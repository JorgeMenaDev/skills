import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function usage() {
  return `Usage:
  bun backlog-to-content-keywords.mjs --backlog .seo/backlog.md --project slug --locale en --output keywords-draft.json

Extracts Ready/In progress content tickets into a reviewable content keyword draft. Review and enrich the result before import.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function extractTableRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| SEO-"))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

function keywordFromTicket(ticket) {
  return ticket
    .replace(/^plan first\s+/i, "")
    .replace(/^create\s+/i, "")
    .replace(/^publish\s+/i, "")
    .replace(/^optimize\s+/i, "")
    .replace(/\s+content\s+cluster$/i, "")
    .replace(/\s+blog\s+post$/i, "")
    .trim();
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const backlogPath = argValue("--backlog");
  const project = argValue("--project");
  const locale = argValue("--locale") ?? "en";
  const output =
    argValue("--output") ?? `${project ?? "project"}-keywords-draft.json`;

  if (!backlogPath || !project) throw new Error(usage());

  const backlog = await readFile(path.resolve(backlogPath), "utf-8");
  const rows = extractTableRows(backlog)
    .filter(
      (cells) =>
        cells[2] === "content" ||
        cells[2] === "pseo" ||
        cells[2] === "internal-links",
    )
    .map((cells, index) => {
      const [ticketId, priority, area, ticket] = cells;
      const keyword = keywordFromTicket(ticket);
      return {
        id: `${project}-${ticketId.toLowerCase()}`,
        keyword,
        cluster: `${locale}-${project}-${slugify(area)}-${String(index + 1).padStart(2, "0")}`,
        contentType: area === "pseo" ? "guide:comparison" : "guide:explainer",
        intent: area === "internal-links" ? "informational" : "commercial",
        buyerStage: area === "pseo" ? "solution-aware" : "problem-aware",
        relevance: priority === "P0" || priority === "P1" ? 10 : 8,
        priorityScore: Math.max(50, 100 - index * 5),
        priorityTier:
          priority === "P0" || priority === "P1"
            ? "p1"
            : priority === "P2"
              ? "p2"
              : "p3",
        sourceTicket: ticketId,
      };
    });

  const payload = {
    metadata: {
      project,
      locale,
      generatedAt: new Date().toISOString(),
      source: backlogPath,
      notes:
        "Draft generated from .seo backlog. Review keyword text, intent, difficulty, and clusters before import.",
    },
    keywords: rows,
  };

  await writeFile(
    path.resolve(output),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  console.log(`Wrote ${rows.length} keyword drafts to ${output}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
