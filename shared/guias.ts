/**
 * Conteúdo das guias de uso (T-GUIA), em fonte ÚNICA.
 *
 * Este arquivo é consumido por três lugares — por isso mora em `shared/`:
 *   1. `pages/guias/[persona].vue`  → a guia visual animada
 *   2. `server/routes/guias/[persona].md.ts` → versão markdown plana (leitura por IA)
 *   3. `server/routes/llms.txt.ts`  → índice para modelos de linguagem externos
 *
 * **Regra de escrita**: `texto` é UMA linha, no máximo ~14 palavras. A guia é
 * visual — se um passo precisa de parágrafo, ou o passo está mal desenhado ou
 * o produto está confuso. Texto longo vai para o `detalhe` (opcional), que só
 * aparece na versão markdown e para leitores de tela.
 */

export type MockupVariant =
  | 'perfil' | 'upload' | 'radar' | 'candidatura' | 'pipeline'
  | 'verificacao' | 'marketplace' | 'indicacao' | 'ganhos'
  | 'vaga-nova' | 'fee' | 'avaliacao'
  | 'time' | 'clientes' | 'faturamento'
  | 'seguranca'

export interface GuiaPasso {
  titulo: string
  /** UMA linha curta. Ver regra de escrita no topo. */
  texto: string
  mockup: MockupVariant
  /** Contexto extra: só na versão markdown e no aria-label. Opcional. */
  detalhe?: string
  /** Deep link para a tela real do app, quando existe. */
  rota?: string
}

export interface Guia {
  slug: string
  /** Como o usuário se identifica ("Sou candidato"). */
  persona: string
  titulo: string
  subtitulo: string
  /** Token de cor de destaque (deve existir em tokens.css). */
  cor: 'brand' | 'blue' | 'purple' | 'amber'
  /** Nome do ícone lucide — resolvido em `GuiaIcone.vue`. */
  icone: 'UserRound' | 'Radar' | 'Building2' | 'Users'
  minutos: number
  passos: GuiaPasso[]
  faq: Array<{ q: string, a: string }>
}

/** Passo final compartilhado: todas as personas terminam protegendo a conta. */
const PASSO_SEGURANCA: GuiaPasso = {
  titulo: 'Proteja sua conta',
  texto: 'Ative a verificação em duas etapas. É grátis, em qualquer plano.',
  mockup: 'seguranca',
  detalhe: 'Em Conta → Dados de acesso, ative a verificação em duas etapas (2FA). '
    + 'Você escaneia um QR com Google Authenticator, Authy ou 1Password e passa a '
    + 'precisar de um código de 6 dígitos além da senha. Guarde os códigos de '
    + 'recuperação que aparecem uma única vez — são a sua saída se perder o celular.',
  rota: '/app/conta',
}

export const GUIAS: Guia[] = [
  {
    slug: 'candidato',
    persona: 'Sou candidato',
    titulo: 'Guia do Candidato',
    subtitulo: 'Do cadastro à contratação em 6 passos.',
    cor: 'blue',
    icone: 'UserRound',
    minutos: 4,
    passos: [
      {
        titulo: 'Monte seu perfil',
        texto: 'Foto, área de atuação e uma bio curta. Leva 2 minutos.',
        mockup: 'perfil',
        detalhe: 'Perfis com foto e bio preenchida aparecem antes nas buscas dos recrutadores.',
        rota: '/app/candidato/perfil',
      },
      {
        titulo: 'Adicione currículo e portfólio',
        texto: 'Mostre o trabalho, não só descreva. Projetos valem mais que adjetivos.',
        mockup: 'upload',
        detalhe: 'Você pode ter vários currículos e marcar um como padrão. '
          + 'O portfólio aceita capa, galeria de imagens e tags por projeto.',
        rota: '/app/candidato/portfolio',
      },
      {
        titulo: 'Encontre vagas no Radar',
        texto: 'Filtre por área, cidade, salário e modelo de trabalho.',
        mockup: 'radar',
        detalhe: 'Salve os filtros que usa sempre — o Radar reaplica com um clique.',
        rota: '/app/candidato/radar',
      },
      {
        titulo: 'Candidate-se em um clique',
        texto: 'Seu perfil vai junto. Sem reescrever nada a cada vaga.',
        mockup: 'candidatura',
        rota: '/app/candidato/radar',
      },
      {
        titulo: 'Acompanhe cada etapa',
        texto: 'Veja em que fase você está, sem precisar perguntar.',
        mockup: 'pipeline',
        detalhe: 'Você recebe notificação a cada mudança de etapa do processo.',
        rota: '/app/candidato/candidaturas',
      },
      PASSO_SEGURANCA,
    ],
    faq: [
      { q: 'Preciso pagar alguma coisa?', a: 'Não. Para candidatos a plataforma é gratuita, do cadastro à contratação.' },
      { q: 'Meu perfil fica público?', a: 'Você decide. Em Meu Perfil → Visibilidade você liga ou desliga o perfil público a qualquer momento.' },
      { q: 'Posso retirar uma candidatura?', a: 'Sim, em Minhas Candidaturas. O recrutador deixa de ver seu perfil naquele processo.' },
      { q: 'Quem vê meus dados de contato?', a: 'Apenas o responsável pela vaga em que você se candidatou, e só a partir de determinada etapa do processo.' },
    ],
  },

  {
    slug: 'hunter',
    persona: 'Sou hunter',
    titulo: 'Guia do Hunter',
    subtitulo: 'Como indicar candidatos e receber por contratação.',
    cor: 'brand',
    icone: 'Radar',
    minutos: 5,
    passos: [
      {
        titulo: 'Ative seu perfil de hunter',
        texto: 'Suas especialidades e anos de experiência. É sua vitrine.',
        mockup: 'perfil',
        rota: '/app/hunter/perfil',
      },
      {
        titulo: 'Peça a verificação',
        texto: 'Envie um documento. Sem o selo, o marketplace fica bloqueado.',
        mockup: 'verificacao',
        detalhe: 'A verificação é analisada por um administrador. Enquanto não for aprovada, '
          + 'você não consegue demonstrar interesse em vagas nem submeter candidatos.',
        rota: '/app/hunter/perfil',
      },
      {
        titulo: 'Explore o marketplace',
        texto: 'Vagas abertas a hunters, com o fee visível antes de você entrar.',
        mockup: 'marketplace',
        detalhe: 'Filtre por fee mínimo e ordene pelas vagas que pagam mais.',
        rota: '/app/hunter/marketplace',
      },
      {
        titulo: 'Indique candidatos',
        texto: 'Peça o consentimento do candidato e envie. Exigência da LGPD.',
        mockup: 'indicacao',
        detalhe: 'O candidato recebe um e-mail e autoriza o uso dos dados dele. '
          + 'Sem esse aceite, a submissão é bloqueada pelo sistema.',
        rota: '/app/hunter/candidatos',
      },
      {
        titulo: 'Receba pelo placement',
        texto: 'Contratação confirmada, garantia cumprida, fee liberado.',
        mockup: 'ganhos',
        detalhe: 'O fee é liberado depois do período de garantia sem quebra. '
          + 'Configure sua chave Pix em Ganhos → Extrato para receber.',
        rota: '/app/hunter/ganhos',
      },
      PASSO_SEGURANCA,
    ],
    faq: [
      { q: 'Quanto eu recebo por contratação?', a: 'O fee é definido pela empresa em cada vaga e fica visível antes de você aceitar. A plataforma retém uma porcentagem; o restante é seu.' },
      { q: 'Por que preciso de verificação?', a: 'Empresas confiam candidatos e dados sensíveis a hunters. A verificação protege os dois lados e é exigida para usar o marketplace.' },
      { q: 'O que é o período de garantia?', a: 'Uma janela após a contratação. Se o profissional sair dentro dela, você faz uma reposição sem custo para a empresa.' },
      { q: 'Posso indicar o mesmo candidato para várias vagas?', a: 'Sim, mas existe uma trava de exclusividade por vaga e candidato para evitar submissões duplicadas.' },
    ],
  },

  {
    slug: 'empresa',
    persona: 'Sou empresa',
    titulo: 'Guia da Empresa',
    subtitulo: 'Publique, receba candidatos e contrate.',
    cor: 'purple',
    icone: 'Building2',
    minutos: 4,
    passos: [
      {
        titulo: 'Publique sua vaga',
        texto: 'Título, descrição e faixa salarial. Publicar consome uma vaga do plano.',
        mockup: 'vaga-nova',
        detalhe: 'O plano Gratuito inclui uma publicação por mês. Rascunhos são ilimitados.',
        rota: '/app/empresa/vagas/nova',
      },
      {
        titulo: 'Abra para hunters, se quiser',
        texto: 'Defina um fee e recrutadores especializados trazem candidatos.',
        mockup: 'fee',
        detalhe: 'Você só paga o fee se contratar. Sem contratação, não há cobrança.',
        rota: '/app/empresa/vagas',
      },
      {
        titulo: 'Organize o pipeline',
        texto: 'Arraste candidatos entre etapas. Anote e pontue cada um.',
        mockup: 'pipeline',
        detalhe: 'As etapas são configuráveis: renomeie, reordene ou crie as suas.',
        rota: '/app/empresa/candidatos',
      },
      {
        titulo: 'Contrate e avalie',
        texto: 'Marque a contratação e avalie o hunter que indicou.',
        mockup: 'avaliacao',
        rota: '/app/empresa/candidatos',
      },
      PASSO_SEGURANCA,
    ],
    faq: [
      { q: 'Quantas vagas posso publicar?', a: 'Depende do plano: o Gratuito inclui uma por mês e os planos pagos ampliam esse limite. Veja a página de Preços.' },
      { q: 'Quando pago o fee de um hunter?', a: 'Somente quando a contratação acontece e é confirmada. Você recebe uma fatura depois disso.' },
      { q: 'E se o contratado sair logo?', a: 'Dentro do período de garantia, o hunter faz uma reposição sem custo adicional.' },
      { q: 'Posso ter mais de um acesso?', a: 'Sim, a partir do plano Team, com múltiplos membros na mesma conta.' },
    ],
  },

  {
    slug: 'consultoria',
    persona: 'Sou consultoria',
    titulo: 'Guia da Consultoria',
    subtitulo: 'Gerencie time, clientes e processos em um lugar.',
    cor: 'amber',
    icone: 'Users',
    minutos: 5,
    passos: [
      {
        titulo: 'Monte seu time',
        texto: 'Convide recrutadores por e-mail e defina o papel de cada um.',
        mockup: 'time',
        detalhe: 'Papéis: Owner (tudo), Manager (gerencia processos e clientes) '
          + 'e Recruiter (trabalha apenas nos clientes atribuídos a ele).',
        rota: '/app/consultoria/membros',
      },
      {
        titulo: 'Cadastre seus clientes',
        texto: 'Cada empresa atendida vira um cliente, com recrutador responsável.',
        mockup: 'clientes',
        rota: '/app/consultoria/clientes',
      },
      {
        titulo: 'Publique vagas por cliente',
        texto: 'A vaga sai vinculada ao cliente certo, sem misturar processos.',
        mockup: 'vaga-nova',
        rota: '/app/consultoria/vagas/nova',
      },
      {
        titulo: 'Acompanhe o pipeline geral',
        texto: 'Todos os processos do time em uma tela só.',
        mockup: 'pipeline',
        rota: '/app/consultoria/pipeline',
      },
      {
        titulo: 'Veja faturamento e ganhos',
        texto: 'Quanto o time produziu, por cliente e por período.',
        mockup: 'faturamento',
        rota: '/app/consultoria/faturamento',
      },
      PASSO_SEGURANCA,
    ],
    faq: [
      { q: 'Qual a diferença entre os papéis?', a: 'Owner administra tudo, inclusive membros. Manager gerencia clientes e processos. Recruiter trabalha somente nos clientes atribuídos a ele.' },
      { q: 'Um recrutador vê os clientes dos outros?', a: 'Não. Cada recrutador enxerga apenas os clientes em que foi atribuído.' },
      { q: 'Quantos acessos o time tem?', a: 'Depende do plano. O Team inclui múltiplos acessos simultâneos e o Enterprise não tem limite.' },
      { q: 'Posso publicar vagas em nome do cliente?', a: 'Sim. A vaga fica vinculada ao cliente e o pipeline mostra de qual empresa é cada processo.' },
    ],
  },
]

export function getGuia(slug: string): Guia | undefined {
  return GUIAS.find(g => g.slug === slug)
}
