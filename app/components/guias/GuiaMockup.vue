<script setup lang="ts">
import type { MockupVariant } from '~~/shared/guias'

/**
 * Maquete animada de um passo da guia (T-GUIA).
 *
 * **Por que wireframe em SVG e não screenshot real**: captura de tela envelhece
 * no primeiro ajuste de UI (e ninguém lembra de retirar a antiga), pesa centenas
 * de KB, não se adapta a mobile e não acompanha os tokens de tema. Estas
 * maquetes usam as MESMAS variáveis de `tokens.css`, então seguem o design
 * sozinhas. São propositalmente abstratas: comunicam a forma da tela, não
 * prometem ser um retrato fiel dela.
 *
 * Acessibilidade: `role="img"` + `<title>`, e toda animação morre em
 * `prefers-reduced-motion: reduce`.
 */
const props = defineProps<{
  variant: MockupVariant
  /** Texto para leitor de tela — descreve o que a cena mostra. */
  label: string
}>()

/** Cada variante desenha uma cena; agrupadas por "tipo de tela" para reuso. */
const ehLista = computed(() => ['radar', 'marketplace', 'clientes'].includes(props.variant))
</script>

<template>
  <div class="mk">
    <svg class="mk__svg" viewBox="0 0 320 200" role="img" :aria-label="label" preserveAspectRatio="xMidYMid meet">
      <title>{{ label }}</title>

      <!-- Moldura comum de "janela" -->
      <rect x="0" y="0" width="320" height="200" rx="10" class="mk__bg" />
      <rect x="0" y="0" width="320" height="26" rx="10" class="mk__bar" />
      <rect x="0" y="18" width="320" height="8" class="mk__bar" />
      <circle cx="14" cy="13" r="3" class="mk__dot" />
      <circle cx="26" cy="13" r="3" class="mk__dot" />
      <circle cx="38" cy="13" r="3" class="mk__dot" />

      <!-- ── PERFIL: avatar + campos que se preenchem ── -->
      <template v-if="variant === 'perfil'">
        <circle cx="52" cy="70" r="22" class="mk__accent-soft a1" />
        <circle cx="52" cy="64" r="8" class="mk__accent" />
        <path d="M38 84a14 14 0 0128 0z" class="mk__accent" />
        <rect x="88" y="52" width="120" height="9" rx="4" class="mk__line a2" />
        <rect x="88" y="68" width="80" height="7" rx="3" class="mk__line-soft a3" />
        <rect x="28" y="112" width="264" height="9" rx="4" class="mk__line-soft a4" />
        <rect x="28" y="130" width="200" height="9" rx="4" class="mk__line-soft a5" />
        <rect x="28" y="156" width="70" height="22" rx="6" class="mk__accent a6" />
      </template>

      <!-- ── UPLOAD: arquivo entrando na zona + barra de progresso ── -->
      <template v-else-if="variant === 'upload'">
        <rect x="28" y="46" width="264" height="96" rx="10" class="mk__dash" />
        <g class="mk__float">
          <rect x="138" y="66" width="44" height="54" rx="5" class="mk__card" />
          <path d="M168 66l14 14h-14z" class="mk__accent-soft" />
          <rect x="146" y="88" width="28" height="5" rx="2" class="mk__line-soft" />
          <rect x="146" y="98" width="20" height="5" rx="2" class="mk__line-soft" />
        </g>
        <rect x="28" y="158" width="264" height="8" rx="4" class="mk__line-soft" />
        <rect x="28" y="158" width="264" height="8" rx="4" class="mk__accent mk__progress" />
      </template>

      <!-- ── LISTAS (radar / marketplace / clientes) ── -->
      <template v-else-if="ehLista">
        <rect x="20" y="40" width="52" height="16" rx="8" class="mk__accent-soft a1" />
        <rect x="78" y="40" width="42" height="16" rx="8" class="mk__line-soft a2" />
        <rect x="126" y="40" width="58" height="16" rx="8" class="mk__line-soft a3" />
        <g v-for="(y, i) in [70, 112, 154]" :key="y" :class="`mk__row a${i + 4}`">
          <rect x="20" :y="y" width="280" height="34" rx="7" class="mk__card" />
          <rect v-if="variant === 'clientes'" x="30" :y="y + 9" width="16" height="16" rx="4" class="mk__accent-soft" />
          <circle v-else cx="38" :cy="y + 17" r="8" class="mk__accent-soft" />
          <rect x="56" :y="y + 10" width="110" height="7" rx="3" class="mk__line" />
          <rect x="56" :y="y + 21" width="70" height="6" rx="3" class="mk__line-soft" />
          <rect v-if="variant === 'marketplace'" x="238" :y="y + 11" width="52" height="14" rx="7" class="mk__accent mk__pulse" />
          <rect v-else x="256" :y="y + 12" width="34" height="12" rx="6" class="mk__line-soft" />
        </g>
      </template>

      <!-- ── CANDIDATURA: botão pressionado + confirmação ── -->
      <template v-else-if="variant === 'candidatura'">
        <rect x="28" y="44" width="264" height="66" rx="8" class="mk__card" />
        <circle cx="52" cy="70" r="12" class="mk__accent-soft" />
        <rect x="74" y="60" width="120" height="8" rx="4" class="mk__line" />
        <rect x="74" y="76" width="80" height="7" rx="3" class="mk__line-soft" />
        <rect x="104" y="128" width="112" height="28" rx="7" class="mk__accent mk__press" />
        <g class="mk__check-wrap">
          <circle cx="160" cy="142" r="16" class="mk__accent" />
          <path d="M152 142l6 6 11-12" class="mk__check" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </template>

      <!-- ── PIPELINE: card viajando entre colunas ── -->
      <template v-else-if="variant === 'pipeline'">
        <g v-for="(x, i) in [20, 112, 204]" :key="x">
          <rect :x="x" y="40" width="84" height="140" rx="8" class="mk__col" />
          <rect :x="x + 10" y="50" width="42" height="7" rx="3" class="mk__line-soft" />
          <rect v-if="i !== 1" :x="x + 10" y="68" width="64" height="24" rx="5" class="mk__card" />
          <rect v-if="i === 0" :x="x + 10" y="98" width="64" height="24" rx="5" class="mk__card" />
        </g>
        <rect x="122" y="68" width="64" height="24" rx="5" class="mk__accent mk__travel" />
      </template>

      <!-- ── VERIFICAÇÃO: documento + selo que se desenha ── -->
      <template v-else-if="variant === 'verificacao'">
        <rect x="96" y="44" width="86" height="106" rx="8" class="mk__card" />
        <rect x="110" y="60" width="58" height="7" rx="3" class="mk__line" />
        <rect x="110" y="76" width="44" height="6" rx="3" class="mk__line-soft" />
        <rect x="110" y="90" width="52" height="6" rx="3" class="mk__line-soft" />
        <rect x="110" y="104" width="36" height="6" rx="3" class="mk__line-soft" />
        <g class="mk__stamp">
          <circle cx="204" cy="128" r="26" class="mk__accent-soft" />
          <circle cx="204" cy="128" r="26" class="mk__ring" fill="none" stroke-width="3" />
          <path d="M192 128l8 9 16-19" class="mk__check" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </template>

      <!-- ── INDICAÇÃO: candidato → vaga, com consentimento ── -->
      <template v-else-if="variant === 'indicacao'">
        <rect x="20" y="66" width="94" height="62" rx="8" class="mk__card" />
        <circle cx="67" cy="90" r="12" class="mk__accent-soft" />
        <rect x="42" y="110" width="50" height="6" rx="3" class="mk__line-soft" />
        <path d="M124 97h58" class="mk__arrow" fill="none" stroke-width="3" stroke-linecap="round" />
        <path d="M176 91l8 6-8 6" class="mk__arrow" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="196" y="66" width="104" height="62" rx="8" class="mk__card" />
        <rect x="210" y="80" width="62" height="7" rx="3" class="mk__line" />
        <rect x="210" y="94" width="44" height="6" rx="3" class="mk__line-soft" />
        <rect x="210" y="108" width="54" height="10" rx="5" class="mk__accent-soft" />
        <g class="mk__consent">
          <rect x="112" y="150" width="96" height="22" rx="6" class="mk__accent" />
          <path d="M126 161l5 5 9-10" class="mk__check" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <rect x="148" y="158" width="46" height="7" rx="3" class="mk__on-accent" />
        </g>
      </template>

      <!-- ── GANHOS / FATURAMENTO: barras que crescem ── -->
      <template v-else-if="variant === 'ganhos' || variant === 'faturamento'">
        <rect x="24" y="40" width="76" height="10" rx="5" class="mk__line" />
        <rect x="24" y="56" width="52" height="16" rx="6" class="mk__accent-soft" />
        <g v-for="(b, i) in [{ x: 28, h: 42 }, { x: 82, h: 66 }, { x: 136, h: 54 }, { x: 190, h: 88 }, { x: 244, h: 74 }]" :key="b.x">
          <rect
            :x="b.x" :y="176 - b.h" width="42" :height="b.h" rx="5"
            :class="`mk__bar-grow ${i === 3 ? 'mk__accent' : 'mk__accent-soft'} a${i + 1}`"
            :style="`--h:${b.h}px; transform-origin: ${b.x + 21}px 176px`"
          />
        </g>
        <path d="M20 176h284" class="mk__axis" stroke-width="1.5" />
      </template>

      <!-- ── VAGA NOVA: formulário que se preenche ── -->
      <template v-else-if="variant === 'vaga-nova'">
        <rect x="28" y="44" width="60" height="7" rx="3" class="mk__line-soft" />
        <rect x="28" y="56" width="264" height="24" rx="6" class="mk__field" />
        <rect x="36" y="65" width="0" height="7" rx="3" class="mk__accent mk__type a1" />
        <rect x="28" y="90" width="46" height="7" rx="3" class="mk__line-soft" />
        <rect x="28" y="102" width="264" height="38" rx="6" class="mk__field" />
        <rect x="36" y="112" width="0" height="6" rx="3" class="mk__line mk__type a2" />
        <rect x="36" y="124" width="0" height="6" rx="3" class="mk__line mk__type a3" />
        <rect x="204" y="154" width="88" height="26" rx="7" class="mk__accent a4" />
      </template>

      <!-- ── FEE: percentual em destaque ── -->
      <template v-else-if="variant === 'fee'">
        <rect x="28" y="44" width="264" height="52" rx="8" class="mk__card" />
        <rect x="42" y="58" width="90" height="8" rx="4" class="mk__line" />
        <rect x="42" y="74" width="60" height="7" rx="3" class="mk__line-soft" />
        <rect x="212" y="60" width="66" height="24" rx="12" class="mk__accent mk__pulse" />
        <rect x="28" y="112" width="264" height="10" rx="5" class="mk__line-soft" />
        <rect x="28" y="112" width="150" height="10" rx="5" class="mk__accent mk__slide" />
        <circle cx="178" cy="117" r="11" class="mk__knob mk__slide" />
        <rect x="28" y="142" width="120" height="7" rx="3" class="mk__line-soft" />
      </template>

      <!-- ── AVALIAÇÃO: estrelas que acendem ── -->
      <template v-else-if="variant === 'avaliacao'">
        <rect x="28" y="44" width="264" height="46" rx="8" class="mk__card" />
        <circle cx="52" cy="67" r="13" class="mk__accent-soft" />
        <rect x="76" y="58" width="96" height="8" rx="4" class="mk__line" />
        <rect x="76" y="72" width="62" height="6" rx="3" class="mk__line-soft" />
        <g v-for="(x, i) in [70, 108, 146, 184, 222]" :key="x" :class="`mk__star a${i + 1}`">
          <path
            :d="`M${x} 116l7 14 15 2-11 11 3 15-14-7-14 7 3-15-11-11 15-2z`"
            class="mk__accent"
          />
        </g>
        <rect x="96" y="166" width="128" height="8" rx="4" class="mk__line-soft" />
      </template>

      <!-- ── TIME: membros com papéis ── -->
      <template v-else-if="variant === 'time'">
        <g v-for="(y, i) in [48, 92, 136]" :key="y" :class="`mk__row a${i + 1}`">
          <rect x="24" :y="y" width="272" height="36" rx="7" class="mk__card" />
          <circle cx="46" :cy="y + 18" r="12" :class="i === 0 ? 'mk__accent' : 'mk__accent-soft'" />
          <rect x="68" :y="y + 10" width="96" height="7" rx="3" class="mk__line" />
          <rect x="68" :y="y + 22" width="60" height="6" rx="3" class="mk__line-soft" />
          <rect x="216" :y="y + 12" width="64" height="14" rx="7" :class="i === 0 ? 'mk__accent-soft' : 'mk__line-soft'" />
        </g>
      </template>

      <!-- ── SEGURANÇA: celular com código + escudo ── -->
      <template v-else-if="variant === 'seguranca'">
        <rect x="42" y="42" width="86" height="140" rx="12" class="mk__card" />
        <rect x="52" y="58" width="66" height="8" rx="4" class="mk__line-soft" />
        <g v-for="(x, i) in [56, 78, 100]" :key="x">
          <rect :x="x" y="82" width="16" height="22" rx="4" :class="`mk__accent mk__digit a${i + 1}`" />
        </g>
        <g v-for="(x, i) in [56, 78, 100]" :key="`b${x}`">
          <rect :x="x" y="112" width="16" height="22" rx="4" :class="`mk__accent mk__digit a${i + 4}`" />
        </g>
        <rect x="56" y="150" width="60" height="16" rx="6" class="mk__accent-soft" />
        <g class="mk__shield">
          <path d="M212 52l40 14v34c0 26-18 42-40 50-22-8-40-24-40-50V66z" class="mk__accent-soft" />
          <path d="M212 52l40 14v34c0 26-18 42-40 50-22-8-40-24-40-50V66z" class="mk__ring" fill="none" stroke-width="3" />
          <path d="M196 108l11 12 22-26" class="mk__check" fill="none" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </template>
    </svg>
  </div>
</template>

<style scoped>
.mk { width: 100%; }
.mk__svg { width: 100%; height: auto; display: block; }

/* ── Paleta: cinzas dos tokens + um acento herdado do pai (--mk-accent) ── */
.mk__bg { fill: var(--white); stroke: var(--ink-100); stroke-width: 1; }
.mk__bar { fill: var(--ink-100); }
.mk__dot { fill: var(--ink-300); }
.mk__card { fill: var(--white); stroke: var(--ink-100); stroke-width: 1.5; }
.mk__col { fill: var(--ink-100); opacity: .5; }
.mk__field { fill: var(--white); stroke: var(--ink-300); stroke-width: 1.5; }
.mk__line { fill: var(--ink-300); }
.mk__line-soft { fill: var(--ink-100); }
.mk__dash { fill: none; stroke: var(--ink-300); stroke-width: 2; stroke-dasharray: 7 6; }
.mk__axis { stroke: var(--ink-100); }
.mk__arrow { stroke: var(--ink-300); }
.mk__knob { fill: var(--white); stroke: var(--mk-accent); stroke-width: 3; }
.mk__accent { fill: var(--mk-accent); }
.mk__accent-soft { fill: var(--mk-accent-soft); }
.mk__ring { stroke: var(--mk-accent); }
.mk__check { stroke: var(--white); }
.mk__on-accent { fill: var(--white); opacity: .85; }

/* ── Animações ── */
@keyframes mkIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes mkFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes mkProgress { 0% { width: 0; } 70%, 100% { width: 264px; } }
@keyframes mkTravel { 0%, 12% { transform: translateX(-92px); } 45%, 62% { transform: translateX(0); } 92%, 100% { transform: translateX(92px); } }
@keyframes mkPulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes mkPress { 0%, 60%, 100% { transform: scale(1); } 70% { transform: scale(.94); } }
@keyframes mkCheckIn { 0%, 55% { opacity: 0; transform: scale(.6); } 75%, 100% { opacity: 1; transform: scale(1); } }
@keyframes mkStamp { 0%, 30% { opacity: 0; transform: scale(.5) rotate(-18deg); } 55%, 100% { opacity: 1; transform: scale(1) rotate(-8deg); } }
@keyframes mkGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes mkType { from { width: 0; } to { width: var(--w, 150px); } }
@keyframes mkSlide { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-26px); } }
@keyframes mkStar { 0%, 40% { opacity: .18; transform: scale(.8); } 60%, 100% { opacity: 1; transform: scale(1); } }
@keyframes mkDigit { 0%, 45% { opacity: .2; } 60%, 100% { opacity: 1; } }
@keyframes mkShield { 0% { opacity: 0; transform: scale(.85); } 100% { opacity: 1; transform: scale(1); } }

.mk__svg :is(.a1, .a2, .a3, .a4, .a5, .a6) { animation: mkIn .5s both; }
.a1 { animation-delay: .05s; } .a2 { animation-delay: .13s; } .a3 { animation-delay: .21s; }
.a4 { animation-delay: .29s; } .a5 { animation-delay: .37s; } .a6 { animation-delay: .45s; }

.mk__float { animation: mkFloat 3.2s ease-in-out infinite; }
.mk__progress { animation: mkProgress 3s ease-in-out infinite; }
.mk__travel { animation: mkTravel 4.5s ease-in-out infinite; }
.mk__pulse { animation: mkPulse 2.4s ease-in-out infinite; }
.mk__press { animation: mkPress 3s ease-in-out infinite; transform-origin: 160px 142px; }
.mk__check-wrap { animation: mkCheckIn 3s ease-in-out infinite; transform-origin: 160px 142px; }
.mk__stamp { animation: mkStamp 3.4s ease-in-out infinite; transform-origin: 204px 128px; }
.mk__bar-grow { animation: mkGrow .8s cubic-bezier(.34, 1.3, .64, 1) both; }
.mk__type { animation: mkType 1.6s steps(14) both; }
.mk__type.a1 { --w: 168px; } .mk__type.a2 { --w: 236px; } .mk__type.a3 { --w: 180px; }
.mk__slide { animation: mkSlide 3.6s ease-in-out infinite; }
.mk__star { animation: mkStar 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.mk__star.a1 { animation-delay: 0s; } .mk__star.a2 { animation-delay: .12s; }
.mk__star.a3 { animation-delay: .24s; } .mk__star.a4 { animation-delay: .36s; }
.mk__star.a5 { animation-delay: .48s; }
.mk__digit { animation: mkDigit 2.6s ease-in-out infinite; }
.mk__shield { animation: mkShield .6s .3s both; transform-origin: 212px 100px; }
.mk__consent { animation: mkIn .5s .5s both; }
.mk__row { animation: mkIn .5s both; }

/* Sem movimento: tudo estático no estado final. Requisito de acessibilidade,
   não enfeite — animação em loop é gatilho real para quem tem sensibilidade
   vestibular. */
@media (prefers-reduced-motion: reduce) {
  .mk__svg *, .mk__svg :is(.a1, .a2, .a3, .a4, .a5, .a6) {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .mk__progress { width: 264px; }
  .mk__type.a1 { width: 168px; } .mk__type.a2 { width: 236px; } .mk__type.a3 { width: 180px; }
}
</style>
