<script setup lang="ts">
// T-T03 — Nova vaga (Workspace Consultoria). Reusa VagaEditor.vue com o card
// "Cliente" (showClientSelector) e basePath próprio.
definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Nova vaga — Consultoria' })
</script>

<template>
  <VagaEditor base-path="/app/consultoria/vagas" show-client-selector />
</template>
