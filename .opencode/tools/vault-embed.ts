import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Run the Körset Vault embedding pipeline. Reads markdown files from docs/vault/, generates OpenAI embeddings, and upserts chunks into Supabase pgvector. Run this at the end of every chat session to persist knowledge.",
  args: {},
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

    try {
      const result = execSync("node scripts/embed-vault.mjs", {
        cwd: context.worktree,
        encoding: "utf-8",
        timeout: 120000,
      })
      return result
    } catch (e) {
      return `Error embedding vault: ${e.message}`
    }
  },
})
