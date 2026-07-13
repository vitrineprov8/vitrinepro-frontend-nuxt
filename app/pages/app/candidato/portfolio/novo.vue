<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Novo projeto — Portfólio' })
</script>

<template>
  <CandidatoPortfolioEditor />
</template>
