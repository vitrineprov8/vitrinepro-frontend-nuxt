<script setup lang="ts">
// T-E03 — Editar vaga (workspace Empresa).
definePageMeta({ layout: 'app', middleware: 'auth' })
useEmpresaWorkspace()
useSeoMeta({ title: 'Editar vaga' })

const route = useRoute()
const vagaId = route.params.id as string
</script>

<template>
  <VagaEditor :vaga-id="vagaId" base-path="/app/empresa/vagas" />
</template>
