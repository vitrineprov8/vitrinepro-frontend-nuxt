<script setup lang="ts">
// T-T03 — Editar vaga (Workspace Consultoria).
definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Editar vaga — Consultoria' })

const route = useRoute()
const vagaId = route.params.id as string
</script>

<template>
  <VagaEditor :vaga-id="vagaId" base-path="/app/consultoria/vagas" show-client-selector />
</template>
