<script setup lang="ts">
// T-H04 — Editor de vaga (nova + editar). Backend: POST/PATCH /vagas, POST /vagas/:id/publish.
// Fee/maxHunters/exclusividade da spec dependem de B4 e ficam de fora por ora.
import type { Vaga, PaginatedResult } from '~/types/vaga'
import { VAGA_SEGMENTS, VAGA_SEGMENT_LABEL, VAGA_TYPE_LABEL, VAGA_WORK_MODE_LABEL } from '~/types/vaga'

const props = defineProps<{ vagaId?: string }>()

const api = useApi()
const toast = useToast()

// --- Form state ---
const id = ref<string | null>(props.vagaId ?? null)
const slug = ref<string | null>(null)
const status = ref<string>('DRAFT')
const title = ref('')
const description = ref('')
const requirements = ref('')
const benefits = ref('')
const location = ref('')
const type = ref<string | null>(null)
const workMode = ref<string | null>(null)
const segment = ref<string | null>(null)
const salaryMin = ref<number | null>(null)
const salaryMax = ref<number | null>(null)
const deadline = ref<string | null>(null)
const contactEmail = ref('')
const allowHunters = ref(false)
const hunterContactPhone = ref('')

const segmentOptions = VAGA_SEGMENTS.map(s => ({ value: s, label: VAGA_SEGMENT_LABEL[s] }))
const typeOptions = (Object.keys(VAGA_TYPE_LABEL) as (keyof typeof VAGA_TYPE_LABEL)[]).map(t => ({ value: t, label: VAGA_TYPE_LABEL[t] }))
const workModeOptions = (Object.keys(VAGA_WORK_MODE_LABEL) as (keyof typeof VAGA_WORK_MODE_LABEL)[]).map(m => ({ value: m, label: VAGA_WORK_MODE_LABEL[m] }))

// --- Carrega vaga em modo edição (via lista /vagas/me) ---
if (props.vagaId) {
  const list = await api.get<PaginatedResult<Vaga>>('/vagas/me', { limit: 100 }).catch(() => null)
  const v = list?.data.find(x => x.id === props.vagaId)
  if (v) {
    id.value = v.id; slug.value = v.slug; status.value = v.status
    title.value = v.title; description.value = v.description ?? ''
    requirements.value = v.requirements ?? ''; benefits.value = v.benefits ?? ''
    location.value = v.location ?? ''; type.value = v.type; workMode.value = v.workMode
    segment.value = v.segment; salaryMin.value = v.salaryMin != null ? Number(v.salaryMin) : null
    salaryMax.value = v.salaryMax != null ? Number(v.salaryMax) : null
    deadline.value = v.deadline; allowHunters.value = v.allowHunters
  }
}

function payload() {
  return {
    title: title.value.trim(),
    description: description.value,
    requirements: requirements.value || undefined,
    benefits: benefits.value || undefined,
    location: location.value || undefined,
    type: type.value || undefined,
    workMode: workMode.value || undefined,
    segment: segment.value || undefined,
    salaryMin: salaryMin.value ?? undefined,
    salaryMax: salaryMax.value ?? undefined,
    deadline: deadline.value || undefined,
    contactEmail: contactEmail.value || undefined,
    allowHunters: allowHunters.value,
    hunterContactPhone: allowHunters.value ? (hunterContactPhone.value || undefined) : undefined,
  }
}

// --- Save (create or patch) ---
const saving = ref(false)
const savedAt = ref<Date | null>(null)

async function save(): Promise<boolean> {
  if (!title.value.trim()) return false
  saving.value = true
  try {
    if (id.value) {
      await api.patch(`/vagas/${id.value}`, payload())
    }
    else {
      const created = await api.post<Vaga>('/vagas', payload())
      id.value = created.id; slug.value = created.slug; status.value = created.status
    }
    savedAt.value = new Date()
    return true
  }
  catch {
    toast.error('Não foi possível salvar.')
    return false
  }
  finally {
    saving.value = false
  }
}

// Autosave (debounce) — só depois que existe um rascunho.
let timer: ReturnType<typeof setTimeout> | null = null
watch([title, description, requirements, benefits, location, type, workMode, segment, salaryMin, salaryMax, deadline, contactEmail, allowHunters, hunterContactPhone], () => {
  if (!id.value) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { save() }, 1200)
})
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

// --- Validação ---
const errors = computed(() => {
  const e: string[] = []
  if (title.value.trim().length < 8) e.push('O título precisa ter ao menos 8 caracteres.')
  if (description.value.trim().length < 100) e.push('A descrição precisa ter ao menos 100 caracteres.')
  return e
})

// --- Publicar ---
interface Usage { used: number, limit: number, cycleEnd: string }
const usage = ref<Usage | null>(null)
const confirmOpen = ref(false)
const upgradeOpen = ref(false)
const successOpen = ref(false)
const publishing = ref(false)
const triedPublish = ref(false)

async function onPublishClick() {
  triedPublish.value = true
  if (errors.value.length) { toast.error(errors.value[0]!); return }
  const ok = await save()
  if (!ok || !id.value) return
  usage.value = await api.get<Usage>('/vagas/me/usage').catch(() => null)
  confirmOpen.value = true
}

const publicLink = computed(() => slug.value ? `${useRuntimeConfig().public.frontendUrl}/vaga/${slug.value}` : '')
const confirmDesc = computed(() => {
  const u = usage.value
  const slot = u ? (u.limit === -1 ? 'publicações ilimitadas' : `${u.used + 1} de ${u.limit} publicações`) : ''
  const renova = u?.cycleEnd ? ` (renova ${new Date(u.cycleEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})` : ''
  return `Isso consome ${slot} do ciclo${renova}. A vaga ficará pública em /vaga/${slug.value}.`
})

async function doPublish() {
  if (!id.value) return
  publishing.value = true
  try {
    await api.post(`/vagas/${id.value}/publish`)
    status.value = 'PUBLISHED'
    confirmOpen.value = false
    successOpen.value = true
  }
  catch (e) {
    const err = e as { status?: number, code?: string }
    confirmOpen.value = false
    if (err.status === 403 && err.code === 'PLAN_LIMIT_REACHED') {
      upgradeOpen.value = true
    }
    else if (err.status === 409) {
      // Já está publicada — sincroniza o estado e informa.
      status.value = 'PUBLISHED'
      toast.info('Esta vaga já está publicada.')
    }
    else { toast.error('Não foi possível publicar a vaga.') }
  }
  finally {
    publishing.value = false
  }
}

function copiarLink() {
  navigator.clipboard?.writeText(publicLink.value).then(() => toast.success('Link copiado!'))
}
function compartilharLinkedIn() {
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicLink.value)}`, '_blank')
}
function irPipeline() {
  successOpen.value = false
  navigateTo(`/app/hunter/vagas/${id.value}`)
}
</script>

<template>
  <div class="editor">
    <header class="editor__head">
      <h1>{{ props.vagaId ? 'Editar vaga' : 'Nova vaga' }}</h1>
      <UiBadge :variant="status === 'PUBLISHED' ? 'success' : 'neutral'">
        {{ status === 'PUBLISHED' ? 'Publicada' : status === 'CLOSED' ? 'Encerrada' : 'Rascunho' }}
      </UiBadge>
    </header>

    <div class="editor__grid">
      <!-- Principal -->
      <main class="editor__main">
        <UiInput v-model="title" label="Título da vaga" placeholder="Ex.: Desenvolvedor(a) Full Stack Pleno" required />
        <p v-if="slug" class="editor__url">
          URL: <code>/vaga/{{ slug }}</code>
          <span v-if="status === 'PUBLISHED'" class="editor__url-fixed">· fixa (não muda ao editar o título)</span>
        </p>
        <div class="editor__field">
          <label class="editor__label">Descrição</label>
          <textarea v-model="description" class="editor__textarea" rows="8" placeholder="Descreva a vaga, responsabilidades e contexto..." />
          <span class="editor__hint">{{ description.trim().length }}/100 mínimo</span>
        </div>
        <div class="editor__field">
          <label class="editor__label">Requisitos</label>
          <textarea v-model="requirements" class="editor__textarea" rows="5" placeholder="O que é necessário para a vaga..." />
        </div>
        <div class="editor__field">
          <label class="editor__label">Benefícios</label>
          <textarea v-model="benefits" class="editor__textarea" rows="4" placeholder="Vale, plano, bônus..." />
        </div>
      </main>

      <!-- Lateral -->
      <aside class="editor__side">
        <UiCard>
          <h3 class="editor__card-title">Detalhes</h3>
          <UiInput v-model="location" label="Local" placeholder="Cidade, UF ou Remoto" />
          <UiSelect v-model="workMode" label="Modelo" :options="workModeOptions" placeholder="Selecionar" />
          <UiSelect v-model="type" label="Tipo de contrato" :options="typeOptions" placeholder="Selecionar" />
          <UiSelect v-model="segment" label="Segmento" :options="segmentOptions" placeholder="Selecionar" />
          <div class="editor__salary">
            <UiCurrencyInput v-model="salaryMin" label="Salário mín." />
            <UiCurrencyInput v-model="salaryMax" label="Salário máx." />
          </div>
          <UiDatepicker v-model="deadline" label="Prazo (deadline)" />
          <UiInput v-model="contactEmail" label="E-mail de contato" type="email" />
        </UiCard>

        <UiCard class="editor__hunters">
          <label class="editor__toggle">
            <input v-model="allowHunters" type="checkbox">
            <span><strong>Aceitar hunters nesta vaga</strong></span>
          </label>
          <template v-if="allowHunters">
            <UiInput v-model="hunterContactPhone" label="Telefone p/ hunters (WhatsApp)" type="tel" placeholder="(11) 90000-0000" />
            <p class="editor__hint">O valor do fee e limite de hunters chegam com o marketplace (em breve).</p>
          </template>
        </UiCard>
      </aside>
    </div>

    <!-- Validação visível ao tentar publicar -->
    <div v-if="triedPublish && errors.length && status !== 'PUBLISHED'" class="editor__errors" role="alert">
      <strong>Para publicar, ajuste:</strong>
      <ul><li v-for="(er, i) in errors" :key="i">{{ er }}</li></ul>
    </div>
    <p v-else-if="status === 'PUBLISHED'" class="editor__published-hint">
      ✓ Esta vaga já está publicada. Suas edições são salvas automaticamente e já valem.
    </p>

    <!-- Footer sticky -->
    <footer class="editor__footer">
      <span class="editor__autosave">
        <template v-if="saving">Salvando…</template>
        <template v-else-if="savedAt">{{ status === 'PUBLISHED' ? 'Alterações salvas ✓' : 'Rascunho salvo ✓' }}</template>
        <template v-else>Edições salvam automaticamente</template>
      </span>
      <div class="editor__footer-actions">
        <UiButton variant="secondary" :loading="saving" @click="save">
          {{ status === 'PUBLISHED' ? 'Salvar alterações' : 'Salvar rascunho' }}
        </UiButton>
        <UiButton v-if="status !== 'PUBLISHED'" @click="onPublishClick">Publicar vaga</UiButton>
        <UiButton v-else variant="secondary" @click="navigateTo(`/vaga/${slug}`)">Ver vaga publicada</UiButton>
      </div>
    </footer>

    <!-- Confirm publicar -->
    <UiConfirmDialog
      :open="confirmOpen"
      :title="`Publicar '${title}'?`"
      :description="confirmDesc"
      confirm-label="Publicar"
      :loading="publishing"
      @confirm="doPublish"
      @cancel="confirmOpen = false"
      @close="confirmOpen = false"
    />

    <!-- Sucesso -->
    <UiModal :open="successOpen" title="Vaga publicada! 🎉" size="sm" @close="irPipeline">
      <p class="text-secondary">Sua vaga está pública. Compartilhe para atrair candidatos:</p>
      <div class="editor__link-box">{{ publicLink }}</div>
      <div class="editor__success-actions">
        <UiButton variant="secondary" size="sm" @click="copiarLink">Copiar link</UiButton>
        <UiButton variant="secondary" size="sm" @click="compartilharLinkedIn">LinkedIn</UiButton>
        <UiButton size="sm" @click="navigateTo(`/vaga/${slug}`)">Ver vaga</UiButton>
      </div>
      <template #footer>
        <UiButton block @click="irPipeline">Ir para o pipeline</UiButton>
      </template>
    </UiModal>

    <!-- Modal Upgrade (limite atingido) -->
    <UiModal :open="upgradeOpen" title="Limite de publicações atingido" size="sm" @close="upgradeOpen = false">
      <p class="text-secondary">
        Você usou todas as publicações do seu plano neste ciclo<span v-if="usage"> ({{ usage.used }}/{{ usage.limit }})</span>.
        Faça upgrade para publicar mais vagas.
      </p>
      <template #footer>
        <UiButton block @click="navigateTo('/precos')">Ver planos</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.editor { padding-bottom: 96px; }
.editor__head { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-6); }
.editor__head h1 { font-size: var(--text-22); }
.editor__grid { display: grid; grid-template-columns: 1fr 360px; gap: var(--sp-6); align-items: start; }
.editor__main { display: flex; flex-direction: column; gap: var(--sp-4); }
.editor__url { font-size: var(--text-12); color: var(--ink-500); margin-top: calc(var(--sp-3) * -1); }
.editor__url code { background: var(--ink-100); padding: 1px var(--sp-2); border-radius: var(--radius-input); color: var(--ink-700); }
.editor__url-fixed { color: var(--brand-700); }
.editor__field { display: flex; flex-direction: column; gap: var(--sp-1); }
.editor__label { font-size: var(--text-14); font-weight: 500; color: var(--ink-700); }
.editor__textarea { width: 100%; border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-3); font-family: var(--font-ui); font-size: var(--text-14); resize: vertical; }
.editor__textarea:focus { outline: none; border-color: var(--brand-600); box-shadow: 0 0 0 3px var(--brand-100); }
.editor__hint { font-size: var(--text-12); color: var(--ink-500); }
.editor__side { display: flex; flex-direction: column; gap: var(--sp-4); }
.editor__card-title { font-size: var(--text-14); color: var(--ink-500); margin-bottom: var(--sp-3); }
.editor__side :deep(.field) { margin-bottom: var(--sp-3); }
.editor__salary { display: flex; gap: var(--sp-3); }
.editor__hunters .editor__toggle { display: flex; align-items: center; gap: var(--sp-2); cursor: pointer; }
.editor__toggle input { width: 18px; height: 18px; accent-color: var(--brand-600); }
.editor__footer {
  position: fixed; left: var(--sidebar-w); right: 0; bottom: 0; z-index: 30;
  background: var(--white); border-top: 1px solid var(--ink-300);
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--sp-3) var(--sp-6);
}
.editor__errors {
  background: var(--red-100); color: var(--red-500);
  border-radius: var(--radius-input); padding: var(--sp-3) var(--sp-4);
  font-size: var(--text-13); margin-top: var(--sp-4);
}
.editor__errors ul { margin: var(--sp-1) 0 0; padding-left: var(--sp-5); }
.editor__published-hint {
  background: var(--brand-100); color: var(--brand-700);
  border-radius: var(--radius-input); padding: var(--sp-3) var(--sp-4);
  font-size: var(--text-13); margin-top: var(--sp-4);
}
.editor__autosave { font-size: var(--text-13); color: var(--ink-500); }
.editor__footer-actions { display: flex; gap: var(--sp-3); }
.editor__link-box { background: var(--ink-100); border-radius: var(--radius-input); padding: var(--sp-3); font-size: var(--text-13); word-break: break-all; margin: var(--sp-3) 0; }
.editor__success-actions { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
@media (max-width: 900px) {
  .editor__grid { grid-template-columns: 1fr; }
  .editor__footer { left: 0; }
}
</style>
