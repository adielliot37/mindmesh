import { KnowledgeGraph, loadConfig, DelegationPolicy } from "../../src/index.js";

const policy: DelegationPolicy = {
  agents: {
    analyst: {
      did: "did:key:z6MkAnalyst",
      domains: {
        "market-data": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 8,
        },
      },
    },
    writer: {
      did: "did:key:z6MkWriter",
      domains: {
        "market-data": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 8,
        },
        "product-docs": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 8,
        },
      },
    },
    collector: {
      did: "did:key:z6MkCollector",
      domains: {
        "market-data": {
          abilities: ["space/blob/add", "upload/add", "space/blob/list"],
          expiration_hours: 2,
        },
      },
    },
  },
};

async function main() {
  const config = loadConfig();
  const kg = new KnowledgeGraph(config);
  await kg.initialize();
  kg.getDelegationManager().loadPolicy(policy);

  const collectorDid = "did:key:z6MkCollector";
  await kg.ingest(
    collectorDid,
    "market-data",
    "Global semiconductor revenue reached $620B in 2025, driven by datacenter demand. TSMC maintained 54% market share in advanced nodes.",
    "https://example.com/semi-report",
    ["semiconductors", "market-size"]
  );

  const analystDid = "did:key:z6MkAnalyst";
  const results = await kg.search(analystDid, {
    query: "semiconductor market share 2025",
    domains: ["market-data"],
    top_k: 3,
  });

  console.log("analyst search results:", results.length, "fragments found");

  const domains = kg.listDomains(analystDid);
  console.log("analyst domains:", domains.map((d) => `${d.name}:${d.access}`));
}

main().catch(console.error);
