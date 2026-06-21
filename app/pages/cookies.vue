<script setup lang="ts">
// T18 — Política de cookies (placeholder).
useSeoMeta({ title: 'Política de Cookies', description: 'Como o VitrinePro usa cookies.' })
const sections = [
  { id: 'o-que-sao', heading: '1. O que são cookies', body: 'Cookies são pequenos arquivos armazenados no seu navegador que ajudam a plataforma a funcionar e a lembrar suas preferências.' },
  { id: 'tipos', heading: '2. Tipos de cookies', body: 'Essenciais (necessários para o funcionamento), de análise (entender o uso) e de marketing (personalizar comunicações). Os essenciais não podem ser desativados.' },
  { id: 'gerenciar', heading: '3. Como gerenciar', body: 'Você pode aceitar ou configurar suas preferências no banner de cookies, e alterá-las depois nas configurações do navegador.' },
]
</script>

<template>
  <LegalDoc title="Política de Cookies" updated="21/06/2026" :sections="sections" />
</template>
