---
domain: knowledge
subdomain: agent-workflow
updated: 2026-09-17
---

# Model Routing and Cost Control

How to spend the AI budget on Körset. Written 2026-09-17 after a cost audit.

## The budget reality

| Source | Type | Notes |
| --- | --- | --- |
| Azure AI (`founder-1069-resource`) | ~$100 hard credit | Frontier Claude models. Finite. |
| Google AI Pro | flat subscription | Gemini in Antigravity IDE. **No API key**, so unusable from OpenCode. |
| Google AI Studio | free tier | Separate from AI Pro. Gives an API key. Generous Flash quota. |
| `iyhapi`, `kimchi`, `blue*` | third-party proxies | Cheap, but code passes through an unknown operator. |

Frontier-tier pricing is roughly $15 per million input tokens and $75 per million
output. A single real coding session (reading files, editing, running checks) burns
300 K–1 M tokens. **$100 therefore buys roughly 10–20 frontier sessions.** It cannot be
the daily driver.

## Fixed overhead per turn

Before the user types anything, every request carries:

| Component | Tokens |
| --- | --- |
| Base opencode system prompt | ~2 500 |
| `AGENTS.md` | ~1 300 (was ~3 500 before the 2026-09-17 trim) |
| Skill descriptions | ~1 200 |
| Tool definitions (incl. MCP servers) | ~3 500 |

This is resent on **every** turn. Two consequences:

1. Long chats are superlinear in cost — each turn resends the whole history.
2. Prompt caching matters enormously. Anthropic-native caching discounts resent context
   by roughly 90%. **Through an OpenAI-compatible proxy it may not apply at all.** Verify
   this before assuming frontier models are affordable.

## Routing by task type

| Task | Model tier | Why |
| --- | --- | --- |
| Architecture, schema design, RLS/auth, security review | Frontier (Opus-class) | Mistakes here are expensive and hard to reverse. Worth the money. |
| Gnarly debugging after cheaper models failed | Frontier | Escalate only after a cheap attempt. |
| Final review before a release | Frontier, short session | Focused diff review, not exploration. |
| Feature code, component work, refactors | Mid (Sonnet-class) | ~5x cheaper, close enough on ordinary code. |
| UI/CSS, i18n strings, copy, small fixes | Cheap (Flash-class) | Volume work. Quality difference is negligible. |
| Codebase search and "where is X" | Cheap, via `explore` subagent | Subagent context never enters the main chat. |
| Chat titles, summaries, compaction | Cheapest (`small_model`) | Invisible background work. |
| Data pipeline scripts, imports, parsers | Mid | Deterministic, verifiable by running it. |
| Marketing copy, landing text, store outreach | Cheap or a chat UI | Zero reason to burn API credit on prose. |

## Practical rules

- **One task per session.** A fresh session resets accumulated history. An endless chat
  re-pays for its own past on every turn.
- **Escalate, do not start high.** Try the cheap model first. Switch to frontier only
  when it visibly fails.
- **Search through subagents.** `explore` returns a summary; the file contents it read
  never land in the main context.
- **Read narrowly.** Offset/limit over whole-file reads. Grep over read.
- **Cap tool output.** `tool_output.max_lines` / `max_bytes` in `opencode.json`. Without
  it, one careless directory listing can dump a megabyte of `node_modules` into context.
- **Keep `AGENTS.md` short.** Under ~3–4 KB. This helps rule adherence as much as cost.
- **Keep the RAG index clean.** Session logs and completed plans are excluded from
  embedding; they dilute retrieval without adding knowledge.

## Config that enforces this

`opencode.json` at the project root sets:

- `small_model` → cheapest available model
- `agent.explore` → cheap model
- `agent.general` → mid model
- `compaction.auto` → automatic history compression
- `tool_output` → hard caps on command output
- `permission.bash` → confirmation gates on `vercel`, `git push`, destructive DB commands

Config is read at startup and is **not** hot-reloaded. Restart opencode after editing.
