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
    // T-GUIA — convenção llmstxt.org: mapa do site em markdown para modelos de
    // linguagem. Não é padrão oficial de robots, mas é inofensivo para
    // crawlers (linha desconhecida é ignorada) e serve de dica para quem procura.
    `# Conteúdo em markdown para assistentes de IA: ${base}/llms.txt`,
  ].join('\n')
})
