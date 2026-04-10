interface QueryResult<T> {
  rows: T[]
  count: number
}

async function query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
  console.log('Executing query:', sql, params)
  return { rows: [], count: 0 }
}

async function findById<T>(table: string, id: string): Promise<T | null> {
  const result = await query<T>(`SELECT * FROM ${table} WHERE id = $1`, [id])
  return result.rows[0] ?? null
}

export { query, findById }
export type { QueryResult }
