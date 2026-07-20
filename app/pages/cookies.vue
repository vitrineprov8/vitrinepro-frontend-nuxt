<script setup lang="ts">
// F12 — Política de cookies. Substituído o texto placeholder por um rascunho
// completo. NOTA: conteúdo redigido internamente — recomenda-se revisão
// jurídica antes do lançamento público (ver aviso em LegalDoc.vue).
useSeoMeta({ title: 'Política de Cookies', description: 'Como o VitrinePro usa cookies.' })
const sections = [
  {
    id: 'o-que-sao',
    heading: '1. O que são cookies',
    body: 'Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles ajudam a plataforma a lembrar quem você é entre uma página e outra (por exemplo, manter você logado) e a entender como o site é usado, para que possamos melhorá-lo.',
  },
  {
    id: 'tipos',
    heading: '2. Quais cookies usamos',
    body: 'Essenciais: necessários para o funcionamento básico da plataforma, como manter sua sessão autenticada (cookie de token de acesso) e lembrar preferências de exibição. Não podem ser desativados, pois sem eles partes essenciais do site — como o login — deixam de funcionar. De análise: usados, mediante seu consentimento, para entender de forma agregada como as pessoas navegam pelo site (páginas mais visitadas, tempo de permanência), o que nos ajuda a priorizar melhorias. De marketing: usados apenas se você consentir com essa categoria específica, para medir campanhas e personalizar comunicações. As duas categorias são independentes — aceitar análise não ativa marketing. Enquanto você não escolher, e também se recusar, nenhum cookie de análise ou de marketing é gravado: as ferramentas ficam em modo restrito, sem identificar você.',
  },
  {
    id: 'terceiros',
    heading: '3. Cookies de terceiros',
    body: 'Alguns provedores que usamos para operar a plataforma podem definir seus próprios cookies, sujeitos às políticas de privacidade deles. São eles: serviços de autenticação social (Google/LinkedIn), quando você opta por entrar com essas contas; e o Google Tag Manager, que gerencia nossas ferramentas de medição. O Google Tag Manager é carregado em todas as visitas, mas utilizamos o Consent Mode do Google: até você escolher — e depois, se recusar — ele opera em modo restrito, sem gravar cookies de análise ou de publicidade e sem identificar você. Sua escolha no banner é transmitida imediatamente a essas ferramentas e pode ser alterada a qualquer momento.',
  },
  {
    id: 'gerenciar',
    heading: '4. Como gerenciar suas preferências',
    body: 'Ao visitar o VitrinePro pela primeira vez, um banner de cookies permite aceitar todos os cookies ou recusar os não essenciais. Você pode alterar sua escolha a qualquer momento limpando os cookies do site nas configurações do seu navegador, o que fará o banner aparecer novamente. Você também pode bloquear cookies diretamente nas configurações do navegador, mas isso pode impedir o funcionamento correto do login e de outras funcionalidades essenciais.',
  },
]
</script>

<template>
  <LegalDoc title="Política de Cookies" updated="06/07/2026" :sections="sections" />
</template>
