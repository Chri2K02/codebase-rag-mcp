# codebase-rag-mcp

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.x-green)](https://modelcontextprotocol.io/)
[![LanceDB](https://img.shields.io/badge/LanceDB-embedded-orange)](https://lancedb.com/)

An MCP (Model Context Protocol) server that indexes any codebase using vector embeddings and enables **semantic code search** and **grounded Q&A** for AI assistants.

Works with Claude Desktop, Cursor, Copilot Chat, and any MCP-compatible client.

## How It Works

```
Your Codebase → Chunker → OpenAI Embeddings → LanceDB (local disk)
                                                       ↑
AI Client → MCP Tool Call → Embed Query → Similarity Search → Cited Answer
```

1. **Index** — files are chunked at function/class boundaries, embedded with `text-embedding-3-small`, and stored locally in LanceDB (no server needed)
2. **Search** — queries are embedded and matched via cosine similarity
3. **Ask** — relevant chunks are injected into a `gpt-4o-mini` prompt; the answer is returned with source citations

## Tools

| Tool | Description |
|---|---|
| `index_repository` | Crawl + chunk + embed a local codebase |
| `search_code` | Semantic similarity search over indexed code |
| `ask_codebase` | Natural language Q&A with cited sources |
| `list_repositories` | View all indexed repos and stats |

## Setup

**Prerequisites:** Node.js 18+, OpenAI API key

```bash
git clone https://github.com/yourusername/codebase-rag-mcp
cd codebase-rag-mcp
npm install
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm run build
```

## Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "codebase-rag": {
      "command": "node",
      "args": ["/absolute/path/to/codebase-rag-mcp/dist/server.js"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

Restart Claude Desktop. The 4 tools will appear automatically.

## Example Usage

```
You: index_repository({ "path": "/Users/you/projects/my-app" })
→ { chunksIndexed: 247, tokensUsed: 4891, timeTakenMs: 12300, repoId: "my-app" }

You: search_code({ "query": "how does authentication work", "repo": "my-app" })
→ Returns top 5 code chunks ranked by semantic similarity

You: ask_codebase({ "question": "How does the JWT middleware validate tokens?" })
→ "The JWT middleware validates tokens by... [1][2] — auth/middleware.ts:23"
```

## Running Tests

```bash
npm test                          # unit tests (no API key needed)
OPENAI_API_KEY=sk-... npm test    # includes integration tests
```

## Tech Stack

- **TypeScript** — end-to-end type safety
- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)** — MCP server protocol
- **[LanceDB](https://lancedb.com/)** — embedded vector DB, zero config, persists to disk
- **OpenAI** — `text-embedding-3-small` for embeddings, `gpt-4o-mini` for Q&A
- **Vitest** — testing
