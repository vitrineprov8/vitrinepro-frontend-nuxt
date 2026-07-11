<script setup lang="ts">
// T-E03 — Nova vaga (workspace Empresa). Reusa VagaEditor.vue com basePath
// próprio para que o botão "ir ao pipeline" pós-criação aponte para
// /app/empresa/vagas/:id em vez do path hunter.
definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Nova vaga' })
</script>

<template>
  <VagaEditor base-path="/app/empresa/vagas" />
</template>
