<script setup lang="ts">
// T18 — Política de privacidade (placeholder).
useSeoMeta({ title: 'Política de Privacidade', description: 'Como o VitrinePro trata seus dados pessoais (LGPD).' })
const sections = [
  { id: 'dados', heading: '1. Dados que coletamos', body: 'Coletamos dados de cadastro (nome, e-mail), dados de perfil profissional e dados de uso da plataforma para oferecer e melhorar o serviço.' },
  { id: 'uso', heading: '2. Como usamos seus dados', body: 'Usamos seus dados para conectar profissionais, hunters e empresas, processar candidaturas e operar o marketplace. Não vendemos seus dados.' },
  { id: 'lgpd', heading: '3. Seus direitos (LGPD)', body: 'Você pode acessar, corrigir, exportar ou excluir seus dados, além de controlar a visibilidade do seu perfil a qualquer momento.' },
  { id: 'cookies', heading: '4. Cookies', body: 'Usamos cookies essenciais e, mediante consentimento, cookies de análise e marketing. Veja a Política de Cookies para detalhes.' },
  { id: 'contato', heading: '5. Contato', body: 'Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale com nosso encarregado de dados pelo e-mail de suporte.' },
]
</script>

<template>
  <LegalDoc title="Política de Privacidade" updated="21/06/2026" :sections="sections" />
</template>
