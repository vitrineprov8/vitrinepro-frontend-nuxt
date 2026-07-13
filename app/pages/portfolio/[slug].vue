<script setup lang="ts">
// F7 — Detalhe de item de portfólio. perfil/[username].vue linkava para cá
// e dava 404 (página não existia). Backend: GET /portfolio/:slug (público,
// OptionalJwtAuthGuard — 404 se DRAFT e não for o dono).
interface PortfolioOwner {
  id: string
  firstName: string
  lastName: string
  username: string | null
  avatarUrl: string | null
  profession: string | null
}
interface PortfolioFile {
  id: string
  fileUrl: string
  fileType: 'IMAGE' | 'PDF'
  caption: string | null
  originalFilename: string | null
}
interface PortfolioTag { id: string, name: string }
interface PortfolioDetail {
  id: string
  title: string
  subtitle: string | null
  slug: string
  /** T-C07 — HTML gerado pelo editor rico leve (negrito/itálico/lista/link). */
  content: { html?: string } | null
  coverImageUrl: string | null
  clientName: string | null
  year: number | null
  duration: string | null
  role: string | null
  projectStatus: 'ONGOING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | null
  externalUrl: string | null
  tags: PortfolioTag[]
  files: PortfolioFile[]
  user: PortfolioOwner
}

const route = useRoute()
const api = useApi()
const slug = computed(() => route.params.slug as string)

const { data: item } = await useAsyncData(`portfolio-${slug.value}`, () =>
  api.get<PortfolioDetail>(`/portfolio/${slug.value}`).catch(() => null))

if (!item.value) {
  throw createError({ statusCode: 404, statusMessage: 'Item de portfólio não encontrado', fatal: true })
}

useSeoMeta({
  title: () => item.value ? `${item.value.title} — Portfólio` : 'Portfólio',
  description: () => item.value?.subtitle ?? undefined,
  ogImage: () => item.value?.coverImageUrl ?? undefined,
})

const statusLabel: Record<string, string> = {
  ONGOING: 'Em andamento',
  COMPLETED: 'Concluído',
  PAUSED: 'Pausado',
  CANCELLED: 'Cancelado',
}

const ownerName = computed(() => {
  const u = item.value?.user
  return u ? `${u.firstName} ${u.lastName ?? ''}`.trim() : ''
})
</script>

<template>
  <div v-if="item" class="pfd container">
    <NuxtLink v-if="item.user.username" :to="`/perfil/${item.user.username}`" class="pfd__back">
      ← Voltar ao perfil de {{ ownerName }}
    </NuxtLink>

    <div v-if="item.coverImageUrl" class="pfd__cover" :style="{ backgroundImage: `url(${item.coverImageUrl})` }" />

    <header class="pfd__header">
      <h1>{{ item.title }}</h1>
      <p v-if="item.subtitle" class="text-secondary">{{ item.subtitle }}</p>

      <div class="pfd__meta">
        <UiBadge v-if="item.projectStatus" variant="info">{{ statusLabel[item.projectStatus] }}</UiBadge>
        <span v-if="item.clientName">{{ item.clientName }}</span>
        <span v-if="item.year">{{ item.year }}</span>
        <span v-if="item.duration">{{ item.duration }}</span>
        <span v-if="item.role">{{ item.role }}</span>
      </div>

      <div v-if="item.tags?.length" class="pfd__tags">
        <UiBadge v-for="tag in item.tags" :key="tag.id" variant="neutral">{{ tag.name }}</UiBadge>
      </div>

      <a v-if="item.externalUrl" :href="item.externalUrl" target="_blank" rel="noopener noreferrer" class="pfd__external">
        Ver projeto original ↗
      </a>
    </header>

    <!-- T-C07 — corpo do projeto (editor rico leve: negrito/itálico/lista/link).
         Conteúdo é autoral do próprio dono via toolbar limitada (não é HTML livre
         de terceiros) — mesmo nível de confiança de outras áreas já renderizadas
         como texto do próprio usuário no app. -->
    <section v-if="item.content?.html" class="pfd__content" v-html="item.content.html" />

    <section v-if="item.files?.length" class="pfd__gallery">
      <template v-for="file in item.files" :key="file.id">
        <img v-if="file.fileType === 'IMAGE'" :src="file.fileUrl" :alt="file.caption ?? item.title" class="pfd__image">
        <a v-else :href="file.fileUrl" target="_blank" rel="noopener noreferrer" class="pfd__pdf">
          📄 {{ file.originalFilename ?? file.caption ?? 'Ver PDF' }}
        </a>
      </template>
    </section>

    <footer v-if="item.user.username" class="pfd__author">
      <img v-if="item.user.avatarUrl" :src="item.user.avatarUrl" :alt="ownerName" class="pfd__author-avatar">
      <span v-else class="pfd__author-avatar pfd__author-avatar--fallback">{{ item.user.firstName?.[0] }}</span>
      <div>
        <strong>{{ ownerName }}</strong>
        <p v-if="item.user.profession" class="text-secondary">{{ item.user.profession }}</p>
      </div>
      <UiButton variant="secondary" @click="navigateTo(`/perfil/${item.user.username}`)">Ver perfil</UiButton>
    </footer>
  </div>
</template>

<style scoped>
.pfd { padding: var(--sp-8) 0 var(--sp-16); max-width: 820px; }
.pfd__back { display: inline-block; margin-bottom: var(--sp-5); font-size: var(--text-14); color: var(--ink-500); }
.pfd__cover {
  width: 100%; aspect-ratio: 16/9; background-size: cover; background-position: center;
  border-radius: var(--radius-card); margin-bottom: var(--sp-6); background-color: var(--ink-100);
}
.pfd__header h1 { margin-bottom: var(--sp-2); }
.pfd__meta { display: flex; gap: var(--sp-3); flex-wrap: wrap; align-items: center; margin: var(--sp-3) 0; font-size: var(--text-14); color: var(--ink-500); }
.pfd__tags { display: flex; gap: var(--sp-2); flex-wrap: wrap; margin-bottom: var(--sp-3); }
.pfd__external { font-size: var(--text-14); color: var(--brand-700); font-weight: 600; }
.pfd__content { margin-top: var(--sp-6); font-size: var(--text-15); line-height: 1.7; color: var(--ink-700); }
.pfd__content :deep(ul) { padding-left: var(--sp-6); }
.pfd__content :deep(a) { color: var(--brand-700); }
.pfd__gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-3); margin-top: var(--sp-8); }
.pfd__image { width: 100%; border-radius: var(--radius-card); object-fit: cover; }
.pfd__pdf {
  display: flex; align-items: center; padding: var(--sp-4); background: var(--ink-100);
  border-radius: var(--radius-card); font-size: var(--text-14);
}
.pfd__author {
  display: flex; align-items: center; gap: var(--sp-3); margin-top: var(--sp-10);
  padding-top: var(--sp-6); border-top: 1px solid var(--ink-100);
}
.pfd__author > div { flex: 1; }
.pfd__author-avatar { width: 48px; height: 48px; border-radius: var(--radius-full); object-fit: cover; }
.pfd__author-avatar--fallback {
  background: var(--brand-100); color: var(--brand-700); display: flex;
  align-items: center; justify-content: center; font-weight: 600;
}
@media (max-width: 640px) { .pfd__gallery { grid-template-columns: 1fr; } }
</style>
