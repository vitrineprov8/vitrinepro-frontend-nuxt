<script setup lang="ts">
// M2 — Modal Upgrade global (design-spec/06 §M2): "padrão única em todo o
// app" pra qualquer gatilho de limite de plano (publicar vaga, convidar
// membro, criar cliente, acessar marketplace...). Busca o plano atual e o
// próximo tier via GET /plans, mostra a comparação (atual cinza vs sugerido
// verde com diff) e manda pro checkout real (M3) com o plano já selecionado.
import type { PlanTier } from '~/stores/auth'
import type { PlanInfo } from '~/types/subscription'
import { nextTier } from '~/types/subscription'

const props = withDefaults(defineProps<{
  open: boolean
  /** Título contextual do gatilho (ex.: "Você usou suas 5 publicações deste ciclo").
   *  Se omitido, cai num título genérico. */
  title?: string
  /** Barra de uso opcional (ex.: publicações 5/5, seats 4/5). */
  usage?: { used: number, limit: number, cycleEnd?: string | null } | null
}>(), { title: undefined, usage: null })

const emit = defineEmits<{ close: [] }>()

const api = useApi()
const auth = useAuthStore()

const { data: plans } = await useAsyncData('upgrade-modal-plans', () =>
  api.get<PlanInfo[]>('/plans').catch(() => null), { server: false })

const currentTier = computed<PlanTier>(() => auth.effectivePlan)
const suggestedTier = computed<PlanTier>(() => nextTier(currentTier.value))

const currentPlan = computed(() => plans.value?.find(p => p.tier === currentTier.value))
const suggestedPlan = computed(() => plans.value?.find(p => p.tier === suggestedTier.value))

const isEnterprise = computed(() => suggestedTier.value === 'ENTERPRISE')

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}
function fmtCycleEnd(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function goUpgrade() {
  if (isEnterprise.value) {
    window.location.href = 'mailto:vendas@v8pro.com.br?subject=Plano Enterprise'
    return
  }
  emit('close')
  navigateTo(`/app/conta/assinatura/checkout?plan=${suggestedTier.value.toLowerCase()}`)
}

function verTodosOsPlanos() {
  emit('close')
  navigateTo('/precos')
}
</script>

<template>
  <UiModal :open="props.open" :title="props.title ?? 'Você atingiu o limite do seu plano'" size="md" @close="emit('close')">
    <div class="upgrade">
      <div v-if="props.usage" class="upgrade__usage">
        <div class="upgrade__bar">
          <div class="upgrade__bar-fill" :style="{ width: `${Math.min(100, (props.usage.used / Math.max(props.usage.limit, 1)) * 100)}%` }" />
        </div>
        <p class="upgrade__usage-text">
          {{ props.usage.used }}/{{ props.usage.limit }} usados
          <span v-if="props.usage.cycleEnd">· renova em {{ fmtCycleEnd(props.usage.cycleEnd) }}</span>
        </p>
      </div>

      <div v-if="currentPlan && suggestedPlan" class="upgrade__compare">
        <div class="upgrade__plan upgrade__plan--current">
          <span class="upgrade__plan-tag">Plano atual</span>
          <p class="upgrade__plan-name">{{ currentPlan.name }}</p>
          <p class="upgrade__plan-limits">
            {{ currentPlan.vagaLimit === -1 ? 'Ilimitado' : currentPlan.vagaLimit }} publicações ·
            {{ currentPlan.seatLimit === -1 ? 'Ilimitado' : currentPlan.seatLimit }} assentos
          </p>
        </div>
        <div class="upgrade__arrow">→</div>
        <div class="upgrade__plan upgrade__plan--suggested">
          <span class="upgrade__plan-tag upgrade__plan-tag--suggested">Sugerido</span>
          <p class="upgrade__plan-name">{{ suggestedPlan.name }}</p>
          <p class="upgrade__plan-limits upgrade__plan-limits--diff">
            {{ suggestedPlan.vagaLimit === -1 ? 'Ilimitado' : suggestedPlan.vagaLimit }} publicações ·
            {{ suggestedPlan.seatLimit === -1 ? 'Ilimitado' : suggestedPlan.seatLimit }} assentos
          </p>
          <ul v-if="suggestedPlan.features?.length" class="upgrade__features">
            <li v-for="f in suggestedPlan.features.slice(0, 3)" :key="f">{{ f }}</li>
          </ul>
        </div>
      </div>
      <div v-else class="skeleton" style="height: 120px;" />
    </div>

    <template #footer>
      <UiButton variant="link" size="sm" @click="verTodosOsPlanos">Ver todos os planos</UiButton>
      <UiButton :disabled="!suggestedPlan" @click="goUpgrade">
        {{ isEnterprise ? 'Falar com vendas' : `Fazer upgrade${suggestedPlan ? ` — R$ ${fmtBRL(suggestedPlan.priceBRL)}/mês` : ''}` }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.upgrade { display: flex; flex-direction: column; gap: var(--sp-5); }
.upgrade__usage { display: flex; flex-direction: column; gap: var(--sp-2); }
.upgrade__bar { height: 8px; border-radius: var(--radius-full); background: var(--ink-100); overflow: hidden; }
.upgrade__bar-fill { height: 100%; background: var(--amber-500, #f59e0b); border-radius: var(--radius-full); }
.upgrade__usage-text { font-size: var(--text-13); color: var(--ink-500); }

.upgrade__compare { display: flex; align-items: stretch; gap: var(--sp-3); }
.upgrade__plan {
  flex: 1; border-radius: var(--radius-card); padding: var(--sp-4);
  display: flex; flex-direction: column; gap: var(--sp-1);
}
.upgrade__plan--current { background: var(--ink-100); }
.upgrade__plan--suggested { background: var(--brand-100); border: 1px solid var(--brand-300, var(--brand-600)); }
.upgrade__plan-tag { font-size: var(--text-11, 11px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-500); }
.upgrade__plan-tag--suggested { color: var(--brand-700); }
.upgrade__plan-name { font-size: var(--text-16); font-weight: 700; color: var(--ink-900); }
.upgrade__plan-limits { font-size: var(--text-13); color: var(--ink-700); }
.upgrade__plan-limits--diff { color: var(--brand-700); font-weight: 600; }
.upgrade__features { list-style: none; padding: 0; margin: var(--sp-1) 0 0; display: flex; flex-direction: column; gap: 2px; }
.upgrade__features li { font-size: var(--text-12); color: var(--ink-700); }
.upgrade__features li::before { content: '✓ '; color: var(--brand-700); font-weight: 700; }
.upgrade__arrow { display: flex; align-items: center; color: var(--ink-300); font-size: var(--text-20); }

@media (max-width: 520px) {
  .upgrade__compare { flex-direction: column; }
  .upgrade__arrow { justify-content: center; transform: rotate(90deg); }
}
</style>
