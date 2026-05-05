import { useState } from 'react';
import { BookOpen, ChevronRight, ChevronDown, ShoppingCart, BarChart3, Package, Users, DollarSign, Target, FileText, Upload, AlertTriangle, Star, Info, CheckCircle2, ArrowRight, Briefcase, Calendar, CalendarClock, TrendingUp, GraduationCap, Bot, Megaphone, Receipt, ScrollText, Zap, Search, LayoutDashboard, Layers } from 'lucide-react';

const sections = [
  {
    id: 'introducao',
    icon: BookOpen,
    title: 'Introdução à Plataforma',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-100',
    content: [
      {
        subtitle: 'O que é o Villela Exchange – Gestão Comercial?',
        text: 'O sistema de Gestão Comercial da Villela Exchange é uma plataforma completa para registro, acompanhamento e análise de vendas, comissões, metas e indicadores da equipe comercial. Integra Contratos, Pipeline, Prospecção, Treinamentos e IA em um único ambiente.',
      },
      {
        subtitle: 'Acesso e Login',
        text: 'O acesso é feito por convite do administrador. Após receber o e-mail de convite, crie sua senha e entre na plataforma. Suas permissões de menu são definidas pelo administrador.',
      },
      {
        subtitle: 'Perfil do Usuário',
        text: 'Clique no seu nome no canto superior do Dashboard para acessar seu perfil. Você pode alterar seu nome de tratamento (como aparece no sistema).',
      },
      {
        subtitle: 'Menus da plataforma',
        items: [
          '**Bloco Comercial:** Vendas, Clientes, Vendedores, Indicadores, Rel. Interações, Pipeline.',
          '**Bloco Apoio:** Meus Clientes, Manual, Capacitação, Contratos.',
          '**Bloco Administrativo (admins):** Comissões, Notificações, Comunicados, Notas Fiscais, Capacitação Admin, Relatório Comissões, Prospecção, Metas, Produtos, Importar.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    color: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-100',
    content: [
      {
        subtitle: 'Visão Geral',
        text: 'O Dashboard apresenta os principais indicadores de desempenho em tempo real: total vendido, número de vendas, comissão gerada, ticket médio e vendedores ativos.',
      },
      {
        subtitle: 'Filtros',
        text: 'Use filtros de data (início e fim), vendedor e produto. KPIs e gráficos se atualizam automaticamente.',
      },
      {
        subtitle: 'Meta do Time',
        text: 'Exibe o progresso da meta mensal da equipe com barra de progresso colorida: vermelho (< 40%), amarelo (40–69%), azul (70–99%) e verde (≥ 100%).',
      },
      {
        subtitle: 'Gráfico Volume vs Meta',
        text: 'Compara o volume de vendas individual de cada vendedor com sua meta do mês atual. Barras verdes indicam meta atingida.',
      },
      {
        subtitle: 'Ranking de Vendedores',
        text: 'Lista os vendedores ordenados pelo volume de vendas no período filtrado, com medalhas para o pódio.',
      },
      {
        subtitle: 'Últimas Vendas',
        text: 'Exibe as vendas mais recentes do período filtrado com cliente, vendedor, data e valor.',
      },
    ],
  },
  {
    id: 'vendas',
    icon: ShoppingCart,
    title: 'Gestão de Vendas',
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
    content: [
      {
        subtitle: 'Dois caminhos para registrar uma venda',
        items: [
          '**Caminho A — Venda direta:** para produtos sem contrato formal. Acesse Vendas > Nova Venda e preencha os dados diretamente.',
          '**Caminho B — Via Contrato:** obrigatório para CONTA GLOBAL, CONTA INTERNACIONAL e DOLARIZE AQUI. O fluxo começa em Contratos, não em Vendas.',
        ],
      },
      {
        subtitle: 'Registrar uma nova venda (Caminho A)',
        steps: [
          'Acesse "Vendas" > clique em "Nova Venda".',
          'Selecione o(s) Produto(s) na lista de ativos.',
          'Selecione o Vendedor responsável — o percentual de comissão é carregado automaticamente.',
          'Ajuste o percentual de comissão, se necessário (aceita 0%).',
          'Informe o Valor Total do Contrato e selecione a estrutura de pagamento (à vista ou parcelado).',
          'Defina o Valor de Entrada — este valor conta para a meta do mês imediatamente.',
          'Busque o cliente pelo nome ou CPF/CNPJ no campo de pesquisa.',
          'Adicione Indicadores se houver — clique em "+ Indicador" e defina o percentual.',
          'Ajuste datas e valores de cada parcela individualmente, se necessário.',
          'Clique em "Salvar".',
        ],
      },
      {
        subtitle: 'Estrutura de pagamento (entrada + parcelas)',
        items: [
          '**Sem parcelas (à vista):** o valor total é tratado como entrada e conta 100% para a meta do mês.',
          '**Entrada + Nx parcelas:** a entrada conta imediatamente; o saldo restante é dividido em parcelas mensais acompanhadas em "Parcelas Vincendas".',
          '**Ajuste de parcelas:** após escolher o número de parcelas, é possível editar manualmente o valor e a data de vencimento de cada uma. Um indicador mostra se os valores estão equilibrados (✓ Valores OK).',
          '**Comissões:** calculadas sempre sobre o valor de entrada. Ao receber cada parcela, novas comissões são geradas automaticamente.',
        ],
      },
      {
        subtitle: 'Comissão zerada (0%)',
        text: 'É possível definir 0% de comissão para o vendedor em uma venda. O campo aceita o valor zero e persiste corretamente sem reversão para percentuais anteriores. Isso é útil em casos de vendas sem comissão ou isenções pontuais.',
      },
      {
        subtitle: 'Editar uma venda',
        text: 'Clique no ícone de lápis (✏️) na linha da venda. O formulário abrirá em modal. Ao salvar, comissões, parcelas e registros vinculados são recalculados automaticamente.',
      },
      {
        subtitle: 'Excluir uma venda',
        text: 'Clique no ícone de lixeira (🗑️) e confirme. Todas as comissões, parcelas e registros do Pipeline vinculados à venda são removidos automaticamente.',
      },
      {
        subtitle: 'Filtros de vendas',
        items: [
          '**Período:** data início e fim.',
          '**Vendedor:** seleção múltipla com checkbox.',
          '**Produto:** seleção múltipla com checkbox.',
          '**Busca livre:** por produto, vendedor, cliente ou CPF/CNPJ.',
        ],
      },
      {
        subtitle: 'Exportar dados',
        items: [
          '**Vendas CSV:** exporta todas as vendas do período filtrado para Excel.',
          '**Clientes CSV:** exporta a lista de clientes únicos do período filtrado.',
          '**Relatório PDF:** gera um documento com todas as transações do período filtrado.',
        ],
      },
      {
        subtitle: 'Importar histórico',
        text: 'Use "Importar Histórico" para carregar vendas em lote via CSV ou Excel. O sistema mapeia automaticamente as colunas reconhecidas e verifica duplicatas.',
      },
      {
        subtitle: 'O que acontece automaticamente ao salvar',
        items: [
          '**Comissão do vendedor** gerada sobre o valor de entrada.',
          '**Comissões dos indicadores** geradas proporcionalmente a cada percentual.',
          '**Cliente vinculado ao vendedor** (carteira) — se não existia, é criado automaticamente.',
          '**Parcelas criadas** no módulo "Parcelas Vincendas" para acompanhamento do saldo restante.',
          '**Registro no Pipeline** criado automaticamente para cada parcela gerada.',
          '**Meta e Dashboard atualizados** em tempo real.',
        ],
      },
      {
        subtitle: 'Cuidados importantes',
        items: [
          '**CONTA GLOBAL, CONTA INTERNACIONAL e DOLARIZE AQUI sempre seguem o Caminho B** — nunca lançados diretamente em Vendas sem passar por Contratos.',
          '**Excluir uma venda remove todas as comissões vinculadas.** Use com cuidado.',
          '**O percentual definido na venda prevalece** sobre o padrão cadastrado no vendedor.',
          '**Indicadores acima de 30% requerem autorização** do administrador.',
          '**Bônus automático** é gerado ao atingir 100% da meta, se o valor de bônus estiver configurado.',
          '**Em vendas parceladas, apenas a entrada conta para a meta do mês atual.**',
        ],
      },
    ],
  },
  {
    id: 'comissoes',
    icon: DollarSign,
    title: 'Comissões',
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-100',
    content: [
      {
        subtitle: 'Como as comissões são geradas',
        text: 'As comissões são criadas automaticamente ao salvar uma venda. O valor é calculado aplicando o percentual definido sobre o valor de entrada.',
      },
      {
        subtitle: 'Tipos de comissão',
        items: [
          '**Comissão normal:** gerada automaticamente para o vendedor responsável pela venda.',
          '**Comissão de indicador (espelhamento):** gerada para indicadores vinculados à venda.',
          '**Bônus:** valor adicional concedido manualmente pelo administrador ou automaticamente ao atingir 100% da meta.',
        ],
      },
      {
        subtitle: 'Marcar comissão como paga',
        text: 'Na página de Comissões, marque individualmente ou em lote as comissões como pagas. Comissões pagas ficam destacadas em verde e saem do saldo pendente.',
      },
      {
        subtitle: 'Bônus por meta',
        text: 'Ao atingir 100% da meta individual, o sistema gera um bônus automaticamente (se configurado na Meta). O administrador também pode conceder bônus manuais na página de Vendedores (ícone "$").',
      },
      {
        subtitle: 'Relatório Consolidado de Comissões',
        text: 'Disponível na página Vendedores (botão "Relatório Consolidado"). Exibe volume de entrada, volume total de contrato, comissão estimada, progresso de meta e desempenho por produto de cada vendedor no período selecionado. Exportável em PDF e CSV.',
      },
    ],
  },
  {
    id: 'metas',
    icon: Target,
    title: 'Metas',
    color: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-100',
    content: [
      {
        subtitle: 'Tipos de meta',
        items: [
          '**Individual:** por vendedor e mês. Exibida como barra de progresso no card do vendedor.',
          '**Time:** meta para um time específico.',
          '**Equipe:** meta global da equipe inteira, exibida no Dashboard.',
        ],
      },
      {
        subtitle: 'Criar uma meta',
        steps: [
          'Acesse "Metas" > clique em "Nova Meta".',
          'Selecione o tipo (Individual, Time ou Equipe).',
          'Para meta individual, selecione o vendedor.',
          'Defina o mês de referência (YYYY-MM), o valor da meta e o valor do bônus (opcional).',
          'Clique em "Salvar".',
        ],
      },
      {
        subtitle: 'Acompanhamento',
        text: 'O progresso das metas individuais aparece nos cards de cada vendedor com barra colorida. A meta do time aparece no Dashboard. Cores: vermelho (< 40%), amarelo (40–69%), azul (70–99%), verde (≥ 100%), dourado (bônus superado).',
      },
    ],
  },
  {
    id: 'vendedores',
    icon: Users,
    title: 'Vendedores',
    color: 'from-sky-500 to-sky-600',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-100',
    content: [
      {
        subtitle: 'Cadastrar vendedor',
        steps: [
          'Acesse "Vendedores" > clique em "Novo Vendedor".',
          'Preencha nome, e-mail, time e percentual de comissão padrão.',
          'Defina o status (Ativo/Inativo) e clique em "Salvar".',
        ],
      },
      {
        subtitle: 'Cards de vendedores',
        text: 'Cada card exibe: número de vendas no mês, volume financeiro, percentual de comissão padrão, barra de progresso de meta e status. Vendedores com dados no mês aparecem primeiro.',
      },
      {
        subtitle: 'Relatório Consolidado de Vendas',
        text: 'Clique em "Relatório Consolidado" para abrir um painel com dados de todos os vendedores. Permite selecionar período e vendedores, ver volume de entrada, volume total de contrato, comissão estimada, progresso de meta e desempenho por produto. Exportável em PDF e CSV.',
      },
      {
        subtitle: 'Relatório individual',
        text: 'Clique no ícone de documento (📄) no card do vendedor para gerar um PDF com todas as vendas, comissões e bônus do período selecionado.',
      },
      {
        subtitle: 'Envio de relatório por e-mail',
        text: 'Clique no ícone de avião (✈️) para enviar individualmente. Use "Enviar Relatórios" para envio em massa com seleção de destinatários e rastreamento de envios já realizados no período.',
      },
      {
        subtitle: 'Bônus manual',
        text: 'Clique no ícone "$" no card do vendedor para conceder ou editar um bônus manual para o mês selecionado.',
      },
      {
        subtitle: 'Permissão Admin',
        text: 'O checkbox "Admin" concede permissão administrativa ao usuário correspondente (desde que tenha e-mail cadastrado e conta criada).',
      },
    ],
  },
  {
    id: 'indicadores',
    icon: Users,
    title: 'Indicadores (Espelhamentos)',
    color: 'from-pink-500 to-pink-600',
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-100',
    content: [
      {
        subtitle: 'O que são indicadores?',
        text: 'Indicadores (espelhamentos) são parceiros externos à equipe de vendas que indicam clientes e recebem uma comissão pelo negócio fechado. Eles são vinculados às vendas no formulário de registro.',
      },
      {
        subtitle: 'Tipos de indicador em uma venda',
        items: [
          '**Indicador externo:** cadastrado no menu "Indicadores". Comissão gerada na tabela de Espelhamentos.',
          '**Vendedor interno como indicador:** qualquer vendedor pode ser adicionado como indicador em uma venda de outro vendedor. Comissão gerada na tabela de Comissões.',
        ],
      },
      {
        subtitle: 'Cadastrar indicador',
        steps: [
          'Acesse "Indicadores" > clique em "Novo Indicador".',
          'Preencha nome, e-mail, telefone e percentual de comissão padrão.',
          'Clique em "Salvar".',
        ],
      },
      {
        subtitle: 'Vincular indicador a uma venda',
        text: 'No formulário de venda, clique em "+ Indicador", selecione o tipo (Indicador ou Vendedor), escolha na lista e ajuste o percentual. Múltiplos indicadores são suportados por venda.',
      },
      {
        subtitle: 'Limite de espelhamento',
        items: [
          '**Até 30%:** permitido sem restrição.',
          '**30% a 50%:** permitido, mas dispara notificação automática para os administradores autorizarem.',
          '**Acima de 50%:** bloqueado pelo sistema.',
        ],
      },
    ],
  },
  {
    id: 'produtos',
    icon: Package,
    title: 'Produtos',
    color: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-100',
    content: [
      {
        subtitle: 'Gerenciar produtos',
        text: 'Acesse "Produtos" para visualizar, criar, editar ou desativar os produtos comercializados. Apenas produtos ativos aparecem no formulário de vendas e nos filtros.',
      },
      {
        subtitle: 'Cadastrar produto',
        steps: [
          'Clique em "Novo Produto".',
          'Informe o nome, categoria e status (Ativo/Inativo).',
          'Clique em "Salvar".',
        ],
      },
    ],
  },
  {
    id: 'relatorios',
    icon: FileText,
    title: 'Relatórios',
    color: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-100',
    content: [
      {
        subtitle: 'Relatório Consolidado de Vendas (Vendedores)',
        text: 'Acesse em Vendedores > "Relatório Consolidado". Selecione o período e os vendedores desejados. O relatório exibe por vendedor: total de vendas, volume de entrada, volume total de contratos, comissão estimada e % atingido da meta. Também detalha desempenho por produto. Exportável em PDF (com layout profissional) e CSV.',
      },
      {
        subtitle: 'Relatório individual do vendedor',
        text: 'Disponível no card de cada vendedor (ícone 📄). Gera PDF com vendas, comissões e bônus do período selecionado.',
      },
      {
        subtitle: 'Relatório geral de comissões',
        text: 'Botão "Relatório Geral" na página de Vendedores. Consolida comissões de todos os vendedores com dados no período.',
      },
      {
        subtitle: 'Relatório de vendas',
        text: 'Disponível em Vendas (botão "Relatório PDF"). Gera um resumo de todas as transações do período filtrado.',
      },
      {
        subtitle: 'Relatório de Comissões (menu Relatório Comissões)',
        text: 'Menu administrativo para gerar relatórios consolidados de comissões por período. Permite filtrar por vendedor, visualizar detalhamento de comissões, bônus e status de pagamento.',
      },
      {
        subtitle: 'Relatório de Interações',
        text: 'Menu "Rel. Interações" na barra lateral. Exibe todos os contatos com clientes/leads no período, com filtros por resultado, tipo e vendedor. Gráfico de produtividade por vendedor para admins. Exportável em PDF.',
      },
      {
        subtitle: 'Relatório PDF do Pipeline',
        text: 'Disponível na página Pipeline (botão "Relatório PDF"). Gera documento com todos os negócios filtrados, KPIs e tabela detalhada.',
      },
      {
        subtitle: 'Relatório de Notas Fiscais',
        text: 'Disponível em Notas Fiscais (botão "Relatório PDF"). Exibe totais por status (pendente, enviada, paga) e valor acumulado.',
      },
      {
        subtitle: 'Envio de relatórios por e-mail',
        text: 'Relatórios individuais podem ser enviados por e-mail direto do card do vendedor. Use "Enviar Relatórios" na página Vendedores para envio em massa, com rastreamento de envios realizados no período.',
      },
    ],
  },
  {
    id: 'importar',
    icon: Upload,
    title: 'Importação de Dados',
    color: 'from-cyan-500 to-cyan-600',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-100',
    content: [
      {
        subtitle: 'Como importar histórico de vendas',
        steps: [
          'Acesse "Importar" ou clique em "Importar Histórico" na página de Vendas.',
          'Faça upload de um arquivo CSV ou Excel (.xlsx).',
          'O sistema mapeia automaticamente as colunas reconhecidas.',
          'Verifique o preview dos dados.',
          'Clique em "Importar" e acompanhe o progresso em tempo real.',
        ],
      },
      {
        subtitle: 'Colunas reconhecidas',
        items: [
          'Data (formatos: DD/MM/YYYY, YYYY-MM-DD)',
          'Produto, Vendedor / Assessor Comercial',
          'Cliente, CPF/CNPJ',
          'Valor (aceita vírgula ou ponto como decimal)',
          'Forma de Pagamento, Observação, Link Bitrix',
        ],
      },
      {
        subtitle: 'Deduplicação',
        text: 'O sistema verifica automaticamente se a venda já foi registrada (mesmo cliente, data e valor) para evitar duplicatas.',
      },
    ],
  },
  {
    id: 'notificacoes',
    icon: AlertTriangle,
    title: 'Notificações e Autorizações',
    color: 'from-red-500 to-red-600',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-100',
    content: [
      {
        subtitle: 'Tipos de notificação',
        items: [
          '**Espelhamento acima de 30%:** disparada quando o total de indicadores ultrapassa 30%. Requer aprovação do administrador.',
          '**Novo contrato criado:** disparada automaticamente ao salvar um contrato (Conta Global, Conta Internacional ou Dolarize Aqui). Solicita que o admin adicione o link de assinatura.',
        ],
      },
      {
        subtitle: 'Página de Notificações',
        text: 'Administradores acessam o menu "Notificações" para visualizar, aprovar ou rejeitar solicitações. O ícone na barra lateral exibe badge vermelho com o número de pendências.',
      },
      {
        subtitle: 'Fluxo de autorização — espelhamento',
        steps: [
          'Vendedor registra venda com espelhamento entre 30% e 50%.',
          'Sistema envia notificação por e-mail e no Jarvis aos administradores.',
          'Administrador acessa "Notificações" e aprova ou rejeita.',
          'Venda é registrada normalmente após aprovação.',
        ],
      },
      {
        subtitle: 'Fluxo de ação — novo contrato',
        steps: [
          'Gerente salva um novo contrato.',
          'Administrador recebe alerta no Jarvis, em Notificações e por e-mail.',
          'Administrador acessa o contrato e adiciona o link de assinatura online.',
          'Gerente encaminha o link ao cliente para assinar.',
          'Marcar notificação como "Resolvido" ao concluir.',
        ],
      },
    ],
  },
  {
    id: 'usuarios',
    icon: Users,
    title: 'Gestão de Usuários',
    color: 'from-slate-500 to-slate-600',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-100',
    content: [
      {
        subtitle: 'Convidar novo usuário',
        steps: [
          'Acesse "Usuários" no menu inferior da barra lateral (apenas admins).',
          'Clique em "Convidar Usuário".',
          'Preencha nome, e-mail e tipo de acesso (Usuário Padrão ou Administrador).',
          'Clique em "Enviar Convite". O usuário receberá e-mail com link para criar a senha.',
        ],
      },
      {
        subtitle: 'Configurar acessos',
        text: 'Após o primeiro acesso, o administrador pode configurar quais menus o usuário pode visualizar clicando em "Editar Acessos" no card do usuário.',
      },
      {
        subtitle: 'Permissões',
        items: [
          '**Administrador:** acesso total a todos os menus e dados de todos os vendedores.',
          '**Usuário padrão:** acesso apenas aos menus liberados pelo admin, visualizando somente seus próprios dados.',
        ],
      },
    ],
  },
  {
    id: 'relatorio-interacoes',
    icon: FileText,
    title: 'Relatório de Interações',
    color: 'from-cyan-600 to-cyan-700',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-100',
    content: [
      {
        subtitle: 'Visão geral',
        text: 'Centraliza todos os contatos realizados com clientes e leads. Administradores veem todas as interações; usuários padrão veem apenas as suas.',
      },
      {
        subtitle: 'Filtros disponíveis',
        items: [
          '**Data início/fim:** filtre por período.',
          '**Vendedor (admin):** veja as interações de um vendedor específico ou de todos.',
          '**Resultado:** Positivo, Neutro, Negativo ou Sem resposta.',
          '**Tipo:** Ligação, WhatsApp, E-mail, Reunião, Visita, Outro.',
          '**Busca livre:** por cliente, vendedor ou descrição.',
        ],
      },
      {
        subtitle: 'Gráfico de produtividade',
        text: 'Para administradores: gráfico de barras com total de interações por vendedor, com destaque para positivas e negativas.',
      },
      {
        subtitle: 'Exportar',
        text: 'Clique em "Exportar PDF" para gerar documento completo com gráficos, resumo por vendedor e listagem detalhada.',
      },
    ],
  },
  {
    id: 'meus-clientes',
    icon: Briefcase,
    title: 'Meus Clientes',
    color: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-100',
    content: [
      {
        subtitle: 'O que é "Meus Clientes"?',
        text: 'Gerenciamento da carteira de clientes e leads. Permite registrar interações, acompanhar próximos contatos e converter leads em clientes cativos. Clientes são adicionados automaticamente ao salvar um contrato.',
      },
      {
        subtitle: 'Criar novo lead manualmente',
        steps: [
          'Clique em "Novo Lead/Prospect" na barra superior.',
          'Preencha nome (obrigatório), CPF/CNPJ, telefone e e-mail.',
          'Clique em "Criar e Registrar Interação".',
          'O lead é vinculado a você como gerente e o sistema abre o formulário de primeira interação.',
        ],
      },
      {
        subtitle: 'Registrar interação',
        text: 'Clique em "Nova Interação" no cliente expandido. Preencha tipo de contato, resultado, descrição, data do próximo contato e produtos abordados.',
      },
      {
        subtitle: 'Converter lead em cliente cativo',
        text: 'Quando um lead tem histórico de interações e cadastro completo (Nome, CPF/CNPJ, Telefone), clique em "Converter em Cliente" para transformá-lo em cliente permanente.',
      },
      {
        subtitle: 'Agenda diária de contatos',
        text: 'Seção "Agenda de Contatos" mostra os leads agendados para contato, ordenados por data. Marque como "Realizado", "Não atendeu" ou "Reagendar".',
      },
      {
        subtitle: 'Ações em lote (admin)',
        text: 'Administradores podem selecionar múltiplos clientes para: trocar de gerente responsável, devolver leads não convertidos ou excluir registros em lote.',
      },
    ],
  },
  {
    id: 'prospecccao',
    icon: Search,
    title: 'Prospecção — Novos Leads',
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-100',
    content: [
      {
        subtitle: 'O que é o menu Prospecção?',
        text: 'Menu administrativo para importar listas de novos leads em lote, distribuir entre gerentes e acompanhar conversões.',
      },
      {
        subtitle: 'Importar lista de leads',
        steps: [
          'Clique em "Importar Lista".',
          'Faça upload de CSV ou Excel com colunas: Nome, CPF/CNPJ, Telefone.',
          'Nomeie o lote e verifique o preview.',
          'Clique em "Importar". Os leads ficam como "Pendentes de Distribuição".',
        ],
      },
      {
        subtitle: 'Distribuir leads',
        steps: [
          'Selecione um lote pendente e clique em "Distribuir".',
          'Escolha os gerentes que receberão os leads.',
          'O sistema embaralha e distribui automaticamente.',
          'Uma agenda de contatos é gerada (até 5 contatos por dia por gerente).',
        ],
      },
      {
        subtitle: 'Métricas',
        items: [
          '**Total de lotes:** quantidade de listas importadas.',
          '**Aguardando distribuição:** leads ainda não distribuídos.',
          '**Leads convertidos:** leads transformados em clientes cativos.',
        ],
      },
    ],
  },
  {
    id: 'treinamentos',
    icon: GraduationCap,
    title: 'Capacitação',
    color: 'from-rose-500 to-rose-600',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-100',
    content: [
      {
        subtitle: 'O que é a plataforma de Capacitação?',
        text: 'Reúne todos os conteúdos de capacitação da equipe em um só lugar. Módulos organizados por tema com aulas em vídeo, PDF, texto, imagens ou links externos.',
      },
      {
        subtitle: 'Acessar e consumir aulas',
        steps: [
          'Clique em "Capacitação" no menu lateral.',
          'Clique em um módulo para expandir e ver as aulas.',
          'Clique em uma aula para abrir o conteúdo.',
          'Ao finalizar, clique em "Marcar como Concluída" para registrar progresso.',
        ],
      },
      {
        subtitle: 'Administração (admin)',
        text: 'Em Administrativo > Capacitação (Admin): crie módulos, adicione aulas, publique ou oculte conteúdos. O painel de Relatório de Progresso mostra o avanço de cada usuário.',
      },
      {
        subtitle: 'Notificações de novos conteúdos',
        text: 'Ao adicionar novo conteúdo a qualquer módulo, todos os usuários recebem um comunicado automático na plataforma.',
      },
    ],
  },
  {
    id: 'assistente-ia',
    icon: Bot,
    title: 'Jarvis — Assistente IA',
    color: 'from-blue-600 to-blue-700',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-100',
    content: [
      {
        subtitle: 'O que é o Jarvis?',
        text: 'Assistente de inteligência artificial disponível em todas as páginas no canto inferior direito. Pode ser arrastado livremente pela tela. Acessa dados da plataforma e da internet para responder perguntas, gerar relatórios e enviar mensagens.',
      },
      {
        subtitle: 'O que o Jarvis pode fazer',
        items: [
          '**Vendas e relatórios:** volumes, rankings, metas e geração de PDFs diretamente no chat.',
          '**Clientes e leads:** localizar clientes, checar histórico de interações.',
          '**Capacitação:** encontrar módulos, aulas e links para materiais.',
          '**Comissões e metas:** saldo de comissões, progresso individual.',
          '**Agenda de prospecção:** contatos agendados para hoje e próximos dias.',
          '**Busca na Web:** cotações, legislação e notícias do mercado financeiro em tempo real.',
          '**Envio de e-mails:** admin pode pedir ao Jarvis para enviar relatórios por e-mail.',
        ],
      },
      {
        subtitle: 'Mensagens do administrador',
        text: 'Admins podem enviar mensagens diretas a usuários via Jarvis. O avatar pisca em vermelho quando há mensagens não lidas.',
      },
      {
        subtitle: 'Privacidade',
        text: 'O Jarvis respeita as permissões da plataforma. Dados exclusivos de administradores não são expostos a usuários comuns.',
      },
    ],
  },
  {
    id: 'parcelas-vincendas',
    icon: CalendarClock,
    title: 'Parcelas Vincendas (Recebíveis)',
    color: 'from-amber-600 to-amber-700',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-100',
    content: [
      {
        subtitle: 'O que são Parcelas Vincendas?',
        text: 'Prestações do saldo restante de vendas parceladas. Ao registrar uma venda com múltiplas parcelas, o sistema cria automaticamente um registro por parcela para acompanhamento completo do ciclo de recebimento.',
      },
      {
        subtitle: 'Como funcionam',
        items: [
          '**Valor de Entrada:** conta imediatamente para a meta do mês do vendedor.',
          '**Saldo Restante:** dividido em parcelas mensais que aparecem em "Parcelas Vincendas" e contam para a meta somente quando efetivamente recebidas.',
          '**Parcelas vencidas:** exibidas com fundo vermelho e badge "Vencida" para ação prioritária.',
        ],
      },
      {
        subtitle: 'Registrar recebimento de parcela',
        steps: [
          'Na aba "Parcelas Vincendas" do Pipeline, localize a parcela.',
          'Clique no botão "Receber" (ícone de moeda verde).',
          'Confirme ou ajuste data e valor recebido.',
          'Clique em "Confirmar Recebimento".',
          'O sistema cria automaticamente uma Venda para o mês do recebimento com comissões.',
          'A parcela é marcada como "Recebida" e o registro no Pipeline é fechado.',
        ],
      },
      {
        subtitle: 'O que acontece automaticamente ao receber',
        items: [
          '**Venda gerada** com data do recebimento.',
          '**Meta atualizada** no mês de recebimento.',
          '**Comissões geradas** para vendedor e indicadores.',
          '**Pipeline fechado** automaticamente.',
          '**Parcela arquivada** com data e venda registradas.',
        ],
      },
    ],
  },
  {
    id: 'pipeline',
    icon: TrendingUp,
    title: 'Pipeline Comercial',
    color: 'from-indigo-600 to-indigo-700',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-100',
    content: [
      {
        subtitle: 'O que é o Pipeline?',
        text: 'Ferramenta de CRM para acompanhar prospecções e negociações em andamento. Organizado no formato kanban por temperatura de negociação.',
      },
      {
        subtitle: 'Temperaturas de negociação',
        items: [
          '🧊 **Frio:** prospecção inicial.',
          '🌤️ **Morno:** interesse demonstrado, negociação em andamento.',
          '🔥 **Quente:** alta probabilidade de fechamento.',
          '✅ **Fechado:** negócio concluído.',
          '❌ **Perdido:** negociação encerrada sem resultado.',
        ],
      },
      {
        subtitle: 'Criar nova prospecção',
        steps: [
          'Clique em "Nova Prospecção".',
          'Digite o nome no campo "Cliente / Prospect" — o sistema busca na base cadastrada.',
          'Se não existir, o sistema cria o cliente automaticamente ao salvar.',
          'Preencha Produto, Valor Estimado, Temperatura e Origem.',
          'Defina data prevista de fechamento e próximo contato (opcional).',
          'Clique em "Adicionar ao Pipeline".',
        ],
      },
      {
        subtitle: 'Converter prospecção',
        items: [
          '**Produtos sem contrato:** clique no ícone de carrinho (🛒). Cria rascunho de venda pré-preenchido em Vendas.',
          '**CONTA GLOBAL, CONTA INTERNACIONAL, DOLARIZE AQUI:** clique no ícone de documento (📜). Cria contrato em rascunho pré-preenchido em Contratos e marca o negócio como "Fechado".',
        ],
      },
      {
        subtitle: 'KPIs do Pipeline',
        items: [
          '**Negócios ativos:** total em andamento.',
          '**Em negociação:** soma dos valores estimados não fechados.',
          '**Fechados:** quantidade e volume de negócios fechados.',
        ],
      },
      {
        subtitle: 'Integração Pipeline ↔ Contratos ↔ Vendas',
        items: [
          '**Pipeline → Contratos:** converter prospecção cria contrato em rascunho pré-preenchido.',
          '**Contratos → Vendas:** após concluir o fluxo, "Enviar para Vendas" gera a venda final.',
          '**Vendas → Pipeline (parcelas):** venda parcelada cria cards de parcelas no Pipeline automaticamente.',
          '**Pipeline → Vendas (parcelas):** receber parcela no Pipeline cria nova venda com comissões.',
        ],
      },
      {
        subtitle: 'Relatório PDF do Pipeline',
        text: 'Clique em "Relatório PDF" para gerar documento com todos os negócios filtrados, KPIs e tabela detalhada por negócio.',
      },
    ],
  },
  {
    id: 'contratos',
    icon: ScrollText,
    title: 'Contratos',
    color: 'from-amber-700 to-amber-800',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    content: [
      {
        subtitle: 'Tipos de contrato disponíveis',
        items: [
          '**Conta Global:** conta em moeda estrangeira para câmbio e investimentos internacionais.',
          '**Conta Internacional:** conta internacional com transações em múltiplas moedas.',
          '**Dolarize Aqui:** dolarização de ativos e proteção patrimonial em dólar.',
          '**ROF, Canal Bancário, Offshore:** demais tipos disponíveis no sistema.',
        ],
      },
      {
        subtitle: 'Criar um novo contrato',
        steps: [
          'Acesse "Contratos" > clique no tipo desejado.',
          'Busque um cliente já cadastrado para preencher automaticamente (ou arraste da barra lateral).',
          'Preencha as abas: Dados Pessoais, Endereço, Financeiro e Obs. & Data.',
          'Na aba Financeiro: Valor de Adesão, Valor da Parcela e número de parcelas — o Valor Total é calculado automaticamente.',
          'Clique em "Salvar Contrato". O cliente é criado em "Meus Clientes" se ainda não existir.',
          'Administradores são notificados automaticamente via Jarvis, Notificações e e-mail.',
        ],
      },
      {
        subtitle: 'Fluxo de etapas do contrato',
        items: [
          '**Rascunho:** contrato criado, sem PDF gerado.',
          '**PDF Gerado:** PDF gerado e baixado.',
          '**Assinado:** gerente anexa contrato assinado pelo cliente.',
          '**Aguardando Pagamento:** admin adiciona boleto ou link de pagamento.',
          '**Pago:** gerente anexa comprovante e informa origem do pagamento.',
          '**No Pipeline / Vendas:** após pagamento, "Enviar para Vendas" finaliza a venda.',
        ],
      },
      {
        subtitle: 'Gerar PDF do contrato',
        steps: [
          'Abra o visualizador (ícone de olho 👁️).',
          'Clique em "Gerar PDF".',
          'O PDF é preenchido automaticamente com todos os dados e baixado.',
          'O status avança para "PDF Gerado".',
        ],
      },
      {
        subtitle: 'Link de assinatura online',
        text: 'Após criar o contrato, o administrador adiciona o link de assinatura online no painel destacado do visualizador. O gerente copia ou acessa o link para encaminhar ao cliente. Contratos sem link exibem "Link pendente" na listagem.',
      },
      {
        subtitle: 'Enviar contrato para Vendas',
        text: 'Após assinatura + pagamento confirmado (comprovante anexado), clique em "Enviar para Vendas". O sistema cria uma venda pré-preenchida com os dados do contrato e redireciona para Vendas para finalizar comissões e indicadores.',
      },
      {
        subtitle: 'Indicadores em contratos',
        text: 'É possível vincular indicadores/espelhamentos diretamente ao contrato na aba correspondente do formulário. Esses dados são pré-carregados quando o contrato é enviado para Vendas.',
      },
      {
        subtitle: 'Filtros e busca',
        items: [
          '**Busca:** por nome do cliente ou CPF/CNPJ.',
          '**Tipo:** filtre por tipo de contrato.',
          '**Status:** Rascunho, PDF Gerado, Assinado, Aguardando Pagamento, Pago, No Pipeline.',
          'Admins veem contratos de toda a equipe; gerentes veem apenas os seus.',
        ],
      },
    ],
  },
  {
    id: 'comunicados',
    icon: Megaphone,
    title: 'Comunicados',
    color: 'from-yellow-500 to-yellow-600',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-100',
    content: [
      {
        subtitle: 'O que são Comunicados?',
        text: 'Avisos publicados pelos administradores para toda a equipe. Aparecem automaticamente como modal ao acessar a plataforma.',
      },
      {
        subtitle: 'Receber um comunicado',
        text: 'Ao acessar a plataforma, comunicados não lidos abrem automaticamente. Clique em "Li e Entendi" para confirmar. A confirmação é registrada no sistema.',
      },
      {
        subtitle: 'Criar e gerenciar comunicados (admin)',
        steps: [
          'Acesse Administrativo > Comunicados.',
          'Clique em "Novo Comunicado", preencha título e mensagem.',
          'Salve — publicado imediatamente para todos que ainda não viram.',
          'Ative/desative ou veja quem leu clicando no comunicado.',
        ],
      },
    ],
  },
  {
    id: 'notas-fiscais',
    icon: Receipt,
    title: 'Notas Fiscais',
    color: 'from-teal-600 to-teal-700',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-100',
    content: [
      {
        subtitle: 'O que é o módulo de Notas Fiscais?',
        text: 'Módulo administrativo para controle do ciclo de emissão, envio e pagamento de notas fiscais.',
      },
      {
        subtitle: 'Criar registro de NF',
        steps: [
          'Acesse Administrativo > Notas Fiscais.',
          'Clique em "Nova NF".',
          'Preencha Cliente/Parceiro, Valor Líquido, Produto, Data de Emissão e ID de Cobrança.',
          'Opcionalmente, faça upload do Mapa de Produção.',
          'Salve o registro.',
        ],
      },
      {
        subtitle: 'Ciclo de vida da NF',
        items: [
          '**Solicitada:** nota solicitada ao emissor.',
          '**Enviada:** NF enviada ao cliente. Faça upload do arquivo PDF.',
          '**Paga:** pagamento confirmado — o sistema cria automaticamente uma Venda vinculada.',
        ],
      },
      {
        subtitle: 'Relatório PDF de NFs',
        text: 'Gera documento com todas as notas do período filtrado, totais por status e valor acumulado.',
      },
    ],
  },
];

function Section({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  return (
    <div className={`rounded-2xl border ${section.border} overflow-hidden shadow-sm transition-shadow hover:shadow-md`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 p-5 text-left transition-colors ${isOpen ? section.bg : 'bg-white hover:bg-gray-50/60'}`}
      >
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${section.color} shadow-sm`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className={`flex-1 font-semibold text-sm ${isOpen ? section.text : 'text-gray-800'}`}>{section.title}</span>
        <div className={`p-1 rounded-lg transition-colors ${isOpen ? 'bg-white/60' : 'bg-gray-100'}`}>
          {isOpen
            ? <ChevronDown className={`w-4 h-4 ${section.text}`} />
            : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-7 pt-3 space-y-6 bg-white">
          {section.content.map((block, i) => (
            <div key={i} className="group">
              <h4 className={`font-semibold text-sm mb-2.5 flex items-center gap-2 ${section.text}`}>
                <span className={`w-1.5 h-4 rounded-full bg-gradient-to-b ${section.color} flex-shrink-0`} />
                {block.subtitle}
              </h4>
              {block.text && (
                <p className="text-sm text-gray-600 leading-relaxed ml-3.5">{block.text}</p>
              )}
              {block.steps && (
                <ol className="ml-3.5 space-y-2">
                  {block.steps.map((step, si) => (
                    <li key={si} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${section.color} text-white text-[10px] font-bold flex items-center justify-center mt-0.5 shadow-sm`}>
                        {si + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {block.items && (
                <ul className="ml-3.5 space-y-2">
                  {block.items.map((item, ii) => (
                    <li key={ii} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${section.text} opacity-70`} />
                      <span
                        className="leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') }}
                      />
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

export default function Manual() {
  const [openSections, setOpenSections] = useState(['introducao']);
  const [search, setSearch] = useState('');

  const toggle = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const expandAll = () => setOpenSections(sections.map(s => s.id));
  const collapseAll = () => setOpenSections([]);

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
    : sections;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header premium */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1e35 40%, #1a3150 70%, #1e3d63 100%)' }}>
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)' }} />

          <div className="relative p-8 md:p-10">
            <div className="flex items-start gap-5 mb-6">
              <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-blue-300/60 text-[10px] uppercase tracking-[0.3em] font-semibold mb-1">Villela Exchange</div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Manual da Plataforma</h1>
                <p className="text-blue-200/60 text-sm mt-1.5">Gestão Comercial — Guia completo de utilização</p>
              </div>
            </div>

            <p className="text-blue-100/70 text-sm leading-relaxed max-w-2xl mb-7">
              Documentação completa de todas as funcionalidades: Vendas, Contratos, Pipeline, Comissões,
              Relatórios, Prospecção, Capacitação e muito mais. Atualizado com as últimas funcionalidades do sistema.
            </p>

            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Seções', value: sections.length },
                { label: 'Tópicos', value: sections.reduce((a, s) => a + s.content.length, 0) },
                { label: 'Atualizado', value: 'Mai/2026' },
              ].map(k => (
                <div key={k.label} className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 text-center">
                  <p className="text-xl font-bold text-white">{k.value}</p>
                  <p className="text-[10px] text-blue-300/50 uppercase tracking-widest mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search + Quick nav */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar no manual..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-gray-50/50"
              />
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                Navegação Rápida
              </h3>
              <div className="flex gap-3">
                <button onClick={expandAll} className="text-xs text-[#1a3150] hover:underline font-medium">Expandir tudo</button>
                <span className="text-gray-200">|</span>
                <button onClick={collapseAll} className="text-xs text-gray-400 hover:underline">Recolher</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sections.map(s => {
                const Icon = s.icon;
                const isOpen = openSections.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (!openSections.includes(s.id)) {
                        setOpenSections(prev => [...prev, s.id]);
                      }
                      setTimeout(() => {
                        document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                      isOpen
                        ? `bg-gradient-to-r ${s.color} text-white border-transparent shadow-sm`
                        : 'bg-gray-50 text-gray-600 border-gray-150 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info tip */}
        <div className="flex items-start gap-3 bg-blue-50/80 border border-blue-100 rounded-xl p-4">
          <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            <strong>Dica:</strong> Usuários não-administradores visualizam apenas os menus liberados pelo admin e somente seus próprios dados de vendas e comissões.
            Use a busca acima para encontrar rapidamente qualquer funcionalidade.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-2.5">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Nenhuma seção encontrada para "<strong>{search}</strong>"</p>
            </div>
          ) : (
            filteredSections.map(section => (
              <div key={section.id} id={`section-${section.id}`}>
                <Section
                  section={section}
                  isOpen={openSections.includes(section.id)}
                  onToggle={() => toggle(section.id)}
                />
              </div>
            ))
          )}
        </div>

        <div className="text-center py-6 text-xs text-gray-300 tracking-wider">
          VILLELA EXCHANGE · GESTÃO COMERCIAL · MANUAL DA PLATAFORMA · MAI/2026
        </div>
      </div>
    </div>
  );
}