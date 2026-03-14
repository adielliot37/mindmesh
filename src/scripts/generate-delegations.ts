import { readFileSync } from "node:fs";
import { DelegationPolicy } from "../types.js";
import { DelegationManager } from "../core/delegation-manager.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("generate-delegations");

async function main() {
  const policyPath = process.argv[2];
  if (!policyPath) {
    console.log("usage: generate-delegations <policy.json>");
    process.exit(1);
  }

  const raw = readFileSync(policyPath, "utf-8");
  const policy: DelegationPolicy = JSON.parse(raw);

  const manager = new DelegationManager();
  manager.loadPolicy(policy);

  console.log("\nDelegations generated:\n");
  for (const [name, agent] of Object.entries(policy.agents)) {
    console.log(`  ${name} (${agent.did})`);
    for (const [domain, access] of Object.entries(agent.domains)) {
      console.log(`    ${domain}: ${access.abilities.join(", ")} (${access.expiration_hours}h)`);
    }
    console.log();
  }

  console.log("delegation generation complete.");
}

main().catch((err) => {
  log.error(err, "delegation generation failed");
  process.exit(1);
});
