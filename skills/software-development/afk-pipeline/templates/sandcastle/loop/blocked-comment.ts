/**
 * Terminal-fail blocked comment renderer (spec §8.4).
 *
 * Builds the issue comment body from the PARSED attempts manifest — never by
 * shell-expanding agent text into a heredoc. YAML posts with --body-file.
 *
 * No-manifest fallback = today's reason-only shape (pre-loop / infra without
 * a loop-written summary).
 *
 * Smoke: AFK_BLOCKED_COMMENT_SIMULATE=1 or argv fixtures via env paths.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { neutralizeGists, neutralizeHostileText } from "./hostile-text";

// Generator-substituted at stamp time.
const EVIDENCE_DIR_STAMP = "{{EVIDENCE_DIR}}";

type GateInfo = {
  remainingSeconds: number;
  requiredSeconds: number;
  previousAttemptDurationSeconds: number;
};

type AttemptRow = {
  attempt: number;
  outcome: string;
  startSha: string | null;
  endSha: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  failedCriteria: string[];
  evidenceDir: string | null;
  gate: GateInfo | null;
};

type AttemptsManifest = {
  schemaVersion: number;
  issueNumber: number;
  maxAttempts: number;
  outcome: string;
  attempts: AttemptRow[];
};

function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function formatMinutesFromSeconds(sec: number): string {
  const m = Math.max(0, Math.round(sec / 60));
  return `${m}m`;
}

function executedAttempts(manifest: AttemptsManifest): AttemptRow[] {
  return manifest.attempts.filter((a) => a.outcome !== "skipped");
}

function terminalAttemptNumber(manifest: AttemptsManifest): number {
  const exec = executedAttempts(manifest);
  if (exec.length) return exec[exec.length - 1]!.attempt;
  const last = manifest.attempts[manifest.attempts.length - 1];
  return last?.attempt ?? 1;
}

/** Stopped: headline per spec §8.4 short form. */
export function buildStoppedHeadline(manifest: AttemptsManifest): string {
  const n = manifest.maxAttempts;
  const kExec = executedAttempts(manifest).length;
  const kTerm = terminalAttemptNumber(manifest);
  const outcome = manifest.outcome;

  switch (outcome) {
    case "budget-exhausted":
      return `Stopped: retry budget exhausted — ${kExec}/${n} attempts ran.`;
    case "deadline-gated": {
      const skipped = [...manifest.attempts].reverse().find((a) => a.outcome === "skipped" && a.gate);
      const rem = skipped?.gate?.remainingSeconds ?? 0;
      const req = skipped?.gate?.requiredSeconds ?? 0;
      return `Stopped: deadline gate — ${kExec}/${n} attempts ran; ${formatMinutesFromSeconds(rem)} remained, below the ${formatMinutesFromSeconds(req)} start threshold.`;
    }
    case "deadline-expired":
      return `Stopped: deadline expired during attempt ${kTerm}.`;
    case "no-progress":
      return `Stopped: no progress — implement pass ${kTerm} produced no commits.`;
    case "indeterminate":
      return `Stopped: indeterminate verify outcome on attempt ${kTerm} — not retryable.`;
    default:
      // infra-terminal and unknowns: still open with Stopped for consistency when we have a manifest
      return `Stopped: run failed (${outcome}) on attempt ${kTerm}.`;
  }
}

function formatAttemptRow(row: AttemptRow): string {
  if (row.outcome === "skipped" && row.gate) {
    const g = row.gate;
    return (
      `- **Attempt ${row.attempt}** · skipped · gate: ${formatMinutesFromSeconds(g.remainingSeconds)} remained, ` +
      `need ${formatMinutesFromSeconds(g.requiredSeconds)} ` +
      `(1.25× prev ${formatDuration(g.previousAttemptDurationSeconds)} + 5m)`
    );
  }

  const { gists, overflow } = neutralizeGists(row.failedCriteria ?? [], {
    maxItems: 5,
    maxLen: 160,
  });
  let criteriaPart = "";
  if (gists.length) {
    criteriaPart = " · " + gists.map((g) => `\`${g}\``).join("; ");
    if (overflow > 0) criteriaPart += ` · +${overflow} more`;
  }

  return (
    `- **Attempt ${row.attempt}** · ${row.outcome} · ${formatDuration(row.durationSeconds)}` +
    criteriaPart
  );
}

function pickEvidenceDir(manifest: AttemptsManifest): string | null {
  // Prefer the last executed attempt that recorded an evidenceDir
  const exec = executedAttempts(manifest);
  for (let i = exec.length - 1; i >= 0; i--) {
    const d = exec[i]!.evidenceDir;
    if (d) return d;
  }
  // Any row
  for (const a of manifest.attempts) {
    if (a.evidenceDir) return a.evidenceDir;
  }
  // Fallback canonical path from stamp + issue
  if (manifest.issueNumber) {
    const root = EVIDENCE_DIR_STAMP.includes("{{")
      ? env("EVIDENCE_DIR", "docs/evidence")
      : EVIDENCE_DIR_STAMP;
    return `${root}/issue-${manifest.issueNumber}`;
  }
  return null;
}

/**
 * Confirm evidence tree exists at salvage_sha. Prefer attempt-* dirs when present
 * on the salvaged tip; otherwise the issue evidence root.
 */
export function evidenceTreeExistsAtSha(
  sha: string,
  evidenceDir: string,
  cwd = process.cwd()
): boolean {
  if (!sha || !evidenceDir) return false;
  // Guard path traversal: evidenceDir must be repo-relative, no ..
  if (evidenceDir.includes("..") || path.isAbsolute(evidenceDir)) return false;
  try {
    // git ls-tree exits 0 even when the path is absent — require non-empty stdout.
    const out = execFileSync("git", ["ls-tree", "-d", "--name-only", sha, "--", evidenceDir], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (out) return true;

    // Also try parent issue dir if we pointed at attempt-K
    const parent = path.posix.dirname(evidenceDir.replace(/\\/g, "/"));
    if (parent && parent !== "." && parent !== evidenceDir) {
      const out2 = execFileSync("git", ["ls-tree", "-d", "--name-only", sha, "--", parent], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      return Boolean(out2);
    }
    return false;
  } catch {
    return false;
  }
}

export function buildEvidenceLine(opts: {
  salvageSha: string;
  evidenceDir: string | null;
  serverUrl: string;
  repository: string;
  cwd?: string;
}): string {
  const { salvageSha, evidenceDir, serverUrl, repository, cwd } = opts;
  if (
    salvageSha &&
    evidenceDir &&
    evidenceTreeExistsAtSha(salvageSha, evidenceDir, cwd)
  ) {
    const base = serverUrl.replace(/\/$/, "");
    const url = `${base}/${repository}/tree/${salvageSha}/${evidenceDir}`;
    return `**Evidence** (pinned to salvage commit \`${salvageSha}\`): ${url}`;
  }
  return "Evidence unavailable; inspect workflow logs.";
}

export function buildReasonOnlyBody(opts: {
  triggerLabel: string;
  reason: string;
  salvageNote: string;
  runUrl: string;
}): string {
  const reason = neutralizeHostileText(opts.reason, { maxLen: 2000 });
  const lines = [
    `\`${opts.triggerLabel}\` run failed.`,
    "",
    `**Reason:** ${reason}`,
    "",
  ];
  if (opts.salvageNote.trim()) {
    lines.push(opts.salvageNote.trim(), "");
  }
  lines.push(`**Workflow run:** ${opts.runUrl}`, "", `Re-add \`${opts.triggerLabel}\` to retry.`, "");
  return lines.join("\n");
}

export function buildBlockedCommentBody(opts: {
  manifest: AttemptsManifest | null;
  triggerLabel: string;
  reason: string;
  salvageNote: string;
  runUrl: string;
  salvageSha: string;
  serverUrl: string;
  repository: string;
  cwd?: string;
}): string {
  if (!opts.manifest) {
    return buildReasonOnlyBody(opts);
  }

  const m = opts.manifest;
  const headline = buildStoppedHeadline(m);
  const reason = neutralizeHostileText(opts.reason, { maxLen: 2000 });
  const rows = m.attempts.map(formatAttemptRow);
  const evidenceDir = pickEvidenceDir(m);
  const evidenceLine = buildEvidenceLine({
    salvageSha: opts.salvageSha,
    evidenceDir,
    serverUrl: opts.serverUrl,
    repository: opts.repository,
    cwd: opts.cwd,
  });

  const lines: string[] = [
    `\`${opts.triggerLabel}\` run failed.`,
    "",
    headline,
    "",
    `**Reason:** ${reason}`,
    "",
    "### Attempts",
    ...rows,
    "",
    evidenceLine,
    "",
  ];
  if (opts.salvageNote.trim()) {
    lines.push(opts.salvageNote.trim(), "");
  }
  lines.push(`**Workflow run:** ${opts.runUrl}`, "", `Re-add \`${opts.triggerLabel}\` to retry.`, "");
  return lines.join("\n");
}

function loadManifest(p: string): AttemptsManifest | null {
  if (!p || !fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!raw || typeof raw !== "object") return null;
    if (!Array.isArray(raw.attempts)) return null;
    return raw as AttemptsManifest;
  } catch {
    return null;
  }
}

function readReason(reasonPath: string): string {
  if (reasonPath && fs.existsSync(reasonPath)) {
    return fs.readFileSync(reasonPath, "utf8").trim() || "(empty reason file)";
  }
  return "(no reason file written — check workflow logs)";
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

const RUNNER_TEMP = env("RUNNER_TEMP", "/tmp");
const MANIFEST_PATH = env(
  "ATTEMPTS_SUMMARY_PATH",
  path.join(RUNNER_TEMP, "attempts-summary.json")
);
const REASON_PATH = env(
  "FAILURE_REASON_PATH",
  path.join(RUNNER_TEMP, "failure_reason.txt")
);
const OUT_PATH = env(
  "BLOCKED_COMMENT_PATH",
  path.join(RUNNER_TEMP, "blocked-comment.md")
);
const TRIGGER_LABEL = env("TRIGGER_LABEL", "agent:implement");
const RUN_URL = env("RUN_URL", "");
const SALVAGED = env("SALVAGED", "");
const BRANCH = env("BRANCH", "");
const SALVAGE_SHA = env("SALVAGE_SHA", "");
const SERVER_URL = env("GITHUB_SERVER_URL", "https://github.com");
const REPOSITORY = env("GITHUB_REPOSITORY", env("GH_REPO", ""));

let salvageNote = "";
if (SALVAGED === "true" && BRANCH) {
  salvageNote =
    `**Committed work preserved** on branch \`${BRANCH}\` (unreviewed for merge — it failed this run; inspect/cherry-pick, or just retry: a successful retry force-replaces it).`;
}

const manifest = loadManifest(MANIFEST_PATH);
const reason = readReason(REASON_PATH);

const body = buildBlockedCommentBody({
  manifest,
  triggerLabel: TRIGGER_LABEL,
  reason,
  salvageNote,
  runUrl: RUN_URL,
  salvageSha: SALVAGE_SHA,
  serverUrl: SERVER_URL,
  repository: REPOSITORY,
  cwd: process.cwd(),
});

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, body);
console.log(`Wrote blocked comment body to ${OUT_PATH}`);
