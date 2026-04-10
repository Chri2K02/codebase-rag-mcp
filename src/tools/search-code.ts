import { embedQuery } from '../pipeline/embedder.js'
import { similaritySearch } from '../pipeline/vector-store.js'
import type { SearchResult } from '../types/index.js'

interface SearchCodeArgs {
  query: string
  limit?: number
  repo?: string
}

export async function searchCode(args: SearchCodeArgs): Promise<{ results: SearchResult[] }> {
  const { query, limit = 5, repo } = args
  const queryVector = await embedQuery(query)
  const results = await similaritySearch(queryVector, limit, repo)
  return { results }
}
