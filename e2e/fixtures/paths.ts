import path from 'node:path'
import type { Role } from './accounts'

/** Caminho do storageState salvo por papel (gitignored). */
export function authFile(role: Role): string {
  return path.join(process.cwd(), 'e2e', '.auth', `${role}.json`)
}
