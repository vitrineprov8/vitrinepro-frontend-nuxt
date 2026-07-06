<script setup lang="ts">
// F2 — placeholder do workspace Empresa (Fase 3 ainda não construída).
// Sem isso, toda conta `isCompany` caía em 404 logo após o login/cadastro.
definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Workspace Empresa' })

const nav = useState<{ label: string, to: string }[]>('workspace-nav')
const label = useState<string>('workspace-label')
nav.value = [{ label: 'Início', to: '/app/empresa' }]
label.value = 'Empresa'

const auth = useAuthStore()
</script>

<template>
  <div>
    <UiEmptyState
      title="Workspace Empresa em construção"
      description="Estamos terminando as telas de vagas, pipeline e faturamento para contas empresa. Enquanto isso, você pode gerenciar sua página pública ou falar com o time."
    >
      <template #action>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
          <UiButton v-if="auth.user?.username" variant="secondary" @click="navigateTo(`/empresa/${auth.user.username}`)">
            Ver minha página pública
          </UiButton>
          <UiButton @click="navigateTo('/precos')">Ver planos</UiButton>
        </div>
      </template>
    </UiEmptyState>
  </div>
</template>
