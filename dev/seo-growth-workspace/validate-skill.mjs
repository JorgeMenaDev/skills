#!/usr/bin/env node

// Maintainer validation for skills/growth/seo-growth-workspace.
// Run from anywhere: node dev/seo-growth-workspace/validate-skill.mjs [--skill-dir <path>] [--report <path>]
// --report writes a versioned machine-readable gate report (per-section results,
// command-inventory subgate, source path-digest, timestamp) for evaluate-release.mjs.

import {
  appendFileSync,
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(scriptDir, "fixtures");
const validationTmp = mkdtempSync(path.join(tmpdir(), "seo-validator-run-"));

function fixtureTmp(prefix) {
  return mkdtempSync(path.join(validationTmp, prefix));
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

const skillRoot = path.resolve(
  argValue("--skill-dir") ??
    path.resolve(scriptDir, "../../skills/growth/seo-growth-workspace"),
);
const { isSafeLegacySiteId } = await import(pathToFileURL(path.join(skillRoot, "scripts/workspace-state.mjs")).href);

const requiredFiles = [
  "SKILL.md",
  "references/hub-mode.md",
  "references/migrate-uninstall.md",
  "references/phase-architecture.md",
  "references/operating-loop.md",
  "references/business-context.md",
  "references/admin-preflight.md",
  "references/adapters.md",
  "references/technical-seo.md",
  "references/search-console.md",
  "references/content-ops.md",
  "references/content-engine-webhooks.md",
  "references/pseo-gates.md",
  "references/ticket-architecture.md",
  "references/internal-linking.md",
  "references/schema-rich-results.md",
  "references/content-refresh.md",
  "references/conversion-cta.md",
  "references/local-seo-gbp.md",
  "references/backlinks-entity.md",
  "references/image-rights.md",
  "references/evidence-conventions.md",
  "references/commercial-integrity.md",
  "references/page-evidence.md",
  "references/community-source-pages.md",
  "references/affiliate-promo-integrity.md",
  "references/ecommerce-seo.md",
  "references/monthly-reporting.md",
  "references/ai-search-visibility.md",
  "references/data-tools.md",
  "references/international-seo.md",
  "references/competitor-profiling.md",
  "references/scheduled-operation.md",
  "references/portfolio-registry.md",
  "templates/taxonomy.md",
  "templates/local-seo-gbp.md",
  "templates/backlink-gap.md",
  "templates/content-plan.md",
  "templates/page-evidence.md",
  "templates/pseo-plan.md",
  "templates/gsc-opportunity.md",
  "templates/monthly-report.md",
  "templates/admin-setup.md",
  "templates/portfolio-index.md",
  "scripts/workspace-state.mjs",
  "scripts/seo-doctor.mjs",
  "scripts/bootstrap-seo-workspace.mjs",
  "scripts/gsc-oauth.mjs",
  "scripts/gsc-fetch.mjs",
  "scripts/gsc-opportunities.mjs",
  "scripts/link-graph-analyzer.mjs",
  "scripts/rendered-link-export.mjs",
  "scripts/monthly-report.mjs",
  "scripts/portfolio-status.mjs",
];

const requiredDevFiles = [
  "fixtures/release-scenarios.json",
];

const failures = [];
const sectionResults = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function section(name, fn) {
  const failuresBefore = failures.length;
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
  sectionResults.push({
    name,
    result: failures.length === failuresBefore ? "PASS" : "FAIL",
    failures: failures.slice(failuresBefore),
  });
}

// Child stdout goes through a file descriptor into a temp file, never a pipe:
// several JSON-emitting children exceed one pipe buffer and pipe capture
// intermittently truncates at exactly 8192 bytes.
let spawnCaptureCounter = 0;
function spawnCapture(command, commandArgs, options = {}) {
  const stdoutPath = path.join(validationTmp, `stdout-${spawnCaptureCounter++}.out`);
  const fd = openSync(stdoutPath, "w");
  let result;
  try {
    result = spawnSync(command, commandArgs, {
      encoding: "utf-8",
      ...options,
      stdio: ["ignore", fd, "pipe"],
    });
  } finally {
    closeSync(fd);
  }
  return { ...result, stdout: readFileSync(stdoutPath, "utf-8") };
}

function run(command, commandArgs, options = {}) {
  const result = spawnCapture(command, commandArgs, options);

  if (result.error) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed to spawn: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

function runScript(relativeScript, scriptArgs) {
  return run(process.execPath, [
    path.join(skillRoot, relativeScript),
    ...scriptArgs,
  ]);
}

function fixture(name) {
  return path.join(fixturesDir, name);
}

function normalizeTimestamps(text) {
  return text.replace(/^Generated: .*$/m, "Generated: <timestamp>");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function treeDigest(root) {
  const visit = (dir, relative = "") => readdirSync(dir).sort().flatMap((entry) => {
    const absolute = path.join(dir, entry);
    const next = path.join(relative, entry);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink()) return [`${next}:link:${readlinkSync(absolute)}`];
    if (stats.isDirectory()) return [`${next}:dir`, ...visit(absolute, next)];
    return [`${next}:file:${hash(readFileSync(absolute))}`];
  });
  return hash(visit(root).join("\n"));
}

// Mirrored in evaluate-release.mjs: binds a --report to the validator/inventory
// implementation that produced it, not just to the skill tree it validated.
function devToolingDigest() {
  return hash(
    ["validate-skill.mjs", "command-inventory.mjs"]
      .map((file) => hash(readFileSync(path.join(scriptDir, file), "utf-8")))
      .join("\n"),
  );
}

function makePlan(root, { domain = "example.com", decision, hub = false, site = null, repairFiles = [], optionalFiles = [], extra = [] }) {
  const planDir = mkdtempSync(path.join("/private/tmp", "seo-plan-fixture-"));
  const planPath = path.join(planDir, "plan.json");
  const args = [root, "--domain", domain, "--decision", decision, "--plan-output", planPath, "--format", "json"];
  if (hub) args.push("--hub");
  if (site) args.push("--site", site);
  if (repairFiles.length) args.push("--repair-files", repairFiles.join(","));
  if (optionalFiles.length) args.push("--optional-files", optionalFiles.join(","));
  args.push(...extra);
  const result = spawnCapture(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), ...args]);
  return { planDir, planPath, result, report: JSON.parse(result.stdout || "{}") };
}

function plannedBootstrap(root, { domain = "example.com", action = "create", hub = false, site = null, files = [] }) {
  const planned = makePlan(root, { domain, decision: action, hub, site, repairFiles: files });
  if (planned.result.status !== 0) throw new Error(planned.result.stderr || planned.result.stdout);
  const args = ["--plan", planned.planPath, "--action", action, "--domain", domain];
  if (hub) args.push("--hub");
  if (site) args.push("--site", site);
  if (files.length) args.push("--files", files.join(","));
  args.push(root);
  const output = run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), ...args]);
  rmSync(planned.planDir, { recursive: true, force: true });
  return output;
}

// --- File inventory ---
section("file inventory", () => {
  for (const file of requiredFiles) {
    check(existsSync(path.join(skillRoot, file)), `Missing ${file}`);
  }
  for (const file of requiredDevFiles) {
    check(existsSync(path.join(scriptDir, file)), `Missing dev/seo-growth-workspace/${file}`);
  }
  check(existsSync(path.join(scriptDir, "criterion-matrix.md")), "Missing dev/seo-growth-workspace/criterion-matrix.md");
});

section("slice 1 shared contracts", () => {
  const evidence = readFileSync(path.join(skillRoot, "references/evidence-conventions.md"), "utf-8");
  const commercial = readFileSync(path.join(skillRoot, "references/commercial-integrity.md"), "utf-8");
  const matrix = readFileSync(path.join(scriptDir, "criterion-matrix.md"), "utf-8");
  check(["Reported", "Observed", "Third-party estimate", "Inference", "Action completed", "Outcome"].every((state) => evidence.includes(`**${state}**`)), "Evidence conventions must define the six shared evidence states");
  check(evidence.includes("Unknown") && evidence.includes("exposure → mention → citation") && evidence.includes("qualified conversion"), "Evidence conventions must include buyer-stage Unknown and the non-causal outcome ladder");
  check(commercial.includes("typical mobile viewport") && commercial.includes("directly to each named alternative") && commercial.includes("Anti-authority-rental boundary"), "Commercial integrity must define disclosure visibility, direct alternative links, and the anti-authority-rental boundary");
  const rows = matrix.split(/\r?\n/).filter((line) => /^\| C\d+-\d{2} \|/.test(line));
  const ids = rows.map((line) => line.split("|")[1].trim());
  const expectedCounts = { 32: 6, 33: 8, 34: 20, 35: 12, 36: 18, 37: 13, 38: 11, 39: 15, 40: 16, 41: 10, 42: 12, 43: 12 };
  check(rows.length === 153 && new Set(ids).size === rows.length, "Criterion matrix must contain all 153 unique source criteria");
  check(Object.entries(expectedCounts).every(([issue, count]) => ids.filter((id) => id.startsWith(`C${issue}-`)).length === count), "Criterion matrix per-issue row counts must match the source issue contracts");
  check(rows.every((line) => /\| \((?:a|b)\) [^|]+ \| (?:open|closed-by-slice-[1-7]) \|/.test(line)), "Every criterion row must have exactly one typed scenario and a valid status");
});

section("slice 3 page-evidence contracts", () => {
  const reference = readFileSync(path.join(skillRoot, "references/page-evidence.md"), "utf-8");
  const template = readFileSync(path.join(skillRoot, "templates/page-evidence.md"), "utf-8");
  const combined = `${reference}\n${template}`;
  const recordFields = ["Page / revision ID", "Claim-to-source support", "Fetched / checked date", "Authorized voice inputs", "Human approval", "rendered-citation survival"];
  const rightsFields = ["Asset ID", "Approved license + version", "Attribution duty", "Release / consent state", "Rights checked at", "Exceptions / caveats", "Master-row version / hash"];

  check(recordFields.every((field) => combined.toLowerCase().includes(field.toLowerCase())), "Page-evidence files must define revision identity, claim support, dated checks, voice inputs, approval, and rendered citation survival");
  check(reference.includes("One record belongs to one page revision") && reference.includes("A later revision gets a new record"), "Page evidence must be immutable and revision-scoped");
  check(reference.includes("Evidence depth is proportional to materiality") && reference.includes("minor wording or metadata change") && reference.includes("YMYL"), "Page evidence must scale depth with materiality");
  check(rightsFields.every((field) => combined.includes(field)), "Page evidence must snapshot material rights values and the asset-master row version/hash");
  check(reference.includes("Engine-native revision evidence") && reference.includes("do not create this fallback or any duplicate provenance ledger"), "Engine-native revision evidence must remain authoritative without duplicate records");
  check(reference.includes("SITE_WORKSPACE/reports/content/<slug>/<YYYY-MM-DD>-<revision-id>-evidence.md") && reference.includes("two-digit sequence"), "No-engine evidence must have a deterministic revision-unique dated per-page path");
  check(reference.includes("Missing information gain") || reference.includes("information gain is missing"), "Missing information gain must block drafting or publication");
  check(!reference.includes(".seo/research/sources.md"), "Page-evidence reference must not introduce a global sources ledger path");

  const tableBlocks = template.split(/\r?\n/).reduce((blocks, line) => {
    if (!line.startsWith("|")) return [...blocks, []];
    const current = blocks.at(-1) ?? [];
    return [...blocks.slice(0, -1), [...current, line]];
  }, [[]]).filter((block) => block.length);
  check(tableBlocks.length === 6, "Page-evidence template must contain six record tables");
  for (const block of tableBlocks) {
    const widths = block.map((line) => line.slice(1, -1).split("|").length);
    check(block.length >= 2 && widths.every((width) => width === widths[0]), `Page-evidence template table must have matching column counts: ${widths.join(",")}`);
  }
});

section("slice 3 AI observation and portrayal contracts", () => {
  const reference = readFileSync(path.join(skillRoot, "references/ai-search-visibility.md"), "utf-8");
  const observationFields = [
    "Platform",
    "Visible model/version",
    "Surface/mode",
    "Prompt ID + version",
    "Verbatim query",
    "Country + locale",
    "City/coordinates + location method",
    "Login/account state",
    "Personalization/memory state",
    "Device/app",
    "Run number",
    "Declared repeat count",
  ];
  const portrayalFields = [
    "Citation state",
    "Cited source",
    "Concise portrayal sentence",
    "Factual accuracy",
    "Missing material qualifier",
    "Outdated information",
    "Unsupported claim",
    "Entity confusion",
    "Sentiment rubric",
    "Buyer stage",
    "Action route",
    "Route reason",
  ];
  const gapFields = ["Opportunity class", "Rationale", "Action route", "Route reason"];

  check(observationFields.every((field) => reference.includes(field)), "AI observation rows must carry platform/model, prompt, verbatim query, locale/personalization/device/account state, and repeat context");
  check(["**Mention**", "**Recommendation**", "**Citation**"].every((semantic) => reference.includes(semantic)), "AI observation contract must distinguish mention, recommendation, and citation per row");
  check(reference.includes("one row per answer run") && reference.includes("x of y completed runs") && reference.includes("never rankings"), "AI observations must be dated reproducible samples with recurrence bounded to the declared sample");
  check(gapFields.every((field) => reference.includes(field)), "AI source-page gaps must carry an opportunity class, rationale, action route, and route reason");
  check(reference.includes("| Opportunity class | Rationale | Action route | Route reason |"), "AI source-page gap rows must include classification and bounded routing as separate fields");
  check(reference.includes("opportunity class is the inference; the action route is its bounded consequence") && reference.includes("Every material gap gets exactly one action route"), "Every material AI source-page gap must route exactly once as a bounded consequence of its classification");
  check(portrayalFields.every((field) => reference.includes(field)), "AI portrayal records must separate factual portrayal, sentiment, buyer stage, and bounded action routing");
  check(reference.includes("| Brand mention | Recommendation | Citation state | Cited source |") && !reference.includes("Citation + cited source"), "AI portrayal rows must keep citation state and cited source as independent fields");
  check(reference.includes("Portrayal is not sentiment") && reference.includes("Every material gap and every portrayal finding routes to exactly one existing destination"), "Portrayal must differ from sentiment and gaps and portrayal findings must each have exactly one route");
  const routes = ["`content backlog`", "`backlink work-log`", "`commercial disclosure review`", "`no action`"];
  check(routes.every((route) => reference.includes(route)), "AI portrayal routing must include the four bounded destinations");
  check(reference.includes(".seo/backlog.md") && reference.includes(".seo/backlinks/work-log.md") && reference.includes("commercial-integrity.md"), "AI findings must route only to existing backlog, backlink, and commercial-review homes");
  check(reference.includes("No scraping, provider dependency, outreach automation") && reference.includes("never promise, project, or calculate AI-visibility lift"), "AI guidance must prohibit scraping, provider/outreach machinery, and predicted lift");
  check(!/route.{0,80}(?:GEO mode|GEO backlog)/is.test(reference), "AI contract must not define a GEO-mode or GEO-backlog route");
  check(!/(?:will|expected to|projected to|should) (?:increase|improve|lift).{0,50}AI.visibility/i.test(reference), "AI contract must not promise or project AI-visibility lift");
});

section("slice 3 discovery-journey contract", () => {
  const reference = readFileSync(path.join(skillRoot, "references/business-context.md"), "utf-8");
  const fields = [
    "Surface",
    "Customer-evidence basis",
    "Evidence state",
    "Provenance / limitations",
    "Buyer stage(s)",
    "Customer job / query or task",
    "Current-presence observation",
    "Activation decision",
    "Asset / outcome / next action",
    "Execution route",
  ];

  check(fields.every((field) => reference.includes(field)), "Discovery-journey rows must carry customer evidence, provenance, buyer stages, presence, activation, action, and routing fields");
  check(reference.includes("only when identified customer evidence is `Reported` or `Observed`") && reference.includes("When no qualifying evidence exists, create no matrix"), "Discovery-journey creation must require reported or observed customer evidence and treat no matrix as correct without it");
  check(reference.includes("`.seo/context.md`") && reference.includes("Do not create another required workspace file"), "Discovery-journey matrix must live in existing context/strategy/report homes without a required workspace artifact");
  check(reference.includes("`active`; `rejected — <reason>`; or `Unknown`") && reference.includes("Leave the decision `Unknown`"), "Discovery-journey activation must preserve active, reasoned rejection, and Unknown decisions");
  check(reference.includes("Route social, video, newsletter, and marketplace execution to dedicated capabilities outside this skill"), "Social, video, newsletter, and marketplace execution must route outside the SEO skill");
  check(reference.includes("Customer recall remains `Reported`") && reference.includes("Do not infer channel causality or revenue/ARR contribution"), "Discovery-journey evidence must keep recall reported and prohibit causal revenue claims");
  check(reference.includes("Do not turn the matrix into an omni-channel mode") && reference.includes("create per-channel ledgers") && reference.includes("calculate a surface score"), "Discovery-journey guidance must prohibit omni-channel mode, per-channel ledgers, and scoring formulas");
  check(!/(?:mandatory|required) (?:discovery[- ]journey |journey )?matrix/i.test(reference), "Discovery-journey matrix must not be mandatory");
  check(!/(?:score|weight|points?)\s*[=+*/]/i.test(reference), "Discovery-journey contract must not contain a scoring formula");
});

section("slice 3 community-source page contract", () => {
  const reference = readFileSync(path.join(skillRoot, "references/community-source-pages.md"), "utf-8");
  const router = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
  const attributionFields = ["Platform or community", "Thread title and direct thread/permalink", "Public author handle", "Date accessed"];

  check(attributionFields.every((field) => reference.includes(field)), "Community sources must carry platform, permalink, author handle, and access-date attribution");
  check(["**Quote**", "**Paraphrase**", "**Publisher analysis**"].every((label) => reference.includes(label)), "Community pages must explicitly separate quote, paraphrase, and publisher analysis");
  check(reference.includes("source-removal workflow") && reference.includes("2 business days") && reference.includes("5 business days") && reference.includes("Record the completed action, outcome"), "Community pages must define a timed deletion/removal workflow and record outcomes");
  check(reference.includes("1–3 pages maximum") && reference.includes("No expansion past three pages"), "Community pilot must be capped at one to three pages before approved expansion");
  check(["week 2", "week 4", "week 8", "week 12"].every((week) => reference.includes(`**${week}**`)), "Community pilot must pre-register week 2, 4, 8, and 12 reviews");
  check(reference.includes("cannot be redefined after results are seen") && reference.includes("explicit operator approval"), "Community pilot gates must be immutable after results and expansion must require operator approval");
  check(["No scraping", "No covert participation", "No parasite publishing"].every((rule) => reference.includes(rule)), "Community contract must prohibit scraping, covert participation, and parasite publishing");
  check(reference.includes("Anti-token-swap assertion") && reference.includes("page-specific source set") && reference.includes("page-specific analysis") && reference.includes("page-specific information gain"), "Community pages must reject token-swapped variants with interchangeable sources, analysis, or information gain");
  check(reference.includes("does not endorse the publisher") && reference.includes("publisher's relationship to the product") && reference.includes("regardless of whether it is classified as commercial"), "Community pages must require affirmative non-endorsement and relationship disclosures on every page");
  check(reference.includes("publicly accessible") && reference.includes("does not grant republication rights") && reference.includes("explicit, recorded authorization"), "Access-controlled community content must require explicit author and community-owner authorization");
  check(reference.includes("fixture-validated only — not yet exercised against a live operation"), "Community specialist path must carry the fixture-only dogfood caveat");
  check(router.includes("Owned pages synthesizing forums, Q&A, or other community sources: `references/community-source-pages.md`"), "SKILL.md must progressively route community-source publishing");
});

section("slice 3 affiliate and promo integrity contract", () => {
  const reference = readFileSync(path.join(skillRoot, "references/affiliate-promo-integrity.md"), "utf-8");
  const router = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
  const businessContext = readFileSync(path.join(skillRoot, "references/business-context.md"), "utf-8");
  const offerFields = ["Program/source", "Authorization basis", "Verbatim terms", "Start date", "expiry date", "checked-at date", "verification method", "next recheck"];
  const statuses = ["verified-active", "expiring", "expired", "revoked", "unverified"];

  check(offerFields.every((field) => reference.toLowerCase().includes(field.toLowerCase())), "Affiliate offers must record source, authorization, verbatim terms, dates, verification, and recheck evidence");
  check(statuses.every((status) => reference.includes(`\`${status}\``)), "Affiliate offers must define the complete specialist status vocabulary");
  check(reference.includes("inside its scheduled pre-expiry review window **and its recheck is pending**") && reference.includes("explicitly transitions the offer back to `verified-active`") && reference.includes("that transition overrides the time-based `expiring` state") && reference.includes("Only `verified-active` offers may be published") && reference.includes("At expiry, promptly remove, unpublish, or update") && reference.includes("Never describe a dated offer as evergreen") && reference.includes("passes without successful reverification becomes `unverified`"), "Only verified-active offers may publish and expiring offers must have an unambiguous recheck transition and expiry workflow");
  check(reference.includes("program identity") && reference.includes("trademark bidding") && reference.includes("QR codes") && reference.includes("link shortening") && reference.includes("self-referrals"), "Affiliate evidence must capture program identity and recorded brand, bidding, and promotional constraints");
  check(reference.includes("require escalation to the operator **before publication**") && reference.includes("category flag") && reference.includes("target jurisdiction(s)") && reference.includes("`approved with conditions`") && reference.includes("recording a condition is not satisfying it") && reference.includes("Do not embed jurisdictional legal rules"), "Regulated categories must record pre-publication escalation without embedding legal rules");
  check(reference.includes("`tracked conversion` → `merchant validation` → `confirmed/approved conversion` → `approved commission` → `paid commission` → `reversed/adjusted` → `net revenue`") && reference.includes("conversion approval is never evidence of commission approval") && reference.includes("separately identified amount") && reference.includes("must never show only a figure netted into revenue") && reference.includes("A tracked click is not a conversion") && reference.includes("never call pending commission revenue") && reference.includes("shared non-causal outcome ladder"), "Affiliate reporting must distinguish tracked, validated, approved, paid, reversed/adjusted, and net lifecycle states without net-only reversals or causal upgrades");
  check(reference.includes("every commission-bearing relationship") && reference.includes("commission-bearing link without it fails publication"), "Commission-bearing relationships must structurally require commercial-integrity disclosure");
  check(reference.includes("workspace holds the evidence pointer, not the secret") && reference.includes("Do not store private or negotiated codes") && reference.includes("stable secret/evidence ID"), "Sensitive codes and terms must be referenced by secure evidence pointer rather than stored in Markdown");
  check(reference.includes("fixture-validated only — not yet exercised against a live operation"), "Affiliate specialist path must carry the fixture-only dogfood caveat");
  check(router.includes("Affiliate/referral offers, coupons, promo codes, and commission lifecycle: `references/affiliate-promo-integrity.md`"), "SKILL.md must progressively route affiliate and promo integrity");
  check(businessContext.includes("affiliate/referral relationships to `references/affiliate-promo-integrity.md`"), "Business-context journey routing must name affiliate-promo integrity");
});

section("slice 4 e-commerce decision contract", () => {
  const reference = readFileSync(path.join(skillRoot, "references/ecommerce-seo.md"), "utf-8");
  const router = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
  const classifier = readFileSync(path.join(skillRoot, "references/phase-architecture.md"), "utf-8");
  const fixturePath = path.join(scriptDir, "fixtures/release-scenarios.json");
  const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));
  const ecommerceProfile = fixture.profiles?.find(({ id }) => id === "synthetic-ecommerce");

  check(reference.includes("## Commerce decision contract"), "E-commerce reference must define its commerce decision contract");
  check(reference.includes("Unknown margin stays `Unknown`") && reference.includes("never estimate it or substitute points to force a ranking"), "Unknown commerce value must stay Unknown and never be estimated to force ranking");
  check(reference.includes("A mixed SERP triggers investigation, never automatic URL creation"), "Mixed commerce SERPs must trigger investigation rather than URL creation");
  check(["`keep`", "`redirect`", "`410`", "`replace`"].every((decision) => reference.includes(decision)) && reference.includes("never apply a blanket rule"), "Discontinued inventory must use the complete evidence-dependent lifecycle decision set");
  check(reference.includes("product feed, structured data, and rendered landing page must agree") && reference.includes("Any disagreement is a blocker"), "Feed, schema, and rendered landing-page truth must agree or block release");
  check(reference.includes("no Merchant Center adapters") && reference.includes("no provider integrations"), "Commerce contract must exclude Merchant Center adapters and provider integrations");
  check(reference.includes("fixture-validated only — not yet exercised against a live operation"), "Commerce specialist path must carry the fixture-only dogfood caveat");
  check(classifier.includes("Ecommerce / marketplace") && classifier.includes("load `references/ecommerce-seo.md` for commerce decisions"), "Site-type classifier must route e-commerce targets to the commerce reference");
  check(router.includes("E-commerce and marketplace prioritization, page-type, collection, facet/variant/inventory, and commerce-truth decisions: `references/ecommerce-seo.md`"), "SKILL.md must progressively route e-commerce decisions");
  check(ecommerceProfile?.siteType === "ecommerce" && ecommerceProfile?.expectedReference === "references/ecommerce-seo.md" && ecommerceProfile?.dogfoodStatus === "fixture-validated only — not yet exercised against a live operation", "Release fixtures must include a synthetic e-commerce classifier route and fixture-only caveat");
});

section("slice 5 rights-gated authority contracts", () => {
  const backlinks = readFileSync(path.join(skillRoot, "references/backlinks-entity.md"), "utf-8");
  const rights = readFileSync(path.join(skillRoot, "references/image-rights.md"), "utf-8");
  const bootstrap = readFileSync(path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "utf-8");
  const router = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
  const funnelFields = ["Lifecycle", "Query", "Market/geo", "Source URL", "Qualification", "Reply disposition", "Paid request", "Amount", "Link live", "Indexable", "30-day check", "90-day check", "Referral", "Qualified conversion", "Cost", "Limitations"];
  const reproducibilityFields = ["Query", "Market/geo", "Source URL", "Qualification result", "Limitations", "Date"];

  check(bootstrap.includes("discovered → qualified → contacted → replied → won → live/verified → lost/expired") && funnelFields.every((field) => bootstrap.includes(field)), "Authority funnel scaffold must contain the complete lifecycle and v4 fields");
  check(reproducibilityFields.every((field) => backlinks.includes(`**${field}**`)), "Listicle prospecting must require every reproducibility field");
  check(backlinks.includes("declare a prospect cap and a review threshold") && backlinks.includes("explicitly approves the next bounded batch"), "Manual-first outreach must stop for review before another bounded batch");
  check(rights.includes("No image distribution and no rights-based outreach/contact may start unless the asset row is **green: sufficient, current ownership/license evidence**"), "The asset-rights master must structurally gate distribution and contact on green evidence");
  check(rights.includes("Reverse-image matches are **discovery leads only**") && rights.includes("a match never proves") && rights.includes("Permitted unattributed use generates no demand"), "Reverse-image matches must remain discovery leads and permitted unattributed use must generate no demand");
  check(rights.includes("Current-check stop gate") && rights.includes("no frozen platform-license table") && rights.includes("not applicable (directly owned, no platform license)"), "Volatile platform terms must use a per-asset/run current-check stop gate without a frozen table, with a directly-owned not-applicable basis");
  check(rights.includes("Legal enforcement escalates out") && rights.includes("never sends DMCA notices, takedown demands, or legal threats"), "Legal enforcement must escalate outside the skill");
  check(rights.includes("Fixture-validated only — not yet exercised against a live operation") && rights.includes("applies only to the live image-distribution/outreach play"), "Only the live image distribution play must carry the fixture-only caveat");
  check(router.includes("Image distribution, reuse discovery, and rights-gated attribution outreach: `references/image-rights.md`"), "SKILL.md must progressively route image-rights work");
});

section("slice 2 GBP evidence contracts", () => {
  const reference = readFileSync(path.join(skillRoot, "references/local-seo-gbp.md"), "utf-8");
  const template = readFileSync(path.join(skillRoot, "templates/local-seo-gbp.md"), "utf-8");
  const visibilityStates = ["observed", "not_visible", "not_checked", "unavailable"];
  const observationFields = ["Observed at", "Source or exact query", "Observer geo", "Locale", "Device / account / session context", "Business or entity", "Field", "Observed value", "Visibility status", "Evidence URL or capture", "Evidence class", "Evidence limitations"];
  const mutationFields = [
    "proposed_change",
    "business_owner_factual_confirmation",
    "eligibility_confirmation",
    "before_evidence",
    "hypothesis",
    "primary_outcome",
    "guard_metrics",
    "concurrent_changes",
    "changed_at",
    "actor",
    "approval_or_review",
    "recheck_window",
    "after_evidence",
    "result",
    "conclusion_class",
    "rollback_or_follow_up",
  ];

  check(visibilityStates.every((state) => reference.includes(`\`${state}\``)), "GBP reference must define all four visibility states");
  check(visibilityStates.every((state) => template.includes(`\`${state}\``)), "GBP template must define all four visibility states");
  check(observationFields.every((field) => template.includes(field)), "GBP template must carry every observation-ledger field");
  check(reference.includes("this is never `false`, absent") && template.includes("never record false, absent"), "Competitor non-visibility must never become a negative fact");
  check(mutationFields.every((field) => reference.includes(`\`${field}\``)), "GBP reference must define every mutation-ledger field");
  const mutationColumns = ["Proposed change", "Business-owner factual confirmation", "Eligibility confirmation", "Before evidence", "Hypothesis", "Primary outcome", "Guard metrics", "Concurrent changes", "Changed at", "Actor", "Approval or review", "Recheck window", "After evidence", "Result", "Conclusion class", "Rollback or follow-up"];
  check(mutationColumns.every((field) => template.includes(field)), "GBP template must carry every mutation-ledger field");
  check(reference.includes("Never label sequential changes on one profile as an A/B test") && template.includes("never A/B tests"), "Sequential GBP changes must not be labelled A/B tests");
  check(reference.includes("There is no GBP-specific approval exception") && template.includes("there is no GBP-only exception"), "GBP changes must use the normal approval ceiling");
  check(reference.includes("`geo-grid scan`") && reference.includes("`manual location sample`") && template.includes("`geo-grid scan`") && template.includes("`manual location sample`"), "Reference and template must define both local measurement evidence classes");
  check(reference.includes("it emits no grid coverage percentage") && template.includes("must leave top-3 and top-10 coverage blank"), "Manual location samples must not emit coverage percentages");
  check(reference.includes("reject the pair as a before/after comparison") && template.includes("changed grid geometry must be rejected"), "Changed grid geometry must be rejected as a before/after comparison");
  check(reference.includes("no bundled script, paid tool, or particular provider is required or endorsed"), "Geo-grid workflow must remain tool-optional and vendor-neutral");
  check(reference.includes("[Evidence Conventions](evidence-conventions.md)") && template.includes("`references/evidence-conventions.md`") && !template.includes("](../references/"), "GBP reference cross-links the shared vocabulary; the copied template names it without relative links");

  const tableBlocks = template.split(/\r?\n/).reduce((blocks, line) => {
    if (!line.startsWith("|")) return [...blocks, []];
    const current = blocks.at(-1) ?? [];
    return [...blocks.slice(0, -1), [...current, line]];
  }, [[]]).filter((block) => block.length);
  check(tableBlocks.length === 5, "GBP template must contain five ledger/action tables");
  for (const block of tableBlocks) {
    const widths = block.map((line) => line.slice(1, -1).split("|").length);
    check(block.length >= 2 && widths.every((width) => width === widths[0]), `GBP template table must have matching column counts: ${widths.join(",")}`);
  }
});

// --- SKILL.md routes every reference ---
section("SKILL.md routing", () => {
  const skill = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
  for (const file of requiredFiles.filter((f) => f.startsWith("references/") && f !== "references/evidence-conventions.md")) {
    check(skill.includes(file), `SKILL.md does not reference ${file}`);
  }
  check(!skill.includes("references/evidence-conventions.md"), "Evidence conventions must be reached through consumer cross-links, not routed from SKILL.md");
});

// --- SKILL.md version matches the bootstrap script's stamp constant ---
section("version consistency", () => {
  const skill = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
  const skillVersion = skill.match(/^version:\s*(\S+)/m)?.[1];
  const bootstrap = readFileSync(
    path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"),
    "utf-8",
  );
  const stampVersion = bootstrap.match(/SKILL_VERSION = "([^"]+)"/)?.[1];
  check(
    skillVersion !== undefined && skillVersion === stampVersion,
    `SKILL.md version (${skillVersion}) must match bootstrap SKILL_VERSION (${stampVersion})`,
  );
});

// --- bootstrap-seo-workspace.mjs ---
section("bootstrap smoke test", () => {
  const bootstrapRoot = fixtureTmp("seo-skill-");
  try {
    plannedBootstrap(bootstrapRoot, { domain: "standalone.example" });
    for (const file of [
      ".seo/taxonomy.md",
      ".seo/log.md",
      ".seo/context.md",
      ".seo/backlog.md",
      ".seo/backlinks/asset-rights.md",
    ]) {
      check(
        existsSync(path.join(bootstrapRoot, file)),
        `Bootstrap did not create ${file}`,
      );
    }
    const taxonomy = readFileSync(
      path.join(bootstrapRoot, ".seo/taxonomy.md"),
      "utf-8",
    );
    const template = readFileSync(
      path.join(skillRoot, "templates/taxonomy.md"),
      "utf-8",
    );
    check(
      taxonomy === template,
      "Bootstrap taxonomy should be sourced verbatim from templates/taxonomy.md",
    );
    const configPath = path.join(bootstrapRoot, ".seo/config.json");
    check(existsSync(configPath), "Bootstrap did not stamp .seo/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    check(
      config.mode === "standalone",
      "Default bootstrap must stamp config.json with mode standalone",
    );
    check(
      config.workspaceSchemaVersion === 1,
      "Bootstrap must stamp config.json with workspaceSchemaVersion 1",
    );
    const workLog = readFileSync(path.join(bootstrapRoot, ".seo/backlinks/work-log.md"), "utf-8");
    const legacyTable = "| Date | Target | Action | Status | Evidence | Next step |\n| --- | --- | --- | --- | --- | --- |";
    check(workLog.includes(legacyTable), "Bootstrap must preserve the legacy six-column backlink table byte-for-byte");
    check(workLog.includes("## Authority funnel (v4)") && workLog.includes("Link live | Indexable") && workLog.includes("explicit operator opt-in only"), "Bootstrap must append the separate v4 authority funnel and migration opt-in note");
  } finally {
    rmSync(bootstrapRoot, { recursive: true, force: true });
  }
});

// --- bootstrap-seo-workspace.mjs: hub mode ---
section("hub bootstrap", () => {
  const hubRoot = fixtureTmp("seo-hub-");
  try {
    // --site without a hub must fail before creating anything.
    const orphanSite = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"),
        "--site",
        "example-com",
        hubRoot,
      ],
      { encoding: "utf-8" },
    );
    check(
      orphanSite.status !== 0,
      "--site without an existing hub (or --hub) must exit non-zero",
    );

    // Malformed slugs (leading/trailing hyphen) must be rejected.
    const badSlug = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"),
        "--hub",
        "--site",
        "-bad-slug-",
        hubRoot,
      ],
      { encoding: "utf-8" },
    );
    check(badSlug.status !== 0, "A slug with leading/trailing hyphens must exit non-zero");

    const siteOutput = plannedBootstrap(hubRoot, {
      domain: "example.com",
      hub: true,
      site: "example-com",
    });
    check(
      siteOutput.includes("REGISTRATION PENDING"),
      "--site must print a REGISTRATION PENDING line for the registry row",
    );
    const config = JSON.parse(
      readFileSync(path.join(hubRoot, ".seo/config.json"), "utf-8"),
    );
    check(config.mode === "hub", "Hub bootstrap must stamp config.json with mode hub");
    check(
      existsSync(path.join(hubRoot, ".seo/registry.md")),
      "Hub bootstrap did not seed .seo/registry.md",
    );
    for (const file of [
      ".seo/sites/example-com/backlog.md",
      ".seo/sites/example-com/log.md",
      ".seo/sites/example-com/taxonomy.md",
    ]) {
      check(existsSync(path.join(hubRoot, file)), `Hub bootstrap did not create ${file}`);
    }
    check(
      !existsSync(path.join(hubRoot, ".seo/backlog.md")),
      "Hub root must not receive standalone workspace files",
    );

    // Rerunning plain bootstrap against a hub root must refuse (no silent conversion).
    const plainOnHub = spawnSync(
      process.execPath,
      [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), hubRoot],
      { encoding: "utf-8" },
    );
    check(
      plainOnHub.status !== 0,
      "Plain bootstrap on a hub root must exit non-zero (no silent conversion)",
    );
  } finally {
    rmSync(hubRoot, { recursive: true, force: true });
  }
});

// --- bootstrap-seo-workspace.mjs: legacy-adoption guard ---
section("legacy adoption guard", () => {
  const legacyRoot = fixtureTmp("seo-legacy-guard-");
  try {
    // A .seo/ holding only one random file is NOT a legacy workspace: abort, never adopt.
    mkdirSync(path.join(legacyRoot, ".seo"), { recursive: true });
    writeFileSync(path.join(legacyRoot, ".seo/random.txt"), "not an SEO workspace\n");
    const result = spawnSync(
      process.execPath,
      [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), legacyRoot],
      { encoding: "utf-8" },
    );
    check(
      result.status !== 0,
      "Bootstrap must abort on a .seo/ without config.json or the legacy signature",
    );
    check(
      (result.stderr ?? "").includes("--plan"),
      "Direct bootstrap must route the operator to a reviewed plan",
    );
    check(
      !existsSync(path.join(legacyRoot, ".seo/config.json")),
      "An aborted bootstrap must not stamp config.json",
    );

    // Filenames with nonsense headings remain unrecognized.
    for (const file of ["backlog.md", "log.md", "audit.md"]) writeFileSync(path.join(legacyRoot, ".seo", file), `# legacy ${file}\n`);
    const nonsense = makePlan(legacyRoot, { domain: "legacy.example", decision: "adopt" });
    check(nonsense.result.status !== 0 && nonsense.report.target?.classification === "unrecognized", "Three canonical filenames with nonsense content must not be adoptable");
    rmSync(nonsense.planDir, { recursive: true, force: true });

    writeFileSync(path.join(legacyRoot, ".seo/backlog.md"), "# SEO backlog\n\nCurrent focus: none\n\n## Ready\n\n| ID | Ticket |\n| --- | --- |\n");
    writeFileSync(path.join(legacyRoot, ".seo/log.md"), "# SEO operating log\n");
    writeFileSync(path.join(legacyRoot, ".seo/audit.md"), "# SEO audit\n\n## Findings\n");
    const before = Object.fromEntries(["backlog.md", "log.md", "audit.md"].map((file) => [file, readFileSync(path.join(legacyRoot, ".seo", file), "utf-8")]));
    plannedBootstrap(legacyRoot, { domain: "legacy.example", action: "adopt" });
    check(
      JSON.parse(readFileSync(path.join(legacyRoot, ".seo/config.json"), "utf-8")).mode ===
        "standalone",
      "A signed legacy workspace must adopt as standalone",
    );
    check(
      ["backlog.md", "log.md", "audit.md"].every((file) => readFileSync(path.join(legacyRoot, ".seo", file), "utf-8") === before[file]),
      "Legacy adoption must be config-only and preserve all recognized files",
    );
  } finally {
    rmSync(legacyRoot, { recursive: true, force: true });
  }
});

// --- bootstrap-seo-workspace.mjs: sentinel idempotence (standalone + hub + site) ---
section("sentinel idempotence", () => {
  const sentinel = "SENTINEL: operator content — bootstrap must never touch this.\n";
  const bootstrap = path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs");

  const standaloneRoot = fixtureTmp("seo-sentinel-standalone-");
  const hubRoot = fixtureTmp("seo-sentinel-hub-");
  try {
    plannedBootstrap(standaloneRoot, { domain: "sentinel.example" });
    writeFileSync(path.join(standaloneRoot, ".seo/backlog.md"), sentinel);
    const configBefore = readFileSync(path.join(standaloneRoot, ".seo/config.json"), "utf-8");
    rmSync(path.join(standaloneRoot, ".seo/context.md"));
    plannedBootstrap(standaloneRoot, { domain: "sentinel.example", action: "repair", files: ["context.md"] });
    check(
      readFileSync(path.join(standaloneRoot, ".seo/backlog.md"), "utf-8") === sentinel,
      "Standalone rerun must preserve preseeded scaffold content byte-for-byte",
    );
    check(
      readFileSync(path.join(standaloneRoot, ".seo/config.json"), "utf-8") === configBefore,
      "Bootstrap must never rewrite an existing config.json",
    );

    plannedBootstrap(hubRoot, { domain: "sentinel.example", hub: true, site: "sentinel-site" });
    appendFileSync(path.join(hubRoot, ".seo/registry.md"), "| sentinel.example | sites/sentinel-site | unknown | unknown | unknown | unknown | fixture |\n");
    writeFileSync(path.join(hubRoot, ".seo/sites/sentinel-site/context.md"), sentinel);
    const registryBefore = readFileSync(path.join(hubRoot, ".seo/registry.md"), "utf-8");
    rmSync(path.join(hubRoot, ".seo/sites/sentinel-site/audit.md"));
    plannedBootstrap(hubRoot, { domain: "sentinel.example", action: "repair", site: "sentinel-site", files: ["audit.md"] });
    check(
      readFileSync(path.join(hubRoot, ".seo/registry.md"), "utf-8") === registryBefore,
      "Hub rerun must preserve a preseeded registry.md byte-for-byte",
    );
    check(
      readFileSync(path.join(hubRoot, ".seo/sites/sentinel-site/context.md"), "utf-8") ===
        sentinel,
      "Site rerun must preserve preseeded site scaffold content byte-for-byte",
    );
  } finally {
    rmSync(standaloneRoot, { recursive: true, force: true });
    rmSync(hubRoot, { recursive: true, force: true });
  }
});

// --- seo-doctor.mjs: read-only preflight scenarios ---
section("doctor clean root", () => {
  const container = fixtureTmp("seo-doctor-clean-");
  try {
    const target = path.join(container, "site-repo");
    plannedBootstrap(target, { domain: "example.com" });
    // Default search roots = target + parent (the container): nothing else there.
    const json = JSON.parse(
      runScript("scripts/seo-doctor.mjs", [target, "--domain", "example.com", "--format", "json"]),
    );
    check(json.clean === true, "Doctor must report a lone standalone workspace as clean");
    check(
      json.target?.classification === "standalone",
      "Doctor must classify a stamped standalone workspace as standalone",
    );
    check(
      (json.candidates ?? []).length === 0,
      "Doctor must find no candidate workspaces for a clean root",
    );
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor decoy workspace", () => {
  const container = fixtureTmp("seo-doctor-decoy-");
  try {
    const target = path.join(container, "site-repo");
    const hub = path.join(container, "hub");
    const bootstrap = path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs");
    plannedBootstrap(target, { domain: "example.com" });
    // Decoy: a mature hub-managed workspace for the SAME site in a sibling dir,
    // referenced by a registry row.
    plannedBootstrap(hub, { domain: "example.com", hub: true, site: "example-com" });
    writeFileSync(
      path.join(hub, ".seo/sites/example-com/log.md"),
      "# SEO operating log\n\n## 2026-01-01 - Mature handoff\n\n- Mode: operate.\n",
    );
    appendFileSync(
      path.join(hub, ".seo/registry.md"),
      "| example.com | sites/example-com | sc-domain:example.com | none yet | UK / en-GB | human approves | decoy |\n",
    );
    const result = spawnCapture(process.execPath, [
      path.join(skillRoot, "scripts/seo-doctor.mjs"),
      target,
      "--domain",
      "example.com",
      "--format",
      "json",
    ]);
    check(
      result.status === 1,
      "Doctor must exit 1 when another workspace for the same site exists",
    );
    const json = JSON.parse(result.stdout || "{}");
    check(
      (json.candidates ?? []).some((candidate) => candidate.registryKind === "canonical"),
      "Doctor must flag the registry-referenced decoy workspace as a candidate",
    );
    check(
      (json.findings ?? []).some((finding) => finding.code === "candidate_workspace"),
      "Doctor findings must name the candidate workspace",
    );
    const absentTarget = path.join(container, "new-site-repo");
    mkdirSync(absentTarget);
    const blockedPlan = makePlan(absentTarget, { domain: "example.com", decision: "create" });
    check(blockedPlan.result.status === 1 && blockedPlan.report.plan?.approved === false && blockedPlan.report.plan?.terminal === false, "A canonical-registry collision must make a create plan unapproved");
    check(!existsSync(path.join(absentTarget, ".seo")), "Ambiguous discovery must remain read-only");
    rmSync(blockedPlan.planDir, { recursive: true, force: true });
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor dangling symlink", () => {
  const container = fixtureTmp("seo-doctor-symlink-");
  try {
    const target = path.join(container, "site-repo");
    plannedBootstrap(target, { domain: "example.com" });
    mkdirSync(path.join(target, ".agents/skills"), { recursive: true });
    symlinkSync(
      path.join(target, "no-such-skill-dir"),
      path.join(target, ".agents/skills/seo-growth-workspace"),
    );
    const result = spawnCapture(process.execPath, [
      path.join(skillRoot, "scripts/seo-doctor.mjs"),
      target,
      "--format",
      "json",
    ]);
    check(result.status === 1, "Doctor must exit 1 on a dangling symlink skill copy");
    const json = JSON.parse(result.stdout || "{}");
    const install = (json.installs ?? []).find(
      (entry) => entry.surface === ".agents/skills/seo-growth-workspace",
    );
    check(
      install?.symlink === true && install?.targetExists === false,
      "Doctor must report the dangling symlink install copy (symlink: true, targetExists: false)",
    );
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor unregistered hub site", () => {
  const container = fixtureTmp("seo-doctor-unregistered-");
  try {
    const hub = path.join(container, "hub");
    plannedBootstrap(hub, { domain: "orphan.example", hub: true, site: "orphan-site" });
    // The registry row was never added (bootstrap only prints REGISTRATION PENDING).
    const result = spawnCapture(process.execPath, [
      path.join(skillRoot, "scripts/seo-doctor.mjs"),
      hub,
      "--format",
      "json",
    ]);
    check(result.status === 1, "Doctor must exit 1 on an unregistered hub site folder");
    const json = JSON.parse(result.stdout || "{}");
    check(
      (json.findings ?? []).some((finding) => finding.code === "unregistered_hub_site"),
      "Doctor must flag hub site folders absent from the registry",
    );
    check(
      (json.findings ?? []).some((finding) => finding.message.includes("orphan-site")),
      "The unregistered-site finding must name the site",
    );
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor plan and bootstrap action contract", () => {
  const root = fixtureTmp("seo-plan-contract-");
  const mismatchRoot = fixtureTmp("seo-plan-mismatch-");
  const expiryRoot = fixtureTmp("seo-plan-expiry-");
  const migrationRoot = fixtureTmp("seo-plan-migrate-");
  const changedRoot = fixtureTmp("seo-plan-changed-");
  try {
    const beforeDoctor = treeDigest(root);
    const planned = makePlan(root, { domain: "plan.example", decision: "create" });
    check(planned.result.status === 0 && planned.report.plan?.approved === true, "Doctor must emit an approved create plan for an absent unambiguous target");
    check(treeDigest(root) === beforeDoctor, "Doctor plan generation must not write inside any scanned root");
    const plan = JSON.parse(readFileSync(planned.planPath, "utf-8"));
    check(plan.hash?.length === 64 && plan.sourcesHash?.length === 64 && plan.registryDiscoveryFingerprint?.length === 64 && Date.parse(plan.expiresAt) > Date.now(), "Plan must bind SHA-256 source/catalog state and a future expiry");
    const copiedPlan = path.join(planned.planDir, "copied-plan.json");
    writeFileSync(copiedPlan, readFileSync(planned.planPath));
    const copied = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", copiedPlan, "--action", "verify", "--domain", "plan.example", root], { encoding: "utf-8" });
    check(copied.status !== 0 && (copied.stderr ?? "").includes("output-path mismatch"), "Copying a valid plan to another path must not enable replay");

    const unrelatedRoot = fixtureTmp("seo-plan-unrelated-");
    mkdirSync(path.join(unrelatedRoot, ".seo"));
    writeFileSync(path.join(unrelatedRoot, ".seo/config.json"), '{"mode":"standalone","workspaceSchemaVersion":1}\n');
    const beforeVerify = treeDigest(root);
    const verify = run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", planned.planPath, "--action", "verify", "--domain", "plan.example", root]);
    check(verify.includes("zero writes") && treeDigest(root) === beforeVerify && existsSync(planned.planPath), "Verify must ignore unrelated sibling workspace churn, perform zero writes, and leave the plan available for its reviewed mutation");
    rmSync(unrelatedRoot, { recursive: true, force: true });

    run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", planned.planPath, "--action", "create", "--domain", "plan.example", root]);
    check(existsSync(path.join(root, ".seo/config.json")) && !existsSync(planned.planPath), "Create must scaffold once and atomically consume its plan");
    const assetRights = path.join(root, ".seo/backlinks/asset-rights.md");
    check(existsSync(assetRights), "New workspaces must scaffold the optional asset-rights ledger");
    rmSync(assetRights);
    const optionalMissing = spawnCapture(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), root, "--domain", "plan.example", "--format", "json"]);
    check(optionalMissing.status === 0 && JSON.parse(optionalMissing.stdout || "{}").clean === true, "An absent optional ledger must be excluded from workspace drift");
    const optional = makePlan(root, { domain: "plan.example", decision: "create-optional", optionalFiles: ["backlinks/asset-rights.md"] });
    check(optional.result.status === 0 && optional.report.plan?.approved === true && optional.report.optionalFiles?.[0] === "backlinks/asset-rights.md", "Doctor must emit an approved, allowlist-bound create-optional plan");
    run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", optional.planPath, "--action", "create-optional", "--domain", "plan.example", "--files", "backlinks/asset-rights.md", root]);
    check(existsSync(assetRights), "Create-optional must create the reviewed absent asset-rights ledger");
    const optionalReplay = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", optional.planPath, "--action", "create-optional", "--domain", "plan.example", "--files", "backlinks/asset-rights.md", root], { encoding: "utf-8" });
    check(optionalReplay.status !== 0, "A consumed create-optional plan must not replay");
    rmSync(optional.planDir, { recursive: true, force: true });
    const replay = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", planned.planPath, "--action", "create", "--domain", "plan.example", root], { encoding: "utf-8" });
    check(replay.status !== 0, "A consumed plan must not replay");
    rmSync(planned.planDir, { recursive: true, force: true });

    const mismatch = makePlan(mismatchRoot, { domain: "right.example", decision: "create" });
    const wrongDomain = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", mismatch.planPath, "--action", "create", "--domain", "wrong.example", mismatchRoot], { encoding: "utf-8" });
    check(wrongDomain.status !== 0 && !existsSync(path.join(mismatchRoot, ".seo")), "Domain mismatch must fail before any workspace write");
    rmSync(mismatch.planDir, { recursive: true, force: true });

    const expiring = makePlan(expiryRoot, { domain: "expired.example", decision: "create" });
    const expiredPlan = JSON.parse(readFileSync(expiring.planPath, "utf-8"));
    expiredPlan.expiresAt = "2000-01-01T00:00:00.000Z";
    const { hash: _oldHash, ...expiredPayload } = expiredPlan;
    expiredPlan.hash = hash(stableJson(expiredPayload));
    writeFileSync(expiring.planPath, `${JSON.stringify(expiredPlan, null, 2)}\n`);
    const expired = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", expiring.planPath, "--action", "create", "--domain", "expired.example", expiryRoot], { encoding: "utf-8" });
    check(expired.status !== 0 && (expired.stderr ?? "").includes("expired") && !existsSync(path.join(expiryRoot, ".seo")), "Expired plans must fail before any workspace write");
    rmSync(expiring.planDir, { recursive: true, force: true });

    const changing = makePlan(changedRoot, { domain: "changed.example", decision: "create" });
    mkdirSync(path.join(changedRoot, ".seo"));
    writeFileSync(path.join(changedRoot, ".seo/unreviewed.txt"), "changed after review\n");
    const changed = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", changing.planPath, "--action", "create", "--domain", "changed.example", changedRoot], { encoding: "utf-8" });
    check(changed.status !== 0 && (changed.stderr ?? "").includes("source changed") && !existsSync(path.join(changedRoot, ".seo/config.json")), "Any bound source change must fail before mutation");
    rmSync(changing.planDir, { recursive: true, force: true });

    const insidePlan = path.join(expiryRoot, "plan.json");
    const inside = spawnSync(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), expiryRoot, "--domain", "inside.example", "--decision", "create", "--plan-output", insidePlan], { encoding: "utf-8" });
    check(inside.status === 2 && !existsSync(insidePlan), "Doctor must refuse a plan output inside any scanned root");

    const migration = makePlan(migrationRoot, { domain: "migrate.example", decision: "migrate" });
    check(migration.result.status === 0 && migration.report.plan?.terminal === true, "Doctor migrate decisions must be terminal evidence plans");
    const migrateBootstrap = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", migration.planPath, "--action", "verify", "--domain", "migrate.example", migrationRoot], { encoding: "utf-8" });
    check(migrateBootstrap.status !== 0 && (migrateBootstrap.stderr ?? "").includes("manual in v3.1"), "Bootstrap must refuse terminal migrate plans");
    rmSync(migration.planDir, { recursive: true, force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(mismatchRoot, { recursive: true, force: true });
    rmSync(expiryRoot, { recursive: true, force: true });
    rmSync(migrationRoot, { recursive: true, force: true });
    rmSync(changedRoot, { recursive: true, force: true });
  }
});

section("doctor registry discovery race", () => {
  const container = fixtureTmp("seo-registry-race-");
  try {
    const target = path.join(container, "target");
    mkdirSync(target);
    const planned = makePlan(target, { domain: "race.example", decision: "create" });
    check(planned.result.status === 0 && planned.report.plan?.approved === true, "An unambiguous absent target must initially receive an approved plan");

    const sibling = path.join(container, "sibling-hub");
    plannedBootstrap(sibling, { domain: "race.example", hub: true, site: "race-site" });
    appendFileSync(path.join(sibling, ".seo/registry.md"), "| race.example | sites/race-site | unknown | unknown | unknown | unknown | late collision |\n");
    const raced = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", planned.planPath, "--action", "create", "--domain", "race.example", target], { encoding: "utf-8" });
    check(raced.status !== 0 && (raced.stderr ?? "").includes("registry discovery changed"), "A newly discoverable sibling registry must invalidate the reviewed plan before source verification");
    check(!existsSync(path.join(target, ".seo")) && existsSync(planned.planPath), "Registry discovery races must fail before target writes or plan consumption");
    rmSync(planned.planDir, { recursive: true, force: true });
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor install-mode binding", () => {
  const container = fixtureTmp("seo-mode-binding-");
  try {
    const standalone = path.join(container, "standalone");
    plannedBootstrap(standalone, { domain: "standalone.example" });
    const stamped = makePlan(standalone, { domain: "child.example", decision: "create", site: "child-site" });
    check(stamped.result.status === 1 && stamped.report.plan?.approved === false, "A stamped standalone root must reject site creation plans");
    check(stamped.report.findings?.some((finding) => finding.code === "mode_confusion"), "Standalone-to-hub reinterpretation must be an explicit mode_confusion finding");
    check(!existsSync(path.join(standalone, ".seo/registry.md")) && !existsSync(path.join(standalone, ".seo/sites/child-site")), "Rejected site planning must not mutate a standalone workspace");
    rmSync(stamped.planDir, { recursive: true, force: true });

    const forcedHub = makePlan(standalone, { domain: "child.example", decision: "create", hub: true, site: "child-site" });
    check(forcedHub.result.status === 1 && forcedHub.report.plan?.approved === false, "--hub must not reinterpret an already stamped standalone root");
    rmSync(forcedHub.planDir, { recursive: true, force: true });

    const absent = path.join(container, "absent");
    mkdirSync(absent);
    const implicitHub = makePlan(absent, { domain: "first.example", decision: "create", site: "first-site" });
    check(implicitHub.result.status === 1 && implicitHub.report.plan?.approved === false, "The first hub site requires an explicit reviewed --hub plan");
    check(!existsSync(path.join(absent, ".seo")), "Implicit hub planning must remain read-only");
    rmSync(implicitHub.planDir, { recursive: true, force: true });

    const standalonePlan = makePlan(absent, { domain: "first.example", decision: "create" });
    const modeMismatch = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", standalonePlan.planPath, "--action", "create", "--domain", "first.example", "--hub", absent], { encoding: "utf-8" });
    check(modeMismatch.status !== 0 && (modeMismatch.stderr ?? "").includes("install mode") && !existsSync(path.join(absent, ".seo")), "Bootstrap must bind and enforce the reviewed install mode before writes");
    rmSync(standalonePlan.planDir, { recursive: true, force: true });
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor selected canonical stale route", () => {
  const container = fixtureTmp("seo-canonical-stale-");
  try {
    const hub = path.join(container, "hub");
    plannedBootstrap(hub, { domain: "healthy.example", hub: true, site: "healthy-site" });
    appendFileSync(path.join(hub, ".seo/registry.md"), "| stale.example | sites/missing-site | unknown | unknown | unknown | unknown | missing route |\n");
    const sibling = path.join(container, "sibling");
    mkdirSync(sibling);
    const blocked = makePlan(sibling, { domain: "stale.example", decision: "create" });
    check(blocked.result.status === 1 && blocked.report.plan?.approved === false, "A missing canonical route for the selected identity must block create");
    check(blocked.report.findings?.some((finding) => finding.code === "stale_canonical_route" && finding.site === "stale.example"), "The blocking finding must identify the stale canonical route");
    check(!existsSync(path.join(sibling, ".seo")), "A stale canonical route must not redirect creation into a sibling target");
    rmSync(blocked.planDir, { recursive: true, force: true });

    const unrelated = path.join(container, "unrelated");
    mkdirSync(unrelated);
    const allowed = makePlan(unrelated, { domain: "fresh.example", decision: "create" });
    check(allowed.result.status === 0 && allowed.report.plan?.approved === true, "An unrelated canonical stale row must remain visible without blocking another identity");
    check(allowed.report.findings?.some((finding) => finding.code === "stale_canonical_route" && finding.site === "stale.example"), "Unrelated canonical stale routes must remain public findings");
    check(!(allowed.report.unresolvedFindings ?? []).some((finding) => finding.code === "stale_canonical_route"), "An unrelated canonical stale route must be excluded only from unresolved findings");
    rmSync(allowed.planDir, { recursive: true, force: true });
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor schema and filesystem safety", () => {
  const schemaRoot = fixtureTmp("seo-schema-ahead-");
  const symlinkRoot = fixtureTmp("seo-symlink-escape-");
  const outside = fixtureTmp("seo-symlink-outside-");
  try {
    plannedBootstrap(schemaRoot, { domain: "schema.example" });
    const configPath = path.join(schemaRoot, ".seo/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    writeFileSync(configPath, `${JSON.stringify({ ...config, workspaceSchemaVersion: 2 }, null, 2)}\n`);
    const schema = spawnCapture(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), schemaRoot, "--domain", "schema.example", "--format", "json"]);
    const schemaJson = JSON.parse(schema.stdout || "{}");
    check(schema.status === 1 && schemaJson.findings?.some((finding) => finding.code === "unsupported_schema"), "Schema 2/ahead state must be blocking in v3.1");

    plannedBootstrap(symlinkRoot, { domain: "symlink.example" });
    rmSync(path.join(symlinkRoot, ".seo/context.md"));
    symlinkSync(path.join(outside, "context.md"), path.join(symlinkRoot, ".seo/context.md"));
    const symlink = spawnCapture(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), symlinkRoot, "--domain", "symlink.example", "--format", "json"]);
    const symlinkJson = JSON.parse(symlink.stdout || "{}");
    check(symlink.status === 1 && symlinkJson.findings?.some((finding) => finding.code === "generated_symlink_escape"), "Generated-file symlink escapes/dangling targets must block mutation");

    const backlinks = path.join(symlinkRoot, ".seo/backlinks");
    rmSync(backlinks, { recursive: true, force: true });
    symlinkSync(outside, backlinks);
    const nested = makePlan(symlinkRoot, { domain: "symlink.example", decision: "repair", repairFiles: ["backlinks/summary.md"] });
    check(nested.result.status === 1 && nested.report.plan?.approved === false, "A generated ancestor-directory symlink escape must block a repair plan");
    check(nested.report.findings?.some((finding) => finding.code === "generated_symlink_escape" && finding.file === "backlinks"), "Doctor must report the escaping ancestor segment, not only the requested leaf");
    check(!existsSync(path.join(outside, "summary.md")), "A rejected nested-symlink repair must not write outside the reviewed root");
    rmSync(nested.planDir, { recursive: true, force: true });
  } finally {
    rmSync(schemaRoot, { recursive: true, force: true });
    rmSync(symlinkRoot, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

section("site ID grammar and exact legacy grandfathering", () => {
  const root = fixtureTmp("seo-site-id-");
  try {
    check(isSafeLegacySiteId("Legacy_Site"), "A legacy ID may use historical characters when it remains one safe segment");
    for (const unsafe of ["", ".", "..", "bad/site", "bad\\site", "bad\0site"]) {
      check(!isSafeLegacySiteId(unsafe), `Legacy ID ${JSON.stringify(unsafe)} must be rejected as an unsafe filesystem segment`);
    }
    plannedBootstrap(root, { domain: "valid.example", hub: true, site: "valid-site" });
    appendFileSync(path.join(root, ".seo/registry.md"), "| valid.example | sites/valid-site | unknown | unknown | unknown | unknown | fixture |\n");
    const legacyDir = path.join(root, ".seo/sites/Legacy_Site");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(path.join(legacyDir, "backlog.md"), "# SEO backlog\n\nCurrent focus: none\n\n## Ready\n\n| ID | Ticket |\n| --- | --- |\n");
    writeFileSync(path.join(legacyDir, "log.md"), "# SEO operating log\n");
    writeFileSync(path.join(legacyDir, "audit.md"), "# SEO audit\n\n## Findings\n");
    appendFileSync(path.join(root, ".seo/registry.md"), "| legacy-id.example | sites/Legacy_Site | unknown | unknown | unknown | unknown | grandfathered |\n");
    const repair = makePlan(root, { domain: "legacy-id.example", decision: "repair", site: "Legacy_Site", repairFiles: ["context.md"] });
    check(repair.result.status === 0 && repair.report.legacySiteId === "Legacy_Site", "An exact existing registry/path ID outside the grammar must be grandfathered");
    run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", repair.planPath, "--action", "repair", "--domain", "legacy-id.example", "--site", "Legacy_Site", "--files", "context.md", root]);
    check(existsSync(path.join(legacyDir, "context.md")), "A grandfathered exact legacy ID may repair its existing workspace");
    rmSync(repair.planDir, { recursive: true, force: true });

    const outsideWorkspace = path.join(root, "outside-workspace");
    mkdirSync(outsideWorkspace);
    writeFileSync(path.join(outsideWorkspace, "backlog.md"), "# SEO backlog\n\nCurrent focus: none\n\n## Ready\n\n| ID | Ticket |\n| --- | --- |\n");
    writeFileSync(path.join(outsideWorkspace, "log.md"), "# SEO operating log\n");
    writeFileSync(path.join(outsideWorkspace, "audit.md"), "# SEO audit\n\n## Findings\n");
    appendFileSync(path.join(root, ".seo/registry.md"), "| ../../outside-workspace | ../outside-workspace | unknown | unknown | unknown | unknown | malicious public ID |\n");
    const traversal = makePlan(root, { domain: "../../outside-workspace", decision: "repair", site: "../../outside-workspace", repairFiles: ["context.md"] });
    check(traversal.result.status === 1 && traversal.report.plan?.approved === false, "Path-separator site IDs must never be grandfathered by a public registry Site cell");
    check(traversal.report.findings?.some((finding) => finding.code === "invalid_site_id"), "Traversal IDs must produce a blocking invalid_site_id finding");
    check(traversal.report.legacySiteId === null && !existsSync(path.join(outsideWorkspace, "context.md")), "Rejected traversal repair must not write outside .seo/sites");
    rmSync(traversal.planDir, { recursive: true, force: true });

    const create = makePlan(root, { domain: "new.example", decision: "create", site: "New_Invalid" });
    const rejected = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", create.planPath, "--action", "create", "--domain", "new.example", "--site", "New_Invalid", root], { encoding: "utf-8" });
    check(rejected.status !== 0 && !existsSync(path.join(root, ".seo/sites/New_Invalid")), "A new site ID outside the 1-64 slug grammar must fail before writes");
    rmSync(create.planDir, { recursive: true, force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

section("hub sites boundary containment", () => {
  const container = fixtureTmp("seo-hub-sites-boundary-");
  try {
    const hub = path.join(container, "hub");
    const outside = path.join(container, "outside");
    mkdirSync(outside);
    plannedBootstrap(hub, { domain: "valid.example", hub: true, site: "valid-site" });
    rmSync(path.join(hub, ".seo/sites"), { recursive: true, force: true });
    symlinkSync(outside, path.join(hub, ".seo/sites"));
    const escaped = makePlan(hub, { domain: "escaped.example", decision: "create", site: "escaped-site" });
    check(escaped.result.status === 1 && escaped.report.plan?.approved === false, "A symlinked hub sites boundary must block site creation");
    check(escaped.report.findings?.some((finding) => finding.code === "hub_sites_escape"), "Doctor must identify when .seo/sites itself resolves outside the hub");
    check(!existsSync(path.join(outside, "escaped-site")), "A rejected hub boundary escape must not create an outside site workspace");
    rmSync(escaped.planDir, { recursive: true, force: true });
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor registry, permission, lock, and non-disclosure findings", () => {
  const container = fixtureTmp("seo-doctor-integrity-");
  try {
    const hub = path.join(container, "hub");
    const credential = path.join(container, "credential.env");
    const ignoredCredential = path.join(container, "ignored-credential.env");
    const marker = "CREDENTIAL_VALUE_MUST_NOT_APPEAR";
    writeFileSync(credential, marker);
    writeFileSync(ignoredCredential, "IGNORED_SECRET_CONTENT");
    chmodSync(credential, 0o644);
    chmodSync(ignoredCredential, 0o644);
    plannedBootstrap(hub, { domain: "integrity.example", hub: true, site: "integrity-site" });
    appendFileSync(path.join(hub, ".seo/registry.md"), [
      `| integrity.example | sites/integrity-site | unknown | GSC_CREDENTIALS_DIR=${credential} | unknown | unknown | fixture |`,
      `| integrity.example | sites/integrity-site | unknown | SECRET_PATH=${ignoredCredential} | unknown | unknown | duplicate |`,
      "| malformed | too-few |",
      "",
    ].join("\n"));
    mkdirSync(path.join(hub, ".agents/skills"), { recursive: true });
    symlinkSync(skillRoot, path.join(hub, ".agents/skills/seo-growth-workspace"));
    writeFileSync(path.join(hub, "skills-lock.json"), JSON.stringify({ version: 1, skills: { "seo-growth-workspace": { source: "fixture", sourceType: "github", skillPath: "skills/growth/seo-growth-workspace/SKILL.md", computedHash: "0".repeat(64) } } }));
    const result = spawnCapture(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), hub, "--domain", "integrity.example", "--format", "json"]);
    const json = JSON.parse(result.stdout || "{}");
    const codes = new Set((json.findings ?? []).map((finding) => finding.code));
    check(result.status === 1 && codes.has("credential_permissions") && codes.has("skills_lock_drift"), "Doctor must report stat-only credential permission and skills-lock drift");
    const permissionFindings = (json.findings ?? []).filter((finding) => finding.code === "credential_permissions");
    check(permissionFindings.length === 1 && permissionFindings[0].credentialPath === credential, "Doctor must stat only the approved GSC_CREDENTIALS_DIR assignment RHS and ignore arbitrary assignments");
    check(codes.has("duplicate_registry_site") && codes.has("duplicate_registry_root") && codes.has("malformed_registry"), "Doctor must distinguish duplicate-site, duplicate-root, and malformed registry rows");
    check(!result.stdout.includes(marker) && !result.stderr.includes(marker), "Credential content marker must never enter doctor output");
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor active-path drift", () => {
  const root = fixtureTmp("seo-active-drift-");
  try {
    writeFileSync(path.join(root, "README.md"), "SEO state lives in .seo/backlog.md\n");
    const result = spawnCapture(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), root, "--format", "json"]);
    const json = JSON.parse(result.stdout || "{}");
    check(result.status === 1 && json.findings?.some((finding) => finding.code === "active_path_drift"), "Stale active workspace pointers must be reported");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const commandInventorySubgate = { command: null, exit: null, result: "FAIL" };
section("command inventory and foreign-CWD matrix", () => {
  const inventoryArgs = [path.join(scriptDir, "command-inventory.mjs"), "--verify"];
  commandInventorySubgate.command = [process.execPath, ...inventoryArgs].join(" ");
  const inventoryRun = spawnCapture(process.execPath, inventoryArgs);
  commandInventorySubgate.exit = inventoryRun.error ? null : inventoryRun.status;
  if (inventoryRun.error) {
    throw new Error(`${commandInventorySubgate.command} failed to spawn: ${inventoryRun.error.message}`);
  }
  if (inventoryRun.status !== 0) {
    throw new Error(`${commandInventorySubgate.command} failed:\n${inventoryRun.stderr || inventoryRun.stdout}`);
  }
  const result = JSON.parse(inventoryRun.stdout);
  check(result.counts?.malformed === 0, "Mechanical command inventory must have zero malformed/secret-argv entries");
  check(result.verification?.pass === true && result.verification.matrix.every((row) => row.status === 0), "Every executable command must pass the generated foreign-CWD matrix");
  check(result.verification?.contractCases.every((item) => item.actual === item.expected), "Command classifier must reject secret argv while allowing env/file-backed auth");
  check(result.counts?.executable > 0 && result.counts?.illustrative > 0, "Inventory must classify executable and illustrative commands rather than hand-maintain one class");
});

section("eight-row legacy / six-row hub rehearsal", () => {
  const container = fixtureTmp("seo-registry-rehearsal-");
  try {
    const hub = path.join(container, "hub");
    const canonicalRows = [];
    for (let index = 1; index <= 6; index += 1) {
      const id = `site-${index}`;
      const domain = `${id}.example`;
      plannedBootstrap(hub, { domain, hub: index === 1, site: id });
      const row = `| ${domain} | sites/${id} | sc-domain:${domain} | unknown | UK / en | human | fixture |`;
      appendFileSync(path.join(hub, ".seo/registry.md"), `${row}\n`);
      canonicalRows.push({ id, domain });
    }
    const legacyA = path.join(container, "legacy-extra-a");
    const legacyB = path.join(container, "legacy-extra-b");
    plannedBootstrap(legacyA, { domain: "extra-a.example" });
    plannedBootstrap(legacyB, { domain: "extra-b.example" });
    mkdirSync(path.join(hub, ".agents/seo"), { recursive: true });
    const legacyRows = [
      ...canonicalRows.map(({ domain }, index) => `| ${domain} | ${path.join(container, `retired-${index + 1}`)} | unknown | unknown | UK / en | human | retired source |`),
      `| extra-a.example | ${legacyA} | unknown | unknown | UK / en | human | legacy-only |`,
      `| extra-b.example | ${legacyB} | unknown | unknown | UK / en | human | legacy-only |`,
    ];
    writeFileSync(path.join(hub, ".agents/seo/REGISTRY.md"), ["# Legacy registry", "", "| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |", "|---|---|---|---|---|---|---|", ...legacyRows, ""].join("\n"));
    const result = spawnCapture(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), hub, "--format", "json"]);
    const json = JSON.parse(result.stdout || "{}");
    const codes = (json.findings ?? []).map((finding) => finding.code);
    check(json.registryInventory?.filter((row) => row.registryKind === "canonical").length === 6, "Hub rehearsal must retain all six canonical routing rows");
    check(json.registryInventory?.filter((row) => row.registryKind === "legacy").length === 8, "Legacy rehearsal must retain all eight inventory rows");
    check(codes.filter((code) => code === "stale_registry_row").length === 6 && codes.filter((code) => code === "unmigrated_legacy_site").length === 2, "Missing retired roots must be stale rows while two legacy-only sites remain visible");
    check(!codes.includes("candidate_workspace"), "Stale legacy rows must not become false candidate workspaces");
    check(new Set(json.registries.map((registry) => registry.path)).size === json.registries.length, "Registry discovery must deduplicate paths by realpath");
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("Next App Router rendered-link exporter", () => {
  const root = fixtureTmp("seo-rendered-export-");
  const buildDir = path.join(root, ".next");
  const appDir = path.join(buildDir, "server", "app");
  const outputPath = path.join(root, "export.json");
  const oversizedPath = path.join(root, "oversized.json");
  const exporter = path.join(skillRoot, "scripts/rendered-link-export.mjs");
  try {
    mkdirSync(path.join(appDir, "nested"), { recursive: true });
    writeFileSync(path.join(buildDir, "prerender-manifest.json"), JSON.stringify({
      routes: { "/": { srcRoute: "/" }, "/missing": { srcRoute: "/missing" }, "/nested/page": { srcRoute: "/nested/page" } },
      dynamicRoutes: {},
    }));
    writeFileSync(path.join(buildDir, "app-path-routes-manifest.json"), JSON.stringify({
      "/page": "/",
      "/nested/page/page": "/nested/page",
      "/account/[id]/page": "/account/[id]",
      "/missing/page": "/missing",
    }));
    writeFileSync(path.join(appDir, "index.html"), '<html><head><link rel="canonical" href="/"><script type="application/ld+json">{"text":"<a href=\'/phantom-jsonld\'>Phantom</a>"}</script><style>.sample::after { content: "<a href=\'/phantom-style\'>Phantom</a>"; }</style></head><body><template><a href="/phantom-template">Phantom</a></template><nav><a rel="nofollow sponsored" href="/nested/page"><strong> Nested </strong> page</a><a href="#skip">Fragment</a><a href="mailto:a@example.test">Mail</a></nav></body></html>');
    writeFileSync(path.join(appDir, "nested", "page.html"), '<html><head><meta content="noindex, follow" name="robots"></head><body><main><a href="../">Home</a></main></body></html>');

    const help = spawnCapture(process.execPath, [exporter, "--help"]);
    check(help.status === 0 && help.stdout.includes("Next.js App Router"), "Exporter --help must exit 0 and state its framework boundary");
    const args = [exporter, "--build-dir", buildDir, "--origin", "https://example.test", "--stamp", "fixture-date"];
    const first = spawnCapture(process.execPath, args);
    const second = spawnCapture(process.execPath, args);
    check(first.status === 0 && first.stdout === second.stdout, "Exporter output must be byte-identical for identical build input and arguments");
    const json = JSON.parse(first.stdout);
    check(json.coverage?.complete === false && json.coverage?.note.includes("2 routes without complete prerendered HTML (dynamic, fallback-rendered, or partial-prerender shells): /account/[id], /missing") && json.coverage?.note.includes("1 declared prerender routes had missing HTML: /missing"), "Exporter must count and name manifest page routes and declared prerenders missing HTML");
    check(json.provenance?.framework === "next-app-router" && json.provenance?.exportDate === "fixture-date" && json.provenance?.fileCount === 2 && json.provenance?.routeCount === 4, "Exporter must record deterministic provenance and count represented-plus-missing route identities as a union");
    check(json.pages.find((page) => page.url === "https://example.test/nested/page")?.indexable === false, "Exporter must set indexable false from a rendered noindex robots meta tag");
    check(json.links.some((link) => link.target === "https://example.test/nested/page" && link.anchor === "Nested page" && link.placement === "nav" && link.rel.join(" ") === "nofollow sponsored"), "Exporter must extract nested anchor text, root-relative targets, landmark placement, and rel tokens");
    check(json.links.some((link) => link.source === "https://example.test/nested/page" && link.target === "https://example.test/" && link.placement === "main"), "Exporter must resolve relative hrefs against the source route");
    check(json.links.length === 2 && !json.links.some((link) => link.target.includes("phantom")), "Exporter must skip fragment-only, mailto, and anchor-shaped content inside script, style, and template elements");

    const analyzerInput = { ...json, coverage: { complete: true, note: "Synthetic complete override for contract acceptance." } };
    writeFileSync(outputPath, JSON.stringify(analyzerInput));
    const accepted = spawnCapture(process.execPath, [path.join(skillRoot, "scripts/link-graph-analyzer.mjs"), "--input", outputPath]);
    check(accepted.status === 0, "Analyzer must accept exporter provenance and the emitted pages[]/links[] contract");

    writeFileSync(path.join(appDir, "nested", "page.html"), "x".repeat(5_000_001));
    const oversized = spawnCapture(process.execPath, [exporter, "--build-dir", buildDir, "--origin", "https://example.test", "--output", oversizedPath]);
    check(oversized.status !== 0 && oversized.stderr.includes("5000001 bytes") && oversized.stderr.includes("5000000-byte limit"), "Exporter must refuse an HTML file over 5 MB with an actionable bound");

    const source = readFileSync(exporter, "utf8");
    check(!/\bfetch\s*\(|node:child_process|from\s+["'](?!node:)/.test(source), "Exporter source must contain no fetch, child process, or external dependencies");
    check(source.includes("files: 50_000") && source.includes("fileBytes: 5_000_000"), "Exporter source must retain both declared traversal bounds");

    const missingManifestDir = path.join(root, "missing-manifest", ".next");
    mkdirSync(path.join(missingManifestDir, "server", "app"), { recursive: true });
    const missingManifest = spawnCapture(process.execPath, [exporter, "--build-dir", missingManifestDir, "--origin", "https://example.test"]);
    check(missingManifest.status !== 0 && missingManifest.stderr.includes("prerender-manifest.json") && missingManifest.stderr.includes("Cannot read manifest"), "Exporter must fail actionably when a required route manifest is absent");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

section("Next App Router exporter basePath, PPR-shell, and redirect handling", () => {
  const root = fixtureTmp("seo-rendered-export-modes-");
  const buildDir = path.join(root, ".next");
  const appDir = path.join(buildDir, "server", "app");
  const exporter = path.join(skillRoot, "scripts/rendered-link-export.mjs");
  const analyzer = path.join(skillRoot, "scripts/link-graph-analyzer.mjs");
  const outputPath = path.join(root, "export.json");
  try {
    mkdirSync(appDir, { recursive: true });
    writeFileSync(path.join(buildDir, "routes-manifest.json"), JSON.stringify({ basePath: "/docs" }));
    writeFileSync(path.join(buildDir, "prerender-manifest.json"), JSON.stringify({
      routes: {
        "/": { srcRoute: "/" },
        "/redirect": { srcRoute: "/redirect", initialStatus: 308, initialHeaders: { location: "/docs/target" } },
        "/shell": { srcRoute: "/shell", experimentalPPR: true },
      },
      dynamicRoutes: {},
    }));
    writeFileSync(path.join(buildDir, "app-path-routes-manifest.json"), JSON.stringify({
      "/page": "/",
      "/redirect/page": "/redirect",
      "/shell/page": "/shell",
    }));
    writeFileSync(path.join(appDir, "index.html"), '<html><head><link rel="canonical" href="/docs"></head><body><main><a href="/docs/redirect">Redirect</a></main></body></html>');
    writeFileSync(path.join(appDir, "redirect.html"), '<html><head></head><body><main>Redirecting…</main></body></html>');
    writeFileSync(path.join(appDir, "shell.html"), '<html><head></head><body><main>Shell</main></body></html>');

    const args = [exporter, "--build-dir", buildDir, "--origin", "https://example.test", "--stamp", "fixture-date"];
    const first = spawnCapture(process.execPath, args);
    const second = spawnCapture(process.execPath, args);
    check(first.status === 0 && first.stdout === second.stdout, "basePath/PPR/redirect exporter output must be byte-identical for identical build input and arguments");
    const json = JSON.parse(first.stdout);

    check(json.pages.some((page) => page.url === "https://example.test/docs" && page.entryPoint === true), "Exporter must prefix a routes-manifest basePath onto the root page URL");
    check(json.pages.some((page) => page.url === "https://example.test/docs/redirect"), "Exporter must prefix a routes-manifest basePath onto nested page URLs");

    check(!json.pages.some((page) => page.url === "https://example.test/docs/shell") && json.coverage?.complete === false && json.coverage?.note.includes("/shell"), "A partial-prerender shell must be named in the coverage note and never emitted as a covered page");

    const redirect = json.pages.find((page) => page.url === "https://example.test/docs/redirect");
    check(redirect?.status === 308 && redirect?.indexable === false && redirect?.finalUrl === "https://example.test/docs/target", "A redirect route must carry its manifest status, finalUrl from the Location header, and indexable false");

    const analyzerInput = { ...json, coverage: { complete: true, note: "Synthetic complete override for contract acceptance." } };
    writeFileSync(outputPath, JSON.stringify(analyzerInput));
    const accepted = spawnCapture(process.execPath, [analyzer, "--input", outputPath]);
    check(accepted.status === 0, "Analyzer must accept exporter output carrying basePath URLs and redirect finalUrl targets");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- link-graph-analyzer.mjs: contract + deterministic report ---
section("offline link-graph analyzer", () => {
  const root = fixtureTmp("seo-link-graph-");
  const inputPath = path.join(root, "graph.json");
  const derivedScopePath = path.join(root, "derived-scope.json");
  const incompletePath = path.join(root, "incomplete.json");
  const overLimitPath = path.join(root, "over-limit.json");
  const byteLimitPath = path.join(root, "byte-limit.json");
  const analyzer = path.join(skillRoot, "scripts/link-graph-analyzer.mjs");
  const page = (url, extra = {}) => ({
    url,
    status: 200,
    canonicalUrl: url,
    indexable: true,
    entryPoint: false,
    moneyPage: false,
    ...extra,
  });
  const graphFixture = {
    coverage: { complete: true, note: "All rendered routes | hostile <note>." },
    siteOrigins: ["https://example.test/"],
    pages: [
      page("https://example.test/", { entryPoint: true }),
      page("https://example.test/money", { moneyPage: true }),
      page("https://example.test/weak", { moneyPage: true }),
      page("https://example.test/near"),
      page("https://example.test/orphan"),
      page("https://example.test/redirect", { status: 301, finalUrl: "https://example.test/money", indexable: false }),
      page("https://example.test/canonical-copy", { canonicalUrl: "https://example.test/money", indexable: false }),
      page("https://example.test/noindex", { indexable: false }),
    ],
    links: [
      { source: "https://example.test/", target: "https://example.test/money", anchor: "=SUM(1|2)\n<script>", placement: "+nav", rel: [] },
      { source: "https://example.test/", target: "https://example.test/money", anchor: "-duplicate anchor", placement: "@body", rel: [] },
      { source: "https://example.test/", target: "https://example.test/near", anchor: "Near", placement: "body", rel: [] },
      { source: "https://example.test/", target: "https://example.test/redirect", anchor: "Redirect", placement: "body", rel: [] },
      { source: "https://example.test/", target: "https://example.test/canonical-copy", anchor: "Canonical", placement: "body", rel: [] },
      { source: "https://example.test/", target: "https://example.test/noindex", anchor: "Noindex", placement: "body", rel: [] },
      { source: "https://example.test/", target: "https://example.test/weak", anchor: "Weak", placement: "body", rel: ["nofollow"] },
      { source: "https://example.test/", target: "https://example.test/missing", anchor: "Broken", placement: "body", rel: [] },
      { source: "https://example.test/orphan", target: "https://example.test/orphan#fragment", anchor: "Self", placement: "body", rel: [] },
      { source: "https://example.test/", target: "https://outside.test/pixel", anchor: "![pixel](https://outside.test/pixel)\r[link](https://outside.test/)", placement: "body", rel: [] },
    ],
  };

  try {
    writeFileSync(inputPath, JSON.stringify(graphFixture));
    const help = spawnCapture(process.execPath, [analyzer, "--help"]);
    check(help.status === 0 && help.stdout.includes("JSON is the only v1 input"), "Analyzer --help must exit 0 and document JSON-only v1 input");

    const first = spawnCapture(process.execPath, [analyzer, "--input", inputPath, "--stamp", "fixture-stamp"]);
    const second = spawnCapture(process.execPath, [analyzer, "--input", inputPath, "--stamp", "fixture-stamp"]);
    check(first.status === 0 && first.stdout === second.stdout, "Analyzer output must be byte-identical for identical input and arguments");
    const output = first.stdout;
    check(output.includes("duplicates preserved") && output.includes("-duplicate anchor"), "Analyzer must preserve duplicate anchored edges");
    check(["redirected target", "canonicalized target", "non-indexable target", "nofollow edge", "broken target: internal target absent"].every((value) => output.includes(value)), "Analyzer must explain redirect, canonical, noindex, nofollow, and broken-target handling");
    check(output.includes("excluded; self-link") && /\| https:\/\/example\.test\/orphan \| unreachable \| unreachable \| 0 \| 0 \| false \| orphan \|/.test(output), "Self-links must remain inventoried without inbound support or graph propagation");
    check(output.includes("https://outside.test/pixel") && output.includes("excluded; external") && output.match(/broken target:/g)?.length === 1, "External links must remain counted without becoming broken-target findings");
    check(output.includes("orphan") && output.includes("near-orphan") && output.includes("weak declared money page"), "Analyzer must explain orphan, near-orphan, and weak declared money-page findings");
    check(output.includes("heuristic internal authority") && output.includes("damping 0.85") && output.includes("maximum 20"), "Analyzer must label authority and record damping/iteration bounds");
    check(output.includes("\\|") && output.includes("&lt;script&gt;") && !output.includes("<script>"), "Analyzer must flatten/escape hostile Markdown and HTML values");
    check(output.includes("'=SUM") && output.includes("'-duplicate") && output.includes("'+nav") && output.includes("'@body"), "Analyzer must neutralize all spreadsheet formula prefixes");
    check(output.includes("!\\[pixel\\]\\(https://outside.test/pixel\\)") && output.includes("\\[link\\]\\(https://outside.test/\\)") && !output.includes("![pixel]("), "Analyzer must flatten lone CR and neutralize Markdown image/link payloads");

    const { siteOrigins, ...derivedScopeFixture } = graphFixture;
    writeFileSync(derivedScopePath, JSON.stringify(derivedScopeFixture));
    const derivedScope = spawnCapture(process.execPath, [analyzer, "--input", derivedScopePath]);
    check(derivedScope.status === 0 && derivedScope.stdout.includes("excluded; external") && derivedScope.stdout.match(/broken target:/g)?.length === 1, "Absent siteOrigins[] must derive internal scope from pages[] origins");

    writeFileSync(incompletePath, JSON.stringify({ ...graphFixture, coverage: { complete: false, note: "Dynamic routes unsupported." } }));
    const incomplete = spawnCapture(process.execPath, [analyzer, "--input", incompletePath]);
    check(incomplete.status === 0 && incomplete.stdout.includes("Orphan result: insufficient input coverage") && !incomplete.stdout.includes("| orphan |"), "Incomplete coverage must return insufficient input coverage without false orphan findings");

    writeFileSync(overLimitPath, JSON.stringify({ coverage: { complete: true, note: "" }, pages: Array(50_001).fill(null), links: [] }));
    const overLimit = spawnCapture(process.execPath, [analyzer, "--input", overLimitPath]);
    check(overLimit.status !== 0 && overLimit.stderr.includes("pages[] exceeds the 50000-record limit") && overLimit.stderr.includes("split or narrow"), "Over-limit analyzer input must fail with the bound and an actionable remedy");

    writeFileSync(byteLimitPath, "x".repeat(5_000_001));
    const byteLimit = spawnCapture(process.execPath, [analyzer, "--input", byteLimitPath]);
    check(byteLimit.status !== 0 && byteLimit.stderr.includes("5000001 bytes") && byteLimit.stderr.includes("5000000-byte limit"), "Analyzer must reject an oversized file from metadata before parsing or full-file allocation");

    const source = readFileSync(analyzer, "utf-8");
    check(!/\bfetch\s*\(|node:child_process|from\s+["'](?!node:)|\breaddir|\bopendir|\bglob\b|\bwalk\s*\(/.test(source), "Analyzer source must contain no fetch, child process, external dependencies, or filesystem traversal");
    check(/^import \{ readFile, stat \} from "node:fs\/promises";/m.test(source), "Analyzer may inspect and read only its explicitly named input file");
    check(source.indexOf("const file = await stat(inputPath)") < source.indexOf("const bytes = await readFile(inputPath)"), "Analyzer must enforce the byte limit before reading the full input file");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- gsc-opportunities.mjs: report format + golden file ---
section("gsc-opportunities report", () => {
  const report = runScript("scripts/gsc-opportunities.mjs", [
    "--input",
    fixture("gsc-sample.json"),
    "--brand",
    "examplebrand",
  ]);
  check(report.includes("## Page 2 goldmine"), "Report missing page-2 section");
  check(
    report.includes("## CTR underperformers (position-banded)"),
    "Report missing banded CTR section",
  );
  check(
    report.includes("## Query cannibalization"),
    "Report missing cannibalization section",
  );
  check(
    report.includes("seo automation"),
    "Report missing expected page-2 query",
  );
  check(report.includes("content seo"), "Report missing expected CTR query");
  check(
    report.includes("Branded queries excluded from CTR analysis: 1"),
    "Report should count excluded branded queries",
  );
  check(
    !report.includes("examplebrand pricing"),
    "Branded query should be excluded from CTR analysis",
  );
  check(
    report.includes("seo reporting \\| dashboards"),
    "Pipe characters in queries must be escaped in table cells",
  );
  check(
    report.includes("keyword tracker"),
    "Report missing expected cannibalization query",
  );

  const expected = readFileSync(
    fixture("gsc-opportunities.expected.md"),
    "utf-8",
  );
  check(
    normalizeTimestamps(report) === expected,
    "gsc-opportunities report drifted from fixtures/gsc-opportunities.expected.md (regenerate deliberately if the change is intended)",
  );
});

// --- gsc-opportunities.mjs: backlog format ---
section("gsc-opportunities backlog", () => {
  const backlog = runScript("scripts/gsc-opportunities.mjs", [
    "--input",
    fixture("gsc-sample.json"),
    "--format",
    "backlog",
    "--start-id",
    "40",
    "--brand",
    "examplebrand",
  ]);
  check(
    backlog.includes("| ID | P | Area | Ticket | Verify |"),
    "Backlog format missing Ready-row table header",
  );
  check(backlog.includes("SEO-040"), "Backlog format should honor --start-id");
  check(
    backlog.includes("seo reporting \\| dashboards"),
    "Backlog format must escape pipe characters in queries",
  );
  check(
    backlog.includes("draft backlog"),
    "Backlog format should be framed as a review draft",
  );
});

// --- gsc-opportunities.mjs: malformed JSON names the file ---
section("malformed JSON error", () => {
  const badJson = path.join(fixtureTmp("seo-bad-"), "bad.json");
  try {
    writeFileSync(badJson, "{ not json");
    const result = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/gsc-opportunities.mjs"),
        "--input",
        badJson,
      ],
      { encoding: "utf-8" },
    );
    check(result.status !== 0, "Malformed JSON input should exit non-zero");
    check(
      (result.stderr ?? "").includes("bad.json"),
      "JSON parse errors must name the offending file",
    );
  } finally {
    rmSync(path.dirname(badJson), { recursive: true, force: true });
  }
});

// --- gsc-fetch.mjs / gsc-oauth.mjs help contracts ---
section("gsc-fetch help", () => {
  const help = runScript("scripts/gsc-fetch.mjs", ["--help"]);
  check(
    help.includes("GSC_ACCESS_TOKEN"),
    "GSC fetch help should document token auth",
  );
  check(
    help.includes("--max-rows"),
    "GSC fetch help should document pagination cap",
  );
});

section("gsc-oauth help and auth URL", () => {
  const help = runScript("scripts/gsc-oauth.mjs", ["--help"]);
  check(
    help.includes("--print-auth-url"),
    "GSC OAuth help should document auth URL generation",
  );
  check(
    !help.includes("--client-secret"),
    "GSC OAuth must not advertise a --client-secret flag (env var only)",
  );
  check(
    help.includes("GSC_CLIENT_SECRET"),
    "GSC OAuth help should require the GSC_CLIENT_SECRET env var",
  );

  const authUrl = runScript("scripts/gsc-oauth.mjs", [
    "--client-id",
    "demo-client-id",
    "--print-auth-url",
  ]);
  check(
    authUrl.includes("webmasters.readonly"),
    "GSC OAuth URL should request read-only Search Console scope",
  );
});

// --- monthly-report.mjs ---
section("monthly report", () => {
  const report = runScript("scripts/monthly-report.mjs", [
    "--target",
    "Demo SaaS",
    "--date-range",
    "2026-04-01 to 2026-04-30",
    "--comparison-range",
    "2026-03-01 to 2026-03-31",
    "--gsc-current",
    fixture("gsc-sample.json"),
    "--gsc-previous",
    fixture("gsc-previous-sample.json"),
    "--backlog",
    fixture("backlog-sample.md"),
    "--keyword-tiers",
    fixture("monthly-keyword-tiers-sample.json"),
    "--calendar",
    fixture("monthly-calendar-sample.json"),
  ]);
  check(
    report.includes("## Query/page movers"),
    "Monthly report missing movers section",
  );
  check(
    report.includes("Keyword tiers"),
    "Monthly report missing keyword tier metric",
  );
  check(
    report.includes("Content calendar"),
    "Monthly report missing content calendar metric",
  );
  check(
    report.includes("Single next action"),
    "Monthly report missing next action",
  );
  check(
    report.includes("legacy feature guide") && report.includes("| lost |"),
    "Movers table must surface disappeared queries",
  );
  check(
    report.includes("1 Done this period"),
    "Backlog Done count should be filtered to the reporting period",
  );
  check(
    report.includes("seo reporting \\| dashboards"),
    "Monthly report must escape pipe characters in table cells",
  );
  check(
    /GSC CTR \|[^|]+\|[^|]+\| [+-]\d/.test(report),
    "CTR delta should carry a +/- sign",
  );
});

// --- monthly-report.mjs: branded-query exclusion + --allow-missing-gsc ---
section("monthly report branded query", () => {
  const args = [
    "--target",
    "Branded SaaS",
    "--date-range",
    "2026-04-01 to 2026-04-30",
    "--comparison-range",
    "2026-03-01 to 2026-03-31",
    "--gsc-current",
    fixture("gsc-branded-sample.json"),
    "--gsc-previous",
    fixture("gsc-branded-sample.json"),
    "--backlog",
    fixture("backlog-sample.md"),
  ];

  const withoutBrand = runScript("scripts/monthly-report.mjs", args);
  check(
    withoutBrand.includes("examplebrand pricing has high impressions but low CTR"),
    "Without --brand, the branded low-CTR query should surface as a problem (baseline)",
  );

  const withBrand = runScript("scripts/monthly-report.mjs", [
    ...args,
    "--brand",
    "examplebrand",
  ]);
  const problemsBlock = withBrand.slice(
    withBrand.indexOf("### 3 problems"),
    withBrand.indexOf("### Single next action"),
  );
  check(
    !problemsBlock.includes("examplebrand"),
    "With --brand, the branded query must not appear in problem selection",
  );
  check(
    !withBrand.includes(
      "Rewrite the title/meta for the highest-impression low-CTR query",
    ),
    "With --brand, the Single Next Action must not target the branded low-CTR query",
  );
  check(
    withBrand.includes("| GSC impressions | 5500 |"),
    "Branded rows must still count toward topline impressions totals",
  );
});

section("monthly report allow-missing-gsc", () => {
  const partial = runScript("scripts/monthly-report.mjs", [
    "--target",
    "Cold Start",
    "--date-range",
    "2026-04-01 to 2026-04-30",
    "--comparison-range",
    "2026-03-01 to 2026-03-31",
    "--allow-missing-gsc",
  ]);
  check(
    partial.includes("partial — GSC exports unavailable"),
    "--allow-missing-gsc must mark the report partial",
  );

  const missing = spawnSync(
    process.execPath,
    [
      path.join(skillRoot, "scripts/monthly-report.mjs"),
      "--target",
      "Cold Start",
      "--date-range",
      "2026-04-01 to 2026-04-30",
      "--comparison-range",
      "2026-03-01 to 2026-03-31",
    ],
    { encoding: "utf-8" },
  );
  check(
    missing.status !== 0,
    "Without --allow-missing-gsc, missing GSC exports must exit non-zero",
  );
});

// --- gsc-fetch.mjs: --credentials-dir parsing ---
section("gsc-fetch credentials-dir", () => {
  const credsDir = fixtureTmp("seo-creds-");
  try {
    writeFileSync(
      path.join(credsDir, "client_secret.json"),
      JSON.stringify({
        installed: { client_id: "dummy.apps.googleusercontent.com", client_secret: "dummy" },
      }),
    );
    writeFileSync(
      path.join(credsDir, "token.json"),
      JSON.stringify({ refresh_token: "dummy-refresh-token", type: "authorized_user" }),
    );
    const parsed = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/gsc-fetch.mjs"),
        "--credentials-dir",
        credsDir,
        "--site",
        "sc-domain:example.com",
        "--start",
        "2026-01-01",
        "--end",
        "2026-03-31",
      ],
      { encoding: "utf-8" },
    );
    // Dummy credentials must pass local shape parsing and reach the token exchange:
    // either Google returns an OAuth response or the sandbox blocks that same fetch at the network layer.
    const parsedStderr = parsed.stderr ?? "";
    check(
      parsed.status !== 0 &&
        !parsedStderr.includes("must contain an installed or web OAuth client") &&
        (/GSC OAuth refresh failed/.test(parsedStderr) || /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|getaddrinfo/.test(parsedStderr)),
      "--credentials-dir should parse {client_secret.json, token.json} and reach the token exchange",
    );

    const badDir = fixtureTmp("seo-creds-bad-");
    writeFileSync(
      path.join(badDir, "client_secret.json"),
      JSON.stringify({ installed: { client_id: "x", client_secret: "y" } }),
    );
    writeFileSync(path.join(badDir, "token.json"), JSON.stringify({ no_token: true }));
    const badResult = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/gsc-fetch.mjs"),
        "--credentials-dir",
        badDir,
        "--site",
        "sc-domain:example.com",
        "--start",
        "2026-01-01",
        "--end",
        "2026-03-31",
      ],
      { encoding: "utf-8" },
    );
    check(
      (badResult.stderr ?? "").includes("token.json (with refresh_token)"),
      "A credentials dir missing token.json.refresh_token should name the requirement",
    );
    rmSync(badDir, { recursive: true, force: true });
  } finally {
    rmSync(credsDir, { recursive: true, force: true });
  }
});

// --- export-clean-skill.mjs (dev sibling) ---
section("clean export", () => {
  const exporter = path.join(scriptDir, "export-clean-skill.mjs");
  const exportTarget = fixtureTmp("seo-export-");
  try {
    const dryRun = run(process.execPath, [
      exporter,
      "--target",
      exportTarget,
      "--dry-run",
    ]);
    check(
      dryRun.includes('"dryRun": true'),
      "Exporter dry-run should report dryRun true",
    );
    const installedSkill = path.join(
      exportTarget,
      ".agents/skills/seo-growth-workspace",
    );
    check(
      !existsSync(path.join(installedSkill, "SKILL.md")),
      "Exporter dry-run should not install files",
    );

    run(process.execPath, [exporter, "--target", exportTarget]);
    check(
      existsSync(path.join(installedSkill, "SKILL.md")),
      "Clean export did not install SKILL.md",
    );
    check(
      existsSync(path.join(installedSkill, "scripts/gsc-opportunities.mjs")),
      "Clean export should install skill scripts",
    );
    check(
      !existsSync(path.join(installedSkill, "fixtures")),
      "Clean export must not install fixtures",
    );
    check(
      !existsSync(path.join(installedSkill, "scripts/validate-skill.mjs")) &&
        !existsSync(path.join(installedSkill, "scripts/evaluate-release.mjs")),
      "Clean export must not install release/dev tooling",
    );
  } finally {
    rmSync(exportTarget, { recursive: true, force: true });
  }
});

// --- portfolio-status.mjs: registry parse + ranking + escaping ---
section("portfolio status", () => {
  const help = runScript("scripts/portfolio-status.mjs", ["--help"]);
  check(
    help.includes("--registry"),
    "portfolio-status help should document --registry",
  );

  const portfolioRoot = fixtureTmp("seo-portfolio-");
  try {
    // Stale site: old log date + a P0 Ready ticket whose title contains a pipe.
    const staleSeo = path.join(portfolioRoot, "stale", ".seo");
    const freshSeo = path.join(portfolioRoot, "fresh", ".seo");
    for (const dir of [
      path.join(staleSeo, "reports"),
      path.join(freshSeo, "reports"),
    ]) {
      run("mkdir", ["-p", dir]);
    }

    writeFileSync(
      path.join(staleSeo, "log.md"),
      "# SEO operating log\n\n## 2020-01-01 - Old handoff\n\n- Mode: operate.\n",
    );
    writeFileSync(
      path.join(staleSeo, "backlog.md"),
      [
        "# SEO backlog",
        "",
        "## Ready",
        "",
        "| ID | P | Area | Ticket | Verify |",
        "| --- | --- | --- | --- | --- |",
        "| SEO-001 | P0 | indexability | Fix robots \\| sitemap block | robots.txt 200 |",
        "| SEO-002 | P3 | content | Blog cluster | calendar exists |",
        "",
        "## In progress",
        "",
        "| ID | Started | Notes |",
        "| --- | --- | --- |",
        "",
        "## Blocked",
        "",
        "| ID | Blocker | Since |",
        "| --- | --- | --- |",
        "",
        "## Done",
        "",
        "| ID | Completed | Verify |",
        "| --- | --- | --- |",
        "",
      ].join("\n"),
    );

    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(
      path.join(freshSeo, "log.md"),
      `# SEO operating log\n\n## ${today} - Fresh handoff\n\n- Mode: operate.\n`,
    );
    writeFileSync(
      path.join(freshSeo, "backlog.md"),
      [
        "# SEO backlog",
        "",
        "## Ready",
        "",
        "| ID | P | Area | Ticket | Verify |",
        "| --- | --- | --- | --- | --- |",
        "",
        "## In progress",
        "",
        "| ID | Started | Notes |",
        "| --- | --- | --- |",
        "",
        "## Blocked",
        "",
        "| ID | Blocker | Since |",
        "| --- | --- | --- |",
        "",
        "## Done",
        "",
        "| ID | Completed | Verify |",
        "| --- | --- | --- |",
        "",
      ].join("\n"),
    );

    const registryPath = path.join(portfolioRoot, "registry.md");
    writeFileSync(
      registryPath,
      [
        "# Portfolio Registry",
        "",
        "| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        `| stale.example | \`${path.join(portfolioRoot, "stale")}\` | sc-domain:stale.example | none yet | UK / en-GB | human approves | — |`,
        `| fresh.example | frontend \`${path.join(portfolioRoot, "fresh")}\` (blog in a CMS) | sc-domain:fresh.example | none yet | UK / en-GB | human approves | — |`,
        `| gone.example | ${path.join(portfolioRoot, "missing")} | unknown | unknown | UK / en-GB | unknown | — |`,
        "",
      ].join("\n"),
    );

    const report = runScript("scripts/portfolio-status.mjs", [
      "--registry",
      registryPath,
    ]);

    check(
      report.includes("Fix robots \\| sitemap block"),
      "portfolio-status must escape pipe characters in ticket titles",
    );
    check(
      report.includes("no workspace"),
      "portfolio-status must flag a missing workspace",
    );

    const idxMissing = report.indexOf("gone.example");
    const idxStale = report.indexOf("stale.example");
    const idxFresh = report.indexOf("fresh.example");
    check(
      idxMissing !== -1 && idxStale !== -1 && idxFresh !== -1,
      "portfolio-status must list every registry row",
    );
    check(
      idxMissing < idxStale,
      "Missing workspaces must rank before present ones",
    );
    check(
      idxStale < idxFresh,
      "A stale workspace with an open P0 must rank above a fresh one",
    );

    const json = runScript("scripts/portfolio-status.mjs", [
      "--registry",
      registryPath,
      "--format",
      "json",
    ]);
    const parsed = JSON.parse(json);
    check(
      parsed.sites?.[0]?.site === "gone.example" &&
        parsed.sites?.[0]?.missing === true,
      "portfolio-status json output must rank the missing workspace first",
    );
    check(
      parsed.sites?.[1]?.site === "stale.example" &&
        parsed.sites?.[1]?.openP0P1 === 1,
      "portfolio-status json must report the stale workspace's open P0/P1 count",
    );
  } finally {
    rmSync(portfolioRoot, { recursive: true, force: true });
  }
});

// --- portfolio-status.mjs: hub layout (registry-relative roots + site-folder workspaces) ---
section("portfolio status hub layout", () => {
  const hubRoot = fixtureTmp("seo-hub-status-");
  const legacyRoot = fixtureTmp("seo-legacy-");
  try {
    plannedBootstrap(hubRoot, { domain: "acme.com", hub: true, site: "acme-com" });
    writeFileSync(
      path.join(hubRoot, ".seo/sites/acme-com/log.md"),
      "# SEO operating log\n\n## 2026-01-01 - Handoff\n\n- Mode: operate.\n",
      { flag: "w" },
    );
    // Legacy standalone workspace: .seo/ with no config.json.
    run("mkdir", ["-p", path.join(legacyRoot, ".seo")]);
    writeFileSync(
      path.join(legacyRoot, ".seo/log.md"),
      "# SEO operating log\n\n## 2026-01-01 - Handoff\n\n- Mode: operate.\n",
    );

    const registryPath = path.join(hubRoot, ".seo/registry.md");
    writeFileSync(
      registryPath,
      [
        "# Portfolio Registry",
        "",
        "| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| acme.com | sites/acme-com | unknown | unknown | unknown | unknown | hub-managed |",
        `| legacy.example | ${legacyRoot} | unknown | unknown | unknown | unknown | standalone repo |`,
        "",
      ].join("\n"),
    );

    // Run from a cwd that is NOT the hub to prove registry-relative resolution.
    const json = run(
      process.execPath,
      [
        path.join(skillRoot, "scripts/portfolio-status.mjs"),
        "--registry",
        registryPath,
        "--format",
        "json",
      ],
      { cwd: tmpdir() },
    );
    const parsed = JSON.parse(json);
    const bySite = Object.fromEntries(parsed.sites.map((s) => [s.site, s]));
    check(
      bySite["acme.com"]?.missing === false,
      "A hub-relative sites/<slug> row must resolve against the registry directory",
    );
    check(
      bySite["legacy.example"]?.missing === false,
      "An absolute standalone root (.seo/ without config.json) must still resolve",
    );
  } finally {
    rmSync(hubRoot, { recursive: true, force: true });
    rmSync(legacyRoot, { recursive: true, force: true });
  }
});

// --- evaluate-release.mjs: blocking-gate report consumption (explicit --validator-report) ---
section("release evaluator blocking gates rehearsal", () => {
  const evaluator = path.join(scriptDir, "evaluate-release.mjs");
  const rehearsalDir = fixtureTmp("seo-evaluator-gates-");
  // Same extraction the evaluator performs over this file: synthetic reports must
  // attest the full canonical section inventory or the evaluator rejects them.
  const sectionInventory = [
    ...readFileSync(fileURLToPath(import.meta.url), "utf-8").matchAll(/^section\(\s*"([^"]+)"/gm),
  ].map((match) => match[1]);
  const inventorySections = (overrides = {}) =>
    sectionInventory.map((name) => ({
      name,
      result: overrides[name] ?? "PASS",
      failures: overrides[name] ? ["rehearsed failure"] : [],
    }));
  const baseReport = {
    reportVersion: 1,
    skill: "seo-growth-workspace",
    generatedAt: new Date().toISOString(),
    sourceDigest: treeDigest(skillRoot),
    toolingDigest: devToolingDigest(),
    pass: true,
    sections: inventorySections(),
    commandInventory: {
      command: "node dev/seo-growth-workspace/command-inventory.mjs --verify",
      exit: 0,
      result: "PASS",
    },
  };
  const runEvaluator = (name, report) => {
    const reportPath = path.join(rehearsalDir, `${name}.json`);
    if (report !== null) {
      writeFileSync(reportPath, typeof report === "string" ? report : JSON.stringify(report, null, 2));
    }
    const result = spawnCapture(process.execPath, [evaluator, "--json", "--validator-report", reportPath]);
    return { status: result.status, json: JSON.parse(result.stdout || "{}") };
  };

  const valid = runEvaluator("valid", baseReport);
  check(
    valid.json.blockingGates?.rejections?.length === 0 &&
      valid.json.blockingGates?.gates?.length === 2 &&
      valid.json.blockingGates.gates.every((gate) => gate.result === "PASS") &&
      valid.json.gates?.blockingGatesGreen === true,
    "A fresh, digest-matching, all-PASS validator report must satisfy both blocking gates",
  );

  const redSection = runEvaluator("red-section", {
    ...baseReport,
    pass: false,
    sections: inventorySections({ "version consistency": "FAIL" }),
  });
  check(
    redSection.status !== 0 &&
      redSection.json.pass === false &&
      redSection.json.blockingGates?.gates?.some(
        (gate) => gate.gate === "validate-skill" && gate.result === "FAIL" && (gate.failedSections ?? []).includes("version consistency"),
      ),
    "A red validator report must fail the evaluator and name the failing gate",
  );

  const redInventory = runEvaluator("red-inventory", {
    ...baseReport,
    pass: false,
    sections: inventorySections({ "command inventory and foreign-CWD matrix": "FAIL" }),
    commandInventory: { ...baseReport.commandInventory, exit: 1, result: "FAIL" },
  });
  check(
    redInventory.json.pass === false &&
      redInventory.json.blockingGates?.gates?.some((gate) => gate.gate === "command-inventory" && gate.result === "FAIL"),
    "A failing command-inventory subgate must fail the evaluator",
  );

  const stale = runEvaluator("stale", {
    ...baseReport,
    generatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  });
  check(
    stale.json.pass === false && stale.json.blockingGates?.rejections?.some((reason) => reason.includes("stale")),
    "A stale validator report must be rejected",
  );

  const wrongDigest = runEvaluator("wrong-digest", { ...baseReport, sourceDigest: "0".repeat(64) });
  check(
    wrongDigest.json.pass === false && wrongDigest.json.blockingGates?.rejections?.some((reason) => reason.includes("digest")),
    "A wrong-digest validator report must be rejected",
  );

  const wrongToolingDigest = runEvaluator("wrong-tooling-digest", { ...baseReport, toolingDigest: "0".repeat(64) });
  check(
    wrongToolingDigest.json.pass === false &&
      wrongToolingDigest.json.blockingGates?.rejections?.some((reason) => reason.includes("tooling")),
    "A report from a different validator/inventory implementation must be rejected",
  );

  const duplicate = runEvaluator("duplicate", {
    ...baseReport,
    sections: [...baseReport.sections, ...baseReport.sections],
  });
  check(
    duplicate.json.pass === false && duplicate.json.blockingGates?.rejections?.some((reason) => reason.includes("duplicate")),
    "Duplicate section entries in a validator report must be rejected",
  );

  const malformed = runEvaluator("malformed", "{ not json");
  check(
    malformed.json.pass === false && malformed.json.blockingGates?.rejections?.some((reason) => reason.includes("malformed")),
    "A malformed validator report must be rejected",
  );

  const nullSection = runEvaluator("null-section", { ...baseReport, sections: [null, ...inventorySections()] });
  check(
    nullSection.json.pass === false &&
      nullSection.json.blockingGates?.rejections?.some((reason) => reason.includes("malformed")),
    "A report with non-object section entries must be rejected, not crash the evaluator",
  );

  const missing = runEvaluator("missing", null);
  check(
    missing.json.pass === false && missing.json.blockingGates?.rejections?.some((reason) => reason.includes("missing")),
    "A missing validator report must be rejected",
  );

  const incomplete = runEvaluator("incomplete", {
    ...baseReport,
    sections: inventorySections().slice(0, 1),
  });
  check(
    incomplete.json.pass === false &&
      incomplete.json.blockingGates?.rejections?.some((reason) => reason.includes("section inventory mismatch")),
    "A report missing the validator's canonical section inventory must be rejected",
  );

  const passExitMismatch = runEvaluator("pass-exit-mismatch", {
    ...baseReport,
    commandInventory: { ...baseReport.commandInventory, exit: 1 },
  });
  check(
    passExitMismatch.json.pass === false &&
      passExitMismatch.json.blockingGates?.rejections?.some((reason) => reason.includes("PASS with exit")),
    "A commandInventory PASS with a non-zero exit must be rejected",
  );

  const editedSubgate = runEvaluator("edited-subgate", {
    ...baseReport,
    pass: false,
    sections: inventorySections({ "command inventory and foreign-CWD matrix": "FAIL" }),
  });
  check(
    editedSubgate.json.pass === false &&
      editedSubgate.json.blockingGates?.rejections?.some((reason) => reason.includes("disagrees with its section result")),
    "A commandInventory result that disagrees with its section result must be rejected",
  );
});

// --- evaluate-release.mjs: canonical gate-results artifact consumption ---
//
// The single automated seam for the slice-7 gate-results artifact. Feeds the
// evaluator a synthetic validator report (via --validator-report, so it does not
// self-execute) plus a synthetic gate-results file (via --gate-results), then proves
// the evaluator imports the deterministic (a)-rows bound to that report by digest,
// reads the manual (b)-rows, and REJECTS a missing, stale, wrong-digest, duplicate,
// malformed, non-PASS, or incomplete artifact.
//
// reportVersion coupling: if the validator report schema (reportVersion) changes, bump
// it in the writer below, in evaluate-release.mjs (VALIDATOR_REPORT_VERSION), and
// update this section together — the base synthetic pair here restates reportVersion 1.
section("release evaluator gate-results artifact consumption", () => {
  const evaluator = path.join(scriptDir, "evaluate-release.mjs");
  const evaluatorSource = readFileSync(evaluator, "utf-8");
  const rehearsalDir = fixtureTmp("seo-gate-results-");
  const digest = treeDigest(skillRoot);
  const tooling = devToolingDigest();
  const sectionInventory = [
    ...readFileSync(fileURLToPath(import.meta.url), "utf-8").matchAll(/^section\(\s*"([^"]+)"/gm),
  ].map((match) => match[1]);
  // Single source of truth: the required manual gate IDs live in evaluate-release.mjs.
  const requiredManualGates = [
    ...evaluatorSource.matchAll(/^\s*"(b\d\d-[a-z0-9-]+)",\s*$/gm),
  ].map((match) => match[1]);
  check(requiredManualGates.length === 17, `Expected 17 required manual gate IDs in evaluate-release.mjs, found ${requiredManualGates.length}`);

  const baseReport = {
    reportVersion: 1,
    skill: "seo-growth-workspace",
    generatedAt: new Date().toISOString(),
    sourceDigest: digest,
    toolingDigest: tooling,
    pass: true,
    sections: sectionInventory.map((name) => ({ name, result: "PASS", failures: [] })),
    commandInventory: {
      command: "node dev/seo-growth-workspace/command-inventory.mjs --verify",
      exit: 0,
      result: "PASS",
    },
  };
  const baseGateResults = () => ({
    artifact: "seo-growth-workspace gate results",
    gateResultsVersion: 1,
    boundReportVersion: 1,
    skill: "seo-growth-workspace",
    skillVersion: "4.0.0",
    generatedAt: new Date().toISOString(),
    operator: "matias/opus-4.8",
    sourceDigest: digest,
    toolingDigest: tooling,
    deterministic: {
      rows: sectionInventory.map((name) => ({ scenario: name, kind: "a", result: "PASS", sourceDigest: digest })),
    },
    manual: requiredManualGates.map((id) => ({
      id,
      kind: "b",
      scenario: id,
      result: "PASS",
      evidence: "rehearsal-fixture",
      date: "2026-07-11",
      operator: "matias/opus-4.8",
      sourceDigest: digest,
    })),
  });

  const reportPathFor = (name) => {
    const p = path.join(rehearsalDir, `${name}.report.json`);
    writeFileSync(p, JSON.stringify(baseReport, null, 2));
    return p;
  };
  const runEval = (name, gateResults) => {
    const gr = path.join(rehearsalDir, `${name}.gate-results.json`);
    if (gateResults !== null) {
      writeFileSync(gr, typeof gateResults === "string" ? gateResults : JSON.stringify(gateResults, null, 2));
    }
    const result = spawnCapture(process.execPath, [
      evaluator, "--json",
      "--validator-report", reportPathFor(name),
      "--gate-results", gr,
    ]);
    return { status: result.status, json: JSON.parse(result.stdout || "{}") };
  };
  const rejectsWith = (name, mutate, needle) => {
    const gr = baseGateResults();
    mutate(gr);
    const out = runEval(name, gr);
    check(
      out.json.gateResults?.pass === false &&
        (out.json.gateResults?.rejections ?? []).some((reason) => reason.includes(needle)),
      `Gate-results rejection "${needle}" must fire for case ${name}`,
    );
  };

  // A fresh, digest-bound, complete, all-PASS artifact satisfies the gate.
  const valid = runEval("valid", baseGateResults());
  check(
    valid.json.gateResults?.pass === true &&
      valid.json.gateResults?.rejections?.length === 0 &&
      valid.json.gateResults?.deterministicRows === sectionInventory.length &&
      valid.json.gateResults?.manualRows === 17 &&
      valid.json.gates?.gateResultsGreen === true,
    "A fresh digest-bound all-PASS gate-results artifact must satisfy the release",
  );

  // Missing / malformed.
  check(
    (() => {
      const out = runEval("missing", null);
      return out.json.gateResults?.pass === false && out.json.gateResults?.rejections?.some((r) => r.includes("missing gate-results artifact"));
    })(),
    "A missing gate-results artifact must be rejected",
  );
  check(
    (() => {
      const out = runEval("malformed", "{ not json");
      return out.json.gateResults?.pass === false && out.json.gateResults?.rejections?.some((r) => r.includes("malformed"));
    })(),
    "A malformed gate-results artifact must be rejected",
  );

  // Version coupling.
  rejectsWith("bad-artifact-version", (gr) => { gr.gateResultsVersion = 99; }, "unsupported gateResultsVersion");
  rejectsWith("bad-report-coupling", (gr) => { gr.boundReportVersion = 2; }, "boundReportVersion");

  // Stale / wrong-digest at artifact and row level.
  rejectsWith("stale-artifact", (gr) => { gr.sourceDigest = "0".repeat(64); }, "stale gate-results artifact");
  rejectsWith("wrong-tooling", (gr) => { gr.toolingDigest = "0".repeat(64); }, "wrong-digest gate-results artifact");
  rejectsWith("stale-manual-row", (gr) => { gr.manual[0].sourceDigest = "0".repeat(64); }, "stale gate-results manual row");
  rejectsWith("stale-deterministic-row", (gr) => { gr.deterministic.rows[0].sourceDigest = "0".repeat(64); }, "stale gate-results deterministic row");

  // Import binding: deterministic rows must reproduce the validator report exactly.
  rejectsWith("omit-section", (gr) => { gr.deterministic.rows.pop(); }, "omit validator section");
  rejectsWith("unknown-section", (gr) => { gr.deterministic.rows.push({ scenario: "not-a-real-section", kind: "a", result: "PASS", sourceDigest: digest }); }, "not in validator report");
  rejectsWith("duplicate-deterministic", (gr) => { gr.deterministic.rows.push({ ...gr.deterministic.rows[0] }); }, "duplicate gate-results deterministic row");
  rejectsWith("non-pass-deterministic", (gr) => { gr.deterministic.rows[0].result = "FAIL"; }, "non-PASS gate-results deterministic row");

  // Manual completeness, duplicates, non-PASS, and shape.
  rejectsWith("missing-manual", (gr) => { gr.manual.shift(); }, "missing required gate-results manual gate");
  rejectsWith("duplicate-manual", (gr) => { gr.manual.push({ ...gr.manual[0] }); }, "duplicate gate-results manual row");
  rejectsWith("non-pass-manual", (gr) => { gr.manual[0].result = "blocked"; }, "non-PASS gate-results manual row");
  rejectsWith("malformed-manual", (gr) => { delete gr.manual[0].evidence; }, "malformed manual row");
});

const reportPath = argValue("--report");
if (reportPath) {
  commandInventorySubgate.result =
    sectionResults.find((entry) => entry.name === "command inventory and foreign-CWD matrix")?.result ?? "FAIL";
  const report = {
    reportVersion: 1,
    skill: "seo-growth-workspace",
    generatedAt: new Date().toISOString(),
    sourceDigest: treeDigest(skillRoot),
    toolingDigest: devToolingDigest(),
    pass: failures.length === 0,
    sections: sectionResults,
    commandInventory: commandInventorySubgate,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

rmSync(validationTmp, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`seo-growth-workspace skill validation FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("seo-growth-workspace skill validation passed");
