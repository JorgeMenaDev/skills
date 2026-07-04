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
 *
 * FAIL-SAFE: an absent section, an unknown key, or an unparseable value ⇒ that
 * flag falls back to its default (`verify: full`, `recap: on`). Parsing may only
 * reduce work below the default when the body explicitly and legibly says so.
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
};

const ALLOWED = {
  verify: new Set(["full", "slim", "off"]),
  recap: new Set(["on", "off"]),
};

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

/** Parse one flag key out of the section body. The value is a single word; an
 *  optional reason follows an em/en dash or hyphen separator. */
function parseFlag(key: "verify" | "recap", section: string): Flag {
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

const body = process.env.ISSUE_BODY ?? "";
const section = pipelineSection(body);
const verify = parseFlag("verify", section);
const recap = parseFlag("recap", section);

// --- machine outputs -------------------------------------------------------
if (process.env.GITHUB_OUTPUT) {
  const out = [
    `verify=${verify.value}`,
    `verify_status=${verify.status}`,
    `verify_reason=${verify.reason}`,
    `recap=${recap.value}`,
    `recap_status=${recap.status}`,
    `recap_reason=${recap.reason}`,
  ].join("\n");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, out + "\n");
}

// --- human echo (stdout) ---------------------------------------------------
function line(key: string, flag: Flag): string {
  let note: string;
  if (flag.status === "default") note = "_(default — no override in the brief)_";
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
    "",
    "_Defaults (`verify: full`, `recap: on`) keep today's full pipeline; retriggering re-reads this body._",
  ].join("\n")
);
