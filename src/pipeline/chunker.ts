import { createHash } from 'crypto'
import type { CodeChunk } from '../types/index.js'

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', go: 'go',
  rs: 'rust', java: 'java', cs: 'csharp',
  cpp: 'cpp', c: 'c', md: 'markdown',
}

// Lines matching these patterns signal the start of a new logical block
const BOUNDARY_PATTERNS = [
  /^(export\s+)?(async\s+)?function\s+\w+/,
  /^(export\s+)?(abstract\s+)?class\s+\w+/,
  /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/,
  /^(export\s+)?const\s+\w+\s*=\s*\{/,
  /^(export\s+)?interface\s+\w+/,
  /^(export\s+)?type\s+\w+\s*=/,
  /^(export\s+)?enum\s+\w+/,
  /^def\s+\w+/,
  /^class\s+\w+/,
  /^func\s+\w+/,
  /^fn\s+\w+/,
]

const MAX_CHUNK_LINES = 80
const OVERLAP_LINES = 10

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return LANGUAGE_MAP[ext] ?? 'plaintext'
}

function isBoundary(line: string): boolean {
  const trimmed = line.trim()
  return BOUNDARY_PATTERNS.some(p => p.test(trimmed))
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

export function chunkFile(file: string, content: string, repoId: string): CodeChunk[] {
  const lines = content.split('\n')
  const language = detectLanguage(file)
  const chunks: CodeChunk[] = []
  let start = 0

  while (start < lines.length) {
    let end = Math.min(start + MAX_CHUNK_LINES, lines.length)

    // Look for a natural boundary to end on
    for (let i = Math.min(start + 10, end - 1); i < end - 1; i++) {
      if (isBoundary(lines[i + 1])) {
        end = i + 1
        break
      }
    }

    const chunkContent = lines.slice(start, end).join('\n').trim()

    if (chunkContent.length > 0) {
      chunks.push({
        id: hashContent(`${file}:${start}:${chunkContent}`),
        repoId,
        file,
        startLine: start + 1,
        endLine: end,
        content: chunkContent,
        language,
      })
    }

    // Move forward with overlap to preserve context across boundaries
    start = Math.max(end - OVERLAP_LINES, start + 1)
  }

  return chunks
}
