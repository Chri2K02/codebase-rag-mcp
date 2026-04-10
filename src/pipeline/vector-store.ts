import * as lancedb from '@lancedb/lancedb'
import type { CodeChunk, Repository, SearchResult } from '../types/index.js'

const DB_PATH = process.env.LANCEDB_PATH ?? './.lancedb'
const TABLE_NAME = 'chunks'

let db: Awaited<ReturnType<typeof lancedb.connect>> | null = null

async function getDb() {
  if (!db) db = await lancedb.connect(DB_PATH)
  return db
}

interface ChunkRecord {
  id: string
  repoId: string
  file: string
  startLine: number
  endLine: number
  content: string
  language: string
  lastIndexed: string
  vector: number[]
}

async function getTable() {
  const database = await getDb()
  const tables = await database.tableNames()
  if (!tables.includes(TABLE_NAME)) {
    return await database.createTable(TABLE_NAME, [])
  }
  return await database.openTable(TABLE_NAME)
}

export async function upsertChunks(chunks: CodeChunk[]): Promise<void> {
  const table = await getTable()

  // validate all chunks have been embedded
  for (const c of chunks) {
    if (c.vector === undefined) {
      throw new Error(`Chunk ${c.id} (${c.file}) has no vector — run embedding before upsert`)
    }
  }

  // Remove stale chunks for these files before inserting fresh ones
  const files = [...new Set(chunks.map(c => c.file))]
  for (const file of files) {
    try {
      await table.delete(`file = '${file.replace(/'/g, "''")}'`)
    } catch (err) {
      // Ignore "no rows" errors on first run, re-throw anything else
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('no rows') && !msg.includes('empty')) throw err
    }
  }

  const records: ChunkRecord[] = chunks.map(c => ({
    id: c.id,
    repoId: c.repoId,
    file: c.file,
    startLine: c.startLine,
    endLine: c.endLine,
    content: c.content,
    language: c.language,
    lastIndexed: new Date().toISOString(),
    vector: c.vector!,
  }))

  await table.add(records as unknown as Record<string, unknown>[])
}

export async function similaritySearch(
  queryVector: number[],
  limit: number,
  repoId?: string
): Promise<SearchResult[]> {
  const table = await getTable()
  let query = table.vectorSearch(queryVector).limit(limit)
  if (repoId) query = query.where(`repoId = '${repoId.replace(/'/g, "''")}'`)

  const results = await query.toArray()
  return results.map(r => ({
    file: r.file as string,
    startLine: r.startLine as number,
    endLine: r.endLine as number,
    content: r.content as string,
    score: 1 - ((r._distance as number) ?? 0),
    repo: r.repoId as string,
  }))
}

export async function getRepositories(): Promise<Repository[]> {
  const table = await getTable()
  const all = await table.query().toArray()

  const repoMap = new Map<string, {
    chunks: number
    languages: Set<string>
    lastIndexed: string
    sampleFile: string
  }>()

  for (const row of all) {
    const repoId = row.repoId as string
    const existing = repoMap.get(repoId)
    if (!existing) {
      repoMap.set(repoId, {
        chunks: 1,
        languages: new Set([row.language as string]),
        lastIndexed: row.lastIndexed as string,
        sampleFile: row.file as string,
      })
    } else {
      existing.chunks++
      existing.languages.add(row.language as string)
      if ((row.lastIndexed as string) > existing.lastIndexed) {
        existing.lastIndexed = row.lastIndexed as string
      }
    }
  }

  return Array.from(repoMap.entries()).map(([id, data]) => ({
    id,
    name: id,
    path: data.sampleFile.split('/').slice(0, -1).join('/'),
    chunkCount: data.chunks,
    languages: [...data.languages],
    lastIndexed: data.lastIndexed,
  }))
}
