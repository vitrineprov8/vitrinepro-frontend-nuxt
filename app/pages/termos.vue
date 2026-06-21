<script setup lang="ts">
// T18 — Termos de uso (placeholder).
useSeoMeta({ title: 'Termos de Uso', description: 'Termos de uso do VitrinePro.' })
const sections = [
  { id: 'aceitacao', heading: '1. Aceitação dos termos', body: 'Ao criar uma conta ou usar o VitrinePro, você concorda com estes Termos de Uso. Caso não concorde, não utilize a plataforma.' },
  { id: 'conta', heading: '2. Sua conta', body: 'Você é responsável por manter a confidencialidade das suas credenciais e por todas as atividades realizadas na sua conta.' },
  { id: 'uso', heading: '3. Uso da plataforma', body: 'Você concorda em usar o VitrinePro apenas para fins legítimos de recrutamento e candidatura, respeitando as regras da comunidade e a legislação aplicável.' },
  { id: 'marketplace', heading: '4. Marketplace e fees', body: 'Quando aplicável, o VitrinePro retém um percentual do fee sobre placements concluídos. Os valores e condições são apresentados no momento da publicação da vaga.' },
  { id: 'rescisao', heading: '5. Rescisão', body: 'Podemos suspender ou encerrar contas que violem estes termos. Você pode encerrar sua conta a qualquer momento nas configurações.' },
]
</script>

<template>
  <LegalDoc title="Termos de Uso" updated="21/06/2026" :sections="sections" />
</template>
