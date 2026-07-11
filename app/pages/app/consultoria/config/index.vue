<script setup lang="ts">
// T-T08 — Configurações (Workspace Consultoria). Tabs: Perfil da consultoria
// · Pipeline padrão do time.
//
// Fora do escopo v1 (documentado em CLAUDE.md):
//  - Plano & cobrança: atalho removido — usuário já acessa via menu de conta.
//  - Zona de perigo (transferir propriedade / excluir consultoria): não
//    implementado nesta fase — ação destrutiva/sensível que requer fluxo
//    próprio de confirmação; adiado para v2.
//
// Ressalva também documentada: "Pipeline padrão do time" na verdade edita o
// template pessoal do ATOR (/me/pipeline-template), pois o schema atual
// mantém 1 template por usuário, não por time — mesma limitação usada em
// T-T04 (Pipeline Geral).
import type { Team } from '~/types/team'
import PipelineStagesModal, { type PipelineStage } from '~/components/PipelineStagesModal.vue'

definePageMeta({ layout: 'app', middleware: 'auth' })
useConsultoriaWorkspace()
useSeoMeta({ title: 'Configurações' })

const api = useApi()
const toast = useToast()
const auth = useAuthStore()

const { data: team, refresh: refreshTeam } = await useAsyncData('consultoria-config-team', () =>
  api.get<Team>('/me/team').catch(() => null))

const isOwner = computed(() => team.value && auth.user && team.value.ownerId === auth.user.id)

const tab = ref<'perfil' | 'pipeline'>('perfil')
const tabs = [
  { value: 'perfil', label: 'Perfil da consultoria' },
  { value: 'pipeline', label: 'Pipeline padrão' },
]

// --- Perfil ---
const form = reactive({ name: '', logoUrl: '', cnpj: '', bio: '' })
watch(team, (t) => {
  if (!t) return
  Object.assign(form, { name: t.name, logoUrl: t.logoUrl ?? '', cnpj: t.cnpj ?? '', bio: t.bio ?? '' })
}, { immediate: true })

const saving = ref(false)
async function salvarPerfil() {
  if (!form.name.trim()) { toast.error('Informe o nome da consultoria.'); return }
  saving.value = true
  try {
    await api.patch('/me/team', {
      name: form.name.trim(),
      logoUrl: form.logoUrl.trim() || undefined,
      cnpj: form.cnpj.trim() || undefined,
      bio: form.bio.trim() || undefined,
    })
    toast.success('Perfil da consultoria atualizado.')
    await refreshTeam()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível salvar. Apenas o proprietário pode editar o perfil.')
  }
  finally {
    saving.value = false
  }
}

// --- Pipeline padrão ---
const { data: template } = await useAsyncData('consultoria-config-template', () =>
  api.get<{ stages: PipelineStage[] }>('/me/pipeline-template').catch(() => null))
const stages = computed<PipelineStage[]>(() => (template.value?.stages ?? []).slice().sort((a, b) => a.order - b.order))
const pipelineModalOpen = ref(false)
function onSaved(newStages: PipelineStage[]) {
  if (template.value) template.value.stages = newStages
}
</script>

<template>
  <div class="config">
    <header class="config__header">
      <h1>Configurações</h1>
    </header>

    <UiTabs v-model="tab" :tabs="tabs" class="config__tabs" />

    <div v-if="tab === 'perfil'" class="config__panel">
      <p v-if="!isOwner" class="config__readonly">Apenas o proprietário da consultoria pode editar o perfil.</p>
      <div class="form">
        <UiInput v-model="form.name" label="Nome da consultoria" required :disabled="!isOwner" />
        <UiInput v-model="form.logoUrl" label="Logo (URL)" placeholder="https://..." :disabled="!isOwner" />
        <UiInput v-model="form.cnpj" label="CNPJ" placeholder="00.000.000/0000-00" :disabled="!isOwner" />
        <div class="field">
          <label class="field__label">Bio pública</label>
          <textarea v-model="form.bio" class="textarea" rows="4" :disabled="!isOwner" placeholder="Aparece como selo 'by {Consultoria}' nos perfis dos membros." />
        </div>
        <UiButton v-if="isOwner" :loading="saving" class="config__save" @click="salvarPerfil">Salvar perfil</UiButton>
      </div>
    </div>

    <div v-else class="config__panel">
      <p class="config__hint">Estas etapas são usadas como padrão para todas as vagas que você cria ou gerencia diretamente no time.</p>
      <div class="config__stages-preview">
        <span v-for="s in stages" :key="s.id" class="config__stage-chip" :style="{ borderColor: s.color || 'var(--ink-300)' }">
          <span class="config__stage-dot" :style="{ background: s.color || 'var(--ink-300)' }" />
          {{ s.label }}
        </span>
      </div>
      <UiButton variant="secondary" @click="pipelineModalOpen = true">Configurar etapas</UiButton>
    </div>

    <PipelineStagesModal :open="pipelineModalOpen" :stages="stages" @close="pipelineModalOpen = false" @saved="onSaved" />
  </div>
</template>

<style scoped>
.config__header h1 { font-size: var(--text-22); margin-bottom: var(--sp-2); }
.config__tabs { margin: var(--sp-4) 0 var(--sp-5); }
.config__panel { max-width: 560px; }
.config__readonly { font-size: var(--text-13); color: var(--ink-500); margin-bottom: var(--sp-3); }
.form { display: flex; flex-direction: column; gap: var(--sp-4); }
.field { display: flex; flex-direction: column; gap: var(--sp-1); }
.field__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.config__save { align-self: flex-start; }
.config__hint { font-size: var(--text-13); color: var(--ink-500); margin-bottom: var(--sp-4); }
.config__stages-preview { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-4); }
.config__stage-chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--ink-300); border-radius: var(--radius-full); padding: 4px 12px; font-size: var(--text-13); color: var(--ink-700); }
.config__stage-dot { width: 8px; height: 8px; border-radius: var(--radius-full); }
</style>
