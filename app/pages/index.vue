<script setup lang="ts">
// T01 — Home marketing (VitrinePro). Spec: design-spec/01_SITE_PUBLICO_E_AUTH.md §T01
import type { Vaga, PaginatedResult } from '~/types/vaga'

useSeoMeta({
  title: 'O hub do recrutador brasileiro',
  description: 'O ATS gratuito do recrutador brasileiro + o marketplace que paga por placement.',
})

const api = useApi()

interface HomeStats { openVagas: number, professionals: number, companies: number }

// Vagas em destaque — dados REAIS de GET /vagas; cai para mock se vier vazio/offline.
const { data: vagasResp } = await useAsyncData('home-vagas-destaque', () =>
  api.get<PaginatedResult<Vaga>>('/vagas', { limit: 6 }).catch(() => null),
)

// Mock de fallback (apenas exibição quando não há dados do backend).
const vagasMock: Vaga[] = [
  { id: 'm1', title: 'Desenvolvedor(a) Full Stack Pleno', slug: 'dev-full-stack-pleno', description: '', requirements: null, benefits: null, location: 'São Paulo, SP', type: 'CLT', workMode: 'REMOTE', salaryMin: 8000, salaryMax: 12000, deadline: null, status: 'PUBLISHED', publishedAt: null, segment: 'TECNOLOGIA', allowHunters: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm2', title: 'Executivo(a) de Vendas B2B', slug: 'executivo-vendas-b2b', description: '', requirements: null, benefits: null, location: 'Rio de Janeiro, RJ', type: 'CLT', workMode: 'HYBRID', salaryMin: 4500, salaryMax: 7000, deadline: null, status: 'PUBLISHED', publishedAt: null, segment: 'COMERCIO_VENDAS', allowHunters: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm3', title: 'Analista de RH', slug: 'analista-de-rh', description: '', requirements: null, benefits: null, location: 'Belo Horizonte, MG', type: 'CLT', workMode: 'ONSITE', salaryMin: 3500, salaryMax: 5000, deadline: null, status: 'PUBLISHED', publishedAt: null, segment: 'RH', allowHunters: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm4', title: 'Designer de Produto (UX/UI)', slug: 'designer-de-produto-ux-ui', description: '', requirements: null, benefits: null, location: 'Remoto', type: 'PJ', workMode: 'REMOTE', salaryMin: 7000, salaryMax: 10000, deadline: null, status: 'PUBLISHED', publishedAt: null, segment: 'TECNOLOGIA', allowHunters: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm5', title: 'Coordenador(a) de Logística', slug: 'coordenador-logistica', description: '', requirements: null, benefits: null, location: 'Curitiba, PR', type: 'CLT', workMode: 'ONSITE', salaryMin: 6000, salaryMax: 8500, deadline: null, status: 'PUBLISHED', publishedAt: null, segment: 'LOGISTICA_TRANSPORTE', allowHunters: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm6', title: 'Analista Financeiro Sênior', slug: 'analista-financeiro-senior', description: '', requirements: null, benefits: null, location: 'São Paulo, SP', type: 'CLT', workMode: 'HYBRID', salaryMin: 9000, salaryMax: 13000, deadline: null, status: 'PUBLISHED', publishedAt: null, segment: 'FINANCAS_CONTABILIDADE', allowHunters: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]
const usandoVagasMock = computed(() => !(vagasResp.value?.data?.length))
const vagas = computed<Vaga[]>(() => vagasResp.value?.data?.length ? vagasResp.value.data : vagasMock)

// Contadores públicos — REAIS de GET /stats/home (gap B12 parcial); mock se offline/zerado.
const { data: statsResp } = await useAsyncData('home-stats', () =>
  api.get<HomeStats>('/stats/home').catch(() => null),
)

// Carrossel: scroll horizontal com botões.
const trilho = ref<HTMLElement | null>(null)
function rolar(dir: 1 | -1) {
  trilho.value?.scrollBy({ left: dir * 320, behavior: 'smooth' })
}

// --- Prova social: contadores REAIS de /stats/home; mock se offline/zerado. ---
// (fees pagos / placements / hunters verificados dependem de B8/B9/B11 e ficam de fora por ora)
const statsMock = computed(() => !statsResp.value
  || (statsResp.value.openVagas + statsResp.value.professionals + statsResp.value.companies) === 0)

const metas = computed(() => {
  const s = statsResp.value
  if (!statsMock.value && s) {
    return [
      { alvo: s.openVagas, prefixo: '', sufixo: '', label: 'vagas abertas' },
      { alvo: s.professionals, prefixo: '', sufixo: '', label: 'profissionais na plataforma' },
      { alvo: s.companies, prefixo: '', sufixo: '', label: 'empresas contratando' },
    ]
  }
  return [
    { alvo: 4200, prefixo: '', sufixo: '+', label: 'vagas abertas' },
    { alvo: 18500, prefixo: '', sufixo: '+', label: 'profissionais na plataforma' },
    { alvo: 1200, prefixo: '', sufixo: '+', label: 'empresas contratando' },
  ]
})
const valores = ref(metas.value.map(() => 0))
function animarContadores() {
  const dur = 1400
  const t0 = performance.now()
  function frame(t: number) {
    const p = Math.min((t - t0) / dur, 1)
    const ease = 1 - Math.pow(1 - p, 3)
    valores.value = metas.value.map(m => Math.floor(m.alvo * ease))
    if (p < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
function fmtNum(n: number) {
  return n.toLocaleString('pt-BR')
}

const provaRef = ref<HTMLElement | null>(null)
onMounted(() => {
  const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduz) { valores.value = metas.value.map(m => m.alvo); return }
  const io = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) { animarContadores(); io.disconnect() }
  }, { threshold: 0.4 })
  if (provaRef.value) io.observe(provaRef.value)
})

const depoimentos = [
  { nome: 'Marina Alves', cargo: 'Hunter · Tech', texto: 'Em 3 meses fiz 7 placements pela plataforma. O ATS grátis já valeria; receber por Pix é o diferencial.', placements: 7 },
  { nome: 'Rafael Souza', cargo: 'Hunter · Vendas', texto: 'O perfil público com reputação me trouxe vagas que eu não acharia sozinho. Fee justo e transparente.', placements: 12 },
  { nome: 'Carla Mendes', cargo: 'Recrutadora autônoma', texto: 'Saí da planilha. Pipeline organizado, candidatos no lugar certo e clientes acompanhando em tempo real.', placements: 5 },
]
</script>

<template>
  <div>
    <!-- 1. HERO -->
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__copy">
          <h1>Recrute. Indique. <span class="hero__accent">Receba.</span></h1>
          <p class="hero__sub">O ATS gratuito do recrutador brasileiro + o marketplace que paga por placement.</p>
          <div class="hero__ctas">
            <UiButton size="lg" @click="navigateTo('/cadastro?perfil=hunter')">Começar grátis</UiButton>
            <UiButton size="lg" variant="secondary" @click="navigateTo('/vagas?fee=true')">Ver vagas com fee</UiButton>
          </div>
        </div>

        <!-- Mock do kanban com card "Contratado" + toast de placement -->
        <div class="hero__mock" aria-hidden="true">
          <div class="kanban">
            <div class="kanban__col">
              <span class="kanban__title">Triagem</span>
              <div class="kanban__card kanban__card--ghost" />
              <div class="kanban__card kanban__card--ghost" />
            </div>
            <div class="kanban__col">
              <span class="kanban__title">Entrevista</span>
              <div class="kanban__card kanban__card--ghost" />
            </div>
            <div class="kanban__col kanban__col--win">
              <span class="kanban__title">Contratado</span>
              <div class="kanban__card kanban__card--move">
                <span class="kanban__avatar">JS</span>
                <div class="kanban__lines"><i /><i /></div>
              </div>
            </div>
          </div>
          <div class="toast-placement">
            <span class="toast-placement__dot" />
            Placement confirmado — <strong>R$ 3.375</strong>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. PROVA SOCIAL (mock B12) -->
    <section ref="provaRef" class="prova">
      <div class="container prova__inner">
        <div v-for="(m, i) in metas" :key="m.label" class="prova__item">
          <span class="prova__num">{{ m.prefixo }}{{ fmtNum(valores[i] ?? 0) }}{{ m.sufixo }}</span>
          <span class="prova__label">{{ m.label }}</span>
        </div>
      </div>
    </section>

    <!-- 3. COMO FUNCIONA -->
    <section class="how container">
      <h2>Como funciona</h2>
      <div class="how__grid">
        <UiCard>
          <span class="how__step">1</span>
          <h4>Empresa publica a vaga</h4>
          <p class="text-secondary">Define o fee que paga pela contratação. Publicar é grátis.</p>
        </UiCard>
        <UiCard>
          <span class="how__step">2</span>
          <h4>Hunters indicam candidatos</h4>
          <p class="text-secondary">Hunters verificados trabalham a vaga e submetem os melhores perfis.</p>
        </UiCard>
        <UiCard>
          <span class="how__step">3</span>
          <h4>Contratou? Fee dividido</h4>
          <p class="text-secondary">Placement confirmado, garantia de reposição e pagamento via Pix.</p>
        </UiCard>
      </div>
    </section>

    <!-- 4. SEÇÃO HUNTER -->
    <section class="split container">
      <div class="split__media">
        <div class="split__screenshot split__screenshot--pipeline">
          <span class="split__tag">Seu pipeline</span>
        </div>
      </div>
      <div class="split__copy">
        <h2>Para o recrutador</h2>
        <ul class="bullets">
          <li>ATS completo e gratuito para sempre.</li>
          <li>Perfil público com reputação e placements.</li>
          <li>Receba seu fee por Pix, sem burocracia.</li>
        </ul>
        <UiButton @click="navigateTo('/cadastro?perfil=hunter')">Sou recrutador</UiButton>
      </div>
    </section>

    <!-- 5. SEÇÃO EMPRESA (invertida) -->
    <section class="split split--reverse container">
      <div class="split__media">
        <div class="split__screenshot split__screenshot--vaga">
          <span class="split__tag">Sua vaga + hunters</span>
        </div>
      </div>
      <div class="split__copy">
        <h2>Para a empresa</h2>
        <ul class="bullets">
          <li>Pague só por resultado — fee no placement.</li>
          <li>Até 60% mais barato que consultoria tradicional.</li>
          <li>Garantia de reposição se não der certo.</li>
        </ul>
        <UiButton @click="navigateTo('/para-empresas')">Quero contratar</UiButton>
      </div>
    </section>

    <!-- 6. VAGAS EM DESTAQUE (carrossel real) -->
    <section v-if="vagas.length" class="destaque">
      <div class="container">
        <div class="destaque__head">
          <h2>
            Vagas em destaque
            <UiBadge v-if="usandoVagasMock" variant="warning">exemplos</UiBadge>
          </h2>
          <div class="destaque__controls">
            <button class="destaque__arrow" aria-label="Anterior" @click="rolar(-1)">‹</button>
            <button class="destaque__arrow" aria-label="Próxima" @click="rolar(1)">›</button>
            <NuxtLink to="/vagas" class="destaque__all">Ver todas</NuxtLink>
          </div>
        </div>
        <div ref="trilho" class="destaque__trilho">
          <div v-for="v in vagas" :key="v.id" class="destaque__item">
            <VagaCard :vaga="v" />
          </div>
        </div>
      </div>
    </section>

    <!-- 7. DEPOIMENTOS -->
    <section class="depo container">
      <h2>Quem usa, indica</h2>
      <div class="depo__grid">
        <UiCard v-for="d in depoimentos" :key="d.nome">
          <p class="depo__texto">“{{ d.texto }}”</p>
          <div class="depo__autor">
            <UiAvatar :name="d.nome" size="md" />
            <div>
              <strong>{{ d.nome }}</strong>
              <span class="depo__cargo">{{ d.cargo }} · {{ d.placements }} placements</span>
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- 8. CTA FINAL -->
    <section class="cta-final">
      <div class="container cta-final__inner">
        <h2>Crie sua conta em 2 minutos</h2>
        <UiButton size="lg" variant="secondary" @click="navigateTo('/cadastro')">Criar conta grátis</UiButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* HERO */
.hero { background: var(--ink-900); color: var(--white); padding: 128px 0 96px; }
.hero__inner { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: var(--sp-12); align-items: center; }
.hero h1 { font-size: var(--text-48); color: var(--white); line-height: 1.1; }
.hero__accent { color: var(--brand-600); }
.hero__sub { font-size: var(--text-18); color: var(--ink-300); margin-top: var(--sp-4); max-width: 520px; }
.hero__ctas { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin-top: var(--sp-8); }

/* HERO mock kanban */
.hero__mock { position: relative; }
.kanban {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-3);
  background: var(--ink-700); border-radius: var(--radius-card); padding: var(--sp-4);
  box-shadow: var(--shadow-lg);
}
.kanban__col { display: flex; flex-direction: column; gap: var(--sp-2); }
.kanban__col--win { background: rgba(14, 159, 110, 0.12); border-radius: var(--radius-input); padding: var(--sp-2); }
.kanban__title { font-size: var(--text-12); color: var(--ink-300); font-weight: 600; }
.kanban__card {
  background: var(--white); border-radius: var(--radius-input); height: 44px;
  display: flex; align-items: center; gap: var(--sp-2); padding: 0 var(--sp-2);
}
.kanban__card--ghost { background: rgba(255, 255, 255, 0.08); }
.kanban__card--move { animation: cardIn 2.6s ease-in-out 0.4s both; }
.kanban__avatar {
  width: 28px; height: 28px; border-radius: var(--radius-full); flex-shrink: 0;
  background: var(--brand-600); color: var(--white);
  display: grid; place-items: center; font-size: 11px; font-weight: 700;
}
.kanban__lines { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.kanban__lines i { display: block; height: 5px; border-radius: var(--radius-full); background: var(--ink-100); }
.kanban__lines i:first-child { width: 70%; }
.kanban__lines i:last-child { width: 45%; }
.toast-placement {
  position: absolute; right: -8px; bottom: -18px;
  background: var(--white); color: var(--ink-900);
  border-radius: var(--radius-input); box-shadow: var(--shadow-lg);
  padding: var(--sp-3) var(--sp-4); font-size: var(--text-13);
  display: flex; align-items: center; gap: var(--sp-2);
  animation: toastIn 2.6s ease-out 1.6s both;
}
.toast-placement strong { color: var(--brand-700); }
.toast-placement__dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--brand-600); }
@keyframes cardIn {
  0% { transform: translateY(-60px) scale(0.96); opacity: 0; }
  60% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes toastIn {
  0% { transform: translateY(12px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* PROVA SOCIAL */
.prova { background: var(--ink-100); padding: var(--sp-8) 0; }
.prova__inner { display: flex; justify-content: space-around; gap: var(--sp-6); flex-wrap: wrap; }
.prova__item { display: flex; flex-direction: column; align-items: center; text-align: center; }
.prova__num { font-family: var(--font-display); font-size: var(--text-36); font-weight: 700; color: var(--ink-900); font-variant-numeric: tabular-nums; }
.prova__label { font-size: var(--text-14); color: var(--ink-500); margin-top: var(--sp-1); }

/* COMO FUNCIONA */
.how { padding: var(--sp-16) var(--sp-6); }
.how__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5); margin-top: var(--sp-6); }
.how__grid p { margin-top: var(--sp-2); }
.how__step {
  display: grid; place-items: center; width: 32px; height: 32px; margin-bottom: var(--sp-3);
  border-radius: var(--radius-full); background: var(--brand-100); color: var(--brand-700);
  font-family: var(--font-display); font-weight: 700;
}

/* SPLIT (hunter/empresa) */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-12); align-items: center; padding: var(--sp-12) var(--sp-6); }
.split--reverse .split__media { order: 2; }
.split__copy h2 { margin-bottom: var(--sp-4); }
.split__media { display: flex; }
.split__screenshot {
  width: 100%; aspect-ratio: 4 / 3; border-radius: var(--radius-card);
  box-shadow: var(--shadow-md); position: relative;
  display: flex; align-items: flex-end; padding: var(--sp-4);
}
.split__screenshot--pipeline { background: linear-gradient(135deg, var(--ink-900), var(--ink-700)); }
.split__screenshot--vaga { background: linear-gradient(135deg, var(--brand-700), var(--brand-600)); }
.split__tag { background: rgba(255,255,255,0.92); color: var(--ink-900); font-size: var(--text-12); font-weight: 600; padding: 4px var(--sp-3); border-radius: var(--radius-full); }
.bullets { list-style: none; padding: 0; margin: 0 0 var(--sp-6); display: flex; flex-direction: column; gap: var(--sp-3); }
.bullets li { position: relative; padding-left: var(--sp-6); color: var(--ink-700); font-size: var(--text-16); }
.bullets li::before {
  content: '✓'; position: absolute; left: 0; top: -1px;
  width: 20px; height: 20px; border-radius: var(--radius-full);
  background: var(--brand-100); color: var(--brand-700);
  display: grid; place-items: center; font-size: var(--text-12); font-weight: 700;
}

/* DESTAQUE / carrossel */
.destaque { padding: var(--sp-12) 0; background: var(--ink-100); }
.destaque__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); }
.destaque__controls { display: flex; align-items: center; gap: var(--sp-2); }
.destaque__arrow {
  width: 36px; height: 36px; border-radius: var(--radius-full);
  border: 1px solid var(--ink-300); background: var(--white); color: var(--ink-700);
  font-size: var(--text-18); line-height: 1; cursor: pointer;
}
.destaque__arrow:hover { background: var(--ink-100); }
.destaque__all { margin-left: var(--sp-3); font-size: var(--text-14); font-weight: 600; color: var(--brand-700); }
.destaque__trilho {
  display: flex; gap: var(--sp-4); overflow-x: auto; padding-bottom: var(--sp-3);
  scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
}
.destaque__trilho::-webkit-scrollbar { height: 6px; }
.destaque__trilho::-webkit-scrollbar-thumb { background: var(--ink-300); border-radius: var(--radius-full); }
.destaque__item { flex: 0 0 300px; scroll-snap-align: start; }

/* DEPOIMENTOS */
.depo { padding: var(--sp-16) var(--sp-6); }
.depo h2 { text-align: center; margin-bottom: var(--sp-8); }
.depo__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5); }
.depo__texto { color: var(--ink-700); font-size: var(--text-16); line-height: 1.55; }
.depo__autor { display: flex; align-items: center; gap: var(--sp-3); margin-top: var(--sp-5); }
.depo__autor strong { display: block; font-size: var(--text-14); color: var(--ink-900); }
.depo__cargo { display: block; font-size: var(--text-12); color: var(--ink-500); }

/* CTA FINAL */
.cta-final { background: var(--brand-600); color: var(--white); padding: var(--sp-12) 0; }
.cta-final__inner { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-6); }
.cta-final h2 { color: var(--white); }

@media (prefers-reduced-motion: reduce) {
  .kanban__card--move, .toast-placement { animation: none; }
}
@media (max-width: 900px) {
  .hero__inner { grid-template-columns: 1fr; }
  .hero__mock { margin-top: var(--sp-8); }
  .split, .split--reverse { grid-template-columns: 1fr; gap: var(--sp-6); }
  .split--reverse .split__media { order: 0; }
  .how__grid, .depo__grid { grid-template-columns: 1fr; }
  /* F16 — o toast decorativo (posicionado com right:-8px de propósito no
     desktop, pra "vazar" um pouco pra fora do mock) causava scroll horizontal
     na página inteira em telas estreitas (~375-390px), já que o hero__mock
     ocupa a largura toda do container nesse breakpoint. Encostando no bordo
     em vez de vazar. */
  .toast-placement { right: 0; }
}
@media (max-width: 768px) {
  .hero { padding: 104px 0 72px; }
  .hero h1 { font-size: var(--text-36); }
  .cta-final__inner { flex-direction: column; text-align: center; }
  .prova__inner { gap: var(--sp-5); }
}
</style>
