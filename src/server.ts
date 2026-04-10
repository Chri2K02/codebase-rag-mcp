import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { indexRepository } from './tools/index-repository.js'
import { searchCode } from './tools/search-code.js'
import { askCodebase } from './tools/ask-codebase.js'
import { listRepositories } from './tools/list-repositories.js'

const server = new Server(
  { name: 'codebase-rag-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'index_repository',
      description: 'Crawl a local codebase, chunk files at function/class boundaries, generate embeddings, and store in vector DB for semantic search.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or relative path to the repository' },
          include: { type: 'array', items: { type: 'string' }, description: 'Glob patterns to include (default: TS, JS, Python, Go, Rust, Markdown)' },
          exclude: { type: 'array', items: { type: 'string' }, description: 'Glob patterns to exclude (default: node_modules, dist, build)' },
        },
        required: ['path'],
      },
    },
    {
      name: 'search_code',
      description: 'Semantic similarity search over indexed code. Returns the most relevant code chunks for a natural language query.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language query or code snippet' },
          limit: { type: 'number', description: 'Number of results to return (default: 5)' },
          repo: { type: 'string', description: 'Filter results to a specific repository ID' },
        },
        required: ['query'],
      },
    },
    {
      name: 'ask_codebase',
      description: 'Ask a natural language question about an indexed codebase. Retrieves relevant code chunks and returns a grounded answer with source citations.',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Question about the codebase' },
          repo: { type: 'string', description: 'Filter to a specific repository ID' },
        },
        required: ['question'],
      },
    },
    {
      name: 'list_repositories',
      description: 'List all indexed repositories with metadata including chunk count, languages, and last indexed time.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    let result: unknown

    if (name === 'index_repository') {
      result = await indexRepository(args as { path: string; include?: string[]; exclude?: string[] })
    } else if (name === 'search_code') {
      result = await searchCode(args as { query: string; limit?: number; repo?: string })
    } else if (name === 'ask_codebase') {
      result = await askCodebase(args as { question: string; repo?: string })
    } else if (name === 'list_repositories') {
      result = await listRepositories()
    } else {
      throw new Error(`Unknown tool: ${name}`)
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
