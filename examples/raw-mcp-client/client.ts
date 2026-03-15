import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["agent-knowledge-server"],
    env: {
      ...process.env,
      MCP_TRANSPORT_MODE: "stdio",
    },
  });

  const client = new Client({ name: "example-client", version: "0.1.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log(
    "available tools:",
    tools.tools.map((t) => t.name)
  );

  const domains = await client.callTool({
    name: "knowledge_domains",
    arguments: {},
  });
  console.log("domains:", domains);

  const searchResult = await client.callTool({
    name: "knowledge_search",
    arguments: {
      query: "quarterly revenue data",
      top_k: 3,
    },
  });
  console.log("search:", searchResult);

  await client.close();
}

main().catch(console.error);
