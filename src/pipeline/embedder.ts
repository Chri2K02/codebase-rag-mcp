import OpenAI from 'openai'
import { createHash } from 'crypto'
import type { CodeChunk } from '../types/index.js'

const BATCH_SIZE = 100
const MAX_RETRIES = 3

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// In-memory cache: content hash → embedding vector
const cache = new Map<string, number[]>()

function cacheKey(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function isRateLimitError(err: unknown): boolean {
  return (err as { status?: number })?.status === 429
}

async function embedBatch(
  texts: string[],
  attempt = 0
): Promise<{ embeddings: number[][]; tokensUsed: number }> {
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    })
    return {
      embeddings: response.data.map(d => d.embedding),
      tokensUsed: response.usage.total_tokens,
    }
  } catch (err) {
    if (attempt < MAX_RETRIES && isRateLimitError(err)) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
      return embedBatch(texts, attempt + 1)
    }
    throw err
  }
}

export async function embedChunks(
  chunks: CodeChunk[]
): Promise<{ chunks: CodeChunk[]; tokensUsed: number }> {
  const result: CodeChunk[] = new Array(chunks.length)
  let totalTokens = 0

  const toEmbed: Array<{ index: number; chunk: CodeChunk }> = []

  for (let i = 0; i < chunks.length; i++) {
    const key = cacheKey(chunks[i].content)
    const cached = cache.get(key)
    if (cached) {
      result[i] = { ...chunks[i], vector: cached }
    } else {
      toEmbed.push({ index: i, chunk: chunks[i] })
    }
  }

  for (let b = 0; b < toEmbed.length; b += BATCH_SIZE) {
    const batch = toEmbed.slice(b, b + BATCH_SIZE)
    const texts = batch.map(item => item.chunk.content)
    const { embeddings, tokensUsed } = await embedBatch(texts)
    totalTokens += tokensUsed

    for (let j = 0; j < batch.length; j++) {
      const { index, chunk } = batch[j]
      cache.set(cacheKey(chunk.content), embeddings[j])
      result[index] = { ...chunk, vector: embeddings[j] }
    }
  }

  return { chunks: result, tokensUsed: totalTokens }
}

export async function embedQuery(query: string): Promise<number[]> {
  const key = cacheKey(query)
  if (cache.has(key)) return cache.get(key)!

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: [query],
  })
  const embedding = response.data[0].embedding
  cache.set(key, embedding)
  return embedding
}
