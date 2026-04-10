export interface CodeChunk {
  id: string           // sha256 hash of file+line+content
  repoId: string       // slugified repo name
  file: string         // relative file path
  startLine: number
  endLine: number
  content: string
  language: string
  vector?: number[]    // populated after embedding
}

export interface Repository {
  id: string
  name: string
  path: string
  chunkCount: number
  languages: string[]
  lastIndexed: string  // ISO timestamp
}

export interface SearchResult {
  file: string
  startLine: number
  endLine: number
  content: string
  score: number
  repo: string
}

export interface IndexResult {
  chunksIndexed: number
  tokensUsed: number
  timeTakenMs: number
  repoId: string
}
