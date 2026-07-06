<script setup lang="ts">
// T-H10 — Compartilhar processo. Backend: GET/POST/DELETE /applications/:id/share.
// B18 — antes não havia endpoint de listagem; os links só viviam na sessão e
// sumiam ao recarregar. Agora carregamos do backend ao abrir o modal.
const props = defineProps<{ open: boolean, applicationId: string }>()
const emit = defineEmits<{ close: [] }>()

const api = useApi()
const toast = useToast()

interface ShareLink { token: string, url: string, expiresAt: string | null, revokedAt: string | null, createdAt: string, isActive: boolean }
const validade = ref(30)
const validadeOptions = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: '365', label: '1 ano' },
]
const validadeModel = computed({
  get: () => String(validade.value),
  set: (v: string | null) => { validade.value = Number(v) || 30 },
})

const links = ref<ShareLink[]>([])
const loading = ref(false)
const generating = ref(false)

async function carregar() {
  loading.value = true
  try {
    links.value = await api.get<ShareLink[]>(`/applications/${props.applicationId}/share`)
  }
  catch { links.value = [] }
  finally { loading.value = false }
}

watch(() => props.open, (o) => { if (o) carregar() })

async function gerar() {
  generating.value = true
  try {
    await api.post<{ token: string }>(`/applications/${props.applicationId}/share`, { expiresInDays: validade.value })
    toast.success('Link gerado.')
    await carregar()
  }
  catch { toast.error('Não foi possível gerar o link.') }
  finally { generating.value = false }
}

async function revogar(token: string) {
  try {
    await api.del(`/applications/${props.applicationId}/share/${token}`)
    toast.info('Link revogado.')
    await carregar()
  }
  catch { toast.error('Não foi possível revogar.') }
}

function copiar(url: string) {
  navigator.clipboard?.writeText(url).then(() => toast.success('Link copiado!'))
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <UiModal :open="open" title="Compartilhar processo" size="md" @close="emit('close')">
    <p class="share__hint">Gere um link público somente-leitura do processo deste candidato.</p>

    <div class="share__form">
      <UiSelect v-model="validadeModel" label="Validade do link" :options="validadeOptions" />
      <UiButton :loading="generating" @click="gerar">Gerar link</UiButton>
    </div>

    <p v-if="loading" class="share__empty">Carregando links...</p>
    <div v-else-if="links.length" class="share__links">
      <div v-for="l in links" :key="l.token" class="share__link" :class="{ 'share__link--inactive': !l.isActive }">
        <div class="share__link-info">
          <code class="share__url">{{ l.url }}</code>
          <span class="share__meta">
            <UiBadge v-if="l.revokedAt" variant="neutral">Revogado</UiBadge>
            <UiBadge v-else-if="!l.isActive" variant="warning">Expirado</UiBadge>
            <UiBadge v-else variant="success">Ativo</UiBadge>
            <span v-if="l.expiresAt"> · expira em {{ fmt(l.expiresAt) }}</span>
            <span v-else> · nunca expira</span>
          </span>
        </div>
        <div v-if="l.isActive" class="share__link-actions">
          <UiButton size="sm" variant="secondary" @click="copiar(l.url)">Copiar</UiButton>
          <UiButton size="sm" variant="ghost" class="share__revoke" @click="revogar(l.token)">Revogar</UiButton>
        </div>
      </div>
    </div>
    <p v-else class="share__empty">Nenhum link gerado ainda.</p>
  </UiModal>
</template>

<style scoped>
.share__hint { color: var(--ink-500); font-size: var(--text-13); margin-bottom: var(--sp-4); }
.share__form { display: flex; gap: var(--sp-3); align-items: flex-end; }
.share__form > :first-child { flex: 1; }
.share__links { margin-top: var(--sp-5); display: flex; flex-direction: column; gap: var(--sp-2); }
.share__link { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-3); border: 1px solid var(--ink-100); border-radius: var(--radius-input); }
.share__link--inactive { opacity: 0.6; }
.share__url { font-size: var(--text-12); color: var(--ink-700); word-break: break-all; }
.share__meta { display: block; font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
.share__link-actions { display: flex; gap: var(--sp-2); flex-shrink: 0; }
.share__revoke { color: var(--red-500); }
.share__empty { margin-top: var(--sp-4); color: var(--ink-500); font-size: var(--text-13); }
</style>
