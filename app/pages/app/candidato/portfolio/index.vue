<script setup lang="ts">
// T-C07 — Portfólio (lista). GET /portfolio?userId=<próprio> devolve rascunhos+publicados
// (owner query — ver comentário de segurança em portfolio.service.ts::findAll).
interface PortfolioListItem {
  id: string
  title: string
  subtitle: string | null
  slug: string
  coverImageUrl: string | null
  clientName: string | null
  year: number | null
  projectStatus: string | null
  status: 'DRAFT' | 'PUBLISHED'
  tags: { id: string, name: string }[]
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

definePageMeta({ layout: 'app', middleware: 'auth' })
useCandidatoWorkspace()
useSeoMeta({ title: 'Portfólio — Candidato' })

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

// F16b (2026-07-16) — bug real: `auth.user` só é populado pelo fetchMe() do
// layout `app.vue`, chamado em onMounted() — ou seja, roda DEPOIS do setup
// desta página. Numa navegação direta/hard-reload pra /app/candidato/portfolio
// (ou /portfolio/novo, /portfolio/[id]), `auth.user` ainda é null aqui, o que
// fazia essa query cair sempre no fallback vazio (Promise.resolve({data:[]})),
// mostrando "Mostre seu trabalho" (vazio) mesmo com projetos já salvos no
// backend. Sem retry depois (nenhum watch em auth.user), o vazio ficava
// permanente até uma navegação client-side por outra página. Fix: garante
// auth.user carregado (aguarda fetchMe() se preciso) antes de montar a query.
if (!auth.user) await auth.fetchMe()

const { data, pending, refresh } = await useAsyncData('candidato-portfolio-list', () =>
  auth.user
    ? api.get<{ data: PortfolioListItem[] }>('/portfolio', { userId: auth.user.id, limit: 100 }).catch(() => ({ data: [] }))
    : Promise.resolve({ data: [] }),
)
const items = computed(() => data.value?.data ?? [])

const openMenu = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenu.value = openMenu.value === id ? null : id
}

// F18 (2026-07-16) — bug UX reportado pelo Andres: clicar no card não levava
// a lugar nenhum (único grid de cards do app sem navegação — todos os outros
// usam NuxtLink ou @click na linha/card). Clique no card → editor do projeto;
// ações do menu "⋯" protegidas com @click.stop pra não disparar a navegação.
function openItem(item: PortfolioListItem) {
  navigateTo(`/app/candidato/portfolio/${item.id}`)
}
// Projeto publicado ganha "Ver página pública" no menu (abre a URL pública
// /portfolio/:slug em nova aba — o que um visitante do perfil vê).
function openPublic(item: PortfolioListItem) {
  openMenu.value = null
  window.open(`/portfolio/${item.slug}`, '_blank', 'noopener')
}

async function togglePublish(item: PortfolioListItem) {
  openMenu.value = null
  try {
    await api.patch(`/portfolio/${item.id}`, { status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })
    toast.success(item.status === 'PUBLISHED' ? 'Projeto despublicado.' : 'Projeto publicado.')
    refresh()
  }
  catch {
    toast.error('Não foi possível atualizar o status.')
  }
}

const confirmDeleteOpen = ref(false)
const deleting = ref(false)
const toDelete = ref<PortfolioListItem | null>(null)
function askDelete(item: PortfolioListItem) {
  openMenu.value = null
  toDelete.value = item
  confirmDeleteOpen.value = true
}
async function confirmDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await api.del(`/portfolio/${toDelete.value.id}`)
    toast.success('Projeto excluído.')
    confirmDeleteOpen.value = false
    refresh()
  }
  catch {
    toast.error('Não foi possível excluir.')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="portfolio">
    <h1>Meu Perfil</h1>
    <CandidatoPerfilSubnav />

    <div class="portfolio__head">
      <h2>Portfólio</h2>
      <UiButton @click="navigateTo('/app/candidato/portfolio/novo')">Novo projeto</UiButton>
    </div>

    <div v-if="pending" class="portfolio__grid">
      <div v-for="n in 3" :key="n" class="skeleton portfolio__skel" />
    </div>

    <div v-else-if="items.length" class="portfolio__grid">
      <UiCard v-for="item in items" :key="item.id" clickable class="portfolio__card" @click="openItem(item)">
        <div class="portfolio__cover" :style="item.coverImageUrl ? { backgroundImage: `url(${item.coverImageUrl})` } : undefined" />
        <div class="portfolio__body">
          <div class="portfolio__body-head">
            <h3>{{ item.title }}</h3>
            <UiBadge :variant="item.status === 'PUBLISHED' ? 'success' : 'neutral'">
              {{ item.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho' }}
            </UiBadge>
          </div>
          <p v-if="item.subtitle" class="text-secondary">{{ item.subtitle }}</p>

          <div class="portfolio__menu-wrap" @click.stop>
            <button class="portfolio__menu-btn" aria-label="Ações do projeto" @click="toggleMenu(item.id)">⋯</button>
            <div v-if="openMenu === item.id" class="portfolio__menu">
              <button @click="navigateTo(`/app/candidato/portfolio/${item.id}`)">Editar</button>
              <button v-if="item.status === 'PUBLISHED'" @click="openPublic(item)">Ver página pública ↗</button>
              <button @click="togglePublish(item)">{{ item.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar' }}</button>
              <button class="portfolio__menu-danger" @click="askDelete(item)">Excluir</button>
            </div>
          </div>
        </div>
      </UiCard>
    </div>

    <UiEmptyState v-else title="Mostre seu trabalho" description="Crie projetos de portfólio para se destacar no seu perfil público.">
      <template #action><UiButton @click="navigateTo('/app/candidato/portfolio/novo')">Novo projeto</UiButton></template>
    </UiEmptyState>

    <UiConfirmDialog
      :open="confirmDeleteOpen"
      title="Excluir projeto?"
      description="Se o projeto estiver publicado, o link público passará a mostrar 'removido' (tombstone) em vez de 404."
      variant="danger"
      confirm-label="Excluir"
      :loading="deleting"
      @confirm="confirmDelete"
      @close="confirmDeleteOpen = false"
    />
  </div>
</template>

<style scoped>
.portfolio h1 { font-size: var(--text-22); margin-bottom: var(--sp-4); }
.portfolio__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); }
.portfolio__head h2 { font-size: var(--text-18); }
.portfolio__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
.portfolio__skel { height: 240px; border-radius: var(--radius-card); }
/* F16c (2026-07-16) — bug real: overflow:hidden aqui clipava o dropdown
   .portfolio__menu (absolute, descendente de .portfolio__card) porque
   overflow:hidden num ancestral corta qualquer filho que ultrapasse a
   caixa, independente de z-index. O overflow só existia pra arredondar
   os cantos de cima do .portfolio__cover — então movemos o clip pra lá. */
.portfolio__card { padding: 0; }
.portfolio__cover {
  aspect-ratio: 16/9; background-size: cover; background-position: center; background-color: var(--ink-100);
  border-radius: var(--radius-card) var(--radius-card) 0 0;
}
.portfolio__body { padding: var(--sp-4); position: relative; }
.portfolio__body-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-2); }
.portfolio__body-head h3 { font-size: var(--text-16); }
.portfolio__menu-wrap { position: absolute; top: var(--sp-3); right: var(--sp-3); }
.portfolio__menu-btn { background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-full); width: 28px; height: 28px; cursor: pointer; }
.portfolio__menu {
  position: absolute; right: 0; top: 32px; background: var(--white); border: 1px solid var(--ink-100);
  border-radius: var(--radius-card); box-shadow: var(--shadow-md); z-index: 5; display: flex; flex-direction: column; min-width: 140px;
}
.portfolio__menu button { text-align: left; padding: var(--sp-2) var(--sp-3); background: none; border: none; cursor: pointer; font-size: var(--text-13); }
.portfolio__menu button:hover { background: var(--ink-100); }
.portfolio__menu-danger { color: var(--red-500); }
@media (max-width: 1100px) { .portfolio__grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .portfolio__grid { grid-template-columns: 1fr; } }
</style>
