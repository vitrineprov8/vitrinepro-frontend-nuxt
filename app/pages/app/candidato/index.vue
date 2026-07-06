<script setup lang="ts">
// F2 — placeholder do workspace Candidato (Fase 3 ainda não construída).
// Sem isso, toda conta persona=candidato caía em 404 logo após login/cadastro.
definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Workspace Candidato' })

const nav = useState<{ label: string, to: string }[]>('workspace-nav')
const label = useState<string>('workspace-label')
nav.value = [{ label: 'Início', to: '/app/candidato' }]
label.value = 'Candidato'

const auth = useAuthStore()
</script>

<template>
  <div>
    <UiEmptyState
      title="Workspace Candidato em construção"
      description="Estamos terminando o radar de vagas, candidaturas e perfil para candidatos. Enquanto isso, você já pode explorar as vagas publicadas."
    >
      <template #action>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
          <UiButton v-if="auth.user?.username" variant="secondary" @click="navigateTo(`/perfil/${auth.user.username}`)">
            Ver meu perfil público
          </UiButton>
          <UiButton @click="navigateTo('/vagas')">Ver vagas</UiButton>
        </div>
      </template>
    </UiEmptyState>
  </div>
</template>
