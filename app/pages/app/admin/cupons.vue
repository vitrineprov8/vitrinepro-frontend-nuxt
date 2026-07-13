<script setup lang="ts">
// A5 — Cupons (design-spec/06 §A). Tab "Resgates pendentes" (backend já
// existia) + tab "Cupons de campanha" (CRUD novo desta rodada, migração
// A5CouponCampaigns1750100000000 adicionou validade/limite de usos).
import type { AdminCouponRedemption, AdminCouponCampaign, DiscountType } from '~/types/admin'
import type { TableColumn } from '~/components/ui/Table.vue'

interface CampaignsResponse { data: AdminCouponCampaign[], total: number, page: number, lastPage: number }

definePageMeta({ layout: 'app', middleware: 'admin' })
useAdminWorkspace()
useSeoMeta({ title: 'Cupons — Admin' })

const api = useApi()
const toast = useToast()

const tab = ref<'resgates' | 'campanhas'>('resgates')
const tabs = [
  { value: 'resgates', label: 'Resgates pendentes' },
  { value: 'campanhas', label: 'Cupons de campanha' },
]

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}
function discountLabel(type: DiscountType, value: number | string) {
  return type === 'PERCENT' ? `${value}%` : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// --- Tab 1: Resgates pendentes ---
const { data: redemptions, pending: pendingRed, refresh: refreshRed } = await useAsyncData('admin-coupon-redemptions', () =>
  api.get<AdminCouponRedemption[]>('/admin/coupons/redemptions').catch(() => []))
const acting = ref<string | null>(null)

async function validar(r: AdminCouponRedemption) {
  acting.value = r.id
  try {
    await api.post(`/admin/coupons/redemptions/${r.id}/validate`)
    toast.success('Resgate validado — +30 dias concedidos ao dono do cupom.')
    await refreshRed()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível validar.')
  }
  finally { acting.value = null }
}
async function rejeitar(r: AdminCouponRedemption) {
  acting.value = r.id
  try {
    await api.post(`/admin/coupons/redemptions/${r.id}/reject`)
    toast.success('Resgate rejeitado.')
    await refreshRed()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível rejeitar.')
  }
  finally { acting.value = null }
}

// --- Tab 2: Cupons de campanha (CRUD) ---
const page = ref(1)
const { data: campResp, pending: pendingCamp, refresh: refreshCamp } = await useAsyncData('admin-coupon-campaigns', () =>
  api.get<CampaignsResponse>('/admin/coupons/campaigns', { page: page.value, limit: 20 }).catch(() => null),
{ watch: [page] })
const campaigns = computed<AdminCouponCampaign[]>(() => campResp.value?.data ?? [])

const campColumns: TableColumn[] = [
  { key: 'code', label: 'Código' },
  { key: 'discount', label: 'Desconto' },
  { key: 'validity', label: 'Validade' },
  { key: 'usage', label: 'Uso', align: 'right' },
  { key: 'isActive', label: 'Status', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
]

const editingCampaign = ref<AdminCouponCampaign | null>(null)
const creating = ref(false)
const form = ref({ code: '', discountType: 'PERCENT' as DiscountType, discountValue: '', validFrom: '', validUntil: '', usageLimit: '' })
const savingCampaign = ref(false)

function openCreate() {
  editingCampaign.value = null
  creating.value = true
  form.value = { code: '', discountType: 'PERCENT', discountValue: '', validFrom: '', validUntil: '', usageLimit: '' }
}
function openEditCampaign(c: AdminCouponCampaign) {
  editingCampaign.value = c
  creating.value = true
  form.value = {
    code: c.code,
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
    validUntil: c.validUntil ? c.validUntil.slice(0, 10) : '',
    usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
  }
}

const discountTypeOptions = [
  { value: 'PERCENT', label: 'Percentual (%)' },
  { value: 'FIXED', label: 'Valor fixo (R$)' },
]

async function salvarCampanha() {
  if (!form.value.code.trim() || !form.value.discountValue) return
  savingCampaign.value = true
  try {
    const body = {
      code: form.value.code.trim().toUpperCase(),
      discountType: form.value.discountType,
      discountValue: Number(form.value.discountValue),
      validFrom: form.value.validFrom || undefined,
      validUntil: form.value.validUntil || undefined,
      usageLimit: form.value.usageLimit ? Number(form.value.usageLimit) : undefined,
    }
    if (editingCampaign.value) {
      await api.patch(`/admin/coupons/campaigns/${editingCampaign.value.id}`, body)
      toast.success('Cupom atualizado.')
    }
    else {
      await api.post('/admin/coupons/campaigns', body)
      toast.success('Cupom de campanha criado.')
    }
    creating.value = false
    await refreshCamp()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível salvar o cupom.')
  }
  finally { savingCampaign.value = false }
}

const toggling = ref<string | null>(null)
async function toggleCampanha(c: AdminCouponCampaign) {
  toggling.value = c.id
  try {
    await api.post(`/admin/coupons/campaigns/${c.id}/toggle`)
    toast.success(c.isActive ? 'Cupom desativado.' : 'Cupom ativado.')
    await refreshCamp()
  }
  catch (e) {
    const err = e as { message?: string }
    toast.error(err.message || 'Não foi possível alterar o status.')
  }
  finally { toggling.value = null }
}
</script>

<template>
  <div class="cup">
    <header class="cup__header">
      <h1>Cupons</h1>
      <p class="cup__sub">Resgates de indicação aguardando validação e cupons de campanha promocional.</p>
    </header>

    <UiTabs v-model="tab" :tabs="tabs" />

    <div v-if="tab === 'resgates'" class="cup__tab">
      <div v-if="pendingRed" class="cup__skel">
        <div v-for="n in 3" :key="n" class="skeleton cup__skel-row" />
      </div>
      <UiEmptyState
        v-else-if="!redemptions?.length"
        title="Nenhum resgate pendente"
        description="Quando alguém usar um cupom de indicação num checkout, o resgate aparece aqui para validação."
      />
      <ul v-else class="cup__list">
        <li v-for="r in redemptions" :key="r.id" class="cup__item">
          <div class="cup__item-info">
            <strong>{{ r.coupon?.code }}</strong>
            <span class="cup__muted">
              Dono: {{ r.coupon?.owner ? `${r.coupon.owner.firstName} ${r.coupon.owner.lastName}` : '—' }}
              · Usado por: {{ r.redeemedBy ? `${r.redeemedBy.firstName} ${r.redeemedBy.lastName}` : '—' }}
              · {{ fmt(r.createdAt) }}
            </span>
          </div>
          <div class="cup__btns">
            <UiButton size="sm" variant="danger" :disabled="acting === r.id" @click="rejeitar(r)">Rejeitar</UiButton>
            <UiButton size="sm" :loading="acting === r.id" @click="validar(r)">Validar</UiButton>
          </div>
        </li>
      </ul>
    </div>

    <div v-else class="cup__tab">
      <div class="cup__camp-header">
        <UiButton size="sm" @click="openCreate">+ Novo cupom</UiButton>
      </div>

      <UiTable :columns="campColumns" :rows="campaigns as unknown as Record<string, unknown>[]" :loading="pendingCamp" empty-title="Nenhum cupom de campanha criado">
        <template #cell-code="{ row }">
          <strong>{{ row.code }}</strong>
        </template>
        <template #cell-discount="{ row }">
          {{ discountLabel((row as AdminCouponCampaign).discountType, (row as AdminCouponCampaign).discountValue) }}
        </template>
        <template #cell-validity="{ row }">
          <span class="cup__muted">{{ fmt((row as AdminCouponCampaign).validFrom) }} — {{ fmt((row as AdminCouponCampaign).validUntil) }}</span>
        </template>
        <template #cell-usage="{ row }">
          {{ (row as AdminCouponCampaign).usageCount }}{{ (row as AdminCouponCampaign).usageLimit != null ? ` / ${(row as AdminCouponCampaign).usageLimit}` : '' }}
        </template>
        <template #cell-isActive="{ row }">
          <UiBadge :variant="(row as AdminCouponCampaign).isActive ? 'success' : 'neutral'">
            {{ (row as AdminCouponCampaign).isActive ? 'Ativo' : 'Inativo' }}
          </UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="cup__btns">
            <UiButton size="sm" variant="ghost" @click="openEditCampaign(row as AdminCouponCampaign)">Editar</UiButton>
            <UiButton
              size="sm" variant="secondary" :loading="toggling === (row as AdminCouponCampaign).id"
              @click="toggleCampanha(row as AdminCouponCampaign)"
            >
              {{ (row as AdminCouponCampaign).isActive ? 'Desativar' : 'Ativar' }}
            </UiButton>
          </div>
        </template>
      </UiTable>

      <UiPagination
        v-if="campResp && campResp.lastPage > 1"
        :page="page" :last-page="campResp.lastPage" :total="campResp.total"
        @update:page="page = $event"
      />
    </div>

    <UiModal :open="creating" :title="editingCampaign ? 'Editar cupom' : 'Novo cupom de campanha'" size="md" @close="creating = false">
      <div class="cup__form">
        <UiInput v-model="form.code" label="Código" placeholder="Ex.: BLACKFRIDAY30" required />
        <div class="cup__form-row">
          <UiSelect v-model="form.discountType" :options="discountTypeOptions" label="Tipo de desconto" />
          <UiInput v-model="form.discountValue" type="number" label="Valor" placeholder="30" required />
        </div>
        <div class="cup__form-row">
          <UiInput v-model="form.validFrom" type="text" label="Válido a partir de (opcional)" placeholder="AAAA-MM-DD" />
          <UiInput v-model="form.validUntil" type="text" label="Válido até (opcional)" placeholder="AAAA-MM-DD" />
        </div>
        <UiInput v-model="form.usageLimit" type="number" label="Limite de usos (opcional)" placeholder="Ilimitado" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="creating = false">Cancelar</UiButton>
        <UiButton :loading="savingCampaign" :disabled="!form.code.trim() || !form.discountValue" @click="salvarCampanha">
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.cup__header h1 { font-size: var(--text-22); }
.cup__sub { font-size: var(--text-13); color: var(--ink-500); margin-top: var(--sp-1); margin-bottom: var(--sp-4); }
.cup__tab { margin-top: var(--sp-4); }
.cup__skel { display: flex; flex-direction: column; gap: var(--sp-2); }
.cup__skel-row { height: 64px; border-radius: var(--radius-input); }
.cup__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
.cup__item { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); background: var(--white); border: 1px solid var(--ink-100); border-radius: var(--radius-card); padding: var(--sp-4); flex-wrap: wrap; }
.cup__item-info { display: flex; flex-direction: column; gap: 2px; }
.cup__muted { font-size: var(--text-13); color: var(--ink-500); }
.cup__btns { display: flex; gap: var(--sp-2); }
.cup__camp-header { display: flex; justify-content: flex-end; margin-bottom: var(--sp-3); }
.cup__form { display: flex; flex-direction: column; gap: var(--sp-3); }
.cup__form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
</style>
