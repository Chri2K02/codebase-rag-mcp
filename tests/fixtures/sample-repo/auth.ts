import { createHash } from 'crypto'

interface User {
  id: string
  email: string
  passwordHash: string
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function validateUser(user: User, password: string): boolean {
  return user.passwordHash === hashPassword(password)
}

export { hashPassword, validateUser }
export type { User }
