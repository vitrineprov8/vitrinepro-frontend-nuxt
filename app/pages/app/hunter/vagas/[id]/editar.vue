<script setup lang="ts">
// T-H04 — Editar vaga.
definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()
useSeoMeta({ title: 'Editar vaga' })

const route = useRoute()
const vagaId = route.params.id as string
</script>

<template>
  <VagaEditor :vaga-id="vagaId" />
</template>
