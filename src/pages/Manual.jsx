import { useState } from 'react';
import {
  BookOpen, ShoppingCart, BarChart3, Package, Users, DollarSign, Target,
  FileText, Upload, AlertTriangle, CheckCircle2, Briefcase, CalendarClock,
  TrendingUp, GraduationCap, Bot, Megaphone, Receipt, ScrollText, Search,
  LayoutDashboard, ChevronDown, ChevronRight, ArrowRight, Zap, X
} from 'lucide-react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const categories = [
  {
    id: 'comercial',
    label: 'Comercial',
    color: '#10b981',
    bg: 'bg-emerald-500',
    sections: ['vendas', 'pipeline', 'parcelas-vincendas', 'contratos'],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    color: '#f59e0b',
    bg: 'bg-amber-500',
    sections: ['comissoes', 'metas', 'notas-fiscais', 'relatorios'],
  },
  {
    id: 'equipe',
    label: 'Equipe',
    color: '#6366f1',
    bg: 'bg-indigo-500',
    sections: ['vendedores', 'indicadores', 'meus-clientes', 'relatorio-interacoes'],
  },
  {
    id: 'operacoes',
    label: 'Operações',
    color: '#0ea5e9',
    bg: 'bg-sky-500',
    sections: ['prospecccao', 'treinamentos', 'assistente-ia', 'comunicados'],
  },
  {
    id: 'plataforma',
    label: 'Plataforma',
    color: '#8b5cf6',
    bg: 'bg-violet-500',
    sections: ['introducao', 'dashboard', 'usuarios', 'importar', 'notificacoes', 'produtos'],
  },
];

const sections = [
  {
    id: 'introducao', icon: BookOpen, title: 'Introdução à Plataforma',
    accent: '#6366f1',
    content: [
      { subtitle: 'O que é o Villela Exchange – Gestão Comercial?', text: 'Plataforma completa para registro, acompanhamento e análise de vendas, comissões, metas e indicadores. Integra Contratos, Pipeline, Prospecção, Treinamentos e IA em um único ambiente.' },
      { subtitle: 'Acesso e Login', text: 'O acesso é feito por convite do administrador. Após receber o e-mail de convite, crie sua senha e entre na plataforma. Suas permissões de menu são definidas pelo administrador.' },
      { subtitle: 'Estrutura de menus', items: ['**Comercial:** Vendas, Clientes, Vendedores, Indicadores, Rel. Interações, Pipeline.', '**Apoio:** Meus Clientes, Manual, Capacitação, Contratos.', '**Administrativo:** Comissões, Notificações, Comunicados, Notas Fiscais, Capacitação Admin, Relatório Comissões, Prospecção, Metas, Produtos, Importar.'] },
    ],
  },
  {
    id: 'dashboard', icon: LayoutDashboard, title: 'Dashboard',
    accent: '#6366f1',
    content: [
      { subtitle: 'Visão Geral', text: 'Indicadores de desempenho em tempo real: total vendido, número de vendas, comissão gerada, ticket médio e vendedores ativos.' },
      { subtitle: 'Filtros', text: 'Data (início e fim), vendedor e produto. KPIs e gráficos se atualizam automaticamente.' },
      { subtitle: 'Meta do Time', text: 'Progresso mensal com barra colorida: vermelho (< 40%), amarelo (40–69%), azul (70–99%), verde (≥ 100%).' },
      { subtitle: 'Ranking de Vendedores', text: 'Vendedores ordenados por volume no período, com medalhas para o pódio.' },
    ],
  },
  {
    id: 'vendas', icon: ShoppingCart, title: 'Gestão de Vendas',
    accent: '#10b981',
    content: [
      { subtitle: 'Dois caminhos para registrar uma venda', items: ['**Caminho A — Venda direta:** para produtos sem contrato. Acesse Vendas > Nova Venda.', '**Caminho B — Via Contrato:** obrigatório para CONTA GLOBAL, CONTA INTERNACIONAL e DOLARIZE AQUI.'] },
      { subtitle: 'Registrar uma nova venda', steps: ['Acesse "Vendas" > clique em "Nova Venda".', 'Selecione o(s) Produto(s).', 'Selecione o Vendedor — percentual de comissão carregado automaticamente.', 'Informe o Valor Total e estrutura de pagamento (à vista ou parcelado).', 'Defina o Valor de Entrada — conta para a meta imediatamente.', 'Busque o cliente pelo nome ou CPF/CNPJ.', 'Adicione Indicadores, se houver.', 'Clique em "Salvar".'] },
      { subtitle: 'Estrutura de pagamento', items: ['**Sem parcelas (à vista):** 100% da entrada conta para a meta do mês.', '**Entrada + Nx parcelas:** entrada conta imediatamente; saldo restante acompanhado em Parcelas Vincendas.', '**Ajuste de parcelas:** edite valor e data de vencimento individualmente. Indicador "✓ Valores OK" confirma equilíbrio.'] },
      { subtitle: 'Comissão zerada (0%)', text: 'Aceita 0% de comissão para o vendedor. O campo persiste corretamente sem reversão para valores anteriores.' },
      { subtitle: 'O que acontece ao salvar', items: ['Comissão do vendedor gerada sobre o valor de entrada.', 'Comissões dos indicadores geradas proporcionalmente.', 'Cliente vinculado à carteira — criado automaticamente se não existia.', 'Parcelas criadas em Parcelas Vincendas.', 'Registro no Pipeline criado para cada parcela.', 'Meta e Dashboard atualizados em tempo real.'] },
      { subtitle: 'Cuidados importantes', items: ['**CONTA GLOBAL, CONTA INTERNACIONAL e DOLARIZE AQUI** sempre pelo Caminho B.', 'Excluir uma venda remove todas as comissões vinculadas.', 'O percentual da venda prevalece sobre o padrão do vendedor.', 'Indicadores acima de 30% requerem autorização do administrador.'] },
    ],
  },
  {
    id: 'comissoes', icon: DollarSign, title: 'Comissões',
    accent: '#f59e0b',
    content: [
      { subtitle: 'Como são geradas', text: 'Criadas automaticamente ao salvar uma venda. Calculadas sobre o valor de entrada pelo percentual definido.' },
      { subtitle: 'Tipos', items: ['**Comissão normal:** para o vendedor responsável.', '**Espelhamento (indicador):** para indicadores vinculados.', '**Bônus:** concedido manualmente ou ao atingir 100% da meta.'] },
      { subtitle: 'Marcar como paga', text: 'Na página Comissões, marque individualmente ou em lote. Pagas ficam em verde e saem do saldo pendente.' },
      { subtitle: 'Relatório Consolidado', text: 'Em Vendedores > "Relatório Consolidado": volume de entrada, volume total de contratos, comissão estimada e progresso de meta por vendedor. Exportável em PDF e CSV.' },
    ],
  },
  {
    id: 'metas', icon: Target, title: 'Metas',
    accent: '#f59e0b',
    content: [
      { subtitle: 'Tipos de meta', items: ['**Individual:** por vendedor e mês. Barra de progresso no card do vendedor.', '**Time:** meta para um time específico.', '**Equipe:** meta global, exibida no Dashboard.'] },
      { subtitle: 'Criar uma meta', steps: ['Acesse "Metas" > "Nova Meta".', 'Selecione o tipo e o vendedor (se individual).', 'Defina mês (YYYY-MM), valor da meta e valor do bônus.', 'Clique em "Salvar".'] },
      { subtitle: 'Bônus automático', text: 'Ao atingir 100% da meta, um bônus é gerado automaticamente se o valor estiver configurado.' },
    ],
  },
  {
    id: 'vendedores', icon: Users, title: 'Vendedores',
    accent: '#6366f1',
    content: [
      { subtitle: 'Cadastrar vendedor', steps: ['Acesse "Vendedores" > "Novo Vendedor".', 'Preencha nome, e-mail, time e percentual de comissão padrão.', 'Defina o status e salve.'] },
      { subtitle: 'Relatório Consolidado', text: 'Clique em "Relatório Consolidado" para visualizar todos os vendedores: volume de entrada, volume total de contratos, comissão estimada, % de meta e desempenho por produto. Exportável em PDF e CSV.' },
      { subtitle: 'Relatório individual', text: 'Ícone 📄 no card do vendedor. Gera PDF com vendas, comissões e bônus do período.' },
      { subtitle: 'Envio por e-mail', text: 'Ícone ✈️ para envio individual. "Enviar Relatórios" para envio em massa com rastreamento.' },
      { subtitle: 'Bônus manual', text: 'Ícone "$" no card para conceder ou editar bônus manual no mês selecionado.' },
    ],
  },
  {
    id: 'indicadores', icon: Users, title: 'Indicadores (Espelhamentos)',
    accent: '#6366f1',
    content: [
      { subtitle: 'O que são?', text: 'Parceiros externos que indicam clientes e recebem comissão pelo negócio fechado.' },
      { subtitle: 'Tipos em uma venda', items: ['**Indicador externo:** cadastrado no menu "Indicadores".', '**Vendedor interno como indicador:** qualquer vendedor pode ser adicionado como indicador em venda de outro.'] },
      { subtitle: 'Limites de espelhamento', items: ['Até 30%: sem restrição.', '30% a 50%: permitido, mas notifica admins para autorização.', 'Acima de 50%: bloqueado.'] },
    ],
  },
  {
    id: 'produtos', icon: Package, title: 'Produtos',
    accent: '#6366f1',
    content: [
      { subtitle: 'Gerenciar produtos', text: 'Acesse "Produtos" para criar, editar ou desativar. Apenas produtos ativos aparecem no formulário de vendas e filtros.' },
      { subtitle: 'Cadastrar', steps: ['Clique em "Novo Produto".', 'Informe nome, categoria e status.', 'Clique em "Salvar".'] },
    ],
  },
  {
    id: 'relatorios', icon: FileText, title: 'Relatórios',
    accent: '#f59e0b',
    content: [
      { subtitle: 'Relatório Consolidado de Vendas', text: 'Em Vendedores > "Relatório Consolidado": por vendedor — volume entrada, volume contratos, comissão estimada, % meta e desempenho por produto. PDF e CSV.' },
      { subtitle: 'Relatório individual do vendedor', text: 'Ícone 📄 no card. PDF com vendas, comissões e bônus do período.' },
      { subtitle: 'Relatório de Vendas', text: 'Em Vendas > "Relatório PDF". Resumo de todas as transações do período filtrado.' },
      { subtitle: 'Relatório Comissões (menu admin)', text: 'Relatórios consolidados por período com detalhamento, bônus e status de pagamento.' },
      { subtitle: 'Relatório de Interações', text: '"Rel. Interações" na barra lateral. Contatos com clientes/leads, filtros por resultado/tipo/vendedor. Gráfico de produtividade para admins. Exportável em PDF.' },
      { subtitle: 'Relatório Pipeline', text: 'Em Pipeline > "Relatório PDF". Negócios filtrados, KPIs e tabela detalhada.' },
      { subtitle: 'Relatório Notas Fiscais', text: 'Em Notas Fiscais > "Relatório PDF". Totais por status e valor acumulado.' },
    ],
  },
  {
    id: 'importar', icon: Upload, title: 'Importação de Dados',
    accent: '#6366f1',
    content: [
      { subtitle: 'Importar histórico de vendas', steps: ['Acesse "Importar" ou "Importar Histórico" em Vendas.', 'Upload de CSV ou Excel (.xlsx).', 'O sistema mapeia automaticamente as colunas.', 'Verifique o preview e clique em "Importar".'] },
      { subtitle: 'Colunas reconhecidas', items: ['Data (DD/MM/YYYY ou YYYY-MM-DD)', 'Produto, Vendedor / Assessor Comercial', 'Cliente, CPF/CNPJ', 'Valor (vírgula ou ponto)', 'Forma de Pagamento, Observação, Link Bitrix'] },
      { subtitle: 'Deduplicação', text: 'Verifica automaticamente duplicatas pelo mesmo cliente, data e valor.' },
    ],
  },
  {
    id: 'notificacoes', icon: AlertTriangle, title: 'Notificações e Autorizações',
    accent: '#ef4444',
    content: [
      { subtitle: 'Tipos', items: ['**Espelhamento acima de 30%:** requer aprovação do admin.', '**Novo contrato:** disparada ao salvar. Solicita que admin adicione link de assinatura.'] },
      { subtitle: 'Fluxo — espelhamento', steps: ['Vendedor registra venda com espelhamento 30–50%.', 'Notificação enviada por e-mail e Jarvis.', 'Admin aprova ou rejeita em "Notificações".'] },
      { subtitle: 'Fluxo — novo contrato', steps: ['Gerente salva contrato.', 'Admin recebe alerta no Jarvis, Notificações e e-mail.', 'Admin adiciona link de assinatura no visualizador.', 'Marcar como "Resolvido" ao concluir.'] },
    ],
  },
  {
    id: 'usuarios', icon: Users, title: 'Gestão de Usuários',
    accent: '#6366f1',
    content: [
      { subtitle: 'Convidar usuário', steps: ['Acesse "Usuários" (apenas admins).', 'Clique em "Convidar Usuário".', 'Preencha nome, e-mail e tipo de acesso.', 'Envie o convite.'] },
      { subtitle: 'Permissões', items: ['**Administrador:** acesso total a todos os menus e dados.', '**Usuário padrão:** apenas menus liberados pelo admin e seus próprios dados.'] },
    ],
  },
  {
    id: 'relatorio-interacoes', icon: FileText, title: 'Relatório de Interações',
    accent: '#0ea5e9',
    content: [
      { subtitle: 'Visão geral', text: 'Centraliza todos os contatos com clientes e leads. Admins veem tudo; usuários padrão, apenas os seus.' },
      { subtitle: 'Filtros', items: ['Período, vendedor, resultado (Positivo/Neutro/Negativo/Sem resposta), tipo de contato, busca livre.'] },
      { subtitle: 'Exportar', text: '"Exportar PDF" gera documento completo com gráficos, resumo por vendedor e listagem.' },
    ],
  },
  {
    id: 'meus-clientes', icon: Briefcase, title: 'Meus Clientes',
    accent: '#0ea5e9',
    content: [
      { subtitle: 'O que é?', text: 'Gestão da carteira de clientes e leads. Registro de interações, acompanhamento de próximos contatos e conversão de leads.' },
      { subtitle: 'Criar novo lead', steps: ['Clique em "Novo Lead/Prospect".', 'Preencha nome, CPF/CNPJ, telefone, e-mail.', 'Clique em "Criar e Registrar Interação" — o sistema abre o formulário de primeira interação.'] },
      { subtitle: 'Converter lead em cliente', text: 'Com histórico de interações e cadastro completo, clique em "Converter em Cliente".' },
      { subtitle: 'Ações em lote (admin)', text: 'Trocar gerente responsável, devolver leads ou excluir registros em lote.' },
    ],
  },
  {
    id: 'prospecccao', icon: Search, title: 'Prospecção — Novos Leads',
    accent: '#0ea5e9',
    content: [
      { subtitle: 'O que é?', text: 'Menu administrativo para importar listas de leads em lote, distribuir entre gerentes e acompanhar conversões.' },
      { subtitle: 'Importar e distribuir', steps: ['Clique em "Importar Lista" > upload CSV ou Excel.', 'Nomeie o lote e confirme.', 'Selecione o lote pendente e clique em "Distribuir".', 'Escolha os gerentes — sistema embaralha e distribui automaticamente.'] },
    ],
  },
  {
    id: 'treinamentos', icon: GraduationCap, title: 'Capacitação',
    accent: '#0ea5e9',
    content: [
      { subtitle: 'O que é?', text: 'Módulos organizados por tema com aulas em vídeo, PDF, texto, imagens ou links externos.' },
      { subtitle: 'Consumir aulas', steps: ['Clique em "Capacitação" > expanda um módulo.', 'Clique em uma aula para abrir o conteúdo.', 'Clique em "Marcar como Concluída" ao finalizar.'] },
      { subtitle: 'Administração (admin)', text: 'Em Administrativo > Capacitação Admin: crie módulos, adicione aulas, publique ou oculte. Relatório de Progresso mostra avanço por usuário.' },
    ],
  },
  {
    id: 'assistente-ia', icon: Bot, title: 'Jarvis — Assistente IA',
    accent: '#0ea5e9',
    content: [
      { subtitle: 'O que é?', text: 'IA disponível em todas as páginas (canto inferior direito, arrastável). Acessa dados da plataforma e da internet.' },
      { subtitle: 'O que pode fazer', items: ['Vendas e relatórios: volumes, rankings, metas, geração de PDFs no chat.', 'Clientes e leads: histórico de interações.', 'Comissões e metas: saldo e progresso individual.', 'Busca na Web: cotações, legislação, notícias em tempo real.', 'Envio de e-mails: relatórios por e-mail via chat.'] },
      { subtitle: 'Privacidade', text: 'Respeita as permissões da plataforma. Dados de admins não são expostos a usuários comuns.' },
    ],
  },
  {
    id: 'parcelas-vincendas', icon: CalendarClock, title: 'Parcelas Vincendas',
    accent: '#10b981',
    content: [
      { subtitle: 'O que são?', text: 'Prestações do saldo restante de vendas parceladas. Criadas automaticamente ao registrar uma venda parcelada.' },
      { subtitle: 'Como funcionam', items: ['**Valor de Entrada:** conta imediatamente para a meta.', '**Saldo Restante:** dividido em parcelas mensais, contam para a meta ao serem recebidas.', '**Parcelas vencidas:** exibidas em vermelho para ação prioritária.'] },
      { subtitle: 'Registrar recebimento', steps: ['Localize a parcela em Pipeline > "Parcelas Vincendas".', 'Clique em "Receber".', 'Confirme data e valor.', 'O sistema cria uma Venda, gera comissões e fecha o Pipeline automaticamente.'] },
    ],
  },
  {
    id: 'pipeline', icon: TrendingUp, title: 'Pipeline Comercial',
    accent: '#10b981',
    content: [
      { subtitle: 'O que é?', text: 'CRM kanban para acompanhar prospecções do primeiro contato ao fechamento.' },
      { subtitle: 'Temperaturas', items: ['🧊 Frio, 🌤️ Morno, 🔥 Quente, ✅ Fechado, ❌ Perdido'] },
      { subtitle: 'Converter prospecção', items: ['**Produtos sem contrato:** ícone 🛒 → cria rascunho de venda pré-preenchido.', '**CONTA GLOBAL / INTERNACIONAL / DOLARIZE AQUI:** ícone 📜 → cria contrato em rascunho e fecha o negócio no Pipeline.'] },
      { subtitle: 'Integração', items: ['Pipeline → Contratos: converter cria contrato em rascunho.', 'Contratos → Vendas: "Enviar para Vendas" gera a venda final.', 'Vendas → Pipeline: venda parcelada cria cards de parcelas automaticamente.'] },
    ],
  },
  {
    id: 'contratos', icon: ScrollText, title: 'Contratos',
    accent: '#10b981',
    content: [
      { subtitle: 'Tipos disponíveis', items: ['Conta Global, Conta Internacional, Dolarize Aqui, ROF, Canal Bancário, Offshore.'] },
      { subtitle: 'Criar contrato', steps: ['Acesse "Contratos" > clique no tipo desejado.', 'Busque cliente existente ou preencha manualmente.', 'Complete as abas: Dados Pessoais, Endereço, Financeiro, Obs. & Data.', 'Salve — admins são notificados automaticamente.'] },
      { subtitle: 'Fluxo de status', items: ['Rascunho → PDF Gerado → Assinado → Aguardando Pagamento → Pago → No Pipeline.'] },
      { subtitle: 'Enviar para Vendas', text: 'Após assinatura + pagamento confirmado, "Enviar para Vendas" gera a venda pré-preenchida com dados do contrato.' },
    ],
  },
  {
    id: 'comunicados', icon: Megaphone, title: 'Comunicados',
    accent: '#0ea5e9',
    content: [
      { subtitle: 'O que são?', text: 'Avisos publicados pelos admins. Aparecem automaticamente como modal ao acessar a plataforma.' },
      { subtitle: 'Criar (admin)', steps: ['Administrativo > Comunicados > "Novo Comunicado".', 'Preencha título e mensagem.', 'Salve — publicado imediatamente para todos que ainda não viram.'] },
    ],
  },
  {
    id: 'notas-fiscais', icon: Receipt, title: 'Notas Fiscais',
    accent: '#f59e0b',
    content: [
      { subtitle: 'O que é?', text: 'Controle do ciclo de emissão, envio e pagamento de notas fiscais.' },
      { subtitle: 'Ciclo de vida', items: ['**Solicitada:** nota solicitada ao emissor.', '**Enviada:** NF enviada ao cliente. Upload do arquivo PDF.', '**Paga:** pagamento confirmado — sistema cria uma Venda automaticamente.'] },
    ],
  },
];

const sectionMap = Object.fromEntries(sections.map(s => [s.id, s]));

// ─── SECTION ACCORDION ───────────────────────────────────────────────────────

function SectionContent({ section }) {
  return (
    <div className="divide-y divide-gray-50">
      {section.content.map((block, i) => (
        <div key={i} className="py-4 first:pt-0 last:pb-0">
          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: section.accent }} />
            {block.subtitle}
          </h4>
          {block.text && <p className="text-sm text-gray-500 leading-relaxed ml-3">{block.text}</p>}
          {block.steps && (
            <ol className="ml-3 space-y-1.5 mt-1">
              {block.steps.map((step, si) => (
                <li key={si} className="flex items-start gap-2.5 text-sm text-gray-500">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: section.accent }}>
                    {si + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          )}
          {block.items && (
            <ul className="ml-3 space-y-1.5 mt-1">
              {block.items.map((item, ii) => (
                <li key={ii} className="flex items-start gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-60" style={{ color: section.accent }} />
                  <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-700">$1</strong>') }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionCard({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-200 ${isOpen ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
      style={{ border: `1px solid ${isOpen ? section.accent + '30' : '#f1f5f9'}` }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3.5 p-5 text-left transition-colors"
        style={{ background: isOpen ? section.accent + '08' : 'white' }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: section.accent + '15' }}>
          <Icon className="w-4 h-4" style={{ color: section.accent }} />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800">{section.title}</span>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: isOpen ? section.accent + '20' : '#f8fafc' }}>
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5" style={{ color: section.accent }} />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 bg-white border-t" style={{ borderColor: section.accent + '15' }}>
          <div className="pt-4">
            <SectionContent section={section} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function Manual() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [openSections, setOpenSections] = useState([]);
  const [search, setSearch] = useState('');

  const toggle = (id) => {
    setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const selectCategory = (catId) => {
    if (activeCategory === catId) {
      setActiveCategory(null);
      setOpenSections([]);
    } else {
      const cat = categories.find(c => c.id === catId);
      setActiveCategory(catId);
      setOpenSections(cat.sections);
      setTimeout(() => {
        document.getElementById('sections-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const clearFilter = () => {
    setActiveCategory(null);
    setOpenSections([]);
    setSearch('');
  };

  const filteredSections = search.trim()
    ? sections.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.content.some(b =>
          b.subtitle?.toLowerCase().includes(search.toLowerCase()) ||
          b.text?.toLowerCase().includes(search.toLowerCase()) ||
          b.steps?.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
          b.items?.some(t => t.toLowerCase().includes(search.toLowerCase()))
        )
      )
    : activeCategory
      ? categories.find(c => c.id === activeCategory)?.sections.map(id => sectionMap[id]).filter(Boolean)
      : sections;

  const activeCat = categories.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fb' }}>
      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1e35 50%, #162845 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-[0.3em] mb-1.5">Villela Exchange</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">Manual da Plataforma</h1>
              <p className="text-white/40 text-sm mt-2">Gestão Comercial — Guia completo de utilização</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-10 pt-8 border-t border-white/8">
            {[
              { v: sections.length, l: 'Seções' },
              { v: sections.reduce((a, s) => a + s.content.length, 0), l: 'Tópicos' },
              { v: 'Mai/2026', l: 'Atualizado' },
            ].map(k => (
              <div key={k.l}>
                <p className="text-xl font-bold text-white">{k.v}</p>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mt-0.5">{k.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCategory(null); }}
            placeholder="Pesquisar em todo o manual..."
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400 shadow-sm transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Cards */}
        {!search && (
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Navegar por categoria</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {categories.map(cat => {
                const isActive = activeCategory === cat.id;
                const count = cat.sections.length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => selectCategory(cat.id)}
                    className="relative flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-2xl border text-center transition-all duration-200"
                    style={{
                      background: isActive ? cat.color : 'white',
                      borderColor: isActive ? cat.color : '#e8edf3',
                      boxShadow: isActive ? `0 4px 20px ${cat.color}30` : '0 1px 4px rgba(0,0,0,0.04)',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <span className="text-base font-bold" style={{ color: isActive ? 'white' : cat.color }}>
                      {cat.label}
                    </span>
                    <span className="text-[11px]" style={{ color: isActive ? 'rgba(255,255,255,0.65)' : '#94a3b8' }}>
                      {count} seções
                    </span>
                    {isActive && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                        <X className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active filter indicator */}
        {(activeCat && !search) && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: activeCat.color + '08', borderColor: activeCat.color + '25' }}>
            <span className="text-sm font-medium" style={{ color: activeCat.color }}>
              Mostrando: {activeCat.label}
            </span>
            <span className="text-xs text-gray-400">— {activeCat.sections.length} seções</span>
            <button onClick={clearFilter} className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar filtro
            </button>
          </div>
        )}

        {/* Search result count */}
        {search && (
          <p className="text-sm text-gray-400">
            {filteredSections.length} {filteredSections.length === 1 ? 'seção encontrada' : 'seções encontradas'} para <strong className="text-gray-600">"{search}"</strong>
          </p>
        )}

        {/* Tip */}
        {!activeCategory && !search && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-gray-100 shadow-sm">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-gray-500 leading-relaxed">
              <strong className="text-gray-700">Dica:</strong> Usuários não-administradores visualizam apenas os menus liberados pelo admin e somente seus próprios dados.
            </p>
          </div>
        )}

        {/* Sections */}
        <div id="sections-area" className="space-y-2.5">
          {filteredSections.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">Nenhuma seção encontrada.</p>
            </div>
          ) : (
            filteredSections.map(section => (
              <div key={section.id} id={`section-${section.id}`}>
                <SectionCard
                  section={section}
                  isOpen={openSections.includes(section.id)}
                  onToggle={() => toggle(section.id)}
                />
              </div>
            ))
          )}
        </div>

        <p className="text-center text-[11px] text-gray-300 tracking-widest py-4">
          VILLELA EXCHANGE · GESTÃO COMERCIAL · MAI/2026
        </p>
      </div>
    </div>
  );
}