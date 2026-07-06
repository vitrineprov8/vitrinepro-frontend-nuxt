// useSafeRedirect — B19/F9 note: `?redirect=` é lido de query string em vários
// pontos (login, cadastro, callback OAuth) e passado direto a `navigateTo`,
// permitindo open-redirect (`?redirect=https://evil.com`). Só aceita paths
// internos relativos (`/algo`), rejeitando protocolo-relative (`//evil.com`)
// e URLs absolutas.
export function safeInternalPath(raw: unknown, fallback = '/app'): string {
  if (typeof raw !== 'string' || !raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  if (raw.includes('://')) return fallback
  return raw
}
