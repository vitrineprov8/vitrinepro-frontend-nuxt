// Contas de teste E2E — espelham `../../../qa-test-accounts.json` (DB de teste, não produção).
// Se o Andres trocar uma senha, atualizar aqui E no qa-test-accounts.json.
//
// A senha do consultoria-recruiter/candidato pode cair no throttle de login se muitas
// contas logarem em sequência rápida — o `loginViaApi` (auth.ts) trata isso com retry.

export type Role =
  | 'hunter'
  | 'empresa'
  | 'admin'
  | 'consultoria-owner'
  | 'consultoria-manager'
  | 'consultoria-recruiter'
  | 'candidato'

export interface Account {
  role: Role
  email: string
  password: string
  /** Rota inicial esperada do workspace deste papel. */
  home: string
  /** Título esperado da página inicial (substring). */
  homeTitle: string
}

export const ACCOUNTS: Record<Role, Account> = {
  'hunter': {
    role: 'hunter',
    email: 'testeia@getnada.com',
    password: '257773155',
    home: '/app/hunter',
    homeTitle: 'Início — Hunter',
  },
  'empresa': {
    role: 'empresa',
    email: 'andresempresa@getnada.com',
    password: '257773155',
    home: '/app/empresa',
    homeTitle: 'Início — Empresa',
  },
  'admin': {
    role: 'admin',
    email: 'admin@gmail.com',
    password: '25777315',
    home: '/app/admin',
    homeTitle: 'Visão Geral — Admin',
  },
  'consultoria-owner': {
    role: 'consultoria-owner',
    email: 'b15owner1783356982818@getnada.com',
    password: 'NovaSenha2026!',
    home: '/app/consultoria',
    homeTitle: 'Início — Consultoria',
  },
  'consultoria-manager': {
    role: 'consultoria-manager',
    email: 'b15manager1783356982818@getnada.com',
    password: 'b15Teste2026!',
    home: '/app/consultoria',
    homeTitle: 'Início — Consultoria',
  },
  'consultoria-recruiter': {
    role: 'consultoria-recruiter',
    email: 'b15recruiter1783356982818@getnada.com',
    password: 'b15Teste2026!',
    home: '/app/consultoria',
    homeTitle: 'Início — Consultoria',
  },
  'candidato': {
    role: 'candidato',
    email: 'consenttest1783896275482@getnada.com',
    password: 'ConsentTeste2026!',
    home: '/app/candidato',
    homeTitle: 'Início — Candidato',
  },
}

export const BACKEND_URL = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:3000'
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321'
