import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Query the Körset Vault RAG knowledge base using semantic search. Searches pgvector embeddings in Supabase for relevant chunks. Use this instead of reading vault files directly when you need specific knowledge.",
  args: {
    query: tool.schema.string().describe("Search query - what you want to find in the vault"),
    domain: tool.schema.string().optional().describe("Filter by domain: knowledge, architecture, decisions, plans, changelog"),
    count: tool.schema.number().optional().describe("Number of results (default: 5)"),
  },
  async execute(args, context) {
    const { execSync } = await import("child_process")
    const { existsSync, readFileSync } = await import("fs")
    const { join } = await import("path")

    const envPath = join(context.worktree, ".env.local")
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eqIdx = trimmed.indexOf("=")
        if (eqIdx <= 0) continue
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = val
      }
    }

    let cmd = `node scripts/query-vault.mjs "${args.query.replace(/"/g, '\\"')}"`
    if (args.domain) cmd += ` --domain ${args.domain}`
    if (args.count) cmd += ` --count ${args.count}`

    try {
      const result = execSync(cmd, {
        cwd: context.worktree,
        encoding: "utf-8",
        timeout: 30000,
      })
      return result
    } catch (e) {
      return `Error querying vault: ${e.message}`
    }
  },
})
