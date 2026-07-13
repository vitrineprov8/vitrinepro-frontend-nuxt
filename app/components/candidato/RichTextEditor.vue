<script setup lang="ts">
// Editor rico leve (T-C07 Portfólio) — contentEditable + document.execCommand.
// Decisão de projeto: não adicionar Tiptap/Quill (sem lib instalada; exigiria
// `npm install` + restart do usuário antes de poder validar no Chrome). Suporta
// só o que o design-spec pede: negrito, itálico, lista, link. Saída é HTML puro
// (armazenado como `{ html }` no campo jsonb `content` do PortfolioItem —
// diferente do campo `bio` do perfil, que continua texto puro em toda a base).
import { Bold, Italic, List, Link2 } from 'lucide-vue-next'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const el = ref<HTMLElement | null>(null)

onMounted(() => {
  if (el.value) el.value.innerHTML = props.modelValue || ''
})
watch(() => props.modelValue, (v) => {
  if (el.value && el.value.innerHTML !== v) el.value.innerHTML = v || ''
})

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
  onInput()
}
function onInput() {
  if (el.value) emit('update:modelValue', el.value.innerHTML)
}
function addLink() {
  const url = window.prompt('URL do link:')
  if (url) exec('createLink', url)
}
</script>

<template>
  <div class="rte">
    <div class="rte__toolbar">
      <button type="button" title="Negrito" @click="exec('bold')"><Bold :size="16" /></button>
      <button type="button" title="Itálico" @click="exec('italic')"><Italic :size="16" /></button>
      <button type="button" title="Lista" @click="exec('insertUnorderedList')"><List :size="16" /></button>
      <button type="button" title="Link" @click="addLink"><Link2 :size="16" /></button>
    </div>
    <div ref="el" class="rte__body" contenteditable="true" @input="onInput" />
  </div>
</template>

<style scoped>
.rte { border: 1px solid var(--ink-300); border-radius: var(--radius-input); overflow: hidden; }
.rte__toolbar { display: flex; gap: var(--sp-1); padding: var(--sp-2); border-bottom: 1px solid var(--ink-100); background: var(--ink-100); }
.rte__toolbar button {
  width: 28px; height: 28px; border: none; background: var(--white); border-radius: var(--radius-input);
  display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-700);
}
.rte__toolbar button:hover { background: var(--brand-100); color: var(--brand-700); }
.rte__body { padding: var(--sp-3); min-height: 160px; font-size: var(--text-14); line-height: 1.6; outline: none; }
.rte__body:empty::before { content: 'Escreva sobre o projeto...'; color: var(--ink-300); }
</style>
