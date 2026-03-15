import { KnowledgeGraph, loadConfig, DelegationPolicy } from "../../src/index.js";

const policy: DelegationPolicy = {
  agents: {
    research: {
      did: "did:key:z6MkResearchAgent",
      domains: {
        "market-data": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 24,
        },
        "product-docs": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 24,
        },
      },
    },
    support: {
      did: "did:key:z6MkSupportAgent",
      domains: {
        "product-docs": {
          abilities: ["space/blob/list", "upload/list"],
          expiration_hours: 24,
        },
      },
    },
    ingestion: {
      did: "did:key:z6MkIngestionAgent",
      domains: {
        "market-data": {
          abilities: ["space/blob/add", "upload/add", "space/index/add", "space/blob/list"],
          expiration_hours: 1,
        },
        "product-docs": {
          abilities: ["space/blob/add", "upload/add", "space/index/add", "space/blob/list"],
          expiration_hours: 1,
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

  const ingestionDid = "did:key:z6MkIngestionAgent";
  await kg.ingest(
    ingestionDid,
    "market-data",
    "Tesla Q4 2025 revenue was $25.7B, up 2% YoY. Operating margin improved to 8.2%.",
    "https://ir.tesla.com/q4-2025",
    ["earnings", "tesla"]
  );

  console.log("ingestion complete");

  const researchDid = "did:key:z6MkResearchAgent";
  const results = await kg.search(researchDid, {
    query: "Tesla revenue Q4 2025",
    domains: ["market-data"],
    top_k: 3,
  });

  console.log("search results:", JSON.stringify(results, null, 2));

  const supportDid = "did:key:z6MkSupportAgent";
  try {
    await kg.search(supportDid, {
      query: "Tesla revenue",
      domains: ["market-data"],
    });
  } catch {
    console.log("support agent correctly blocked from market-data");
  }

  const domains = kg.listDomains(researchDid);
  console.log("domains for research agent:", JSON.stringify(domains, null, 2));
}

main().catch(console.error);
