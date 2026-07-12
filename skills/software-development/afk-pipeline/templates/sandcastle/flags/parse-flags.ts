/**
 * Pipeline Flags parser (issue #20). Reads the triggering issue's body from the
 * `ISSUE_BODY` env var, parses the optional `### Pipeline` section, and emits
 * two things:
 *
 *   1. machine outputs to `$GITHUB_OUTPUT` (verify / recap + reasons + status)
 *      so the workflow can route the verify profile and gate the recap job;
 *   2. a human-readable Markdown echo to stdout so the workflow can post the
 *      parsed flag set on the in-progress issue comment — a misparse is then
 *      visible immediately, and retriggering re-reads the same body.
 *
 * Flag contract (canonical spec:
 * https://github.com/JorgeMenaDev/skills/blob/main/skills/software-development/afk-pipeline/reference/brief-template.md):
 *
 *   ### Pipeline
 *   verify: full|slim|off — optional reason
 *   recap:  on|off        — optional reason
 *   review: on|off        — optional reason
 *   recording: on|off     — optional reason
 *   engine: claude|codex|cursor|grok — optional reason
 *   review-engine: codex|claude — optional reason
 *   retries: 0–3         — optional reason (default 2; >3 clamps to 3)
 *
 * FAIL-SAFE: an absent section, an unknown key, or an unparseable value ⇒ that
 * flag falls back to its default (`verify: full`, `recap: on`, `review: on`, `recording: off`,
 * `engine: claude`, `review-engine: codex`, `retries: 2`). Parsing may only
 * reduce work below the default when the body explicitly and legibly says so.
 * `review-engine` defaults to codex unless `engine: codex` is set and
 * `review-engine` itself was not set; then it resolves to claude to keep the
 * implement/review engines cross-vendor. `engine: cursor` and `engine: grok`
 * are implement-only and follow the Claude default. Explicit old briefs carry
 * their `review-engine: codex` contract forward.
 *
 * When `verify: off`, the implement↔verify retry loop is inert — the echo notes
 * that `retries` does not apply for the run (the wrapper still enforces a
 * single attempt).
 *
 * Lives in the `.sandcastle` layer (not inline YAML) so it travels with the
 * pipeline to other repos. Uses only Node/Bun builtins — no `bun install`
 * needed before it runs.
 */
import * as fs from "node:fs";

const SPEC_URL =
  "https://github.com/JorgeMenaDev/skills/blob/main/skills/software-development/afk-pipeline/reference/brief-template.md";

type Status = "default" | "set" | "fallback";

interface Flag {
  value: string;
  reason: string;
  status: Status;
  raw: string; // the unparseable token, only when status === "fallback"
}

const DEFAULTS = {
  verify: { value: "full", reason: "", status: "default" as Status, raw: "" },
  recap: { value: "on", reason: "", status: "default" as Status, raw: "" },
  review: { value: "on", reason: "", status: "default" as Status, raw: "" },
  recording: { value: "off", reason: "", status: "default" as Status, raw: "" },
  engine: { value: "claude", reason: "", status: "default" as Status, raw: "" },
  "review-engine": {
    value: "codex",
    reason: "",
    status: "default" as Status,
    raw: "",
  },
  retries: { value: "2", reason: "", status: "default" as Status, raw: "" },
};

const ALLOWED = {
  verify: new Set(["full", "slim", "off"]),
  recap: new Set(["on", "off"]),
  review: new Set(["on", "off"]),
  recording: new Set(["on", "off"]),
  engine: new Set(["claude", "codex", "cursor", "grok"]),
  "review-engine": new Set(["codex", "claude"]),
};

type EnumFlagKey = Exclude<keyof typeof DEFAULTS, "retries">;

/** Extract the body of the `### Pipeline` section: lines after the heading up to
 *  the next Markdown heading (any level) or EOF. Returns "" when absent. */
function pipelineSection(body: string): string {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => /^\s*#{1,6}\s+pipeline\s*$/i.test(l));
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^\s*#{1,6}\s+/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/** Parse one enum flag key out of the section body. The value is a single word; an
 *  optional reason follows an em/en dash or hyphen separator. */
function parseFlag(key: EnumFlagKey, section: string): Flag {
  const re = new RegExp(
    `^\\s*${key}\\s*:\\s*([A-Za-z]+)\\s*(?:[—–-]\\s*(.*))?$`,
    "im"
  );
  const m = section.match(re);
  if (!m) return { ...DEFAULTS[key] };

  const value = m[1].toLowerCase();
  const reason = (m[2] ?? "").trim().replace(/\s+/g, " ");
  if (!ALLOWED[key].has(value)) {
    // Unknown value ⇒ fail safe to the default; record the raw token so the
    // echo makes the misparse obvious.
    return { ...DEFAULTS[key], status: "fallback", raw: m[1] };
  }
  return { value, reason, status: "set", raw: "" };
}

/**
 * Integer `retries:` — counts extra implement→…→verify cycles after the first.
 * Default 2; allowed 0–3; integers >3 clamp to 3 with a clamp note; absent or
 * non-integer fall back to 2 under the standard fail-safe contract.
 */
function parseRetries(section: string): Flag {
  const re = /^\s*retries\s*:\s*(\S+)\s*(?:[—–-]\s*(.*))?$/im;
  const m = section.match(re);
  if (!m) return { ...DEFAULTS.retries };

  const raw = m[1];
  const reason = (m[2] ?? "").trim().replace(/\s+/g, " ");
  if (!/^-?\d+$/.test(raw)) {
    return { ...DEFAULTS.retries, status: "fallback", raw };
  }
  const n = Number(raw);
  if (n < 0) {
    return { ...DEFAULTS.retries, status: "fallback", raw };
  }
  if (n > 3) {
    return {
      value: "3",
      reason: reason
        ? `${reason} (clamped from ${n} to 3)`
        : `clamped from ${n} to 3 (max allowed)`,
      status: "set",
      raw: "",
    };
  }
  return { value: String(n), reason, status: "set", raw: "" };
}

const body = process.env.ISSUE_BODY ?? "";
const section = pipelineSection(body);
const verify = parseFlag("verify", section);
const recap = parseFlag("recap", section);
const review = parseFlag("review", section);
const recording = parseFlag("recording", section);
const engine = parseFlag("engine", section);
const parsedReviewEngine = parseFlag("review-engine", section);
const reviewEngine =
  engine.value === "codex" && parsedReviewEngine.status === "default"
    ? { ...parsedReviewEngine, value: "claude", reason: "defaulted to claude because engine is codex" }
    : parsedReviewEngine;
const retries = parseRetries(section);

// When verify is off the retry loop has no behavioral signal — note that
// retries is inert for the run (wrapper also enforces maxAttempts=1).
if (verify.value === "off") {
  const inert = "inert for this run because verify: off (loop runs exactly one attempt)";
  if (retries.status === "default") {
    retries.reason = inert;
  } else if (retries.reason) {
    retries.reason = `${retries.reason}; ${inert}`;
  } else {
    retries.reason = inert;
  }
}

// --- machine outputs -------------------------------------------------------
if (process.env.GITHUB_OUTPUT) {
  const out = [
    `verify=${verify.value}`,
    `verify_status=${verify.status}`,
    `verify_reason=${verify.reason}`,
    `recap=${recap.value}`,
    `recap_status=${recap.status}`,
    `recap_reason=${recap.reason}`,
    `review=${review.value}`,
    `review_status=${review.status}`,
    `review_reason=${review.reason}`,
    `recording=${recording.value}`,
    `recording_status=${recording.status}`,
    `recording_reason=${recording.reason}`,
    `engine=${engine.value}`,
    `engine_status=${engine.status}`,
    `engine_reason=${engine.reason}`,
    `review_engine=${reviewEngine.value}`,
    `review_engine_status=${reviewEngine.status}`,
    `review_engine_reason=${reviewEngine.reason}`,
    `retries=${retries.value}`,
    `retries_status=${retries.status}`,
    `retries_reason=${retries.reason}`,
  ].join("\n");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, out + "\n");
}

// --- human echo (stdout) ---------------------------------------------------
function line(key: string, flag: Flag): string {
  let note: string;
  if (flag.status === "default")
    note = flag.reason
      ? `_(default — ${flag.reason})_`
      : "_(default — no override in the brief)_";
  else if (flag.status === "fallback")
    note = `_(fallback — couldn't parse \`${key}: ${flag.raw}\`, using the default)_`;
  else note = flag.reason ? `— ${flag.reason}` : "_(set)_";
  return `- **${key}:** \`${flag.value}\` ${note}`;
}

console.log(
  [
    "### 🚦 Pipeline Flags",
    "",
    `Parsed from the Agent Brief \`### Pipeline\` section ([flag contract](${SPEC_URL})):`,
    "",
    line("verify", verify),
    line("recap", recap),
    line("review", review),
    line("recording", recording),
    line("engine", engine),
    line("review-engine", reviewEngine),
    // Run-specific inert note (spec §2): under verify: off there is no
    // behavioral signal, so whatever retries parsed to, this run gets
    // exactly one attempt — say so on the line, not just in the boilerplate.
    verify.value === "off"
      ? `${line("retries", retries)} _(inert this run — \`verify: off\` means a single attempt)_`
      : line("retries", retries),
    "",
    "_Defaults (`verify: full`, `recap: on`, `review: on`, `recording: off`, `engine: claude`, `review-engine: codex`, `retries: 2`) keep today's full pipeline without recording and allow up to two retries on behavioral verify failure. `engine: cursor` / `engine: grok` run implement only, then Claude-backed structured phases continue. When `engine: codex` is set and `review-engine` is absent, review defaults to `claude`. `retries: 0` restores single-attempt behavior; `verify: off` makes retries inert. Retriggering re-reads this body._",
  ].join("\n")
);
