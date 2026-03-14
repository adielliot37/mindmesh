import { loadConfig } from "../config.js";
import { DomainManager } from "../core/domain-manager.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("setup-domains");

async function main() {
  const config = loadConfig();

  if (Object.keys(config.domains).length === 0) {
    console.log("no domains configured. set DOMAIN_*_DID env vars or update config.");
    process.exit(1);
  }

  const manager = new DomainManager(config);
  const domains = manager.listDomains();

  console.log(`\nConfigured domains (${domains.length}):\n`);
  for (const domain of domains) {
    console.log(`  ${domain.name}`);
    console.log(`    space: ${domain.space_did}`);
    console.log(`    desc:  ${domain.description}`);
    console.log();
  }

  console.log("domain setup complete.");
}

main().catch((err) => {
  log.error(err, "setup failed");
  process.exit(1);
});
