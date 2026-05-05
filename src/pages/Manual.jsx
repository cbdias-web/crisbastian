import { useState } from 'react';
import {
  BookOpen, ChevronRight, ChevronDown, ShoppingCart, BarChart3, Package, Users,
  DollarSign, Target, FileText, Upload, AlertTriangle, CheckCircle2, ArrowRight,
  Briefcase, CalendarClock, TrendingUp, GraduationCap, Bot, Megaphone, Receipt,
  ScrollText, Search, LayoutDashboard, Layers, Zap, Settings, BarChart2,
  TrendingDown, Bell, UserCheck, RefreshCw, Banknote, Globe
} from 'lucide-react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const sections = [
  {
    id: 'introducao', icon: BookOpen, title: 'Introdução à Plataforma',
    color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100',
    content: [
      { subtitle: 'O que é o Villela Exchange – Gestão Comercial?', text: 'O sistema de Gestão Comercial da Villela Exchange é uma plataforma completa para registro, acompanhamento e análise de vendas, comissões, metas e indicadores da equipe comercial. Integra Contratos, Pipeline, Prospecção, Treinamentos e IA em um único ambiente.' },
      { subtitle: 'Acesso e Login', text: 'O acesso é feito por convite do administrador. Após receber o e-mail de convite, crie sua senha e entre na plataforma. Suas permissões de menu são definidas pelo administrador.' },
      { subtitle: 'Perfil do Usuário', text: 'Clique no seu nome no canto superior do Dashboard para acessar seu perfil. Você pode alterar seu nome de tratamento (como aparece no sistema).' },
      { subtitle: 'Menus da plataforma', items: ['**Bloco Comercial:** Vendas, Clientes, Vendedores, Indicadores, Rel. Interações, Pipeline.', '**Bloco Apoio:** Meus Clientes, Manual, Capacitação, Contratos.', '**Bloco Administrativo (admins):** Comissões, Notificações, Comunicados, Notas Fiscais, Capacitação Admin, Relatório Comissões, Prospecção, Metas, Produtos, Importar.'] },
    ],
  },
  {
    id: 'dashboard', icon: LayoutDashboard, title: 'Dashboard',
    color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100',
    content: [
      { subtitle: 'Visão Geral', text: 'O Dashboard apresenta os principais indicadores de desempenho em tempo real: total vendido, número de vendas, comissão gerada, ticket médio e vendedores ativos.' },
      { subtitle: 'Filtros', text: 'Use filtros de data (início e fim), vendedor e produto. KPIs e gráficos se atualizam automaticamente.' },
      { subtitle: 'Meta do Time', text: 'Exibe o progresso da meta mensal da equipe com barra de progresso colorida: vermelho (< 40%), amarelo (40–69%), azul (70–99%) e verde (≥ 100%).' },
      { subtitle: 'Gráfico Volume vs Meta', text: 'Compara o volume de vendas individual de cada vendedor com sua meta do mês atual. Barras verdes indicam meta atingida.' },
      { subtitle: 'Ranking de Vendedores', text: 'Lista os vendedores ordenados pelo volume de vendas no período filtrado, com medalhas para o pódio.' },
    ],
  },
  {
    id: 'vendas', icon: ShoppingCart, title: 'Gestão de Vendas',
    color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100',
    content: [
      { subtitle: 'Dois caminhos para registrar uma venda', items: ['**Caminho A — Venda direta:** para produtos sem contrato formal. Acesse Vendas > Nova Venda.', '**Caminho B — Via Contrato:** obrigatório para CONTA GLOBAL, CONTA INTERNACIONAL e DOLARIZE AQUI.'] },
      { subtitle: 'Registrar uma nova venda (Caminho A)', steps: ['Acesse "Vendas" > clique em "Nova Venda".', 'Selecione o(s) Produto(s) na lista de ativos.', 'Selecione o Vendedor — o percentual de comissão é carregado automaticamente.', 'Informe o Valor Total do Contrato e a estrutura de pagamento.', 'Defina o Valor de Entrada (conta para a meta do mês imediatamente).', 'Busque o cliente pelo nome ou CPF/CNPJ.', 'Adicione Indicadores se houver.', 'Ajuste datas e valores de cada parcela individualmente.', 'Clique em "Salvar".'] },
      { subtitle: 'Estrutura de pagamento', items: ['**Sem parcelas (à vista):** valor total conta 100% para a meta.', '**Entrada + Nx parcelas:** entrada conta imediatamente; saldo vai para "Parcelas Vincendas".', '**Comissão zerada (0%):** aceito e persiste corretamente.'] },
      { subtitle: 'O que acontece automaticamente ao salvar', items: ['**Comissão do vendedor** gerada sobre o valor de entrada.', '**Comissões dos indicadores** geradas proporcionalmente.', '**Cliente vinculado** — criado automaticamente se não existia.', '**Parcelas criadas** no módulo "Parcelas Vincendas".', '**Meta e Dashboard atualizados** em tempo real.'] },
      { subtitle: 'Exportar dados', items: ['**Vendas CSV:** exporta para Excel.', '**Clientes CSV:** lista de clientes únicos do período.', '**Relatório PDF:** documento de todas as transações.'] },
    ],
  },
  {
    id: 'comissoes', icon: DollarSign, title: 'Comissões',
    color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100',
    content: [
      { subtitle: 'Como as comissões são geradas', text: 'Criadas automaticamente ao salvar uma venda. Calculadas sobre o valor de entrada.' },
      { subtitle: 'Tipos de comissão', items: ['**Normal:** gerada para o vendedor responsável.', '**Indicador (espelhamento):** gerada para indicadores vinculados.', '**Bônus:** concedido manualmente ou ao atingir 100% da meta.'] },
      { subtitle: 'Marcar como paga', text: 'Na página de Comissões, marque individualmente ou em lote. Comissões pagas ficam em verde e saem do saldo pendente.' },
      { subtitle: 'Relatório Consolidado', text: 'Em Vendedores > "Relatório Consolidado": volume de entrada, volume total de contrato, comissão estimada, progresso de meta e desempenho por produto. Exportável em PDF e CSV.' },
    ],
  },
  {
    id: 'metas', icon: Target, title: 'Metas',
    color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100',
    content: [
      { subtitle: 'Tipos de meta', items: ['**Individual:** por vendedor e mês.', '**Time:** para um time específico.', '**Equipe:** meta global, exibida no Dashboard.'] },
      { subtitle: 'Criar uma meta', steps: ['Acesse "Metas" > "Nova Meta".', 'Selecione o tipo e o vendedor (se individual).', 'Defina mês de referência, valor e bônus (opcional).', 'Clique em "Salvar".'] },
      { subtitle: 'Cores de progresso', text: 'Vermelho (< 40%), Amarelo (40–69%), Azul (70–99%), Verde (≥ 100%), Dourado (bônus superado).' },
    ],
  },
  {
    id: 'vendedores', icon: Users, title: 'Vendedores',
    color: 'from-sky-500 to-sky-600', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100',
    content: [
      { subtitle: 'Cadastrar vendedor', steps: ['Acesse "Vendedores" > "Novo Vendedor".', 'Preencha nome, e-mail, time e percentual de comissão padrão.', 'Defina o status e clique em "Salvar".'] },
      { subtitle: 'Relatório Consolidado', text: 'Clique em "Relatório Consolidado" para painel com dados de todos os vendedores no período. Exportável em PDF e CSV.' },
      { subtitle: 'Relatório individual', text: 'Ícone 📄 no card do vendedor gera PDF com vendas, comissões e bônus do período.' },
      { subtitle: 'Envio por e-mail', text: 'Ícone ✈️ para envio individual. "Enviar Relatórios" para envio em massa com rastreamento.' },
    ],
  },
  {
    id: 'indicadores', icon: Users, title: 'Indicadores (Espelhamentos)',
    color: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100',
    content: [
      { subtitle: 'O que são indicadores?', text: 'Parceiros externos que indicam clientes e recebem comissão pelo negócio fechado.' },
      { subtitle: 'Tipos de indicador', items: ['**Indicador externo:** cadastrado no menu "Indicadores".', '**Vendedor interno como indicador:** qualquer vendedor pode ser adicionado como indicador em venda de outro.'] },
      { subtitle: 'Limite de espelhamento', items: ['**Até 30%:** sem restrição.', '**30% a 50%:** requer autorização do administrador.', '**Acima de 50%:** bloqueado pelo sistema.'] },
    ],
  },
  {
    id: 'produtos', icon: Package, title: 'Produtos',
    color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100',
    content: [
      { subtitle: 'Gerenciar produtos', text: 'Acesse "Produtos" para criar, editar ou desativar produtos. Apenas ativos aparecem no formulário de vendas.' },
      { subtitle: 'Cadastrar produto', steps: ['Clique em "Novo Produto".', 'Informe nome, categoria e status.', 'Clique em "Salvar".'] },
    ],
  },
  {
    id: 'relatorios', icon: FileText, title: 'Relatórios',
    color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100',
    content: [
      { subtitle: 'Relatório Consolidado de Vendas', text: 'Em Vendedores > "Relatório Consolidado". Volume de entrada, volume total, comissão estimada, % de meta e desempenho por produto. PDF e CSV.' },
      { subtitle: 'Relatório individual do vendedor', text: 'Ícone 📄 no card. PDF com vendas, comissões e bônus do período.' },
      { subtitle: 'Relatório de vendas', text: 'Botão "Relatório PDF" em Vendas. Resumo de todas as transações do período filtrado.' },
      { subtitle: 'Relatório de Comissões', text: 'Menu administrativo com relatório consolidado de comissões por período.' },
      { subtitle: 'Relatório de Interações', text: 'Menu "Rel. Interações". Filtre por resultado, tipo e vendedor. Exportável em PDF.' },
      { subtitle: 'Relatório PDF do Pipeline', text: 'Botão "Relatório PDF" no Pipeline. Negócios filtrados, KPIs e tabela detalhada.' },
    ],
  },
  {
    id: 'importar', icon: Upload, title: 'Importação de Dados',
    color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100',
    content: [
      { subtitle: 'Como importar histórico', steps: ['Acesse "Importar" ou clique em "Importar Histórico" em Vendas.', 'Faça upload de CSV ou Excel.', 'Verifique o preview dos dados.', 'Clique em "Importar" e acompanhe em tempo real.'] },
      { subtitle: 'Colunas reconhecidas', items: ['Data (DD/MM/YYYY ou YYYY-MM-DD)', 'Produto, Vendedor / Assessor Comercial', 'Cliente, CPF/CNPJ', 'Valor, Forma de Pagamento, Observação, Bitrix'] },
      { subtitle: 'Deduplicação', text: 'O sistema verifica duplicatas (mesmo cliente, data e valor) automaticamente.' },
    ],
  },
  {
    id: 'notificacoes', icon: AlertTriangle, title: 'Notificações e Autorizações',
    color: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100',
    content: [
      { subtitle: 'Tipos de notificação', items: ['**Espelhamento acima de 30%:** requer aprovação do administrador.', '**Novo contrato criado:** solicita que o admin adicione link de assinatura.'] },
      { subtitle: 'Fluxo — espelhamento', steps: ['Vendedor registra venda com espelhamento entre 30% e 50%.', 'Admin recebe notificação por e-mail e Jarvis.', 'Admin aprova ou rejeita em "Notificações".'] },
      { subtitle: 'Fluxo — novo contrato', steps: ['Gerente salva contrato.', 'Admin recebe alerta no Jarvis, Notificações e e-mail.', 'Admin adiciona link de assinatura online.', 'Gerente encaminha ao cliente.'] },
    ],
  },
  {
    id: 'usuarios', icon: Users, title: 'Gestão de Usuários',
    color: 'from-slate-500 to-slate-600', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100',
    content: [
      { subtitle: 'Convidar usuário', steps: ['Acesse "Usuários" (apenas admins).', 'Clique em "Convidar Usuário".', 'Preencha nome, e-mail e tipo de acesso.', 'Clique em "Enviar Convite".'] },
      { subtitle: 'Permissões', items: ['**Administrador:** acesso total.', '**Usuário padrão:** apenas menus liberados pelo admin, somente seus dados.'] },
    ],
  },
  {
    id: 'relatorio-interacoes', icon: FileText, title: 'Relatório de Interações',
    color: 'from-cyan-600 to-cyan-700', bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-100',
    content: [
      { subtitle: 'Visão geral', text: 'Centraliza todos os contatos com clientes e leads. Admins veem tudo; usuários padrão veem apenas os seus.' },
      { subtitle: 'Filtros', items: ['**Data:** período início/fim.', '**Vendedor:** específico ou todos (admin).', '**Resultado:** Positivo, Neutro, Negativo, Sem resposta.', '**Tipo:** Ligação, WhatsApp, E-mail, Reunião, Visita, Outro.'] },
      { subtitle: 'Exportar', text: 'Clique em "Exportar PDF" para gerar documento com gráficos, resumo por vendedor e listagem detalhada.' },
    ],
  },
  {
    id: 'meus-clientes', icon: Briefcase, title: 'Meus Clientes',
    color: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100',
    content: [
      { subtitle: 'O que é?', text: 'Gerenciamento da carteira de clientes e leads. Registre interações, acompanhe contatos e converta leads em clientes cativos.' },
      { subtitle: 'Criar novo lead', steps: ['Clique em "Novo Lead/Prospect".', 'Preencha nome, CPF/CNPJ, telefone e e-mail.', 'Clique em "Criar e Registrar Interação".', 'O sistema abre o formulário de primeira interação.'] },
      { subtitle: 'Converter lead', text: 'Lead com cadastro completo e histórico de interações: clique em "Converter em Cliente".' },
      { subtitle: 'Agenda diária', text: 'Seção "Agenda de Contatos" mostra leads agendados por data. Marque como "Realizado", "Não atendeu" ou "Reagendar".' },
    ],
  },
  {
    id: 'prospecccao', icon: Search, title: 'Prospecção — Novos Leads',
    color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100',
    content: [
      { subtitle: 'Importar lista de leads', steps: ['Clique em "Importar Lista".', 'Faça upload de CSV ou Excel (Nome, CPF/CNPJ, Telefone).', 'Nomeie o lote e verifique o preview.', 'Clique em "Importar".'] },
      { subtitle: 'Distribuir leads', steps: ['Selecione o lote e clique em "Distribuir".', 'Escolha os gerentes.', 'Sistema distribui automaticamente e gera agenda (até 5/dia por gerente).'] },
    ],
  },
  {
    id: 'treinamentos', icon: GraduationCap, title: 'Capacitação',
    color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100',
    content: [
      { subtitle: 'Acessar e consumir aulas', steps: ['Clique em "Capacitação" no menu.', 'Expanda um módulo e clique em uma aula.', 'Ao finalizar, clique em "Marcar como Concluída".'] },
      { subtitle: 'Tipos de conteúdo', items: ['**Vídeo, PDF, Texto, Imagem, Link externo.**'] },
      { subtitle: 'Administração', text: 'Em Administrativo > Capacitação (Admin): crie módulos, adicione aulas, publique ou oculte. Relatório de Progresso mostra avanço de cada usuário.' },
    ],
  },
  {
    id: 'assistente-ia', icon: Bot, title: 'Jarvis — Assistente IA',
    color: 'from-blue-600 to-blue-700', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-100',
    content: [
      { subtitle: 'O que é?', text: 'Assistente de IA disponível em todas as páginas no canto inferior direito. Pode ser arrastado livremente. Acessa dados da plataforma e da internet.' },
      { subtitle: 'Capacidades', items: ['**Vendas e relatórios:** volumes, rankings, metas e geração de PDFs no chat.', '**Clientes e leads:** localizar e checar histórico.', '**Comissões e metas:** saldo e progresso individual.', '**Busca na Web:** cotações, legislação e notícias em tempo real.', '**Envio de e-mails:** admin pode pedir ao Jarvis para enviar relatórios.'] },
    ],
  },
  {
    id: 'parcelas-vincendas', icon: CalendarClock, title: 'Parcelas Vincendas (Recebíveis)',
    color: 'from-amber-600 to-amber-700', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-100',
    content: [
      { subtitle: 'Como funcionam', items: ['**Valor de Entrada:** conta para a meta do mês imediatamente.', '**Saldo Restante:** parcelas mensais em "Parcelas Vincendas", contam na meta ao serem recebidas.', '**Parcelas vencidas:** fundo vermelho e badge "Vencida".'] },
      { subtitle: 'Registrar recebimento', steps: ['Localize a parcela na aba "Parcelas Vincendas".', 'Clique em "Receber".', 'Confirme data e valor.', 'O sistema cria Venda, gera comissões e fecha o Pipeline.'] },
    ],
  },
  {
    id: 'pipeline', icon: TrendingUp, title: 'Pipeline Comercial',
    color: 'from-indigo-600 to-indigo-700', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-100',
    content: [
      { subtitle: 'Temperaturas', items: ['🧊 **Frio:** prospecção inicial.', '🌤️ **Morno:** interesse demonstrado.', '🔥 **Quente:** alta probabilidade de fechamento.', '✅ **Fechado:** negócio concluído.', '❌ **Perdido:** encerrado sem resultado.'] },
      { subtitle: 'Converter prospecção', items: ['**Produtos sem contrato:** ícone de carrinho (🛒) → cria rascunho de venda.', '**CONTA GLOBAL / CONTA INTERNACIONAL / DOLARIZE AQUI:** ícone de documento (📜) → cria contrato em rascunho e fecha o negócio no Pipeline.'] },
      { subtitle: 'Integração', items: ['**Pipeline → Contratos:** converter cria contrato pré-preenchido.', '**Contratos → Vendas:** "Enviar para Vendas" gera a venda final.', '**Vendas → Pipeline (parcelas):** venda parcelada cria cards de parcelas automaticamente.'] },
    ],
  },
  {
    id: 'contratos', icon: ScrollText, title: 'Contratos',
    color: 'from-amber-700 to-amber-800', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200',
    content: [
      { subtitle: 'Tipos disponíveis', items: ['**Conta Global, Conta Internacional, Dolarize Aqui, ROF, Canal Bancário, Offshore.**'] },
      { subtitle: 'Criar contrato', steps: ['Acesse "Contratos" > selecione o tipo.', 'Busque cliente existente ou preencha manualmente.', 'Preencha Dados Pessoais, Endereço, Financeiro e Obs.', 'Clique em "Salvar". Admins são notificados automaticamente.'] },
      { subtitle: 'Fluxo de etapas', items: ['**Rascunho → PDF Gerado → Assinado → Aguardando Pagamento → Pago → No Pipeline.**'] },
      { subtitle: 'Enviar para Vendas', text: 'Após assinatura + pagamento confirmado, clique em "Enviar para Vendas". Cria venda pré-preenchida.' },
    ],
  },
  {
    id: 'comunicados', icon: Megaphone, title: 'Comunicados',
    color: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-100',
    content: [
      { subtitle: 'O que são?', text: 'Avisos dos administradores para toda a equipe. Aparecem como modal automático ao acessar a plataforma.' },
      { subtitle: 'Criar (admin)', steps: ['Acesse Administrativo > Comunicados.', 'Clique em "Novo Comunicado", preencha título e mensagem.', 'Salve — publicado imediatamente.'] },
    ],
  },
  {
    id: 'notas-fiscais', icon: Receipt, title: 'Notas Fiscais',
    color: 'from-teal-600 to-teal-700', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-100',
    content: [
      { subtitle: 'Ciclo de vida', items: ['**Solicitada:** nota solicitada ao emissor.', '**Enviada:** NF enviada; faça upload do PDF.', '**Paga:** pagamento confirmado — sistema cria Venda vinculada automaticamente.'] },
      { subtitle: 'Criar registro', steps: ['Acesse Administrativo > Notas Fiscais > "Nova NF".', 'Preencha Cliente/Parceiro, Valor, Produto e Data.', 'Salve o registro.'] },
    ],
  },
];

// ─── CATEGORY CARDS ──────────────────────────────────────────────────────────

const categories = [
  {
    id: 'vendas', label: 'Vendas', icon: BarChart2,
    gradFrom: '#00b09b', gradTo: '#007b6e',
    color: 'from-[#00b09b] to-[#007b6e]',
    sections: ['vendas', 'pipeline', 'parcelas-vincendas', 'meus-clientes', 'prospecccao'],
  },
  {
    id: 'financas', label: 'Finanças', icon: DollarSign,
    gradFrom: '#36d1dc', gradTo: '#4a6fa5',
    color: 'from-[#36d1dc] to-[#4a6fa5]',
    sections: ['comissoes', 'metas', 'notas-fiscais', 'relatorios', 'importar'],
  },
  {
    id: 'operacoes', label: 'Operações', icon: Settings,
    gradFrom: '#56ab2f', gradTo: '#2d7a0f',
    color: 'from-[#56ab2f] to-[#2d7a0f]',
    sections: ['contratos', 'indicadores', 'treinamentos', 'relatorio-interacoes', 'comunicados'],
  },
  {
    id: 'admin', label: 'Admin', icon: UserCheck,
    gradFrom: '#9b59b6', gradTo: '#6c3483',
    color: 'from-[#9b59b6] to-[#6c3483]',
    sections: ['introducao', 'dashboard', 'vendedores', 'produtos', 'notificacoes', 'usuarios', 'assistente-ia'],
  },
];

// ─── SECTION ACCORDION ───────────────────────────────────────────────────────

function SectionBlock({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  return (
    <div className={`rounded-xl border ${section.border} overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? section.bg : 'bg-white hover:bg-gray-50'}`}
      >
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${section.color} shadow-sm flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className={`flex-1 font-semibold text-sm ${isOpen ? section.text : 'text-gray-800'}`}>{section.title}</span>
        {isOpen
          ? <ChevronDown className={`w-4 h-4 flex-shrink-0 ${section.text}`} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" style={{ transform: 'rotate(-90deg)' }} />}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-3 space-y-5 bg-white">
          {section.content.map((block, i) => (
            <div key={i}>
              <h4 className={`font-semibold text-sm mb-2 flex items-center gap-2 ${section.text}`}>
                <span className={`w-1 h-4 rounded-full bg-gradient-to-b ${section.color} flex-shrink-0`} />
                {block.subtitle}
              </h4>
              {block.text && <p className="text-sm text-gray-600 leading-relaxed ml-3">{block.text}</p>}
              {block.steps && (
                <ol className="ml-3 space-y-1.5">
                  {block.steps.map((step, si) => (
                    <li key={si} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${section.color} text-white text-[10px] font-bold flex items-center justify-center mt-0.5`}>{si + 1}</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {block.items && (
                <ul className="ml-3 space-y-1.5">
                  {block.items.map((item, ii) => (
                    <li key={ii} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${section.text} opacity-60`} />
                      <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Manual() {
  const [openSections, setOpenSections] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  const toggle = (id) => setOpenSections(prev =>
    prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
  );

  const handleCategory = (cat) => {
    if (activeCategory === cat.id) {
      setActiveCategory(null);
      return;
    }
    setActiveCategory(cat.id);
    // open all sections of this category, close others
    setOpenSections(cat.sections);
    setTimeout(() => {
      document.getElementById('sections-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // Quick nav tags: featured sections
  const quickNavIds = ['introducao', 'dashboard', 'vendas', 'vendedores', 'prospecccao', 'pipeline', 'contratos', 'meus-clientes', 'relatorios', 'importar', 'contratos'];
  const quickNavSections = sections.filter((s, i, arr) => quickNavIds.includes(s.id) && arr.findIndex(x => x.id === s.id) === i).slice(0, 12);

  const visibleSections = activeCategory
    ? sections.filter(s => categories.find(c => c.id === activeCategory)?.sections.includes(s.id))
    : sections;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7f5c14 0%, #b8860b 25%, #1a3150 60%, #0f1e35 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 50%)' }} />
        <div className="relative px-6 py-10 md:py-12 max-w-5xl mx-auto">
          <div className="mb-1 text-yellow-200/60 text-xs uppercase tracking-widest font-semibold">Villela Exchange</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-yellow-300 flex-shrink-0" />
            Manual da Plataforma
          </h1>
          <p className="text-white/60 text-sm mb-6 flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Gestão Comercial — Guia completo de utilização
          </p>
          <p className="text-white/70 text-sm leading-relaxed max-w-xl mb-8">
            Documentação completa de todas as funcionalidades: Vendas, Contratos, Pipeline, Comissões,
            Relatórios, Prospecção, Capacitação e muito mais. Atualizado com as últimas funcionalidades do sistema.
          </p>
          {/* stats */}
          <div className="flex gap-4">
            {[{ v: sections.length, l: 'Seções' }, { v: sections.reduce((a, s) => a + s.content.length, 0), l: 'Tópicos' }, { v: 'Mai/2026', l: 'Atualizado' }].map(k => (
              <div key={k.l} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-5 py-3 text-center min-w-[70px]">
                <p className="text-xl font-bold text-white">{k.v}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{k.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ── QUICK NAV ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Navegação Rápida</p>
          <div className="flex flex-wrap gap-2">
            {quickNavSections.map(s => {
              const isOpen = openSections.includes(s.id);
              return (
                <button key={s.id} onClick={() => {
                  if (!openSections.includes(s.id)) toggle(s.id);
                  setActiveCategory(null);
                  setTimeout(() => document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isOpen ? 'bg-[#1a3150] text-white border-[#1a3150]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CATEGORY CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => handleCategory(cat)}
                className={`relative overflow-hidden rounded-2xl py-8 px-4 flex flex-col items-center justify-center gap-4 transition-all shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-95 ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-100' : ''}`}
                style={{ background: `linear-gradient(145deg, var(--cat-from), var(--cat-to))`,
                  '--cat-from': cat.gradFrom, '--cat-to': cat.gradTo }}
              >
                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <Icon className="w-9 h-9 text-white" />
                </div>
                <span className="text-white font-bold text-xl tracking-wide drop-shadow">{cat.label}</span>
                {isActive && <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/50 rounded-full" />}
              </button>
            );
          })}
        </div>



        {/* ── ACCORDION GRID ── */}
        <div id="sections-list">
          {activeCategory && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Filtrando por:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1a3150] text-white">
                {categories.find(c => c.id === activeCategory)?.label}
              </span>
              <button onClick={() => setActiveCategory(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">ver tudo</button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Col 1 */}
            <div className="space-y-2">
              {visibleSections.filter((_, i) => i % 4 === 0).map(s => (
                <div key={s.id} id={`sec-${s.id}`}>
                  <SectionBlock section={s} isOpen={openSections.includes(s.id)} onToggle={() => toggle(s.id)} />
                </div>
              ))}
            </div>
            {/* Col 2 */}
            <div className="space-y-2">
              {visibleSections.filter((_, i) => i % 4 === 1).map(s => (
                <div key={s.id} id={`sec-${s.id}`}>
                  <SectionBlock section={s} isOpen={openSections.includes(s.id)} onToggle={() => toggle(s.id)} />
                </div>
              ))}
            </div>
            {/* Col 3 */}
            <div className="space-y-2">
              {visibleSections.filter((_, i) => i % 4 === 2).map(s => (
                <div key={s.id} id={`sec-${s.id}`}>
                  <SectionBlock section={s} isOpen={openSections.includes(s.id)} onToggle={() => toggle(s.id)} />
                </div>
              ))}
            </div>
            {/* Col 4 */}
            <div className="space-y-2">
              {visibleSections.filter((_, i) => i % 4 === 3).map(s => (
                <div key={s.id} id={`sec-${s.id}`}>
                  <SectionBlock section={s} isOpen={openSections.includes(s.id)} onToggle={() => toggle(s.id)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TIP ── */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <p className="text-sm text-amber-800">
            <strong>Dica:</strong> Usuários não-administradores visualizam apenas os menus liberados pelo admin e somente seus próprios dados de vendas e comissões.
            Use a busca acima para encontrar rapidamente qualquer funcionalidade.
          </p>
        </div>

        {/* ── FOOTER ── */}
        <div className="text-center py-4 text-[11px] text-gray-300 uppercase tracking-widest">
          Villela Exchange · Gestão Comercial · Manual da Plataforma · Mai/2026
        </div>
      </div>
    </div>
  );
}