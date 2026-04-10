import { getRepositories } from '../pipeline/vector-store.js'
import type { Repository } from '../types/index.js'

export async function listRepositories(): Promise<{ repositories: Repository[] }> {
  const repositories = await getRepositories()
  return { repositories }
}
