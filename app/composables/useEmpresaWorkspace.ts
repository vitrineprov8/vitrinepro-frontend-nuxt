// Navegação do app shell (layout 'app') para o workspace da Empresa (Fase 3,
// design-spec 05_WORKSPACE_EMPRESA.md). Mesmo padrão do useHunterWorkspace.ts.
// Faturas (T-E07) fica fora por enquanto — depende de B11 (pagamentos), ainda
// bloqueado.
import type { NavItem } from './useHunterWorkspace'

export function useEmpresaWorkspace() {
  const nav = useState<NavItem[]>('workspace-nav')
  const label = useState<string>('workspace-label')

  nav.value = [
    { label: 'Início', to: '/app/empresa' },
    { label: 'Minhas Vagas', to: '/app/empresa/vagas' },
    { label: 'Candidatos', to: '/app/empresa/candidatos' },
    { label: 'Hunters', to: '/app/empresa/hunters' },
    { label: 'Página da Empresa', to: '/app/empresa/pagina' },
    { label: 'Configurações', to: '/app/empresa/config' },
  ]
  label.value = 'Empresa'
}
