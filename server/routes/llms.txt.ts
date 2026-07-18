import { GUIAS } from '../../shared/guias'

/**
 * `/llms.txt` — convenção emergente (llmstxt.org) para dar a modelos de
 * linguagem um mapa curto e limpo do site, em markdown, sem navegação nem CSS.
 *
 * Diferença para `robots.txt` e `sitemap.xml`: aqueles dizem o que rastrear;
 * este diz **o que o site é** e onde está o conteúdo já em formato legível.
 * Por isso aponta para os `.md` das guias, não para as páginas HTML.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const base = config.public.frontendUrl

  const corpo = `# VitrinePro

> Plataforma brasileira de recrutamento que conecta empresas, recrutadores
> independentes ("hunters"), consultorias de RH e candidatos. Empresas publicam
> vagas e podem abri-las a hunters mediante um fee pago apenas em caso de
> contratação efetiva, com período de garantia e reposição sem custo.

Idioma do conteúdo: português do Brasil (pt-BR).

## Guias de uso (markdown, prontas para leitura por máquina)

${GUIAS.map(g => `- [${g.titulo}](${base}/llms/guias/${g.slug}.md): ${g.subtitulo} ${g.passos.length} passos, ~${g.minutos} min. Versão visual em ${base}/guias/${g.slug}`).join('\n')}

## Páginas principais

- [Início](${base}/): visão geral do produto.
- [Guias de uso](${base}/guias): índice das guias por perfil de usuário.
- [Preços](${base}/precos): planos, limites e o que cada um inclui.
- [Para empresas](${base}/para-empresas): proposta para quem contrata.
- [Para candidatos](${base}/para-candidatos): proposta para quem busca vaga.
- [Vagas](${base}/vagas): vagas abertas publicadas na plataforma.
- [Hunters](${base}/hunters): diretório público de recrutadores verificados.
- [Sobre](${base}/sobre): o que é a empresa.
- [Central de ajuda](${base}/ajuda): artigos de suporte.

## Conceitos do produto

- **Hunter**: recrutador independente que indica candidatos a vagas de terceiros
  e recebe um fee quando a contratação se confirma. Precisa de verificação
  aprovada para atuar no marketplace.
- **Fee**: valor que a empresa paga por uma contratação vinda de hunter.
  Definido pela empresa na vaga e visível antes de o hunter aceitar.
- **Placement**: registro de uma contratação efetivada, com período de garantia.
- **Período de garantia**: janela após a contratação; se o profissional sair
  dentro dela, o hunter faz uma reposição sem custo adicional para a empresa.
- **Consultoria**: conta com time de recrutadores que atende várias empresas
  clientes, com papéis (owner, manager, recruiter) e escopo por cliente.
- **Verificação em duas etapas (2FA)**: disponível gratuitamente em todos os
  planos e obrigatória para contas administradoras.

## Legal

- [Termos de uso](${base}/termos)
- [Política de privacidade](${base}/privacidade)
- [Política de cookies](${base}/cookies)
`

  // event.node!.res.setHeader em vez do helper do h3 — ver sitemap.xml.ts.
  event.node!.res.setHeader('content-type', 'text/plain; charset=utf-8')
  event.node!.res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  event.node!.res.setHeader('access-control-allow-origin', '*')
  return corpo
})
