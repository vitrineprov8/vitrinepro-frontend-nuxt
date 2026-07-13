<script setup lang="ts">
// T-C09 — Formação. Timeline agrupada por tipo. GET/POST/PATCH/DELETE /education.
definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Formação — Candidato' })

type EducationType = 'GRADUATE' | 'POST_GRADUATE' | 'MASTER' | 'DOCTORATE' | 'CERTIFICATION' | 'COURSE'
interface Education {
  id: string
  type: EducationType
  institution: string
  title: string
  fieldOfStudy: string | null
  startDate: string
  endDate: string | null
  description: string | null
  certificateUrl: string | null
  order: number
}

const TYPE_LABEL: Record<EducationType, string> = {
  GRADUATE: 'Graduação',
  POST_GRADUATE: 'Pós-graduação',
  MASTER: 'Mestrado',
  DOCTORATE: 'Doutorado',
  CERTIFICATION: 'Certificação',
  COURSE: 'Curso',
}
const TYPE_ORDER: EducationType[] = ['GRADUATE', 'POST_GRADUATE', 'MASTER', 'DOCTORATE', 'CERTIFICATION', 'COURSE']

const api = useApi()
const toast = useToast()

const { data: items, pending, refresh } = await useAsyncData('candidato-education', () =>
  api.get<Education[]>('/education').catch(() => []))

const grouped = computed(() => {
  const groups: { type: EducationType, label: string, items: Education[] }[] = []
  for (const type of TYPE_ORDER) {
    const list = (items.value ?? []).filter(i => i.type === type)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    if (list.length) groups.push({ type, label: TYPE_LABEL[type], items: list })
  }
  return groups
})

// Datas do backend são "YYYY-MM-DD" (coluna `date`, sem hora). Passar isso por
// `new Date(str)` interpreta como UTC meia-noite; formatar depois com
// toLocaleDateString usa o fuso LOCAL do navegador — em fusos atrás de UTC
// (ex.: America/Sao_Paulo, UTC-3) isso volta um dia (e às vezes um mês) antes
// do valor real. Bug real encontrado ao validar T-C09: "02/2018" salvo virava
// "01/2018" na tela. Fix: extrair ano/mês direto da string, sem passar por Date.
function fmtMonthYear(d: string | null) {
  if (!d) return null
  const [year, month] = d.split('-')
  return `${month}/${year}`
}
function periodo(item: Education) {
  const start = fmtMonthYear(item.startDate)
  const end = item.endDate ? fmtMonthYear(item.endDate) : 'Em andamento'
  return `${start} – ${end}`
}

// ── Modal criar/editar ───────────────────────────────────────────────────────
const modalOpen = ref(false)
const editing = ref<Education | null>(null)
const form = reactive({
  type: 'GRADUATE' as EducationType,
  institution: '',
  title: '',
  fieldOfStudy: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  ongoing: false,
  description: '',
})
const typeOptions = TYPE_ORDER.map(t => ({ value: t, label: TYPE_LABEL[t] }))

function resetForm() {
  Object.assign(form, {
    type: 'GRADUATE', institution: '', title: '', fieldOfStudy: '',
    startMonth: '', startYear: '', endMonth: '', endYear: '', ongoing: false, description: '',
  })
}
function openCreate() {
  editing.value = null
  resetForm()
  modalOpen.value = true
}
function openEdit(item: Education) {
  editing.value = item
  // Mesmo cuidado de fmtMonthYear: extrai direto da string "YYYY-MM-DD",
  // sem passar por `new Date()` (evita o desvio de fuso horário).
  const [startYear, startMonth] = item.startDate.split('-')
  const [endYear, endMonth] = item.endDate ? item.endDate.split('-') : [null, null]
  Object.assign(form, {
    type: item.type,
    institution: item.institution,
    title: item.title,
    fieldOfStudy: item.fieldOfStudy ?? '',
    startMonth,
    startYear,
    endMonth: endMonth ?? '',
    endYear: endYear ?? '',
    ongoing: !item.endDate,
    description: item.description ?? '',
  })
  modalOpen.value = true
}

const saving = ref(false)
async function submitForm() {
  if (!form.institution.trim() || !form.title.trim() || !form.startMonth || !form.startYear) {
    toast.error('Preencha instituição, título e data de início.')
    return
  }
  saving.value = true
  try {
    const payload = {
      type: form.type,
      institution: form.institution.trim(),
      title: form.title.trim(),
      fieldOfStudy: form.fieldOfStudy.trim() || undefined,
      startDate: `${form.startYear}-${form.startMonth}-01`,
      endDate: !form.ongoing && form.endMonth && form.endYear ? `${form.endYear}-${form.endMonth}-01` : undefined,
      description: form.description.trim() || undefined,
    }
    if (editing.value) {
      await api.patch(`/education/${editing.value.id}`, payload)
      toast.success('Formação atualizada.')
    }
    else {
      await api.post('/education', payload)
      toast.success('Formação adicionada.')
    }
    modalOpen.value = false
    refresh()
  }
  catch {
    toast.error('Não foi possível salvar.')
  }
  finally {
    saving.value = false
  }
}

// ── Certificado ──────────────────────────────────────────────────────────────
const certInput = ref<HTMLInputElement | null>(null)
const certTargetId = ref<string | null>(null)
function pickCert(id: string) { certTargetId.value = id; certInput.value?.click() }
async function onCertSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  const id = certTargetId.value
  if (!file || !id) return
  try {
    const form2 = new FormData()
    form2.append('file', file)
    await api.post(`/education/${id}/certificate`, form2)
    toast.success('Certificado anexado.')
    refresh()
  }
  catch {
    toast.error('Não foi possível anexar o certificado.')
  }
  finally {
    if (certInput.value) certInput.value.value = ''
  }
}

// ── Excluir ──────────────────────────────────────────────────────────────────
const confirmOpen = ref(false)
const deleting = ref(false)
const toDelete = ref<Education | null>(null)
function askDelete(item: Education) {
  toDelete.value = item
  confirmOpen.value = true
}
async function confirmDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await api.del(`/education/${toDelete.value.id}`)
    toast.success('Formação removida.')
    confirmOpen.value = false
    refresh()
  }
  catch {
    toast.error('Não foi possível remover.')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="formacao">
    <h1>Meu Perfil</h1>
    <CandidatoPerfilSubnav />

    <div class="formacao__head">
      <h2>Formação</h2>
      <UiButton @click="openCreate">Adicionar formação</UiButton>
    </div>

    <div v-if="pending" class="formacao__skel-wrap">
      <div v-for="n in 3" :key="n" class="skeleton formacao__skel" />
    </div>

    <template v-else-if="grouped.length">
      <section v-for="group in grouped" :key="group.type" class="formacao__group">
        <h3>{{ group.label }}</h3>
        <ol class="timeline">
          <li v-for="item in group.items" :key="item.id" class="timeline__item">
            <div class="timeline__dot" />
            <div class="timeline__content">
              <div class="timeline__row">
                <div>
                  <strong>{{ item.title }}</strong>
                  <p class="text-secondary">{{ item.institution }}<span v-if="item.fieldOfStudy"> · {{ item.fieldOfStudy }}</span></p>
                  <p class="timeline__period">{{ periodo(item) }}</p>
                </div>
                <div class="timeline__actions">
                  <button @click="openEdit(item)">Editar</button>
                  <button class="timeline__danger" @click="askDelete(item)">Excluir</button>
                </div>
              </div>
              <p v-if="item.description" class="timeline__desc">{{ item.description }}</p>
              <a v-if="item.certificateUrl" :href="item.certificateUrl" target="_blank" rel="noopener" class="timeline__cert">📄 Certificado</a>
              <button v-else class="timeline__cert-add" @click="pickCert(item.id)">+ Anexar certificado</button>
            </div>
          </li>
        </ol>
      </section>
    </template>

    <UiEmptyState v-else title="Nenhuma formação cadastrada" description="Adicione sua formação acadêmica e certificações.">
      <template #action><UiButton @click="openCreate">Adicionar formação</UiButton></template>
    </UiEmptyState>

    <input ref="certInput" type="file" accept="application/pdf,image/*" class="hidden-input" @change="onCertSelected">

    <UiModal :open="modalOpen" :title="editing ? 'Editar formação' : 'Adicionar formação'" size="md" @close="modalOpen = false">
      <div class="formacao-form">
        <UiSelect v-model="form.type" label="Tipo" :options="typeOptions" />
        <UiInput v-model="form.institution" label="Instituição" required />
        <UiInput v-model="form.title" label="Título" placeholder="Ex.: Bacharelado em Administração" required />
        <UiInput v-model="form.fieldOfStudy" label="Área (opcional)" />
        <div class="formacao-form__dates">
          <UiInput v-model="form.startMonth" label="Mês início" placeholder="MM" />
          <UiInput v-model="form.startYear" label="Ano início" placeholder="AAAA" />
          <UiInput v-model="form.endMonth" label="Mês fim" placeholder="MM" :disabled="form.ongoing" />
          <UiInput v-model="form.endYear" label="Ano fim" placeholder="AAAA" :disabled="form.ongoing" />
        </div>
        <label class="formacao-form__check">
          <input v-model="form.ongoing" type="checkbox">
          <span>Em andamento</span>
        </label>
        <label class="formacao-form__field">
          <span class="formacao-form__label">Descrição (opcional)</span>
          <textarea v-model="form.description" rows="3" />
        </label>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="modalOpen = false">Cancelar</UiButton>
        <UiButton :loading="saving" @click="submitForm">Salvar</UiButton>
      </template>
    </UiModal>

    <UiConfirmDialog
      :open="confirmOpen"
      title="Excluir formação?"
      variant="danger"
      confirm-label="Excluir"
      :loading="deleting"
      @confirm="confirmDelete"
      @close="confirmOpen = false"
    />
  </div>
</template>

<style scoped>
.formacao h1 { font-size: var(--text-22); margin-bottom: var(--sp-4); }
.formacao__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); }
.formacao__head h2 { font-size: var(--text-18); }
.formacao__skel-wrap { display: flex; flex-direction: column; gap: var(--sp-3); }
.formacao__skel { height: 80px; border-radius: var(--radius-card); }
.formacao__group { margin-bottom: var(--sp-8); }
.formacao__group h3 { font-size: var(--text-15); color: var(--ink-500); margin-bottom: var(--sp-3); text-transform: uppercase; letter-spacing: 0.03em; }
.timeline { list-style: none; padding: 0; margin: 0; }
.timeline__item { position: relative; padding-left: var(--sp-6); padding-bottom: var(--sp-6); border-left: 2px solid var(--ink-100); }
.timeline__item:last-child { border-left-color: transparent; padding-bottom: 0; }
.timeline__dot { position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: var(--radius-full); background: var(--brand-600); }
.timeline__row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-3); }
.timeline__period { font-size: var(--text-12); color: var(--ink-500); margin-top: var(--sp-1); }
.timeline__actions { display: flex; gap: var(--sp-3); flex-shrink: 0; }
.timeline__actions button { background: none; border: none; color: var(--brand-700); font-size: var(--text-13); font-weight: 600; cursor: pointer; }
.timeline__danger { color: var(--red-500) !important; }
.timeline__desc { margin-top: var(--sp-2); color: var(--ink-700); font-size: var(--text-14); }
.timeline__cert, .timeline__cert-add {
  display: inline-flex; margin-top: var(--sp-2); font-size: var(--text-13); color: var(--brand-700);
  background: none; border: none; cursor: pointer; padding: 0; text-decoration: none; font-weight: 600;
}
.hidden-input { display: none; }
.formacao-form { display: flex; flex-direction: column; gap: var(--sp-4); }
.formacao-form__dates { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-2); }
.formacao-form__check { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--text-13); cursor: pointer; }
.formacao-form__field { display: flex; flex-direction: column; gap: var(--sp-1); }
.formacao-form__label { font-size: var(--text-13); color: var(--ink-500); font-weight: 500; }
.formacao-form__field textarea { border: 1px solid var(--ink-300); border-radius: var(--radius-input); padding: var(--sp-2) var(--sp-3); font: inherit; font-size: var(--text-14); resize: vertical; }
@media (max-width: 640px) { .formacao-form__dates { grid-template-columns: repeat(2, 1fr); } }
</style>
