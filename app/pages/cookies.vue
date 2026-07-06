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
    body: 'Essenciais: necessários para o funcionamento básico da plataforma, como manter sua sessão autenticada (cookie de token de acesso) e lembrar preferências de exibição. Não podem ser desativados, pois sem eles partes essenciais do site — como o login — deixam de funcionar. De análise: usados, mediante seu consentimento, para entender de forma agregada como as pessoas navegam pelo site (páginas mais visitadas, tempo de permanência), o que nos ajuda a priorizar melhorias. Ainda não usamos cookies de publicidade/remarketing de terceiros; se isso mudar no futuro, esta política será atualizada e um novo consentimento será solicitado.',
  },
  {
    id: 'terceiros',
    heading: '3. Cookies de terceiros',
    body: 'Alguns provedores que usamos para operar a plataforma (como serviços de autenticação social — Google/LinkedIn — quando você opta por entrar com essas contas) podem definir seus próprios cookies, sujeitos às políticas de privacidade desses provedores.',
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
