<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import type { GuiaPasso } from '~~/shared/guias'

/**
 * Um passo da guia: número, título, UMA linha de texto e a maquete animada.
 * Layout alterna lado a lado (par/ímpar) no desktop e empilha no mobile.
 */
const props = defineProps<{ passo: GuiaPasso, numero: number, total: number }>()

/**
 * Revelação no scroll.
 *
 * **Por que NÃO usa IntersectionObserver** (a escolha óbvia, testada e
 * descartada com bug real): o IO só dispara ao *cruzar* um threshold. Num salto
 * instantâneo — `Ctrl+End`, âncora, ou restauração de scroll ao recarregar — o
 * elemento vai de "não intersecta (abaixo)" para "não intersecta (acima)" sem
 * que nenhum frame amostrado o pegue visível: **nenhum callback dispara e o
 * passo fica invisível para sempre**. Reproduzido: 2 de 6 passos ficavam
 * mortos após um `scrollTo` até o fim.
 *
 * Um listener de scroll passivo com guarda de `requestAnimationFrame` cobre
 * todos os casos (evento de scroll dispara mesmo em salto instantâneo), custa
 * praticamente nada e se remove sozinho depois de revelar.
 *
 * O estado inicial "escondido" só é aplicado quando há JS E o usuário aceita
 * movimento — sem isso, quem tem JS desligado ou `prefers-reduced-motion`
 * veria a página em branco para sempre.
 */
const el = ref<HTMLElement | null>(null)
const visivel = ref(true)

onMounted(() => {
  const querMovimento = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!querMovimento) return

  visivel.value = false
  let agendado = false

  const limpar = () => {
    window.removeEventListener('scroll', aoMover)
    window.removeEventListener('resize', aoMover)
  }

  const checar = () => {
    if (!el.value) return
    // Revela quando o topo do passo entra na janela (com uma folga de 60px para
    // não animar exatamente na borda). `top < innerHeight` também é verdadeiro
    // para quem já passou (top negativo) — é isso que salva o salto instantâneo.
    if (el.value.getBoundingClientRect().top < window.innerHeight - 60) {
      visivel.value = true
      limpar()
    }
  }

  function aoMover() {
    if (agendado) return
    agendado = true
    requestAnimationFrame(() => { agendado = false; checar() })
  }

  window.addEventListener('scroll', aoMover, { passive: true })
  window.addEventListener('resize', aoMover, { passive: true })
  checar() // estado inicial, antes de qualquer scroll
  onBeforeUnmount(limpar)
})
</script>

<template>
  <li ref="el" class="passo" :class="{ 'passo--on': visivel }">
    <div class="passo__texto">
      <span class="passo__num" aria-hidden="true">{{ numero }}</span>
      <h3 class="passo__titulo">{{ props.passo.titulo }}</h3>
      <p class="passo__linha">{{ props.passo.texto }}</p>
      <NuxtLink v-if="props.passo.rota" :to="props.passo.rota" class="passo__cta">
        Ir para esta tela <ArrowRight :size="15" />
      </NuxtLink>
    </div>

    <div class="passo__visual">
      <GuiasGuiaMockup
        :variant="props.passo.mockup"
        :label="`Passo ${numero} de ${total}: ${props.passo.titulo}`"
      />
    </div>
  </li>
</template>

<style scoped>
.passo {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: var(--sp-10);
  align-items: center;
  padding: var(--sp-8) 0;
}
/* Alterna o lado da maquete para a página não virar uma coluna monótona. */
.passo:nth-child(even) .passo__visual { order: -1; }

.passo__texto { display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-2); }
.passo__num {
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: var(--radius-full);
  background: var(--mk-accent-soft); color: var(--mk-accent);
  font-family: var(--font-display); font-size: var(--text-16); font-weight: 700;
  margin-bottom: var(--sp-1);
}
.passo__titulo { font-size: var(--text-22); line-height: 1.25; }
.passo__linha { font-size: var(--text-16); color: var(--ink-700); line-height: 1.5; max-width: 42ch; }
.passo__cta {
  display: inline-flex; align-items: center; gap: var(--sp-1);
  margin-top: var(--sp-2); font-size: var(--text-14); font-weight: 600;
  color: var(--mk-accent);
}
.passo__cta:hover { text-decoration: none; opacity: .78; }

/* Entrada: a maquete vem do lado oposto ao texto. */
.passo__texto, .passo__visual { transition: opacity .55s ease, transform .55s cubic-bezier(.22, .9, .34, 1); }
.passo:not(.passo--on) .passo__texto { opacity: 0; transform: translateY(14px); }
.passo:not(.passo--on) .passo__visual { opacity: 0; transform: translateY(14px) scale(.97); }

@media (max-width: 860px) {
  .passo { grid-template-columns: 1fr; gap: var(--sp-5); padding: var(--sp-6) 0; }
  /* No mobile a maquete sempre vem DEPOIS do texto: ler primeiro, ver depois. */
  .passo:nth-child(even) .passo__visual { order: 0; }
  .passo__titulo { font-size: var(--text-18); }
  .passo__linha { font-size: var(--text-14); }
}
@media (prefers-reduced-motion: reduce) {
  .passo__texto, .passo__visual { transition: none; }
}
</style>
