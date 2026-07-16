// Define a navegação do app shell (layout 'app') para o workspace de admin.
// FASE 5 (2026-07-12): sidebar completa do spec 06 §A — Visão Geral ·
// Verificações · Disputas · Placements · Cupons · Usuários · Vagas · Empresas
// (este último, "Empresas"/split negociável, é F13 — fora do spec original,
// pedido do Andres em 2026-07-06, mas vive na mesma nav por ser 100% admin).
export interface NavItem { label: string, to: string }

export function useAdminWorkspace() {
  const nav = useState<NavItem[]>('workspace-nav')
  const label = useState<string>('workspace-label')

  nav.value = [
    { label: 'Visão Geral', to: '/app/admin' },
    { label: 'Verificações', to: '/app/admin/verificacoes' },
    { label: 'Disputas', to: '/app/admin/disputas' },
    { label: 'Placements', to: '/app/admin/placements' },
    { label: 'Pagamentos', to: '/app/admin/payouts' },
    { label: 'Faturas', to: '/app/admin/invoices' },
    { label: 'Cupons', to: '/app/admin/cupons' },
    { label: 'Usuários', to: '/app/admin/usuarios' },
    { label: 'Vagas', to: '/app/admin/vagas' },
    { label: 'Empresas', to: '/app/admin/empresas' },
  ]
  label.value = 'Admin'
}
