// Navegação do app shell (layout 'app') para o Workspace Consultoria (Fase 4,
// design-spec 04_WORKSPACE_CONSULTORIA.md). Mesmo padrão do useEmpresaWorkspace.ts.
//
// Rotas FLAT (/app/consultoria/...) em vez de /app/consultoria/[id]/... do
// design-spec: nenhum endpoint do backend consome um teamId via parâmetro de
// rota — TeamContextHelper.getTeamContext() sempre resolve o time a partir de
// `user.activeContextTeamId` (setado por auth.setActiveContext() no entry
// point, ver layouts/app.vue). Adicionar um segmento [id] duplicaria uma
// checagem de acesso que o backend já não precisa — mesmo padrão do Empresa.
import type { NavItem } from './useHunterWorkspace'

export function useConsultoriaWorkspace() {
  const nav = useState<NavItem[]>('workspace-nav')
  const label = useState<string>('workspace-label')

  nav.value = [
    { label: 'Início', to: '/app/consultoria' },
    { label: 'Vagas do Time', to: '/app/consultoria/vagas' },
    { label: 'Pipeline Geral', to: '/app/consultoria/pipeline' },
    { label: 'Clientes', to: '/app/consultoria/clientes' },
    { label: 'Membros', to: '/app/consultoria/membros' },
    { label: 'Faturamento & Ganhos', to: '/app/consultoria/faturamento' },
    { label: 'Configurações', to: '/app/consultoria/config' },
  ]
  label.value = 'Consultoria'
}
