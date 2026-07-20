/**
 * Consentimento de cookies (LGPD) — fonte única e reativa.
 *
 * Existia só dentro do `CookieBanner.vue`, com um `useCookie` local. O problema:
 * `useCookie` devolve um ref NOVO a cada chamada — dois componentes lendo a
 * mesma chave não se atualizam entre si. Com o GTM entrando em cena (plugin que
 * precisa reagir na hora em que o usuário aceita), isso viraria bug silencioso:
 * o banner gravaria o cookie e o plugin continuaria vendo o valor antigo até um
 * reload. Daí o `useState` compartilhado por cima do cookie.
 */
export interface ConsentimentoCookies {
  /** Sempre true — necessários para o site funcionar. Não é opcional. */
  essential: boolean
  /** Métricas de uso. Controla `analytics_storage` no Consent Mode. */
  analytics: boolean
  /** Anúncios/remarketing. Controla `ad_storage`/`ad_user_data`/`ad_personalization`. */
  marketing: boolean
}

const CHAVE_COOKIE = 'vp_cookie_consent'
const UM_ANO = 60 * 60 * 24 * 365

export function useConsentimento() {
  const cookie = useCookie<ConsentimentoCookies | null>(CHAVE_COOKIE, {
    maxAge: UM_ANO,
    default: () => null,
    sameSite: 'lax',
  })

  // Inicializa a partir do cookie (funciona no SSR também, então a decisão já
  // tomada é conhecida no primeiro render — sem piscar o banner).
  const estado = useState<ConsentimentoCookies | null>('consentimento-cookies', () => cookie.value)

  /** true quando o usuário já respondeu ao banner (aceitando OU recusando). */
  const decidiu = computed(() => estado.value !== null)

  function salvar(c: ConsentimentoCookies) {
    estado.value = c
    cookie.value = c
  }

  return { estado, decidiu, salvar }
}
