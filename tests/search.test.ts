import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'path'
import { indexRepository } from '../src/tools/index-repository.js'
import { searchCode } from '../src/tools/search-code.js'

const FIXTURE_PATH = resolve('./tests/fixtures/sample-repo')
const HAS_API_KEY = !!process.env.OPENAI_API_KEY

describe('search integration', () => {
  beforeAll(async () => {
    if (!HAS_API_KEY) return
    await indexRepository({ path: FIXTURE_PATH, include: ['**/*.ts'] })
  }, 60_000)

  it('finds auth-related code when searching for password hashing', async () => {
    if (!HAS_API_KEY) return

    const { results } = await searchCode({ query: 'password hashing', limit: 3 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.file.includes('auth'))).toBe(true)
  }, 30_000)

  it('returns results with all required fields', async () => {
    if (!HAS_API_KEY) return

    const { results } = await searchCode({ query: 'database query', limit: 3 })
    for (const r of results) {
      expect(r.file).toBeTruthy()
      expect(r.startLine).toBeGreaterThan(0)
      expect(r.content).toBeTruthy()
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.repo).toBeTruthy()
    }
  }, 30_000)
})
