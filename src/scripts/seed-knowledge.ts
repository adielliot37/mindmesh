import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { loadConfig } from "../config.js";
import { KnowledgeGraph } from "../core/knowledge-graph.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("seed-knowledge");

async function main() {
  const dataDir = process.argv[2];
  const domain = process.argv[3];

  if (!dataDir || !domain) {
    console.log("usage: seed-knowledge <data-dir> <domain>");
    process.exit(1);
  }

  const config = loadConfig();
  const kg = new KnowledgeGraph(config);
  await kg.initialize();

  const agentDid = process.env.AGENT_DID || "did:key:admin";
  const files = collectFiles(dataDir);

  console.log(`seeding ${files.length} files into ${domain}...\n`);

  let totalFragments = 0;
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const result = await kg.ingest(agentDid, domain, content, `file://${file}`);
    totalFragments += result.fragments_created;
    console.log(`  ${file}: ${result.fragments_created} fragments`);
  }

  console.log(`\ndone. ${totalFragments} total fragments created.`);
}

function collectFiles(dir: string): string[] {
  const supported = new Set([".txt", ".md", ".json", ".csv"]);
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (supported.has(extname(entry).toLowerCase())) {
      files.push(path);
    }
  }

  return files;
}

main().catch((err) => {
  log.error(err, "seeding failed");
  process.exit(1);
});
