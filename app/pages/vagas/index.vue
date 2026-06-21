<script setup lang="ts">
// T05 — Lista de vagas (todos os segmentos). SSR + SEO.
useSeoMeta({
  title: 'Vagas abertas',
  description: 'Encontre vagas abertas no VitrinePro. Filtre por segmento, cidade, tipo de contrato e modelo de trabalho.',
})
</script>

<template>
  <VagasListing />
</template>
