// Define a navegação do app shell (layout 'app') para o workspace de admin.
// Mínimo viável (Fase 5 do PLANO ainda não construída) — só Visão Geral (A1,
// B12) e a fila de verificação de hunters (B8, A2), sem a qual o fluxo de
// verificação seria um beco sem saída (aprovar/recusar tem que acontecer em
// algum lugar).
export interface NavItem { label: string, to: string }

export function useAdminWorkspace() {
  const nav = useState<NavItem[]>('workspace-nav')
  const label = useState<string>('workspace-label')

  nav.value = [
    { label: 'Visão Geral', to: '/app/admin' },
    { label: 'Verificações de hunter', to: '/app/admin/verificacoes' },
  ]
  label.value = 'Admin'
}
