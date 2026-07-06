<script setup lang="ts">
// F12 — Termos de uso. Substituído o texto placeholder por um rascunho
// completo alinhado ao modelo de negócio real (marketplace de hunters, fee,
// planos, LGPD). NOTA: conteúdo redigido internamente — recomenda-se revisão
// por advogado antes do lançamento público (ver aviso em LegalDoc.vue).
useSeoMeta({ title: 'Termos de Uso', description: 'Termos de uso do VitrinePro.' })
const sections = [
  {
    id: 'aceitacao',
    heading: '1. Aceitação dos termos',
    body: 'Ao criar uma conta, acessar ou usar o VitrinePro (site, aplicativo ou qualquer funcionalidade da plataforma), você concorda integralmente com estes Termos de Uso e com nossa Política de Privacidade. Se você não concordar com qualquer parte destes termos, não deverá utilizar a plataforma. Estes termos se aplicam a todos os perfis de uso: candidatos/profissionais, hunters (recrutadores independentes), empresas contratantes e consultorias de recrutamento.',
  },
  {
    id: 'conta',
    heading: '2. Cadastro e sua conta',
    body: 'Para usar a maior parte dos recursos, você precisa criar uma conta com informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta. Contas podem ser criadas por e-mail/senha ou via login social (Google/LinkedIn). Menores de 18 anos não podem criar conta. Reservamo-nos o direito de suspender contas com dados falsos, duplicados ou usados para burlar limites de plano.',
  },
  {
    id: 'personas',
    heading: '3. Perfis de uso (personas)',
    body: 'Uma mesma conta pessoa física pode ativar mais de um perfil de uso — por exemplo, candidato e hunter simultaneamente — a partir da tela "Como você quer usar o VitrinePro" ou das configurações da conta. Contas de empresa (isCompany) têm um perfil fixo definido no cadastro e não acumulam os perfis de candidato/hunter. Cada perfil tem regras e áreas próprias descritas nas seções abaixo.',
  },
  {
    id: 'uso-plataforma',
    heading: '4. Uso aceitável da plataforma',
    body: 'Você concorda em usar o VitrinePro apenas para fins legítimos de recrutamento, indicação profissional e busca de oportunidades de trabalho. É proibido: publicar vagas fraudulentas, discriminatórias ou que violem a legislação trabalhista; coletar dados de outros usuários para finalidades diferentes das previstas nesta plataforma (raspagem/scraping, spam, prospecção não solicitada); se passar por outra pessoa ou empresa; tentar burlar limites de plano, verificação de identidade ou mecanismos antifraude. O descumprimento pode levar à suspensão ou ao encerramento da conta, sem prejuízo de outras medidas cabíveis.',
  },
  {
    id: 'vagas-candidaturas',
    heading: '5. Publicação de vagas e candidaturas',
    body: 'Empresas e hunters autorizados podem publicar vagas na plataforma. Cada vaga publicada consome um "slot" de acordo com o limite do plano contratado (planos FREE, RECRUITER, TEAM ou ENTERPRISE), renovado a cada ciclo. Candidatos podem se candidatar diretamente às vagas publicadas; hunters podem indicar candidatos do próprio pool para vagas que aceitem indicação de hunters ("allowHunters"). O conteúdo das vagas é de responsabilidade de quem publica — o VitrinePro pode remover vagas que violem estes termos ou a legislação aplicável, a qualquer momento e sem aviso prévio quando houver risco de dano a terceiros.',
  },
  {
    id: 'marketplace',
    heading: '6. Marketplace de hunters, fee e comissão',
    body: 'Vagas que aceitam indicação de hunters definem um fee (percentual ou valor fixo) devido em caso de contratação bem-sucedida (placement) do candidato indicado, além de condições como número máximo de hunters simultâneos e prazo de exclusividade da indicação. O VitrinePro retém um percentual sobre o fee pago como comissão de intermediação do marketplace (atualmente informado como 25% nas páginas de preços — sujeito a alteração mediante aviso prévio). As condições completas de cada vaga (fee, exclusividade, máximo de hunters) são exibidas ao hunter antes de expressar interesse, e a aceitação é registrada com data e hora. Enquanto o candidato indicado está nas etapas iniciais do processo seletivo, os dados de contato podem ficar parcialmente ocultos ("mascarados") da empresa até uma etapa configurável do pipeline, para proteger a relação de indicação do hunter.',
  },
  {
    id: 'pagamentos',
    heading: '7. Planos, pagamentos e cancelamento',
    body: 'O VitrinePro oferece um plano gratuito com limites de uso e planos pagos com recursos e limites ampliados, cobrados de forma recorrente (mensal ou anual). Os valores vigentes estão sempre disponíveis na página de Preços. Você pode cancelar a assinatura a qualquer momento nas configurações da conta; o cancelamento tem efeito ao final do ciclo vigente, sem reembolso proporcional salvo quando exigido por lei. Ainda estamos implementando o checkout de pagamento — ao tentar assinar um plano pago hoje, você verá um aviso informando que o checkout está a caminho e seu plano permanece FREE.',
  },
  {
    id: 'propriedade',
    heading: '8. Propriedade intelectual e conteúdo do usuário',
    body: 'A marca VitrinePro, o design da plataforma e o software são de propriedade do VitrinePro/V8Pro e protegidos por lei. Você mantém a titularidade do conteúdo que publica (perfil, portfólio, currículo, descrição de vagas), mas nos concede uma licença não exclusiva para exibir esse conteúdo publicamente conforme as configurações de visibilidade que você escolher, pelo tempo em que sua conta estiver ativa e o conteúdo publicado.',
  },
  {
    id: 'responsabilidade',
    heading: '9. Limitação de responsabilidade',
    body: 'O VitrinePro atua como intermediário tecnológico entre candidatos, hunters e empresas, e não garante a contratação, a veracidade de todas as informações publicadas por terceiros, nem o resultado de qualquer processo seletivo ou placement. Fazemos esforços razoáveis para manter a plataforma disponível e segura, mas não respondemos por indisponibilidades temporárias, perdas indiretas ou decisões de contratação tomadas por empresas ou hunters usando a plataforma.',
  },
  {
    id: 'rescisao',
    heading: '10. Suspensão e encerramento',
    body: 'Podemos suspender ou encerrar contas que violem estes termos, apresentem atividade fraudulenta ou representem risco a outros usuários, mediante notificação sempre que possível. Você pode encerrar sua conta a qualquer momento nas configurações; alguns dados podem ser retidos pelo período exigido por lei (ex.: obrigações fiscais) mesmo após o encerramento.',
  },
  {
    id: 'alteracoes',
    heading: '11. Alterações destes termos',
    body: 'Podemos atualizar estes Termos de Uso periodicamente para refletir mudanças na plataforma ou na legislação. Alterações relevantes serão comunicadas por e-mail ou aviso na plataforma antes de entrarem em vigor. O uso continuado após a alteração implica concordância com os novos termos.',
  },
  {
    id: 'foro',
    heading: '12. Lei aplicável e foro',
    body: 'Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede do VitrinePro/V8Pro para dirimir quaisquer controvérsias, salvo disposição diversa e obrigatória da legislação consumerista aplicável.',
  },
]
</script>

<template>
  <LegalDoc title="Termos de Uso" updated="06/07/2026" :sections="sections" />
</template>
