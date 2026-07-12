/**
 * Hostile-data rendering contract for verdict text (spec §8.4 / §15.4).
 *
 * Consumer-side only: blocked-comment rows and write-pr Convergence.
 * The implement RETRY_CONTEXT envelope keeps full text + framing (no truncation).
 */

const DEFAULT_GIST_CAP = 160;

/** Zero-width space — breaks GitHub @ping and #issue autolinks without losing readability. */
const ZWSP = "\u200b";

/**
 * Normalize hostile agent/verdict text for human-facing surfaces:
 * one line, no control chars, capped, no @ping / #cross-link / HTML / links / bare backticks.
 */
export function neutralizeHostileText(
  input: string,
  opts: { maxLen?: number } = {}
): string {
  const maxLen = opts.maxLen ?? DEFAULT_GIST_CAP;
  let s = String(input ?? "");

  // Control characters (C0 + DEL + C1) → drop; newlines/tabs → space first
  s = s.replace(/[\r\n\t]+/g, " ");
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");

  // Collapse whitespace
  s = s.replace(/ {2,}/g, " ").trim();

  // Neutralize HTML tags (strip angle-bracket markup)
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  s = s.replace(/[<>]/g, "");

  // Neutralize URLs / markdown links
  s = s.replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1");
  s = s.replace(/\bhttps?:\/\/\S+/gi, "[link]");
  s = s.replace(/\bwww\.\S+/gi, "[link]");

  // Neutralize backticks (no code-fence / inline-code injection)
  s = s.replace(/`+/g, "'");

  // Neutralize @mentions (must not ping) — insert ZWSP after @
  s = s.replace(/@([A-Za-z0-9_-]+)/g, `@${ZWSP}$1`);

  // Neutralize #N issue/PR refs (must not cross-link)
  s = s.replace(/#(\d+)\b/g, `#${ZWSP}$1`);

  // Cap gist length
  if (s.length > maxLen) {
    s = s.slice(0, maxLen - 1).trimEnd() + "…";
  }

  return s;
}

export function neutralizeGists(
  criteria: string[],
  opts: { maxLen?: number; maxItems?: number } = {}
): { gists: string[]; overflow: number } {
  const maxItems = opts.maxItems ?? 5;
  const maxLen = opts.maxLen ?? DEFAULT_GIST_CAP;
  const list = Array.isArray(criteria) ? criteria.map(String) : [];
  const shown = list.slice(0, maxItems).map((c) => neutralizeHostileText(c, { maxLen }));
  const overflow = Math.max(0, list.length - maxItems);
  return { gists: shown, overflow };
}

export const GIST_CAP = DEFAULT_GIST_CAP;
