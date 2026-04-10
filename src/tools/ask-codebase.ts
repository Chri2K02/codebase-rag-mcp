import OpenAI from 'openai'
import { searchCode } from './search-code.js'

interface AskCodebaseArgs {
  question: string
  repo?: string
}

interface AskCodebaseResult {
  answer: string
  sources: Array<{ file: string; startLine: number; content: string }>
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function askCodebase(args: AskCodebaseArgs): Promise<AskCodebaseResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  const { question, repo } = args
  const { results } = await searchCode({ query: question, limit: 6, repo })

  if (results.length === 0) {
    return {
      answer: 'No relevant code found. Make sure the repository is indexed with index_repository first.',
      sources: [],
    }
  }

  const context = results
    .map((r, i) => `[${i + 1}] ${r.file}:${r.startLine}-${r.endLine}\n\`\`\`\n${r.content}\n\`\`\``)
    .join('\n\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a code assistant. Answer questions about a codebase using only the provided code excerpts. Cite sources by their [number]. Be concise and accurate.',
      },
      {
        role: 'user',
        content: `Code excerpts:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0,
  })

  return {
    answer: response.choices[0]?.message?.content ?? 'No answer generated.',
    sources: results.map(r => ({ file: r.file, startLine: r.startLine, content: r.content })),
  }
}
