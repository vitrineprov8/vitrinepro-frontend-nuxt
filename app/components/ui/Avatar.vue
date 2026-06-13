<script setup lang="ts">
// UiAvatar — design-spec/00 §3.4 (imagem ou iniciais, com indicador de status opcional)
const props = withDefaults(defineProps<{
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | null
  /** persona: usado para colorir o fallback (consultoria = purple, etc.) */
  variant?: 'default' | 'purple'
}>(), { size: 'md', variant: 'default' })

const showImage = ref(!!props.src)

const initials = computed(() => {
  if (!props.name) return '?'
  const parts = props.name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
})

function onError() {
  showImage.value = false
}
</script>

<template>
  <span class="avatar" :class="[`avatar--${props.size}`, `avatar--${props.variant}`]">
    <img v-if="props.src && showImage" :src="props.src" :alt="props.name ?? 'Avatar'" @error="onError">
    <span v-else class="avatar__initials" aria-hidden="true">{{ initials }}</span>
    <span v-if="props.status" class="avatar__status" :class="`avatar__status--${props.status}`" />
    <span class="visually-hidden">{{ props.name }}</span>
  </span>
</template>

<style scoped>
.avatar {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-full); overflow: hidden; flex-shrink: 0;
  background: var(--ink-100); color: var(--ink-500); font-weight: 600;
  font-family: var(--font-display);
}
.avatar--default { background: var(--ink-100); color: var(--ink-500); }
.avatar--purple { background: var(--purple-100); color: var(--purple-500); }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar--sm { width: 28px; height: 28px; font-size: var(--text-12); }
.avatar--md { width: 36px; height: 36px; font-size: var(--text-13); }
.avatar--lg { width: 48px; height: 48px; font-size: var(--text-16); }
.avatar--xl { width: 72px; height: 72px; font-size: var(--text-22); }
.avatar__status {
  position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px;
  border-radius: var(--radius-full); border: 2px solid var(--white);
}
.avatar__status--online { background: var(--brand-600); }
.avatar__status--offline { background: var(--ink-300); }
</style>
