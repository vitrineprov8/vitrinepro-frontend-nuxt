<script setup lang="ts">
// F12 — Política de privacidade. Substituído o texto placeholder por um
// rascunho completo alinhado à LGPD e aos dados realmente tratados pela
// plataforma. NOTA: conteúdo redigido internamente — recomenda-se revisão
// por advogado/DPO antes do lançamento público (ver aviso em LegalDoc.vue).
useSeoMeta({ title: 'Política de Privacidade', description: 'Como o VitrinePro trata seus dados pessoais (LGPD).' })
const sections = [
  {
    id: 'controlador',
    heading: '1. Quem somos e escopo desta política',
    body: 'O VitrinePro (operado pela V8Pro) é o controlador dos dados pessoais tratados na plataforma, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD). Esta política se aplica a candidatos/profissionais, hunters, empresas e visitantes do site, e explica quais dados coletamos, por que, com quem compartilhamos e quais direitos você tem sobre eles.',
  },
  {
    id: 'dados',
    heading: '2. Dados que coletamos',
    body: 'Dados de cadastro: nome, e-mail, senha (armazenada com hash, nunca em texto puro), telefone, foto de perfil. Dados de perfil profissional: profissão, biografia, localização, links sociais, especialidades (hunter), portfólio, currículos e formação. Dados de empresa: razão social, indústria, dados fiscais quando aplicável. Dados de uso: páginas visitadas, candidaturas realizadas, interações com vagas, dados de dispositivo/navegador e cookies (ver Política de Cookies). Dados de candidatos indicados por hunters: quando um hunter cadastra um candidato do seu pool de relacionamento ("candidato fantasma") para submetê-lo a uma vaga, coletamos os dados fornecidos pelo hunter e solicitamos o consentimento do próprio candidato antes de qualquer submissão efetiva, por meio de um link de consentimento enviado por e-mail.',
  },
  {
    id: 'finalidade',
    heading: '3. Para que usamos seus dados',
    body: 'Usamos seus dados para: criar e manter sua conta; conectar candidatos, hunters e empresas dentro do marketplace de recrutamento; processar candidaturas e submissões, incluindo o registro de histórico, notas e etapas do pipeline seletivo; calcular fees e comissões do marketplace; enviar comunicações transacionais (confirmação de cadastro, redefinição de senha, convites de time, notificações de processo seletivo); prevenir fraude e uso indevido da plataforma; e, quando permitido pela sua configuração de privacidade, exibir seu perfil publicamente para aumentar suas chances de ser encontrado por recrutadores. Não vendemos seus dados pessoais a terceiros.',
  },
  {
    id: 'compartilhamento',
    heading: '4. Com quem compartilhamos seus dados',
    body: 'Compartilhamos dados com: (a) outros usuários da plataforma, na medida necessária ao processo seletivo — por exemplo, uma empresa vê os dados de candidatura enviados a uma vaga sua; (b) hunters, de forma limitada, quando você aceita participar de um processo indicado por eles; nesse caso, dados de contato (e-mail/telefone) podem ficar ocultos da empresa até uma etapa mais avançada do pipeline, para equilibrar a transparência do processo com a proteção da relação de indicação; (c) prestadores de serviço que nos auxiliam a operar a plataforma (hospedagem, armazenamento de arquivos, envio de e-mail transacional), sob obrigações contratuais de confidencialidade e segurança; (d) autoridades públicas, quando exigido por lei ou ordem judicial.',
  },
  {
    id: 'retencao',
    heading: '5. Por quanto tempo guardamos seus dados',
    body: 'Mantemos seus dados enquanto sua conta estiver ativa e pelo tempo adicional necessário para cumprir obrigações legais, fiscais ou para exercício regular de direitos em eventual disputa. Ao encerrar sua conta, dados de perfil público deixam de ficar visíveis; alguns registros históricos (como candidaturas já processadas) podem ser mantidos de forma anonimizada ou pelo prazo legal aplicável.',
  },
  {
    id: 'lgpd',
    heading: '6. Seus direitos como titular dos dados (LGPD)',
    body: 'Você tem direito a: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos, inexatos ou desatualizados; solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei; solicitar a portabilidade dos seus dados; revogar o consentimento dado; e obter informações sobre com quem compartilhamos seus dados. A maior parte desses controles já está disponível diretamente no seu perfil (edição de dados, visibilidade do perfil, exclusão de itens de portfólio/currículo). Para solicitações que ainda não têm um botão de autoatendimento (como exportação completa dos dados ou exclusão total da conta), entre em contato pelo canal de Suporte em nossa página de Contato — estamos trabalhando para trazer essas ações também para as configurações da conta.',
  },
  {
    id: 'seguranca',
    heading: '7. Segurança da informação',
    body: 'Adotamos medidas técnicas e organizacionais para proteger seus dados, como senhas armazenadas com hash criptográfico, controle de acesso por autenticação (JWT) e conexões criptografadas (HTTPS). Nenhum sistema é 100% imune a incidentes; caso identifiquemos um incidente de segurança que possa gerar risco relevante a você, iremos notificá-lo e às autoridades competentes conforme exigido pela LGPD.',
  },
  {
    id: 'cookies',
    heading: '8. Cookies',
    body: 'Usamos cookies essenciais ao funcionamento da plataforma (como manter sua sessão logada) e, mediante seu consentimento no banner de cookies, cookies de análise para entender o uso do site. Veja a Política de Cookies para o detalhamento completo e como gerenciar suas preferências.',
  },
  {
    id: 'menores',
    heading: '9. Menores de idade',
    body: 'O VitrinePro não é destinado a menores de 18 anos e não coletamos intencionalmente dados de menores. Se identificarmos uma conta criada por um menor, ela será removida.',
  },
  {
    id: 'alteracoes',
    heading: '10. Alterações desta política',
    body: 'Podemos atualizar esta Política de Privacidade periodicamente. Mudanças relevantes serão comunicadas por e-mail ou aviso na plataforma antes de entrarem em vigor, junto com a data de atualização no topo desta página.',
  },
  {
    id: 'contato',
    heading: '11. Contato e encarregado de dados (DPO)',
    body: 'Para exercer seus direitos de titular ou tirar dúvidas sobre esta política, fale com a gente pela página de Contato, com o assunto "Privacidade/LGPD". Responderemos dentro do prazo legal aplicável.',
  },
]
</script>

<template>
  <LegalDoc title="Política de Privacidade" updated="06/07/2026" :sections="sections" />
</template>
