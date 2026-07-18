// F14 — sitemap.xml dinâmico. Gerado sob demanda (sem @nuxtjs/sitemap — evita
// adicionar uma dependência nova nesta rodada) lendo direto do backend real:
// vagas publicadas (/vagas/radar) e hunters visíveis (/hunters), além das
// páginas públicas estáticas. Cache de 1h no edge (bate com o padrão já usado
// pras rotas /vaga/** e /vagas/** em nuxt.config.ts routeRules).
//
// Fora de escopo, gap conhecido (documentado, não esquecido): não existe
// endpoint público que liste TODOS os perfis de candidato nem TODAS as
// páginas de empresa (só dá pra saber o slug se já se sabe o username) — só
// vagas e hunters entram na parte dinâmica. Cap de 5 páginas (500 itens) por
// tipo, suficiente pro volume atual; se crescer, paginar de verdade.
interface RadarVaga { slug: string, updatedAt: string }
interface RadarResponse { data: RadarVaga[], total: number }
interface HunterCard { username: string }
interface HuntersResponse { items: HunterCard[], total: number }

import { GUIAS } from '../../shared/guias'

const STATIC_PATHS = [
  '', 'sobre', 'contato', 'precos', 'para-empresas', 'para-candidatos',
  'hunters', 'vagas', 'termos', 'privacidade', 'cookies', 'ajuda',
  // T-GUIA — índice + uma guia por persona (conteúdo estável, vale indexar).
  'guias', ...GUIAS.map(g => `guias/${g.slug}`),
]

const MAX_PAGES = 5
const PAGE_LIMIT = 100

function xmlEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const base = config.public.frontendUrl
  const backend = config.public.backendUrl

  const urls: Array<{ loc: string, lastmod?: string }> = STATIC_PATHS.map(p => ({ loc: `${base}/${p}` }))

  // Vagas publicadas
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await $fetch<RadarResponse>('/vagas/radar', { baseURL: backend, params: { page, limit: PAGE_LIMIT } })
      for (const v of res.data) urls.push({ loc: `${base}/vaga/${v.slug}`, lastmod: v.updatedAt })
      if (page * PAGE_LIMIT >= res.total) break
    }
  }
  catch {
    // Backend fora do ar não deve derrubar o sitemap inteiro — só fica sem a parte dinâmica.
  }

  // Hunters visíveis (diretório público)
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await $fetch<HuntersResponse>('/hunters', { baseURL: backend, params: { page, limit: PAGE_LIMIT } })
      for (const h of res.items) urls.push({ loc: `${base}/hunter/${h.username}` })
      if (page * PAGE_LIMIT >= res.total) break
    }
  }
  catch {
    // idem
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(u => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')
    + `\n</urlset>`

  // Usa event.node.res.setHeader diretamente em vez do helper `setHeader` do h3
  // (auto-import do Nitro) — nesta versão o helper estava resolvendo pro h3 do
  // node_modules raiz em vez do h3 interno do nitropack, com assinatura
  // incompatível (TypeError: Cannot read properties of undefined (reading 'set')).
  // A API crua do Node sempre funciona independente dessa ambiguidade de resolução.
  event.node.res.setHeader('content-type', 'application/xml; charset=utf-8')
  event.node.res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  return body
})
