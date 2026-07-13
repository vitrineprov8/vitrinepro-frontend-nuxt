// F14 — robots.txt. Libera tudo pro público, bloqueia só a área logada
// (/app/**, sem SEO nenhum — client-only, ver routeRules do nuxt.config.ts)
// e aponta pro sitemap dinâmico.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const base = config.public.frontendUrl

  // Mesmo fix do sitemap.xml.ts — event.node.res.setHeader direto evita a
  // ambiguidade de resolução do helper `setHeader` do h3 (ver comentário lá).
  event.node.res.setHeader('content-type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /app/',
    'Disallow: /login',
    'Disallow: /cadastro',
    'Disallow: /redefinir-senha/',
    'Disallow: /verificar-email/',
    'Disallow: /convite/',
    'Disallow: /consentimento/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
  ].join('\n')
})
