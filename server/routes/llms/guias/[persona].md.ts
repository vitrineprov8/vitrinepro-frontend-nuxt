import { GUIAS, getGuia } from '../../../../shared/guias'

/**
 * T-GUIA — versão markdown pura de cada guia, para leitura por máquina
 * (assistentes de IA, scrapers, leitores de texto).
 *
 * Por que existe: a guia visual é boa para humanos e péssima para um modelo —
 * o conteúdo está espalhado em SVG animado, `<details>` fechados e CSS. Aqui
 * sai tudo linear, em texto, na ordem certa, com os `detalhe` que a UI esconde
 * por serem longos demais para a tela.
 *
 * ⚠️ **Por que fica sob `/llms/` e não em `/guias/{slug}.md`** (bug real, pego
 * na validação): o Nitro registra um arquivo `[persona].md.ts` como
 * `/guias/:persona` — o sufixo `.md` é engolido pelo parser do parâmetro. Uma
 * rota de servidor tem precedência sobre a página do Nuxt, então o handler
 * capturava TAMBÉM `/guias/hunter` e devolvia markdown no lugar da página
 * visual. Retornar `undefined` para "deixar passar" também não funciona:
 * a resposta sai 200 com corpo vazio, não cai no renderer.
 *
 * Sob `/llms/` não existe página Vue nenhuma, então a captura ampla é inofensiva
 * — e vira até conveniência: `/llms/guias/hunter` e `/llms/guias/hunter.md`
 * respondem as duas coisas.
 */
function render(slug: string): string | null {
  const g = getGuia(slug)
  if (!g) return null

  const linhas: string[] = [
    `# ${g.titulo}`,
    '',
    `> ${g.subtitulo} — guia de uso do VitrinePro para quem diz "${g.persona}".`,
    '',
    `**Tempo de leitura:** ~${g.minutos} minutos · **Passos:** ${g.passos.length}`,
    '',
    '## Passo a passo',
    '',
  ]

  g.passos.forEach((p, i) => {
    linhas.push(`### ${i + 1}. ${p.titulo}`, '', p.texto)
    if (p.detalhe) linhas.push('', p.detalhe)
    if (p.rota) linhas.push('', `Tela no app: \`${p.rota}\``)
    linhas.push('')
  })

  linhas.push('## Perguntas frequentes', '')
  for (const f of g.faq) linhas.push(`**${f.q}**`, '', f.a, '')

  linhas.push(
    '## Outras guias',
    '',
    ...GUIAS.filter(o => o.slug !== g.slug).map(o => `- [${o.titulo}](/llms/guias/${o.slug}.md) — ${o.subtitulo}`),
    '',
    '---',
    '',
    'VitrinePro — plataforma brasileira de recrutamento que conecta empresas, '
    + 'recrutadores independentes (hunters), consultorias e candidatos.',
    '',
  )

  return linhas.join('\n')
}

export default defineEventHandler((event) => {
  const slug = (event.path || '').split('?')[0]!.split('/').pop()!.replace(/\.md$/i, '')
  const corpo = render(slug)

  // `event.node!.res.setHeader` em vez do helper `setHeader` do h3 — mesma razão
  // documentada em sitemap.xml.ts (duas cópias de h3 na árvore de dependências).
  if (!corpo) {
    event.node!.res.statusCode = 404
    event.node!.res.setHeader('content-type', 'text/plain; charset=utf-8')
    return `Guia não encontrada.\n\nDisponíveis:\n${GUIAS.map(g => `- /llms/guias/${g.slug}.md`).join('\n')}\n`
  }

  event.node!.res.setHeader('content-type', 'text/markdown; charset=utf-8')
  event.node!.res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  // Permite que ferramentas de IA em outro domínio busquem o conteúdo.
  event.node!.res.setHeader('access-control-allow-origin', '*')
  return corpo
})
