import { describe, it, expect } from 'vitest'
import { chunkFile } from '../src/pipeline/chunker.js'

const sampleTs = `
import { foo } from './foo.js'

function greet(name: string): string {
  return \`Hello, \${name}!\`
}

class UserService {
  private users: string[] = []

  addUser(name: string): void {
    this.users.push(name)
  }

  getUsers(): string[] {
    return this.users
  }
}

export { greet, UserService }
`.trim()

describe('chunkFile', () => {
  it('splits a file into at least one chunk', () => {
    const chunks = chunkFile('test.ts', sampleTs, 'repo-1')
    expect(chunks.length).toBeGreaterThan(0)
  })

  it('each chunk has required fields', () => {
    const chunks = chunkFile('test.ts', sampleTs, 'repo-1')
    for (const chunk of chunks) {
      expect(chunk.id).toBeTruthy()
      expect(chunk.file).toBe('test.ts')
      expect(chunk.repoId).toBe('repo-1')
      expect(chunk.startLine).toBeGreaterThanOrEqual(1)
      expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine)
      expect(chunk.content).toBeTruthy()
      expect(chunk.language).toBe('typescript')
    }
  })

  it('chunks cover the whole file', () => {
    const chunks = chunkFile('test.ts', sampleTs, 'repo-1')
    const lines = sampleTs.split('\n')
    const lastChunkEnd = Math.max(...chunks.map(c => c.endLine))
    expect(lastChunkEnd).toBeGreaterThanOrEqual(lines.length)
  })

  it('assigns unique ids', () => {
    const chunks = chunkFile('test.ts', sampleTs, 'repo-1')
    const ids = chunks.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('detects language from file extension', () => {
    const jsChunks = chunkFile('app.js', 'function foo() {}', 'repo-1')
    expect(jsChunks[0].language).toBe('javascript')

    const pyChunks = chunkFile('main.py', 'def foo(): pass', 'repo-1')
    expect(pyChunks[0].language).toBe('python')
  })
})
