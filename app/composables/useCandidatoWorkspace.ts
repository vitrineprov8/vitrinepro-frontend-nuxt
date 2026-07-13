// Navegação do app shell (layout 'app') para o workspace do Candidato (Fase 3,
// design-spec 02_WORKSPACE_CANDIDATO.md). Mesmo padrão do useHunterWorkspace.ts/
// useEmpresaWorkspace.ts. "Meu Perfil" é um hub com sub-nav interna (Dados ·
// Portfólio · Currículos · Formação), não itens separados na sidebar principal
// — igual ao design-spec (T-C06 lista as 4 sub-seções dentro da própria página).
import type { NavItem } from './useHunterWorkspace'

export function useCandidatoWorkspace() {
  const nav = useState<NavItem[]>('workspace-nav')
  const label = useState<string>('workspace-label')

  nav.value = [
    { label: 'Início', to: '/app/candidato' },
    { label: 'Radar de Vagas', to: '/app/candidato/radar' },
    { label: 'Minhas Candidaturas', to: '/app/candidato/candidaturas' },
    { label: 'Vagas Salvas', to: '/app/candidato/salvas' },
    { label: 'Meu Perfil', to: '/app/candidato/perfil' },
  ]
  label.value = 'Candidato'
}
