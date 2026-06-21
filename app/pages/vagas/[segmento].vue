<script setup lang="ts">
// T05 — Lista de vagas por segmento. Slug inválido → 404.
import { segmentFromSlug, VAGA_SEGMENT_LABEL } from '~/types/vaga'

const route = useRoute()
const seg = segmentFromSlug(route.params.segmento as string)
if (!seg) {
  throw createError({ statusCode: 404, statusMessage: 'Segmento não encontrado', fatal: true })
}

useSeoMeta({
  title: `Vagas de ${VAGA_SEGMENT_LABEL[seg]}`,
  description: `Vagas abertas de ${VAGA_SEGMENT_LABEL[seg]} no VitrinePro. Filtre por cidade, tipo de contrato e modelo de trabalho.`,
})
</script>

<template>
  <VagasListing :locked-segment="seg" />
</template>
