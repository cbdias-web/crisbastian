import { UserRound, ContactRound, TrendingUp, Files, Wallet, Handshake, CalendarDays, ChartNoAxesCombined, GraduationCap } from 'lucide-react';

const manualCollections = [
  {
    id: 'conta', label: 'Conta e primeiros passos', icon: UserRound,
    description: 'Acesso, perfil, equipe e permissões para começar a trabalhar.',
    sections: ['introducao', 'perfil-usuario', 'usuarios', 'vendedores'],
  },
  {
    id: 'crm', label: 'CRM e prospecção', icon: ContactRound,
    description: 'Clientes, captação, distribuição e atendimento dos seus leads.',
    sections: ['clientes', 'prospecccao', 'central-leads', 'fila-contatos-popup', 'fila-contatos-esteira', 'liberacao-leads', 'config-prospeccao', 'discagem-operadora'],
  },
  {
    id: 'comercial', label: 'Vendas e negociação', icon: TrendingUp,
    description: 'Do pipeline à venda, com produtos, simuladores e propostas.',
    sections: ['vendas', 'pipeline', 'precificacao', 'produtos'],
  },
  {
    id: 'entrega', label: 'Contratos e implantação', icon: Files,
    description: 'Documentos, assinatura, compliance e acompanhamento pós-venda.',
    sections: ['contratos', 'implantacoes'],
  },
  {
    id: 'financeiro', label: 'Financeiro e comissões', icon: Wallet,
    description: 'Recebíveis, parcelas, comissionamento e notas fiscais.',
    sections: ['comissoes', 'parcelas-vincendas', 'notas-fiscais'],
  },
  {
    id: 'parceiros', label: 'Indicadores e parceiros', icon: Handshake,
    description: 'Indicações, espelhamento e acompanhamento pelo portal.',
    sections: ['indicadores', 'portal-indicador'],
  },
  {
    id: 'comunicacao', label: 'Agenda e comunicação', icon: CalendarDays,
    description: 'Compromissos, reuniões, mensagens e notificações da equipe.',
    sections: ['meus-clientes', 'google-calendar', 'chat-interno', 'comunicados', 'notificacoes', 'alertas-sistema'],
  },
  {
    id: 'gestao', label: 'Gestão e resultados', icon: ChartNoAxesCombined,
    description: 'Dashboards, metas, relatórios e dados da operação comercial.',
    sections: ['dashboard', 'metas', 'desempenho', 'relatorios', 'relatorio-interacoes', 'relatorio-acessos', 'mercado', 'importar'],
  },
  {
    id: 'aprendizado', label: 'Capacitação e suporte', icon: GraduationCap,
    description: 'Aulas, assistente, gamificação e resolução de dúvidas.',
    sections: ['treinamentos', 'assistente-ia', 'suporte', 'gamificacao-roleta'],
  },
];

export default manualCollections;