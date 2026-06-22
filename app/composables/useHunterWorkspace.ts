// Define a navegação do app shell (layout 'app') para o workspace do hunter.
// Chamar no setup de cada página /app/hunter/*.
export interface NavItem { label: string, to: string }

export function useHunterWorkspace() {
  const nav = useState<NavItem[]>('workspace-nav')
  const label = useState<string>('workspace-label')

  nav.value = [
    { label: 'Início', to: '/app/hunter' },
    { label: 'Minhas Vagas', to: '/app/hunter/vagas' },
  ]
  label.value = 'Hunter'
}
