<script setup lang="ts">
// T-H10 — Compartilhar processo. Backend: POST/DELETE /applications/:id/share.
// O backend gera o token; montamos a URL pública local (frontendUrl) em vez da retornada (domínio prod).
const props = defineProps<{ open: boolean, applicationId: string }>()
const emit = defineEmits<{ close: [] }>()

const api = useApi()
const toast = useToast()
const frontendUrl = useRuntimeConfig().public.frontendUrl

interface ShareLink { token: string, url: string, expiresInDays: number, createdAt: string }
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

// Sem endpoint de listagem no backend → mostramos os links gerados nesta sessão.
const links = ref<ShareLink[]>([])
const generating = ref(false)

async function gerar() {
  generating.value = true
  try {
    const res = await api.post<{ token: string }>(`/applications/${props.applicationId}/share`, { expiresInDays: validade.value })
    links.value.unshift({
      token: res.token,
      url: `${frontendUrl}/processo/${res.token}`,
      expiresInDays: validade.value,
      createdAt: new Date().toISOString(),
    })
    toast.success('Link gerado.')
  }
  catch { toast.error('Não foi possível gerar o link.') }
  finally { generating.value = false }
}

async function revogar(token: string) {
  try {
    await api.del(`/applications/${props.applicationId}/share/${token}`)
    links.value = links.value.filter(l => l.token !== token)
    toast.info('Link revogado.')
  }
  catch { toast.error('Não foi possível revogar.') }
}

function copiar(url: string) {
  navigator.clipboard?.writeText(url).then(() => toast.success('Link copiado!'))
}
</script>

<template>
  <UiModal :open="open" title="Compartilhar processo" size="md" @close="emit('close')">
    <p class="share__hint">Gere um link público somente-leitura do processo deste candidato.</p>

    <div class="share__form">
      <UiSelect v-model="validadeModel" label="Validade do link" :options="validadeOptions" />
      <UiButton :loading="generating" @click="gerar">Gerar link</UiButton>
    </div>

    <div v-if="links.length" class="share__links">
      <div v-for="l in links" :key="l.token" class="share__link">
        <div class="share__link-info">
          <code class="share__url">{{ l.url }}</code>
          <span class="share__meta">Expira em {{ l.expiresInDays }} dias</span>
        </div>
        <div class="share__link-actions">
          <UiButton size="sm" variant="secondary" @click="copiar(l.url)">Copiar</UiButton>
          <UiButton size="sm" variant="ghost" class="share__revoke" @click="revogar(l.token)">Revogar</UiButton>
        </div>
      </div>
    </div>
    <p v-else class="share__empty">Nenhum link gerado nesta sessão.</p>
  </UiModal>
</template>

<style scoped>
.share__hint { color: var(--ink-500); font-size: var(--text-13); margin-bottom: var(--sp-4); }
.share__form { display: flex; gap: var(--sp-3); align-items: flex-end; }
.share__form > :first-child { flex: 1; }
.share__links { margin-top: var(--sp-5); display: flex; flex-direction: column; gap: var(--sp-2); }
.share__link { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-3); border: 1px solid var(--ink-100); border-radius: var(--radius-input); }
.share__url { font-size: var(--text-12); color: var(--ink-700); word-break: break-all; }
.share__meta { display: block; font-size: var(--text-12); color: var(--ink-500); margin-top: 2px; }
.share__link-actions { display: flex; gap: var(--sp-2); flex-shrink: 0; }
.share__revoke { color: var(--red-500); }
.share__empty { margin-top: var(--sp-4); color: var(--ink-500); font-size: var(--text-13); }
</style>
