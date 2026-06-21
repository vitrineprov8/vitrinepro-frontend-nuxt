// Nuxt 4 — vitrinepro-frontend-v2 (HUNTRIA)
// Páginas públicas: SSR com SEO. Área /app: client-only (ssr false por rota).
export default defineNuxtConfig({
  compatibilityDate: '2026-06-01',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      titleTemplate: (t) => (t ? `${t} · VitrinePro` : 'VitrinePro — O hub do recrutador brasileiro'),
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap',
        },
      ],
      meta: [{ name: 'theme-color', content: '#0B1220' }],
    },
  },

  runtimeConfig: {
    public: {
      backendUrl: process.env.NUXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
      frontendUrl: process.env.NUXT_PUBLIC_FRONTEND_URL || 'http://localhost:4321',
      environment: process.env.NUXT_PUBLIC_ENVIRONMENT || 'development',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      linkedinClientId: process.env.NUXT_PUBLIC_LINKEDIN_CLIENT_ID || '',
      // OAuth por provedor. Google ativo (credenciais configuradas no backend).
      // LinkedIn desativado por enquanto — reativar com NUXT_PUBLIC_LINKEDIN_AUTH_ENABLED=true.
      googleAuthEnabled: process.env.NUXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'false',
      linkedinAuthEnabled: process.env.NUXT_PUBLIC_LINKEDIN_AUTH_ENABLED === 'true',
    },
  },

  routeRules: {
    // Dashboard/app: client-only (sem SSR), igual à regra do projeto v1
    '/app/**': { ssr: false },
    // Páginas públicas cacheadas no edge (vagas mudam pouco)
    '/vaga/**': { headers: { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400' } },
    '/vagas/**': { headers: { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400' } },
  },

  typescript: { strict: true },
})
