<script setup lang="ts">
// T-H04 — Nova vaga.
definePageMeta({ layout: 'app', middleware: 'auth' })
useHunterWorkspace()
useSeoMeta({ title: 'Nova vaga' })
</script>

<template>
  <VagaEditor />
</template>
