import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ManualSectionModal from '@/components/manual/ManualSectionModal';
import {
  BookOpen, ChevronRight, ChevronDown, ShoppingCart, BarChart3, Package, Users,
  DollarSign, Target, FileText, Upload, AlertTriangle, CheckCircle2, ArrowRight,
  Briefcase, CalendarClock, TrendingUp, GraduationCap, Bot, Megaphone, Receipt,
  ScrollText, Search, LayoutDashboard, Layers, Zap, Settings, BarChart2,
  TrendingDown, Bell, UserCheck, RefreshCw, Banknote, Globe, MessageSquare, LifeBuoy, Calculator,
  Rocket, KanbanSquare, Activity, FileWarning, ShieldCheck, Newspaper, Handshake, Download, Loader2
} from 'lucide-react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const sections = [
  {
    id: 'introducao', icon: BookOpen, title: 'Introdução à Plataforma',
    color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100',
    content: [
      { subtitle: 'O que é o Villela Exchange – Gestão Comercial?', text: 'O sistema de Gestão Comercial da Villela Exchange é uma plataforma completa para registro, acompanhamento e análise de vendas, comissões, metas e indicadores da equipe comercial. Integra Contratos, Pipeline, Prospecção, Treinamentos e IA em um único ambiente.' },
      { subtitle: 'Acesso e Login', text: 'O acesso é feito por convite do administrador. Após receber o e-mail de convite, crie sua senha e entre na plataforma. Suas permissões de menu são definidas pelo administrador.' },
      { subtitle: 'Perfil e Menu de Usuário', text: 'No canto superior direito do cabeçalho (presente em todas as páginas), você vê "Bem Vindo" + seu nome completo + sua foto de avatar. Clique no avatar para abrir o menu dropdown com seu e-mail, "Meu Perfil" (editar nome de tratamento, enviar/trocar foto, escolher personagem) e "Sair".' },
      { subtitle: 'Menus da plataforma', items: ['**Bloco Comercial:** Dashboard, Mercado, Vendas, Agenda do Dia, Central de Leads, Contratos, Implantações, Pipeline, Precificação, Desempenho.', '**Bloco Apoio:** Clientes, Vendedores, Indicadores, Chat Interno, Rel. Interações, Manual, Capacitação, Suporte.', '**Bloco Administrativo (admins):** Comissões, Notificações, Comunicados, Notas Fiscais, Capacitação (Admin), Rel. Comissões, Prospecção, Metas, Produtos, Importar, Usuários.'] },
    ],
  },
  {
    id: 'mercado', icon: Newspaper, title: 'Mercado — Inteligência & Cotações',
    color: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100',
    content: [
      { subtitle: 'O que é?', text: 'Página de inteligência de mercado que reúne cotações financeiras em tempo real e notícias/análises de ativos da B3, câmbio, commodities e bolsas internacionais. Disponível para todos os usuários no menu Comercial.' },
      { subtitle: '📊 Dashboard de Cotações em Tempo Real', items: [
        'Box interativo no topo da página com cotações ao vivo de **Ibovespa, Dólar, Euro, Dow Jones, Nasdaq, S&P 500, Brent, WTI, Ouro, Minério, PETR4, VALE3, ITUB4, BBDC4 e WEGE3**.',
        '**Gráfico de área** exibe a variação do ativo selecionado nos últimos 5 dias.',
        '**Mini sparklines** em cada card mostram a tendência visual do preço.',
        'Abas de filtro: **Destaque, B3, Commodities, Câmbio, Bolsas**.',
        'Clique em qualquer ativo para selecioná-lo e ver o gráfico detalhado.',
        '**Atualização automática a cada 5 minutos** durante o horário de mercado.',
        'Botão de atualização manual (🔄) no canto superior direito.',
      ]},
      { subtitle: '📰 Notícias e Análises de Mercado', items: [
        'Cards de notícias com **cotação, variação percentual, mini-gráfico e análise** de cada ativo.',
        'Filtros por categoria: **Commodities, Câmbio, Bolsas, Cripto, Economia, Renda Fixa**.',
        'Cada notícia exibe: **título, resumo, preço atual, variação, impacto (positivo/negativo/neutro), tendência e tags**.',
        'Clique em **"Ver análise"** para expandir o conteúdo detalhado da notícia.',
        'Link direto para a **fonte original** quando disponível.',
        'Indicadores de **relevância** (alta/média/baixa) e **impacto no mercado brasileiro**.',
      ]},
      { subtitle: '⚡ Atualização automática (Admin)', items: [
        'Administradores podem clicar em **"Atualizar Notícias"** para gerar novas análises de mercado sob demanda.',
        'O sistema busca cotações em tempo real via **Yahoo Finance** e gera análises via **IA com contexto da web**.',
        '**Automação agendada:** notícias são atualizadas automaticamente a cada 2 horas em horário comercial (seg–sex, 8h–18h).',
        'Cada atualização cria até 6 novas notícias/análises de mercado.',
      ]},
      { subtitle: '🎯 Como usar na rotina comercial', items: [
        '**Antes de uma reunião:** verifique cotações de dólar, ouro e Brent para embasar conversas com clientes.',
        '**Acompanhamento diário:** use o ticker de mercado (topo do sistema) para ter uma visão rápida dos principais ativos.',
        '**Análises de impacto:** verifique se as notícias têm impacto positivo ou negativo no mercado brasileiro/câmbio.',
        '**Insights para clientes:** use as análises como argumento comercial em propostas e negociações.',
      ]},
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
      { subtitle: 'Tipo de venda (Nova x Recorrência)', items: ['**Nova:** venda de nova implantação — direcionada automaticamente para o módulo de Implantações.', '**Recorrência:** pagamento de parcela/mensalidade — não gera implantação, apenas atualiza financeiro e metas.', 'O campo "tipo_venda" aparece no formulário de venda e diferencia o tratamento no fluxo pós-venda.'] },
      { subtitle: 'Registrar uma nova venda (Caminho A)', steps: ['Acesse "Vendas" > clique em "Nova Venda".', 'Selecione o(s) Produto(s) na lista de ativos.', 'Selecione o Vendedor — o percentual de comissão é carregado automaticamente.', 'Informe o Valor Total do Contrato e a estrutura de pagamento.', 'Defina o Valor de Entrada (conta para a meta do mês imediatamente).', 'Busque o cliente pelo nome ou CPF/CNPJ.', 'Adicione Indicadores se houver.', 'Ajuste datas e valores de cada parcela individualmente.', 'Clique em "Salvar".'] },
      { subtitle: 'Estrutura de pagamento', items: ['**Sem parcelas (à vista):** valor total conta 100% para a meta.', '**Entrada + Nx parcelas:** entrada conta imediatamente; saldo vai para "Parcelas Vincendas".', '**Comissão zerada (0%):** aceito e persiste corretamente.'] },
      { subtitle: 'O que acontece automaticamente ao salvar', items: ['**Comissão do vendedor** gerada sobre o valor de entrada.', '**Comissões dos indicadores** geradas proporcionalmente.', '**Cliente vinculado** — criado automaticamente se não existia.', '**Parcelas criadas** no módulo "Parcelas Vincendas".', '**Meta e Dashboard atualizados** em tempo real.', '**Implantação criada automaticamente** — o sistema busca o contrato relacionado e cria o registro de implantação com checklist de fases. Se o contrato não for encontrado, sinaliza para anexamento manual.'] },
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
    id: 'portal-indicador', icon: Handshake, title: 'Portal do Indicador',
    color: 'from-pink-600 to-rose-700', bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-100',
    content: [
      { subtitle: 'O que é?', text: 'Portal exclusivo e externo para indicadores/parceiros acompanharem suas indicações em tempo real, sem acessar o sistema interno. Cada indicador recebe um link único (token) enviado por e-mail no convite. Acesso público, não exige login da plataforma.' },
      { subtitle: 'Convite e primeiro acesso', steps: ['O administrador cadastra o indicador no menu "Indicadores" e clica em "Enviar Convite".', 'O indicador recebe um e-mail com o link pessoal do portal.', 'Ao acessar o link pela primeira vez, ele lê e aceita o Termo de Uso (v1.0).', 'Um e-mail de boas-vindas é disparado automaticamente e o painel é liberado.'] },
      { subtitle: '🤝 Capa de Boas-vindas / Bom Retorno', items: [
        'Na **primeira visita** (após aceitar o termo), uma capa de boas-vindas é exibida com a imagem institucional e a comissão padrão do indicador.',
        'Em **retornos reais** (nova sessão do navegador), uma capa de "Bom retorno" aparece — uma vez por sessão, sem repetir a cada navegação interna.',
        'A distinção é automática com base no último acesso registrado.',
      ]},
      { subtitle: '📋 KPIs e gráfico do painel', items: [
        '**Volume indicado:** soma dos valores estimados de todas as indicações.',
        '**Total de indicações:** quantidade de leads cadastrados.',
        '**Vendas convertidas:** soma do valor das vendas efetivadas (entrada).',
        '**Vendas efetivas:** quantidade de leads que viraram venda.',
        '**Comissão gerada:** soma das comissões sobre as vendas convertidas, usando o percentual EFETIVO de cada contrato.',
        '**Gráfico de distribuição** por status (Novas, Em Atendimento, Convertidas, Descartadas).',
      ]},
      { subtitle: '💸 Comissão efetiva pelo contrato (não o padrão)', items: [
        'O indicador nasce com uma **comissão padrão** (ex.: 10%) no cadastro.',
        '**Vale sempre o percentual cadastrado no contrato** — se o contrato definir 15% para aquele indicador, o portal calcula sobre 15%, mesmo que o padrão seja 10%.',
        'O sistema localiza o indicador dentro do campo "indicadores" do contrato e aplica o percentual específico de cada venda.',
        'A comissão é exibida no detalhe do lead como "Comissão (X%): R$ Y", sobre o valor total do contrato.',
      ]},
      { subtitle: '🧭 Jornada do Cliente (timeline)', items: [
        'No detalhe de cada lead, uma timeline mostra os marcos: **Indicação recebida → Cliente criado → Contrato gerado → Venda efetivada → Implantação**.',
        'Cada marco exibe data e status (concluído ou pendente).',
        'O status do contrato (rascunho, assinado, pago, no pipeline) aparece no card do contrato.',
        'O status da implantação e o responsável aparecem no card de implantação.',
      ]},
      { subtitle: '💳 Parcelamento (entrada + parcelas + total)', items: [
        'O box de parcelamento mostra o **total do contrato**, a **entrada** e as **parcelas** (ex.: Total R$ 7.500 · Entrada R$ 2.500 · + 2x de R$ 2.500).',
        '**Parcelas recebidas:** barra de progresso com quantas parcelas já foram pagas vs. o total.',
        '**Detalhamento:** lista cada parcela com número, valor, vencimento e status (Recebida, Pendente, Inadimplente).',
        'A comissão do indicador é liberada conforme o recebimento de cada parcela.',
      ]},
      { subtitle: '💬 Histórico de interações e WhatsApp', items: [
        'O detalhe do lead lista as **interações comerciais** registradas (tipo, resultado, data, descrição e vendedor).',
        'Quando há conversa de WhatsApp, o histórico de mensagens é exibido (casamento **exato de telefone** + preferência pelo nome do lead, evitando cruzar leads com números parecidos).',
        'Apenas conversas associadas àquele lead aparecem — não há mistura entre leads diferentes.',
      ]},
      { subtitle: '📝 Cadastrar nova indicação (link público)', steps: ['No painel, clique em "Nova Indicação".', 'Escolha Pessoa Física (PF) ou Pessoa Jurídica (PJ).', 'Preencha dados do indicado e o produto de interesse.', 'Informe o valor estimado e observações.', 'Envie — o lead é criado no sistema e aparece para a equipe de distribuição.'] },
      { subtitle: '🔔 Notificações por e-mail', items: [
        'O indicador pode ativar/desativar as notificações por e-mail no cabeçalho do portal.',
        'Quando ativo, recebe avisos automáticos de movimentações dos seus leads (novo contrato, venda, implantação).',
        'A preferência fica salva no cadastro do indicador.',
      ]},
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
      { subtitle: 'Tipos de notificação', items: ['**Espelhamento acima de 30%:** requer aprovação do administrador.', '**Novo contrato criado:** solicita que o admin adicione link de assinatura.', '**Solicitação de precificação:** solicita autorização para proposta comercial.', '**Implantação:** notifica sobre novas implantações e mudanças de status (via Jarvis e e-mail).'] },
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
    id: 'meus-clientes', icon: Briefcase, title: 'Agenda do Dia',
    color: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100',
    content: [
      { subtitle: 'O que é?', text: 'Central de gerenciamento da carteira de clientes e leads. Registre interações, acompanhe contatos, agende compromissos e converta leads em clientes cativos. Integra com Google Calendar e Google Meet.' },
      { subtitle: 'Criar novo lead/prospect', steps: ['Clique em "Novo Lead" no cabeçalho da página.', 'Preencha nome, CPF/CNPJ, telefone e e-mail.', 'Clique em "Criar e Registrar Interação".', 'O sistema abre o formulário de primeira interação.'] },
      { subtitle: 'Registrar uma interação', steps: ['Clique em "Ver Carteira" para exibir os clientes.', 'Expanda o cliente e clique em "Nova Interação".', 'Complemente o cadastro (Nome, CPF, Telefone, E-mail — obrigatórios).', 'Defina tipo, resultado, data do contato e próximo contato.', 'Marque os produtos abordados (opcional).', 'Gere um link Google Meet se necessário.', 'Preencha a descrição e clique em "Salvar Interação".'] },
      { subtitle: '📅 Criar agendamento direto pela aba Clientes', items: [
        'Na página **Clientes**, cada linha da tabela possui um botão de calendário verde (📅).',
        'Clique no ícone para abrir o modal "Agendar Contato".',
        'Selecione o gerente responsável, informe data e horário.',
        'O sistema valida automaticamente se a data é um dia útil.',
        'O agendamento é criado e aparece na Agenda do Dia do gerente selecionado.',
      ]},
      { subtitle: '🔔 Lembrete automático via Jarvis (10 min antes)', items: [
        '**O Jarvis notifica automaticamente** o gerente com uma mensagem no chat 10 minutos antes de cada compromisso com horário definido.',
        'A mensagem inclui: nome do cliente, horário do compromisso e telefone de contato.',
        '**Condição:** o agendamento precisa ter o campo "Horário" preenchido.',
        'Agendamentos sem horário não disparam o lembrete do Jarvis.',
        'Adicionalmente, notificações do navegador são enviadas 15 minutos antes (requer Google Calendar conectado).',
      ]},
      { subtitle: '👥 Agendar para outro gerente (SDR / Admin)', items: [
        '**Qualquer usuário pode criar agendamentos para qualquer gerente** — não há restrição de permissão.',
        'No modal "Agendar" (pelo botão verde da tabela de Clientes ou pelo botão "Agendar" na Agenda), selecione o gerente desejado.',
        'Ao salvar uma interação com "Próximo contato", um campo "Agendar para o gerente" aparece para redirecionar o compromisso.',
        '**Verificação de sobreposição:** mesmo cliente + mesmo gerente + mesma data → bloqueado automaticamente com alerta.',
        '**Conflito de horário (clientes diferentes):** exibe aviso amarelo, mas permite confirmar.',
      ]},
      { subtitle: '🚫 Prevenção de agendamentos duplicados', items: [
        'O sistema verifica duplicatas antes de criar qualquer agendamento.',
        '**Mesmo lead + mesmo gerente + mesma data → BLOQUEADO** com mensagem de erro.',
        '**Mesmo horário com clientes diferentes → AVISO** (pode confirmar).',
        'Ao salvar interação: agenda duplicada é ignorada com a mensagem "Agendamento já existia para este gerente nesta data — não duplicado."',
      ]},
      { subtitle: 'Converter lead', text: 'Lead com cadastro completo e histórico de interações: clique em "Converter em Cliente". O lead passa a ser cliente cativo na carteira.' },
      { subtitle: 'Calendário de agendamentos', text: 'Visualize agendamentos em visão Semana ou Dia. Marque como "Realizado", "Não atendeu" ou "Reagendar". Admins veem a agenda global de todos os gerentes com filtros por gerente, período e status.' },
      { subtitle: '🎥 Google Meet no agendamento', items: [
        'No card do compromisso (visão Dia), clique em "Gerar Link Meet".',
        'Informe o horário de início e clique em "Gerar Link".',
        'O link é salvo no agendamento e aparece como botão "Entrar no Meet".',
        'Use "Copiar" para enviar o link ao cliente via WhatsApp ou e-mail.',
        'O evento também é salvo no Google Calendar do gerente (se conta Google estiver conectada).',
      ]},
    ],
  },
  {
    id: 'desempenho', icon: Activity, title: 'Desempenho — Dashboard Personalizável',
    color: 'from-indigo-500 to-indigo-700', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-100',
    content: [
      { subtitle: 'O que é?', text: 'Página de desempenho personalizada onde cada usuário pode reorganizar os menus laterais e ocultar gráficos que não utiliza, criando um dashboard sob medida para sua rotina.' },
      { subtitle: 'Reorganizar menus', steps: ['Acesse "Desempenho" no menu Comercial.', 'Clique e arraste os itens do menu lateral para reordená-los.', 'A nova ordem é salva automaticamente no seu perfil.'] },
      { subtitle: 'Ocultar gráficos', items: ['Cada gráfico possui um botão de ocultar/mostrar.', 'Gráficos ocultos não aparecem no seu dashboard.', 'Você pode reativar a qualquer momento.'] },
      { subtitle: 'Visão por usuário', text: 'As configurações são individuais — cada usuário tem seu próprio layout. Administradores continuam vendo todos os dados e gráficos disponíveis.' },
    ],
  },
  {
    id: 'central-leads', icon: Zap, title: 'Central de Leads — WhatsApp & Kanban',
    color: 'from-cyan-500 to-cyan-700', bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-100',
    content: [
      { subtitle: 'O que é?', text: 'Central de gestão de leads e conversas de WhatsApp em tempo real. Integra captação automática de leads via webhook, distribuição round-robin entre gerentes, chat direto pelo WhatsApp, controle de SLA de resposta e Kanban de funil.' },
      { subtitle: 'Captação automática de leads (Webhook)', items: [
        '**Levia externa (Make/Zapier):** a integração recebe leads automaticamente de campanhas e formulários externos.',
        'Cada lead é criado com nome, telefone e origem da campanha.',
        'O sistema cria automaticamente uma conversa de WhatsApp associada ao lead.',
        '**Segurança:** o webhook é autenticado por token secreto (header x-webhook-token).',
      ]},
      { subtitle: 'Distribuição Round-Robin', items: [
        'Os leads são distribuídos **automaticamente** entre os gerentes ativos na esteira.',
        'A distribuição respeita a **disponibilidade** de cada gerente (status de bloqueio/desbloqueio).',
        'Gerentes bloqueados (almoço, reunião, fora do expediente) **não recebem** novos leads.',
        'Configure quais gerentes participam da esteira no cadastro de Vendedores (campo "Participa da Central de Leads").',
      ]},
      { subtitle: 'Chat WhatsApp integrado (Umbler Talk)', items: [
        'Converse diretamente com o lead pelo WhatsApp **dentro da plataforma** — sem precisar abrir o celular.',
        'As mensagens enviadas e recebidas ficam registradas no histórico da conversa.',
        'O sistema identifica automaticamente a última mensagem e quem enviou.',
        '**Atendimento humano:** disponível apenas em horário comercial (08h–18h, seg–sex). Fora deste horário, o sistema sinaliza que o atendimento é automatico.',
      ]},
      { subtitle: 'Kanban de Funil', items: [
        'Arraste e solte leads entre as colunas: **Ativa, Aguardando, Qualificado, Desqualificado, Convertido, Encerrada**.',
        'Cada mudança de status é persistida automaticamente.',
        'Visualize alertas de SLA e tempo de espera diretamente nos cards.',
      ]},
      { subtitle: '⏱️ Controle de SLA (30 minutos)', items: [
        'O sistema monitora o **tempo de resposta** de cada gerente aos leads recebidos.',
        '**SLA de 30 minutos:** se o gerente não responder em 30 minutos, o lead é **migrado automaticamente** para outro gerente disponível.',
        'A migração é registrada no histórico da conversa e no log de migrações.',
        'Verificação automática a cada 5 minutos via rotina agendada.',
      ]},
      { subtitle: '👥 Status do Gerente', items: [
        'Cada gerente controla sua disponibilidade para receber leads.',
        'Pode bloquear temporariamente por: **almoço, reunião, fora do expediente, outro**.',
        'Defina até quando o bloqueio dura (ou indefinido).',
        'Gerentes bloqueados **não entram** na distribuição até serem desbloqueados.',
      ]},
      { subtitle: '📊 KPIs e Relatórios', items: [
        '**Leads Ativos:** conversas em andamento.',
        '**Aguardando Resposta:** leads aguardando resposta do gerente (inclui alertas de SLA).',
        '**Tempo médio de resposta:** performance da equipe.',
        '**Relatório de migrações:** quantos leads foram redistribuídos por timeout.',
        'Filtros por gerente, período e horário disponíveis.',
      ]},
      { subtitle: '🔧 Gestão de conversas (Admin)', items: [
        '**Transferir:** reatribuir uma conversa para outro gerente manualmente.',
        '**Mesclar:** combinar conversas duplicadas do mesmo lead.',
        '**Excluir:** remover conversas inválidas (com confirmação dupla).',
        'Acesse via ícone de engrenagem em cada conversa.',
      ]},
      { subtitle: 'Permissões de acesso', items: [
        'O acesso à Central de Leads é **controlado por permissão** — configurado no cadastro de usuário.',
        'Administradores têm acesso total a todos os leads e conversas.',
        'Usuários padrão veem apenas leads direcionados ao seu perfil.',
        'Gerentes sem permissão não visualizam o menu "Central de Leads".',
      ]},
    ],
  },
  {
    id: 'fila-contatos-popup', icon: Zap, title: 'Fila de Contatos — Popup & Pitch IA',
    color: 'from-teal-500 to-emerald-600', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-100',
    content: [
      { subtitle: 'O que é?', text: 'A Fila de Contatos (Agenda do Dia) é a esteira diária de atendimento do gerente. Cada lead da carteira ou indicação entra na fila do dia; ao abrir o popup de atendimento, o gerente tem QR codes de ação, botões de desfecho, classificação rápida e um painel de Pitch com IA para tratar objeções em tempo real.' },
      { subtitle: '🤳 QR Codes de Ação (WhatsApp e Ligação)', items: [
        'O popup exibe **dois QR codes em contêineres brancos** (borda verde = WhatsApp, azul = Ligação).',
        '**Toque para contato:** cada QR funciona como botão de ação — abre o WhatsApp Web (wa.me) ou o discador do sistema (tel:).',
        '**Alto contraste:** códigos em preto sobre fundo branco para máxima legibilidade.',
        'Se o telefone não estiver informado, o QR aparece esmaecido e sem ação.',
      ]},
      { subtitle: '🤖 Painel de Pitch com IA', items: [
        'Coluna direita do popup com **roteiro específico por produto** (Dolarize, Conta Internacional, Offshore, Rating, Canal Bancário, História do Grupo).',
        '**Objeções comuns** como botões rápidos — clique para enviar à IA.',
        '**Chat com IA:** digite a objeção do lead e receba uma sugestão curta e consultiva de como responder/conduzir.',
        'O campo de digitação fica **fixo na base do painel** (não é cortado) e o histórico rola internamente.',
        'Aba **FAQ** com busca e acordeão de perguntas frequentes por categoria.',
      ]},
      { subtitle: '✅ Botões de desfecho', items: [
        '**Atendeu (verde chapado):** registra contato positivo e abre o agendamento de reunião (Meet/Calendar).',
        '**Não Atendeu (vermelho chapado):** o lead vai para o fim da fila e é reagendado para o próximo dia útil — o sistema avança automaticamente para o próximo lead pendente.',
        '**Registros do Contato:** histórico de tentativas, interações e agendamentos do lead.',
      ]},
      { subtitle: '🏷️ Classificação rápida', items: [
        'Barra superior classifica o lead: **Em Contato, Qualificado, Desqualificado, Convertido, Voltar à Fila**.',
        '**Qualificado** envia o lead para o Pipeline.',
        '**Convertido** gera Contrato + Venda e fecha o Pipeline automaticamente.',
      ]},
      { subtitle: '🧭 Jornada do Lead até a Conversão', items: [
        '**1. Captação:** webhook (Make/Zapier) ou Portal do Indicador cria o lead.',
        '**2. Central de Leads:** conversa de WhatsApp criada + Kanban de funil.',
        '**3. Distribuição Round-Robin:** gerente disponível selecionado por roleta justa.',
        '**4. Fila de Contatos:** lead entra na esteira do dia do gerente.',
        '**5. Popup de Atendimento:** QR + Pitch IA + registros.',
        '**6. Qualificação:** lead classificado e enviado ao Pipeline.',
        '**7. Conversão:** Contrato + Venda gerados automaticamente.',
        '**8. Implantação:** checklist de fases + notificações Jarvis (vendas do tipo "nova").',
      ]},
      { subtitle: '📄 PDF da Jornada', text: 'Use o botão "Baixar PDF da Jornada" no topo do Manual para gerar um documento ilustrado (paleta Aurora) com o fluxograma da jornada completa, o diagrama do popup e o fluxo de conversão.' },
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
      { subtitle: '🎥 Agendar reunião com Meet direto pelo Pipeline', items: [
        'Em cada card do Kanban, passe o mouse para exibir os ícones de ação.',
        'Clique no ícone de calendário (📅 **CalendarPlus**) para abrir o modal "Agendar Reunião".',
        'O nome do cliente, dados de contato e a data do próximo contato são preenchidos automaticamente.',
        'Defina data, horário de início (término calculado +1h automaticamente) e observações.',
        'Ative o toggle **"Gerar link Google Meet"** para criar um link de videoconferência junto com o evento.',
        'Clique em "Agendar" — o compromisso é criado na **Agenda do Dia** do gerente responsável pelo negócio.',
        'Se o Google Calendar estiver conectado, o evento também é salvo automaticamente no calendário do gerente.',
        '**Condição:** o gerente precisa ter sua conta Google conectada para a geração do Meet funcionar.',
      ]},
      { subtitle: 'Integração', items: ['**Pipeline → Contratos:** converter cria contrato pré-preenchido.', '**Contratos → Vendas:** "Enviar para Vendas" gera a venda final.', '**Vendas → Pipeline (parcelas):** venda parcelada cria cards de parcelas automaticamente.', '**Pipeline → Agenda do Dia:** botão CalendarPlus cria agendamento com ou sem Meet para o gerente do negócio.'] },
    ],
  },
  {
    id: 'contratos', icon: ScrollText, title: 'Contratos',
    color: 'from-amber-700 to-amber-800', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200',
    content: [
      { subtitle: 'Tipos disponíveis', items: ['**Conta Global, Conta Internacional, Dolarize Aqui, ROF, Canal Bancário, Offshore, Garantias, Hora Técnica, Rating.**'] },
      { subtitle: 'Criar contrato', steps: ['Acesse "Contratos" > selecione o tipo.', 'Busque cliente existente ou preencha manualmente.', 'Preencha Dados Pessoais, Endereço, Financeiro e Obs.', 'Clique em "Salvar". Admins são notificados automaticamente.'] },
      { subtitle: 'Fluxo de etapas', items: ['**Rascunho → PDF Gerado → Assinado → Aguardando Pagamento → Pago → No Pipeline.**'] },
      { subtitle: 'Enviar para Vendas', text: 'Após assinatura + pagamento confirmado, clique em "Enviar para Vendas". Cria venda pré-preenchida.' },
      { subtitle: '📎 Anexos de contrato e boletos', items: [
        '**Contrato assinado:** o gerente pode anexar o PDF do contrato assinado pelo cliente.',
        '**Link de assinatura:** o administrador preenche o link de assinatura online (contrato e aditivo).',
        '**Boletos de parcelas:** anexe boletos das parcelas vincendas individualmente, com vencimento e descrição.',
        '**Comprovante de pagamento:** anexe o comprovante quando o pagamento for confirmado.',
        '**Origem do pagamento:** selecione entre Boleto, Link de Pagamento, PIX, TED ou Outros.',
      ]},
      { subtitle: '🔄 Gestão manual de status', text: 'Administradores podem alterar manualmente o status do contrato em qualquer etapa do fluxo, permitindo correções e ajustes quando necessário.' },
    ],
  },
  {
    id: 'implantacoes', icon: Rocket, title: 'Implantações — Pós-Venda',
    color: 'from-emerald-600 to-teal-700', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-100',
    content: [
      { subtitle: 'O que é?', text: 'Módulo de acompanhamento de implantação de produtos e contratos vendidos. Garante que cada venda seja efetivamente entregue ao cliente através de um checklist estruturado de fases, com notificações automáticas e controle de prazos.' },
      { subtitle: 'Criação automática ao finalizar venda', items: [
        'Ao registrar uma venda, o sistema **busca automaticamente** o contrato relacionado (por CPF/CNPJ ou nome do cliente).',
        'Se encontrado, o contrato é **vinculado automaticamente** à implantação.',
        'Se não encontrado (vendas antigas ou erro), o sistema **sinaliza** para o responsável anexar o contrato manualmente.',
        'O registro de implantação é criado com as fases padrão de melhores práticas.',
      ]},
      { subtitle: '📋 Fases de Implantação (Melhores Práticas)', items: [
        '**1. Contratos & Compliance:** revisão do contrato assinado, KYC (Know Your Customer), due diligence e checagem em listas restritivas (PLD/FT), aprovação de compliance e risco.',
        '**2. Documentação:** coleta de documentos pessoais/empresariais, comprovante de residência e renda, validação e organização.',
        '**3. Onboarding:** abertura de conta/cadastro, setup técnico e parametrização do produto, configuração de credenciais e acessos.',
        '**4. Configuração & Liberação:** testes de funcionamento, ativação e liberação de acesso ao cliente, confirmação de operação ativa.',
        '**5. Treinamento & Handover:** treinamento do cliente, entrega de manuais e credenciais, apresentação do suporte pós-venda.',
      ]},
      { subtitle: '🔗 Contrato não encontrado — anexamento manual', items: [
        'Quando o sistema não localiza o contrato, aparece um **alerta amarelo** no card da implantação (ícone de aviso).',
        'No modal de detalhes, o responsável pode **anexar o contrato manualmente** (upload de PDF, DOC ou imagem).',
        'Também é possível especificar **condições especiais de implantação** (prazos, exigências técnicas, dependências externas).',
        'Após anexar, o status de "contrato não encontrado" é atualizado automaticamente.',
      ]},
      { subtitle: 'Status e prioridade', items: [
        '**Status:** Aguardando Documentação → Em Andamento → Aguardando Cliente → Concluído / Concluído com Feedback / Cancelado.',
        '**Prioridade:** Baixa, Média, Alta ou Urgente — exibida como indicador colorido na lista.',
        '**Prazo:** defina a data prevista de conclusão. Implantações atrasadas aparecem destacadas em vermelho.',
      ]},
      { subtitle: 'Checklist interativo', text: 'Cada fase possui etapas que podem ser marcadas como concluídas individualmente. A barra de progresso mostra o percentual geral. Ao concluir todas as etapas, o status pode ser atualizado para "Concluído".' },
      { subtitle: '🔔 Notificações automáticas', items: [
        '**Nova implantação:** administradores e o vendedor da venda recebem notificação via Jarvis e e-mail.',
        '**Mudança de status:** a cada alteração de status, os envolvidos são notificados.',
        'As notificações incluem: cliente, produto, vendedor, responsável, valor e observação da alteração.',
      ]},
      { subtitle: '📊 KPIs e Relatório PDF', items: [
        'KPIs na página: Total de Processos, Em Andamento, Concluídos e Atrasados.',
        'Filtros por produto, status e período.',
        'Administradores podem gerar um **Relatório PDF** consolidado com resumo e tabela detalhada.',
      ]},
      { subtitle: 'Permissões', items: [
        '**Todos os usuários** podem visualizar implantações e acompanhar o progresso.',
        '**Apenas administradores** podem editar status, prioridade, responsável, etapas e condições.',
        'O menu "Implantações" está disponível para todos no bloco Comercial.',
      ]},
    ],
  },
  {
    id: 'google-calendar', icon: Globe, title: 'Google Calendar & Meet',
    color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100',
    content: [
      { subtitle: '🎯 O que é esta integração?', text: 'Cada usuário vincula sua própria conta Google ao portal. Isso permite: (1) criar reuniões Google Meet com um clique direto da Agenda do Dia, (2) salvar o evento automaticamente no Google Calendar do gerente, e (3) receber notificações 15 minutos antes de cada compromisso agendado.' },
      { subtitle: '⚠️ Importante: cada usuário conecta UMA VEZ', items: [
        '**A conexão é por usuário**, não por empresa. Cada gerente precisa conectar sua própria conta Google.',
        '**Não precisa repetir:** após conectar, a autorização fica salva permanentemente no sistema.',
        '**O administrador já configurou** toda a parte técnica (Google Cloud Console, URIs de redirecionamento). O usuário só precisa clicar e autorizar.',
        '**Quem precisa conectar:** todo gerente que quiser usar Google Meet ou receber notificações de compromissos.',
      ]},
      { subtitle: '✅ Como vincular sua conta Google (passo a passo)', steps: [
        'Acesse a página "Agenda do Dia" no menu lateral.',
        'Clique no botão "Google Calendar" (ícone colorido do Google) no canto superior direito da tela.',
        'Uma janela popup do Google abrirá. Faça login com sua conta Google corporativa.',
        'Na tela de permissões, clique em "Continuar" para autorizar o acesso ao Google Calendar.',
        'O popup fechará automaticamente. O sistema detecta a conexão e exibe "Google Calendar vinculado com sucesso!".',
        'Pronto! Agora você pode gerar links Meet e receber lembretes automáticos nos seus compromissos.',
      ]},
      { subtitle: '🎥 Como gerar um link Google Meet para um compromisso', steps: [
        'Na Agenda do Dia, localize o agendamento desejado (visão Semana ou Dia).',
        'No card do contato, clique em "Gerar Link Meet" (ícone de câmera).',
        'Informe o horário de início da reunião e clique em "Gerar Link".',
        'O link Meet é criado e salvo automaticamente no agendamento.',
        'Use o botão "Copiar" para compartilhar o link com o cliente via WhatsApp ou e-mail.',
        'O gerente também receberá o evento com o link Meet no seu Google Calendar.',
      ]},
      { subtitle: '🔔 Notificações automáticas de compromissos', items: [
        '**10 minutos antes:** o Jarvis envia automaticamente uma mensagem no chat para o gerente responsável pelo agendamento, lembrando o nome do cliente, horário e telefone.',
        '**15 minutos antes (navegador):** se a conta Google estiver conectada e as notificações do navegador permitidas, aparece também um alerta de sistema.',
        '**Nenhuma configuração adicional é necessária** — o Jarvis monitora todos os agendamentos com horário definido durante o dia automaticamente.',
        '**Condição:** o agendamento precisa ter horário preenchido. Agendamentos sem horário não disparam lembrete.',
      ]},
      { subtitle: '🕐 Atenção com o horário dos eventos', items: [
        '**Sempre informe o horário correto** ao gerar o link Meet — este horário será registrado no Google Calendar.',
        '**O sistema usa o fuso horário de Brasília (UTC-3)** automaticamente. Um compromisso às 14h no portal aparecerá às 14h no Google Calendar.',
        '**Ao criar agendamentos pelo admin**, informe o horário correto no campo "Horário" para que as notificações e o Meet usem o horário certo.',
      ]},
      { subtitle: '🚨 Solução de problemas', items: [
        '**"Conexão não foi concluída":** O popup do Google foi fechado antes de completar. Clique em "Tentar novamente" e complete o processo de autorização.',
        '**"Acesso bloqueado" pelo Google:** Use a conta Google correta (corporativa). Se persistir, contate o administrador.',
        '**Botão "Conectar Google Calendar" aparece no lugar do Meet:** Sua conta Google ainda não está vinculada — siga o passo a passo acima.',
        '**Link Meet não foi gerado:** Verifique se sua conta Google ainda está autorizada clicando no botão "Google Calendar" na Agenda do Dia.',
        '**Evento apareceu com horário errado no Calendar:** Confirme que o horário informado no portal estava correto (fuso Brasília).',
      ]},
    ],
  },
  {
    id: 'chat-interno', icon: MessageSquare, title: 'Chat Interno',
    color: 'from-blue-600 to-blue-700', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-100',
    content: [
      { subtitle: 'O que é?', text: 'Canal de comunicação interna da equipe em tempo real, acessível pelo menu "Chat Interno" no bloco Apoio. Suporta canais públicos, canais privados com membros definidos e Mensagens Diretas (DMs) entre todos os usuários da plataforma.' },
      { subtitle: 'Canais fixos (disponíveis para todos)', items: ['**🏢 Geral:** comunicação geral da equipe.', '**💼 Comercial:** assuntos do time comercial.', '**📢 Avisos:** comunicados e informes importantes.'] },
      { subtitle: 'Criar um canal personalizado', steps: ['Clique em "+ Novo canal" na barra lateral.', 'Defina o ícone e o nome do canal.', 'Selecione os membros que terão acesso ao canal.', 'Clique em "Criar Canal". O criador é adicionado automaticamente.'] },
      { subtitle: 'Gerenciar membros de um canal', items: ['**Criador do canal:** pode adicionar ou remover membros a qualquer momento.', '**Administrador:** tem acesso total a todos os canais, mesmo sem ser membro, e pode gerenciar qualquer canal.', 'Passe o mouse sobre o canal na barra lateral e clique no ícone ⚙️ para abrir o modal de gerenciamento.', 'No cabeçalho do canal ativo, o botão "Membros" abre o mesmo modal.'] },
      { subtitle: 'Remover um canal', items: ['Apenas o **criador do canal** ou um **administrador** pode remover um canal.', 'Abra o modal de gerenciamento (⚙️) e clique em "Remover Canal".', '**Os canais fixos (Geral, Comercial, Avisos) não podem ser removidos.**', 'O canal é desativado; o histórico de mensagens é preservado.'] },
      { subtitle: 'Mensagens Diretas (DMs)', items: [
        '**Todos os usuários** da plataforma aparecem automaticamente na seção "Mensagens Diretas" da barra lateral.',
        'Clique em qualquer usuário para iniciar uma conversa privada. Apenas os dois participantes podem ver as mensagens.',
        '**Indicador de presença:** ponto verde = online (ativo nos últimos 3 minutos), cinza = offline.',
      ]},
      { subtitle: '💬 Abrir DM direto de uma mensagem no canal', items: [
        'Dentro de qualquer canal, clique no **avatar** ou no **nome** do remetente de uma mensagem para abrir uma conversa direta com aquele usuário.',
        'Funciona em qualquer canal público ou privado.',
        'Não funciona em conversas DM (evita abrir DM com você mesmo).',
      ]},
      { subtitle: 'Indicadores de notificação', items: [
        '**Badges vermelhos** aparecem no ícone do canal/DM e no menu lateral com o número de mensagens não lidas.',
        'O badge é zerado automaticamente ao abrir o canal ou ao navegar para a página Chat Interno.',
        'O Jarvis (assistente IA) **não** exibe notificações do Chat Interno — os dois sistemas de notificação são independentes.',
      ]},
      { subtitle: '🎥 Iniciar reunião Google Meet pelo Chat', steps: ['Abra o canal ou DM desejado.', 'Clique em "Iniciar Meet" no canto superior direito.', 'O sistema gera um link Meet e envia automaticamente como mensagem no canal.', 'Todos os membros verão o botão "Entrar no Meet" na mensagem.', 'É possível entrar na reunião diretamente no portal (tela cheia) ou abrindo em nova aba.'] },
      { subtitle: '📎 Envio de arquivos', items: [
        'Clique no ícone de clipe (📎) ao lado do campo de texto para anexar arquivos.',
        'Suporta: imagens, vídeos, áudios, PDFs, documentos Office e arquivos ZIP.',
        'Limite máximo: **20 MB** por arquivo.',
        'Imagens são exibidas inline na conversa; outros arquivos aparecem como botão de download.',
      ]},
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
  {
    id: 'suporte', icon: LifeBuoy, title: 'Sistema de Suporte — Chamados',
    color: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100',
    content: [
      { subtitle: 'O que é?', text: 'Sistema centralizado para abrir tickets de suporte e acompanhar resoluções. Gerenciado pelo time de suporte com histórico de comunicação integrado.' },
      { subtitle: 'Abrir um novo chamado', steps: ['Acesse **Suporte** no menu > clique na aba **Novo Chamado**.', 'Preencha **Título** (resumo do problema) e **Descrição** (detalhes completos).', 'Escolha a **Categoria** (Acesso, Vendas, Contratos, Precificação, Chat, Capacitação, Sugestão, Bug, Outro).', 'Defina a **Prioridade** (Baixa, Média, Alta, Urgente).', 'Clique em **Enviar Chamado**. O ticket é criado com status "Aberto".'] },
      { subtitle: 'Acompanhar seus chamados', items: ['Acesse **Suporte** > aba **Meus Chamados**.', 'Veja lista de todos os seus tickets com **status, prioridade e data**.', '**Filtros disponíveis:** Status (Aberto, Em Andamento, Aguardando Você, Resolvido, Fechado) e Categoria.', 'Clique em qualquer chamado para ver o **histórico completo de respostas**.'] },
      { subtitle: '🔔 Notificação "Aguardando Você"', items: ['Quando o suporte responde seu chamado, o status muda para **"Aguardando resposta do usuário"**.', 'Um **badge âmbar** aparece no menu Suporte mostrando quantos chamados estão aguardando você.', 'Verifique regularmente para não deixar tickets sem resposta.'] },
      { subtitle: 'Interagir com o suporte', steps: ['Abra um chamado já existente.', 'Na seção **Respostas**, veja o histórico completo com timestamps.', 'No campo **Sua Resposta**, escreva uma mensagem e clique em **Enviar**.', 'Deixe comentários com informações adicionais conforme necessário.'] },
      { subtitle: 'Avaliar atendimento', items: ['Quando o suporte resolve seu chamado, o status fica **"Resolvido"**.', 'Uma avaliação de 1-5 estrelas é solicitada (opcional).', 'Deixar feedback ajuda a melhorar o serviço.', 'Após avaliar, você pode **fechar** o chamado definitivamente.'] },
      { subtitle: 'Dicas importantes', items: ['Quanto **mais detalhes** fornecer, mais rápido resolvemos.', 'Use **"Urgente"** apenas para problemas que bloqueiam suas atividades imediatamente.', 'Revise a aba **Início** para ver **FAQs comuns** — sua dúvida pode já estar respondida.', 'Para **bugs críticos**, marque como "Urgente" e descreva os passos para reproduzir.'] },
    ],
  },
  {
    id: 'clientes', icon: UserCheck, title: 'Clientes — Carteira Unificada',
    color: 'from-emerald-600 to-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-100',
    content: [
      { subtitle: 'O que é a aba Clientes?', text: 'Visão consolidada de todos os clientes cadastrados na plataforma, exibidos em cards visuais com informações completas visíveis de imediato. Admins têm acesso total; usuários padrão visualizam os clientes do seu gerente.' },
      { subtitle: '🃏 Novo layout em Cards', items: [
        'Cada cliente aparece como um **card com avatar de iniciais** em gradiente azul.',
        'O card exibe: **nome, gerente responsável, subcarteira (📁), CPF, telefone, e-mail e cidade/UF** — sem necessidade de abrir qualquer tela.',
        'Grid responsivo: 1 coluna (mobile), 2 colunas (tablet), 3–4 colunas (desktop).',
        'Passe o mouse sobre o card para destacar a borda azul.',
      ]},
      { subtitle: '🖱️ Abrir ficha do cliente (clique no card)', items: [
        'Clique em **qualquer parte do card** para abrir o **Modal de Detalhes do Cliente**.',
        'O modal abre na **aba "Dados do Cliente"** com todas as informações para visualização.',
        '**Admins:** campos editáveis diretamente no modal — altere e clique em "Salvar Alterações".',
        '**Usuários:** visualização somente leitura dos dados cadastrais.',
      ]},
      { subtitle: '💬 Registrar Interação (pelo card ou dentro do modal)', items: [
        '**Opção 1 — pelo botão do card:** clique no botão roxo **"Interações"** no rodapé do card. Abre o modal diretamente na aba de Interações.',
        '**Opção 2 — dentro do modal:** abra o card, clique na aba **"Interações"** (ícone de balão).',
        'Na aba de interações, o formulário de nova interação é exibido automaticamente.',
        'Preencha: **Tipo** (Ligação, WhatsApp, E-mail, Reunião, Visita), **Resultado**, **Data**, **Próximo contato** e **Descrição**.',
        'Clique em **"Salvar"** — a interação é registrada e o histórico atualizado imediatamente.',
      ]},
      { subtitle: '📌 Ações rápidas no rodapé do card', items: [
        '**💬 Interações (roxo):** abre modal na aba de interações.',
        '**📅 Agendar (verde):** cria agendamento de contato para este cliente.',
        '**📄 Contrato (azul):** redireciona para criação de contrato pré-vinculado a este cliente.',
        '**🗑️ Excluir (vermelho):** apenas para administradores.',
      ]},
      { subtitle: 'Filtros e busca', items: [
        '**Campo de busca:** filtre por nome, CPF/CNPJ, e-mail ou telefone em tempo real.',
        '**Filtro por gerente:** selecione um gerente para ver apenas sua carteira.',
        '**Contador dinâmico:** o header exibe "X de Y clientes" conforme os filtros aplicados.',
      ]},
      { subtitle: 'Permissões', items: [
        '**Admins:** podem criar, editar, excluir clientes e alterar o gerente responsável.',
        '**Usuários padrão:** visualizam e registram interações; **não** podem editar dados nem excluir.',
        'Os botões "Importar das Vendas" e "Novo Cliente" são exibidos **somente para admins**.',
      ]},
    ],
  },
  {
    id: 'alertas-sistema', icon: Bell, title: 'Alertas do Sistema',
    color: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100',
    content: [
      { subtitle: 'O que são?', text: 'Banners de aviso global exibidos no topo da plataforma para todos os usuários conectados. Úteis para comunicar instabilidades, manutenções programadas ou avisos urgentes em tempo real.' },
      { subtitle: 'Tipos de alerta', items: [
        '⚠️ **Aviso (amarelo):** para comunicados de atenção geral.',
        '🚨 **Erro (vermelho):** para indicar instabilidade ou falha em andamento.',
        'ℹ️ **Info (azul):** para informações neutras como manutenções programadas.',
      ]},
      { subtitle: 'Como publicar um alerta (admin)', steps: [
        'O banner aparece **no topo de qualquer página** — clique no botão **"+ Criar Alerta"** à direita.',
        'Escolha o **tipo** (Aviso, Erro, Info), escreva a **mensagem** e clique em "Publicar".',
        'O alerta é exibido instantaneamente para **todos os usuários logados** sem recarregar a página.',
        'Para desativar, clique no botão **"Desativar"** no próprio banner.',
        'Apenas **um alerta pode estar ativo** por vez — publicar um novo desativa o anterior automaticamente.',
      ]},
      { subtitle: 'Visibilidade para usuários', items: [
        'O banner aparece **acima do conteúdo** em todas as páginas enquanto estiver ativo.',
        'Usuários **não podem dispensar** o banner — ele fica visível até o admin desativar.',
        'Ideal para comunicar: sistemas externos fora do ar, atualizações do sistema, prazos urgentes.',
      ]},
    ],
  },
  {
    id: 'precificacao', icon: Calculator, title: 'Precificação — Simuladores de Produtos',
    color: 'from-amber-600 to-amber-700', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200',
    content: [
      { subtitle: 'O que é a Precificação?', text: 'Módulo de cálculo automático de preços e propostas comerciais para 5 produtos principais: Dolarize, Offshore, Canal Bancário, Conta Internacional e Seguro Garantia. Gera propostas em PDF prontas para enviar ao cliente.' },
      { subtitle: 'Acessar os simuladores', steps: ['Vá para **Precificação** no menu Comercial.', 'Escolha um dos 5 produtos no topo da página (ícones coloridos).', 'Cada simulador abre com campos de entrada específicos do produto.'] },
      { subtitle: '💰 Os 5 Produtos', items: [
        '**Dolarize:** Reestruturação de dívidas com proteção cambial — simule valor de dívida e parcelamento.',
        '**Offshore:** Gestão de patrimônio em estruturas internacionais — baseado em Patrimônio sob Gestão (AUM).',
        '**Canal Bancário:** Abertura e operação de contas no exterior — simule volume de transações.',
        '**Conta Internacional:** Conta corrente em USD/EUR — paramétrico por tipo de cliente.',
        '**Seguro Garantia:** Garantias para operações comerciais — simule valor de dívida ou contrato.'] },
      { subtitle: 'Usando um simulador (exemplo Offshore)', steps: [
        'Preencha **Patrimônio sob Gestão (USD)** — valor total que o cliente quer investir.',
        'Busque ou crie um **Cliente** (campo com autocomplete).',
        'Selecione um **Destino/Jurisdição** (offshore/country específico) — afeta custos.',
        'Configure **Câmbio** (USD/BRL) — atualiza todos os cálculos em tempo real.',
        'Defina **Entrada (%)** e **Parcelamento** (quantas parcelas para o saldo).',
        'Veja automaticamente as **2 Propostas** (P1 = Estrutura Simples, P2 = Estrutura Completa) com valores em USD e BRL aproximados.',
        'Clique em **"Criar Proposta PDF"** para gerar um documento formal.'] },
      { subtitle: '🎯 Ajustes avançados', items: ['Clique em **"Ajustes de Câmbio e Adesão"** para editar valores manualmente nesta simulação.', 'Modifique câmbio, ou override as adesões (P1 e P2) sem alterar o padrão da empresa.', 'Clique **"Salvar como padrão"** para persistir o câmbio novo para futuras simulações.', 'Ou **"Resetar"** para voltar aos valores da configuração global.'] },
      { subtitle: 'Propostas Geradas', steps: [
        'Acesse **Precificação** > aba **"Propostas Geradas"** para ver histórico.',
        'Cada proposta exibe cliente, produtos, datas e status (Rascunho, Enviada, Aceita, Recusada).',
        'Clique na linha para **expandir e ver detalhes completos**.',
        'Atualize status conforme evolui a negociação.',
        'Quando cliente **aceita**, clique **"Converter para Pipeline"** — cria automaticamente a negociação no Pipeline.'] },
      { subtitle: '⚙️ Parâmetros da Empresa (Admin)', items: [
        'Apenas **administradores** podem clicar em **"Parâmetros"** para configurar globalmente.',
        'Ajuste percentuais de **adesão, mensalidades, pisos e tetos** por produto.',
        'Configure **jurisdições/destinos offshore** com custos específicos (constituição, manutenção).',
        'As mudanças aqui afetam **todos os novos simuladores** — não retroagem às propostas passadas.',
        'Salve as alterações e teste em um novo simulador.'] },
      { subtitle: 'Exportar e usar a proposta', items: [
        'PDF gerado é **pronto para imprimir ou enviar** — contém logo, assinatura e todos os detalhes.',
        'Salve o PDF no seu computador ou envie direto ao cliente via e-mail.',
        'Cada proposta fica registrada no histórico com data de criação e status.',
        'Cliente recebe um documento **profissional e personalizado** com seus dados.'] },
    ],
  },
  {
    id: 'perfil-usuario', icon: UserCheck, title: 'Perfil & Menu de Usuário',
    color: 'from-sky-600 to-sky-700', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-100',
    content: [
      { subtitle: 'Menu unificado no cabeçalho', text: 'O menu de usuário agora é único e aparece no cabeçalho superior em todas as páginas do sistema. Exibe "Bem Vindo" + nome completo + foto do avatar. O bloco duplicado que existia no Dashboard foi removido.' },
      { subtitle: 'Como acessar o perfil', steps: ['Clique no seu avatar/nome no canto superior direito.', 'No dropdown que aparece, clique em **"Meu Perfil"**.', 'O modal de perfil abre com suas informações e opções de personalização.'] },
      { subtitle: '🖼️ Enviar foto de perfil', items: [
        'No modal de perfil, clique no **ícone de upload** (câmera) sobre o avatar.',
        'Selecione uma imagem do seu computador ou celular.',
        'A foto é enviada e aparece instantaneamente no cabeçalho de todas as páginas.',
        '**Espelhamento:** se um admin estiver espelhando um vendedor, a foto atualizada é a do vendedor espelhado.',
      ]},
      { subtitle: '🎭 Escolher Personagem', items: [
        'No modal de perfil, clique em **"Escolher Personagem"**.',
        'Selecione um avatar/personagem da galeria disponível.',
        'O personagem substitui a foto de perfil em todo o sistema.',
        'Você pode trocar a qualquer momento ou remover para voltar à inicial.',
      ]},
      { subtitle: 'Editar nome de tratamento', items: [
        'O campo **"Nome de tratamento"** define como seu nome aparece no sistema.',
        'Diferente do nome completo e e-mail (que não podem ser alterados), o nome de tratamento é editável.',
        'Após alterar, clique em **"Salvar"** — o novo nome aparece imediatamente no cabeçalho.',
      ]},
      { subtitle: 'Espelhamento (Admin)', items: [
        'Administradores podem **espelhar** um vendedor para ver o sistema da perspectiva dele.',
        'Use o botão **"Espelhar"** no cabeçalho e selecione o vendedor.',
        'O avatar e nome do vendedor espelhado aparecem no cabeçalho (com banner laranja de aviso).',
        'O perfil editado durante o espelhamento afeta o vendedor espelhado, não o admin.',
        'Clique em **"Sair do Espelhamento"** para voltar ao seu usuário.',
      ]},
    ],
  },
  {
    id: 'gamificacao-roleta', icon: Target, title: 'Gamificação — Roleta de Prêmios',
    color: 'from-pink-600 to-purple-700', bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-100',
    content: [
      { subtitle: 'O que é?', text: 'Sistema de gamificação onde administradores liberam uma roleta de prêmios para usuários específicos. Cada usuário autorizado pode girar a roleta uma única vez e receber um prêmio sorteado.' },
      { subtitle: 'Como funciona (Usuário)', steps: ['O admin libera a roleta para o seu usuário (página Usuários).', 'Ao acessar o sistema, um popup da roleta aparece automaticamente.', 'Clique em "Girar" para acionar a roleta.', 'A roleta anima e para em um prêmio (representado por emoji).', 'O prêmio sorteado é exibido com descrição detalhada na lateral.', 'O resultado é salvo permanentemente — cada usuário gira apenas uma vez.'] },
      { subtitle: 'Prêmios padrão', items: ['🍽️ **Almoço**', '🌙 **Janta**', '🏖️ **Dia de Folga**', '💰 **R$ 100,00**', 'Os prêmios podem ser customizados pelo administrador.'] },
      { subtitle: '🎨 Visual da Roleta', items: [
        'A roleta exibe **apenas emojis** nos segmentos (sem texto) para maior clareza visual.',
        'Uma **legenda lateral** descreve cada prêmio em texto.',
        'Após o giro, a **descrição completa** do prêmio sorteado aparece abaixo da roleta.',
        'O componente é padronizado (RoletaWheel) entre o popup do usuário e a prévia do admin.',
      ]},
      { subtitle: '🔧 Gestão (Admin)', items: [
        'Na página **Usuários**, o admin pode liberar a roleta para usuários específicos.',
        '**Visualizar Roleta:** botão de prévia que permite ao admin testar a roleta sem salvar resultados.',
        '**Relatório de Prêmios:** gera PDF com histórico de todos os sorteios realizados.',
        'Cada registro contém: usuário, prêmio sorteado e data/hora do sorteio.',
      ]},
      { subtitle: '📊 Relatório de Prêmios (PDF)', items: [
        'Acesse o relatório pela página de Usuários ou pelo botão no popup da roleta.',
        'Contém: estatísticas consolidadas (total de sorteios, prêmio mais sorteado).',
        'Lista detalhada de cada sorteio: usuário, e-mail, prêmio, data.',
        'Exportável em PDF com formatação compatível com acentuação portuguesa.',
      ]},
    ],
  },
  {
    id: 'relatorio-acessos', icon: Activity, title: 'Relatório de Acessos & Sessões',
    color: 'from-indigo-600 to-blue-700', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-100',
    content: [
      { subtitle: 'O que é?', text: 'Sistema de rastreamento de sessões de usuários que registra horários de início, fim e duração de cada acesso à plataforma, além do histórico de páginas visitadas. Disponível para administradores na página de Usuários.' },
      { subtitle: '📏 Como o rastreamento funciona', items: [
        'Ao fazer login, o sistema cria automaticamente uma **sessão ativa** com horário de início.',
        'A cada **2 minutos**, um sinal de vida (heartbeat) atualiza a sessão.',
        'Ao sair ou fechar o navegador, a sessão é **encerrada** com horário de fim e duração calculada.',
        'Se o usuário ficar inativo por mais de **10 minutos** sem heartbeat, a sessão é encerrada automaticamente por rotina agendada.',
        'Ao retornar, uma nova sessão é criada (não duplica sessões em refresh de página).',
      ]},
      { subtitle: '📊 Dados disponíveis no relatório', items: [
        '**Início da sessão:** horário exato de entrada.',
        '**Fim da sessão:** horário de saída (manual ou por inatividade).',
        '**Duração total:** tempo em minutos entre início e fim.',
        '**Status:** Ativa ou Encerrada.',
        '**Páginas visitadas:** histórico de navegação com data/hora de cada acesso.',
      ]},
      { subtitle: '🔍 Filtros e visualização', items: [
        'Filtro por **período** (data inicial e final).',
        'Filtro por **usuário** específico.',
        '**Cards de resumo:** total de sessões, tempo total online, média por sessão.',
        '**Gráfico temporal:** visualização de atividade ao longo do tempo.',
        '**Tabela detalhada:** lista de sessões com sorting por coluna.',
        '**Popup individual:** clique em um usuário para ver detalhamento de suas sessões.',
      ]},
      { subtitle: '📄 Exportar PDF', items: [
        'Clique em **"Gerar PDF"** para exportar o relatório completo.',
        'O documento inclui: resumo estatístico, gráficos e tabela de sessões.',
        'Usuários **inativos ou bloqueados** são filtrados automaticamente do relatório.',
        'Horários formatados em padrão brasileiro (DD/MM/AAAA HH:MM).',
      ]},
      { subtitle: '⚠️ Limitações', items: [
        'O rastreamento é baseado em **atividade no navegador** — se o usuário deixar a aba aberta sem interagir, a sessão é encerrada após 10 min de inatividade.',
        'Múltiplas abas/janelas do mesmo usuário compartilham a mesma sessão.',
        'O relatório não rastreia atividade fora da plataforma (ex: e-mails enviados externamente).',
      ]},
    ],
  },
];

// ─── CATEGORY CARDS ──────────────────────────────────────────────────────────

const categories = [
  {
    id: 'vendas', label: 'Vendas', icon: BarChart2,
    gradFrom: '#00b09b', gradTo: '#007b6e',
    color: 'from-[#00b09b] to-[#007b6e]',
    sections: ['mercado', 'vendas', 'pipeline', 'parcelas-vincendas', 'meus-clientes', 'prospecccao', 'central-leads', 'fila-contatos-popup', 'implantacoes'],
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
    sections: ['contratos', 'implantacoes', 'central-leads', 'indicadores', 'portal-indicador', 'treinamentos', 'relatorio-interacoes', 'comunicados', 'google-calendar', 'chat-interno', 'suporte', 'clientes', 'alertas-sistema', 'desempenho', 'perfil-usuario', 'gamificacao-roleta', 'relatorio-acessos'],
  },
  {
    id: 'admin', label: 'Admin', icon: UserCheck,
    gradFrom: '#9b59b6', gradTo: '#6c3483',
    color: 'from-[#9b59b6] to-[#6c3483]',
    sections: ['introducao', 'dashboard', 'mercado', 'vendedores', 'produtos', 'notificacoes', 'usuarios', 'assistente-ia', 'precificacao', 'desempenho', 'perfil-usuario', 'gamificacao-roleta', 'relatorio-acessos', 'portal-indicador'],
  },
];

// ─── SECTION ACCORDION ───────────────────────────────────────────────────────

function SectionBlock({ section, onOpen }) {
  const Icon = section.icon;
  return (
    <div className={`rounded-xl border ${section.border} overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5`}>
      <button onClick={onOpen} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors bg-white hover:bg-gray-50">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${section.color} shadow-sm flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="flex-1 font-semibold text-sm text-gray-800 text-left">{section.title}</span>
        <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
      </button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Manual() {
  const [selectedSection, setSelectedSection] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [baixandoPdfIndicador, setBaixandoPdfIndicador] = useState(false);
  const [baixandoPdfEsteira, setBaixandoPdfEsteira] = useState(false);

  const baixarPdfJornada = async () => {
    setBaixandoPdf(true);
    try {
      const res = await base44.functions.invoke('gerarManualJornadaLeadPDF', {});
      // res.data pode ser o PDF binário (arraybuffer no backend) ou um erro
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'manual-jornada-lead.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF da jornada gerado com sucesso.');
    } catch (e) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || e));
    }
    setBaixandoPdf(false);
  };

  const baixarPdfIndicador = async () => {
    setBaixandoPdfIndicador(true);
    try {
      const res = await base44.functions.invoke('gerarManualCadastroIndicadorPDF', {});
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'manual-cadastro-indicador.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF de cadastro do indicador gerado com sucesso.');
    } catch (e) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || e));
    }
    setBaixandoPdfIndicador(false);
  };

  const baixarPdfEsteira = async () => {
    setBaixandoPdfEsteira(true);
    try {
      const res = await base44.functions.invoke('gerarManualFilaContatosPDF', {});
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'estrutura-fila-contatos.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF da Nova Esteira de Fila de Contatos gerado com sucesso.');
    } catch (e) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || e));
    }
    setBaixandoPdfEsteira(false);
  };

  const handleCategory = (cat) => {
    if (activeCategory === cat.id) {
      setActiveCategory(null);
      return;
    }
    setActiveCategory(cat.id);
    setTimeout(() => {
      document.getElementById('sections-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // Quick nav tags: featured sections
  const quickNavIds = ['introducao', 'dashboard', 'mercado', 'vendas', 'vendedores', 'prospecccao', 'pipeline', 'contratos', 'implantacoes', 'central-leads', 'meus-clientes', 'perfil-usuario', 'portal-indicador'];
  const quickNavSections = sections.filter((s, i, arr) => quickNavIds.includes(s.id) && arr.findIndex(x => x.id === s.id) === i).slice(0, 13);

  const visibleSections = activeCategory
    ? sections.filter(s => categories.find(c => c.id === activeCategory)?.sections.includes(s.id))
    : sections;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7f5c14 0%, #b8860b 22%, #1a3150 58%, #0f1e35 100%)' }}>
        {/* decorative glows */}
        <div className="absolute top-0 left-0 w-72 h-72 opacity-20 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #f5c842 0%, transparent 70%)', transform: 'translate(-30%, -40%)' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 opacity-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #4a90d9 0%, transparent 70%)', transform: 'translate(20%, 40%)' }} />

        <div className="relative px-6 py-7 md:py-8 max-w-5xl mx-auto">
          {/* top label */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-300/70 text-[10px] uppercase tracking-[0.25em] font-semibold">Villela Exchange</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/40 text-[10px] uppercase tracking-[0.15em]">Gestão Comercial</span>
          </div>

          {/* main row: title left, stats right */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* left */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #f5c842 0%, #e09b15 100%)' }}>
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                  Manual da Plataforma
                </h1>
                <p className="text-white/50 text-xs mt-0.5 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  Guia completo de utilização — atualizado Ago/2026
                </p>
              </div>
            </div>

            {/* right: stats inline */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {[
                { v: sections.length, l: 'Seções', icon: '📋' },
                { v: sections.reduce((a, s) => a + s.content.length, 0), l: 'Tópicos', icon: '📌' },
                { v: 'Ago/2026', l: 'Atualizado', icon: '🗓' },
              ].map((k, i) => (
                <div key={k.l} className={`flex flex-col items-center px-4 py-2.5 rounded-xl backdrop-blur-sm border transition-all ${i === 0 ? 'bg-yellow-400/15 border-yellow-400/25' : i === 1 ? 'bg-white/10 border-white/15' : 'bg-white/8 border-white/10'}`}>
                  <span className="text-lg font-extrabold text-white leading-none">{k.v}</span>
                  <span className="text-[9px] text-white/45 uppercase tracking-widest mt-0.5 whitespace-nowrap">{k.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* description — compact, below */}
          <p className="text-white/55 text-xs leading-relaxed mt-4 max-w-2xl border-t border-white/10 pt-4">
            Documentação de todas as funcionalidades: Vendas, Contratos, Pipeline, Comissões, Relatórios, Prospecção, Capacitação e mais.
          </p>

          {/* botões PDF */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={baixarPdfJornada} disabled={baixandoPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #0066cc 100%)', color: '#fff', boxShadow: '0 4px 18px rgba(0,212,170,0.35)' }}>
              {baixandoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Baixar PDF da Jornada do Lead
            </button>
            <button onClick={baixarPdfIndicador} disabled={baixandoPdfIndicador}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #db2777 0%, #b91c5c 100%)', color: '#fff', boxShadow: '0 4px 18px rgba(219,39,119,0.35)' }}>
              {baixandoPdfIndicador ? <Loader2 className="w-4 h-4 animate-spin" /> : <Handshake className="w-4 h-4" />}
              Baixar PDF do Cadastro do Indicador
            </button>
            <button onClick={baixarPdfEsteira} disabled={baixandoPdfEsteira}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', boxShadow: '0 4px 18px rgba(245,158,11,0.35)' }}>
              {baixandoPdfEsteira ? <Loader2 className="w-4 h-4 animate-spin" /> : <KanbanSquare className="w-4 h-4" />}
              Baixar PDF da Nova Esteira (Fila de Contatos)
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ── QUICK NAV ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Navegação Rápida</p>
          <div className="flex flex-wrap gap-2">
            {quickNavSections.map(s => (
              <button key={s.id} onClick={() => { setActiveCategory(null); setSelectedSection(s); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all bg-white text-gray-600 border-gray-200 hover:border-[#1a3150] hover:bg-gray-50">
                {s.title}
              </button>
            ))}
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
            {visibleSections.map(s => (
              <div key={s.id} id={`sec-${s.id}`}>
                <SectionBlock section={s} onOpen={() => setSelectedSection(s)} />
              </div>
            ))}
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
          Villela Exchange · Gestão Comercial · Manual da Plataforma · Ago/2026
        </div>
      </div>

      {/* ── POPUP DE LEITURA DO TEMA ── */}
      {selectedSection && (
        <ManualSectionModal section={selectedSection} onClose={() => setSelectedSection(null)} />
      )}
    </div>
  );
}