<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Editar projeto — Portfólio' })
const route = useRoute()
const itemId = computed(() => route.params.id as string)
</script>

<template>
  <CandidatoPortfolioEditor :item-id="itemId" />
</template>
