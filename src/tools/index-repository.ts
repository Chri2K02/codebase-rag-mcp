import { glob } from 'glob'
import { readFile } from 'fs/promises'
import { resolve, relative } from 'path'
import { chunkFile } from '../pipeline/chunker.js'
import { embedChunks } from '../pipeline/embedder.js'
import { upsertChunks } from '../pipeline/vector-store.js'
import type { IndexResult, CodeChunk } from '../types/index.js'

interface IndexRepositoryArgs {
  path: string
  include?: string[]
  exclude?: string[]
}

const DEFAULT_INCLUDE = [
  '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
  '**/*.py', '**/*.go', '**/*.rs', '**/*.md',
]
const DEFAULT_EXCLUDE = [
  '**/node_modules/**', '**/dist/**', '**/build/**',
  '**/.git/**', '**/*.min.js', '**/*.lock',
]

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function indexRepository(args: IndexRepositoryArgs): Promise<IndexResult> {
  const start = Date.now()
  const absPath = resolve(args.path)
  const repoId = slugify(absPath.split(/[\\/]/).pop() ?? 'repo')

  const files = await glob(args.include ?? DEFAULT_INCLUDE, {
    cwd: absPath,
    ignore: args.exclude ?? DEFAULT_EXCLUDE,
    absolute: true,
  })

  if (files.length === 0) {
    throw new Error(
      `No matching files found in ${absPath}. Check your include/exclude patterns.`
    )
  }

  let allChunks: CodeChunk[] = []

  for (const file of files) {
    const content = await readFile(file, 'utf-8')
    const relPath = relative(absPath, file)
    allChunks = allChunks.concat(chunkFile(relPath, content, repoId))
  }

  const { chunks: embeddedChunks, tokensUsed } = await embedChunks(allChunks)
  await upsertChunks(embeddedChunks)

  return {
    chunksIndexed: embeddedChunks.length,
    tokensUsed,
    timeTakenMs: Date.now() - start,
    repoId,
  }
}
