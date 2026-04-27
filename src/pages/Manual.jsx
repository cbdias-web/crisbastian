import { useState } from 'react';
import { BookOpen, ChevronRight, ChevronDown, ShoppingCart, BarChart3, Package, Users, DollarSign, Target, FileText, Upload, AlertTriangle, Star, Info, CheckCircle2, ArrowRight, Briefcase, Calendar, CalendarClock, TrendingUp, GraduationCap, Bot, Megaphone, Receipt, ScrollText } from 'lucide-react';

const sections = [
  {
    id: 'introducao',
    icon: BookOpen,
    title: 'Introdução à Plataforma',
    color: 'bg-blue-50 text-blue-600',
    border: 'border-blue-200',
    content: [
      {
        subtitle: 'O que é o Villela Exchange – Gestão Comercial?',
        text: 'O sistema de Gestão Comercial da Villela Exchange é uma plataforma completa para registro, acompanhamento e análise de vendas, comissões, metas e indicadores da equipe comercial.',
      },
      {
        subtitle: 'Acesso e Login',
        text: 'O acesso é feito por convite do administrador. Após receber o e-mail de convite, crie sua senha e entre na plataforma. Suas permissões de menu são definidas pelo administrador.',
      },
      {
        subtitle: 'Perfil do Usuário',
        text: 'Clique no seu nome no canto superior direito do Dashboard para acessar seu perfil. Você pode alterar seu nome de tratamento (como aparece no sistema) e atualizar sua foto de avatar.',
      },
    ],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Dashboard',
    color: 'bg-indigo-50 text-indigo-600',
    border: 'border-indigo-200',
    content: [
      {
        subtitle: 'Visão Geral',
        text: 'O Dashboard apresenta os principais indicadores de desempenho da operação em tempo real: total vendido no período, número de vendas, comissão gerada, ticket médio e vendedores ativos.',
      },
      {
        subtitle: 'Filtros',
        text: 'Use os filtros de data (início e fim), vendedor e produto para refinar os dados exibidos. Os KPIs e gráficos se atualizam automaticamente conforme os filtros aplicados.',
      },
      {
        subtitle: 'Meta do Time',
        text: 'Exibe o progresso da meta mensal da equipe. A barra de progresso muda de cor conforme o percentual atingido: vermelho (abaixo de 40%), amarelo (40–69%), azul (70–99%) e verde (100%+).',
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
        text: 'Exibe as 8 vendas mais recentes do período filtrado com cliente, vendedor, data e valor.',
      },
    ],
  },
  {
    id: 'vendas',
    icon: ShoppingCart,
    title: 'Gestão de Vendas',
    color: 'bg-emerald-50 text-emerald-600',
    border: 'border-emerald-200',
    content: [
      {
        subtitle: 'Como registrar uma nova venda',
        steps: [
          'Acesse o menu "Vendas" na barra lateral.',
          'Clique em "Nova Venda" no canto superior direito.',
          'Selecione o Produto, Vendedor, Data e preencha os demais campos.',
          'Informe o Cliente (nome e CPF/CNPJ). Se o cliente já estiver cadastrado, ele aparecerá na lista.',
          'Defina o percentual de comissão do vendedor.',
          'Adicione Indicadores (espelhamentos) se houver — clique em "+ Indicador" e informe o percentual.',
          'Clique em "Salvar". As comissões são calculadas automaticamente.',
        ],
      },
      {
        subtitle: 'Editar uma venda',
        text: 'Clique no ícone de lápis (✏️) na linha da venda desejada. O formulário abrirá em modal suspenso. Faça as alterações e clique em "Salvar". As comissões serão recalculadas automaticamente.',
      },
      {
        subtitle: 'Excluir uma venda',
        text: 'Clique no ícone de lixeira (🗑️) na linha da venda. Confirme a exclusão. Todas as comissões associadas à venda também serão removidas automaticamente.',
      },
      {
        subtitle: 'Filtros de vendas',
        text: 'Use os filtros de data, vendedor e produto para refinar a listagem. O total acumulado do período filtrado é exibido no contador superior.',
      },
      {
        subtitle: 'Exportar dados',
        text: 'Clique em "Vendas" ou "Clientes" para exportar os dados filtrados em formato CSV, compatível com Excel.',
      },
      {
        subtitle: 'Relatório PDF de vendas',
        text: 'Clique em "Relatório PDF" para gerar um documento com todas as vendas do período filtrado, incluindo totais e detalhamento por transação.',
      },
      {
        subtitle: 'Importar histórico',
        text: 'Use o botão "Importar Histórico" para carregar vendas em lote via planilha CSV ou Excel. Siga o modelo sugerido pelo sistema para garantir a importação correta.',
      },
      {
        subtitle: 'Link Bitrix',
        text: 'Se a venda possuir link do Bitrix, o ícone de link externo aparecerá na linha. Clique para abrir o registro no CRM.',
      },
      {
        subtitle: 'Jornada completa de uma venda — do registro ao pagamento',
        text: 'Entender o ciclo completo é fundamental para garantir que comissões, metas e relatórios estejam sempre corretos.',
      },
      {
        subtitle: 'Etapa 1 – Pré-requisitos antes de registrar',
        items: [
          '**Produto cadastrado e ativo** em Produtos — sem produto ativo, ele não aparece no formulário.',
          '**Vendedor cadastrado** em Vendedores com percentual de comissão definido.',
          '**Indicadores cadastrados** em Indicadores, caso haja espelhamento na venda.',
          '**Meta do mês configurada** em Metas para que o progresso seja exibido corretamente.',
        ],
      },
      {
        subtitle: 'Etapa 2 – Registro da venda passo a passo',
        steps: [
          'Acesse Vendas > clique em Nova Venda.',
          'Selecione o Produto (apenas ativos aparecem na lista).',
          'Informe a Data da venda.',
          'Selecione o Vendedor responsável — o percentual de comissão padrão é carregado automaticamente.',
          'Preencha Cliente (nome) e CPF/CNPJ. Clientes já cadastrados aparecem como sugestão.',
          'Informe o Valor da venda e a Forma de Pagamento.',
          'Adicione Indicadores se houver: clique em + Indicador, selecione e defina o percentual de cada um.',
          'Se o total de espelhamento ultrapassar 30%, uma notificação é enviada aos admins para autorização.',
          'Preencha campos opcionais: link Bitrix, observações, parcelamento.',
          'Clique em Salvar.',
        ],
      },
      {
        subtitle: 'Etapa 3 – O que acontece automaticamente ao salvar',
        items: [
          '**Comissão do vendedor** é gerada sobre o valor de entrada (ou total, se à vista).',
          '**Comissões dos indicadores** são geradas: cada indicador recebe proporcionalmente ao seu percentual.',
          '**Cliente é vinculado ao vendedor** (carteira de clientes) — se não existia, é criado automaticamente.',
          '**Dashboard e meta são atualizados** — apenas o Valor de Entrada conta para a meta do mês atual.',
          '**Parcelas são criadas automaticamente** em "Parcelas Vincendas" para o saldo restante de vendas parceladas.',
          '**Registro no Pipeline** é criado automaticamente para cada parcela gerada, permitindo acompanhamento individual.',
        ],
      },
      {
        subtitle: 'Etapa 4 – Acompanhamento pós-venda',
        items: [
          'Acesse Comissões para visualizar os valores gerados e o status de pagamento.',
          'Acesse Vendedores e selecione o mês para ver o progresso de meta e volume.',
          'Monitore o Dashboard para acompanhar o desempenho geral da equipe.',
          'Gere o relatório PDF individual do vendedor para conferência dos valores.',
        ],
      },
      {
        subtitle: 'Etapa 5 – Conferência e pagamento das comissões',
        steps: [
          'Acesse Comissões e filtre o período desejado.',
          'Verifique os valores de comissão de cada vendedor.',
          'Gere ou envie o relatório PDF por e-mail para o vendedor conferir.',
          'Após efetuar o pagamento, marque as comissões como pagas no sistema.',
          'Comissões pagas ficam destacadas em verde e saem do saldo pendente.',
        ],
      },
      {
        subtitle: 'Implicações e cuidados importantes',
        items: [
          '**Excluir uma venda remove todas as comissões vinculadas** (vendedor e indicadores). Use com cuidado.',
          '**Editar o valor de uma venda recalcula as comissões automaticamente.** Confira os valores antes de salvar.',
          '**O percentual definido na venda prevalece** sobre o percentual padrão cadastrado no vendedor.',
          '**Indicadores acima de 30% requerem autorização** do administrador antes de concluir o registro.',
          '**O produto impacta os filtros** do Dashboard e relatórios — mantenha o cadastro atualizado.',
          '**Bônus automático é gerado** ao atingir 100% da meta, apenas se o valor de bônus estiver configurado na Meta.',
          '**Em vendas parceladas, apenas a entrada conta para a meta do mês atual.** Cada parcela conta para a meta do mês em que for recebida.',
          '**Parcelas são gerenciadas no Pipeline > aba "Parcelas Vincendas".** Acompanhe vencimentos e registre recebimentos por lá.',
          '**Ao receber uma parcela, uma nova Venda é criada automaticamente** com comissões calculadas sobre o valor recebido.',
        ],
      },
    ],
  },
  {
    id: 'comissoes',
    icon: DollarSign,
    title: 'Comissões',
    color: 'bg-amber-50 text-amber-600',
    border: 'border-amber-200',
    content: [
      {
        subtitle: 'Como as comissões são geradas',
        text: 'As comissões são criadas automaticamente ao registrar uma venda. O valor é calculado aplicando o percentual de comissão definido sobre o valor da venda.',
      },
      {
        subtitle: 'Tipos de comissão',
        items: [
          '**Comissão normal:** gerada automaticamente para o vendedor responsável pela venda.',
          '**Comissão de indicador (espelhamento):** gerada para indicadores vinculados à venda, registrada na tabela de espelhamentos.',
          '**Bônus:** valor adicional concedido manualmente pelo administrador ou automaticamente ao atingir 100% da meta individual.',
        ],
      },
      {
        subtitle: 'Marcar comissão como paga',
        text: 'Na página de Comissões, utilize o controle de pagamento para marcar individualmente ou em lote as comissões como pagas. Comissões pagas ficam destacadas em verde.',
      },
      {
        subtitle: 'Bônus por meta',
        text: 'Quando um vendedor atinge 100% de sua meta individual, o sistema pode gerar um bônus automaticamente (se configurado). O administrador também pode conceder bônus manuais diretamente na página de Vendedores, clicando no ícone "$" do vendedor.',
      },
      {
        subtitle: 'Excluir comissão',
        text: 'Comissões podem ser excluídas individualmente na página de Comissões. Atenção: excluir uma venda remove automaticamente todas as comissões vinculadas.',
      },
    ],
  },
  {
    id: 'metas',
    icon: Target,
    title: 'Metas',
    color: 'bg-violet-50 text-violet-600',
    border: 'border-violet-200',
    content: [
      {
        subtitle: 'Tipos de meta',
        items: [
          '**Individual:** definida por vendedor e mês. Aparece no card do vendedor como barra de progresso.',
          '**Time:** meta para um time específico.',
          '**Equipe:** meta global da equipe inteira, exibida no Dashboard.',
        ],
      },
      {
        subtitle: 'Criar uma meta',
        steps: [
          'Acesse o menu "Metas".',
          'Clique em "Nova Meta".',
          'Selecione o tipo (Individual, Time ou Equipe).',
          'Para meta individual, selecione o vendedor.',
          'Defina o mês de referência (formato YYYY-MM), o valor da meta e o valor do bônus (opcional).',
          'Clique em "Salvar".',
        ],
      },
      {
        subtitle: 'Acompanhamento',
        text: 'O progresso das metas individuais é exibido nos cards de cada vendedor na página Vendedores, com barra de progresso colorida. A meta do time aparece no Dashboard principal.',
      },
      {
        subtitle: 'Bônus por meta',
        text: 'Ao cadastrar uma meta, você pode definir um valor de bônus que será concedido automaticamente quando o vendedor atingir 100% do objetivo.',
      },
    ],
  },
  {
    id: 'vendedores',
    icon: Users,
    title: 'Vendedores',
    color: 'bg-sky-50 text-sky-600',
    border: 'border-sky-200',
    content: [
      {
        subtitle: 'Cadastrar vendedor',
        steps: [
          'Acesse o menu "Vendedores".',
          'Clique em "Novo Vendedor".',
          'Preencha nome, e-mail, time e percentual de comissão padrão.',
          'Defina o status (Ativo/Inativo) e clique em "Salvar".',
        ],
      },
      {
        subtitle: 'Cards de vendedores',
        text: 'Cada vendedor exibe: número de vendas no mês, volume financeiro, percentual de comissão, barra de progresso da meta (quando configurada) e status.',
      },
      {
        subtitle: 'Filtro por mês',
        text: 'Use o seletor de mês no topo da página para visualizar os dados de qualquer mês passado ou atual.',
      },
      {
        subtitle: 'Bônus manual',
        text: 'Clique no ícone "$" no card do vendedor para conceder ou editar um bônus manual para o mês selecionado.',
      },
      {
        subtitle: 'Relatório individual',
        text: 'Clique no ícone de documento (📄) para gerar o relatório PDF do vendedor no período selecionado.',
      },
      {
        subtitle: 'Envio de relatório por e-mail',
        text: 'Clique no ícone de avião (✈️) para enviar o relatório por e-mail ao vendedor. Use "Enviar Relatórios" para envio em massa com seleção de destinatários.',
      },
      {
        subtitle: 'Permissão Admin',
        text: 'O checkbox "Admin" no card do vendedor concede permissão administrativa ao usuário correspondente (desde que tenha e-mail cadastrado e conta criada).',
      },
    ],
  },
  {
    id: 'indicadores',
    icon: Users,
    title: 'Indicadores (Espelhamentos)',
    color: 'bg-pink-50 text-pink-600',
    border: 'border-pink-200',
    content: [
      {
        subtitle: 'O que são indicadores?',
        text: 'Indicadores (ou espelhamentos) são pessoas externas à equipe de vendas que indicam clientes e recebem uma comissão pelo negócio fechado. Eles são vinculados às vendas no momento do registro.',
      },
      {
        subtitle: 'Cadastrar indicador',
        steps: [
          'Acesse o menu "Indicadores".',
          'Clique em "Novo Indicador".',
          'Preencha nome, e-mail, telefone e percentual de comissão padrão.',
          'Clique em "Salvar".',
        ],
      },
      {
        subtitle: 'Vincular indicador a uma venda',
        text: 'Ao registrar ou editar uma venda, clique em "+ Indicador" e selecione o indicador desejado, ajustando o percentual. Você pode adicionar múltiplos indicadores por venda.',
      },
      {
        subtitle: 'Alerta de espelhamento acima de 30%',
        text: 'Se o total de espelhamento de uma venda ultrapassar 30%, o sistema envia uma notificação automática aos administradores para autorização antes de finalizar o registro.',
      },
      {
        subtitle: 'Relatórios de indicadores',
        text: 'Assim como vendedores, indicadores possuem relatório PDF individual e envio por e-mail diretamente da página de Indicadores.',
      },
    ],
  },
  {
    id: 'produtos',
    icon: Package,
    title: 'Produtos',
    color: 'bg-orange-50 text-orange-600',
    border: 'border-orange-200',
    content: [
      {
        subtitle: 'Gerenciar produtos',
        text: 'Acesse o menu "Produtos" para visualizar, criar, editar ou desativar os produtos comercializados pela equipe.',
      },
      {
        subtitle: 'Cadastrar produto',
        steps: [
          'Clique em "Novo Produto".',
          'Informe o nome, categoria e status (Ativo/Inativo).',
          'Clique em "Salvar".',
        ],
      },
      {
        subtitle: 'Uso em vendas',
        text: 'Os produtos cadastrados aparecem no seletor do formulário de nova venda. Apenas produtos ativos são listados. O filtro de produto também está disponível no Dashboard e na listagem de Vendas.',
      },
    ],
  },
  {
    id: 'relatorios',
    icon: FileText,
    title: 'Relatórios',
    color: 'bg-teal-50 text-teal-600',
    border: 'border-teal-200',
    content: [
      {
        subtitle: 'Relatório de Comissões (menu Relatório)',
        text: 'Acesse pelo menu "Relatório" para gerar relatórios consolidados de comissões de vendedores e indicadores. Selecione o período, os destinatários e gere em PDF ou envie diretamente por e-mail.',
      },
      {
        subtitle: 'Relatório individual do vendedor',
        text: 'Disponível na página Vendedores, no card de cada vendedor (ícone 📄). Gera um PDF com todas as vendas, comissões e bônus do período selecionado.',
      },
      {
        subtitle: 'Relatório de vendas',
        text: 'Disponível na página Vendas (botão "Relatório PDF"). Gera um resumo de todas as transações do período filtrado.',
      },
      {
        subtitle: 'Conteúdo do relatório de comissões',
        items: [
          'Resumo financeiro: total de comissões, valor pago, valor pendente.',
          'Listagem detalhada de cada venda com data, cliente, produto, valor e comissão.',
          'Bônus concedidos no período.',
          'Layout profissional com identidade visual da Villela Exchange.',
        ],
      },
      {
        subtitle: 'Envio por e-mail',
        text: 'Os relatórios podem ser enviados automaticamente por e-mail para vendedores e indicadores. Use "Enviar Relatórios" na página de Vendedores ou Indicadores para envio em massa com rastreamento de envios realizados.',
      },
    ],
  },
  {
    id: 'importar',
    icon: Upload,
    title: 'Importação de Dados',
    color: 'bg-cyan-50 text-cyan-600',
    border: 'border-cyan-200',
    content: [
      {
        subtitle: 'Como importar histórico de vendas',
        steps: [
          'Acesse o menu "Importar" ou use o botão "Importar Histórico" na página de Vendas.',
          'Faça o upload de um arquivo CSV ou Excel (.xlsx).',
          'O sistema irá mapear automaticamente as colunas reconhecidas.',
          'Verifique o preview dos dados antes de confirmar.',
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
    color: 'bg-red-50 text-red-600',
    border: 'border-red-200',
    content: [
      {
        subtitle: 'Alerta de espelhamento acima de 30%',
        text: 'Quando o percentual total de indicadores em uma venda ultrapassa 30%, o sistema bloqueia o registro e envia uma notificação automática por e-mail para todos os administradores.',
      },
      {
        subtitle: 'Página de Notificações',
        text: 'Administradores têm acesso ao menu "Notificações" onde podem visualizar, aprovar ou rejeitar as solicitações pendentes. O ícone na barra lateral exibe um badge vermelho com o número de pendências.',
      },
      {
        subtitle: 'Fluxo de autorização',
        steps: [
          'Vendedor tenta registrar venda com espelhamento > 30%.',
          'Sistema envia notificação por e-mail aos administradores.',
          'Administrador acessa "Notificações" e aprova ou rejeita.',
          'Vendedor pode então registrar a venda normalmente.',
        ],
      },
    ],
  },
  {
    id: 'usuarios',
    icon: Users,
    title: 'Gestão de Usuários',
    color: 'bg-slate-50 text-slate-600',
    border: 'border-slate-200',
    content: [
      {
        subtitle: 'Convidar novo usuário',
        steps: [
          'Acesse "Usuários" no menu inferior da barra lateral (apenas admins).',
          'Clique em "Convidar Usuário".',
          'Preencha nome, e-mail e tipo de acesso (Usuário Padrão ou Administrador).',
          'Clique em "Enviar Convite". O usuário receberá um e-mail com link para criar a senha.',
        ],
      },
      {
        subtitle: 'Configurar acessos',
        text: 'Após o primeiro acesso do usuário, o administrador pode configurar quais menus ele pode visualizar clicando em "Editar Acessos" no card do usuário.',
      },
      {
        subtitle: 'Permissões',
        items: [
          '**Administrador:** acesso total a todos os menus e dados de todos os vendedores.',
          '**Usuário padrão:** acesso somente aos menus liberados pelo admin, visualizando apenas seus próprios dados.',
        ],
      },
    ],
  },
  {
    id: 'relatorio-interacoes',
    icon: FileText,
    title: 'Relatório de Interações',
    color: 'bg-cyan-50 text-cyan-600',
    border: 'border-cyan-200',
    content: [
      {
        subtitle: 'Visão geral',
        text: 'O Relatório de Interações centraliza todos os contatos realizados com clientes e leads, permitindo acompanhamento detalhado de cada interação, resultado e próximos passos.',
      },
      {
        subtitle: 'Acessar o relatório',
        text: 'Clique no menu "Rel. Interações" na barra lateral. Administradores veem todas as interações; usuários padrão veem apenas suas interações.',
      },
      {
        subtitle: 'Filtros disponíveis',
        items: [
          '**Data início/fim:** filtre interações por período.',
          '**Vendedor (admin):** veja as interações de um vendedor específico ou de todos.',
          '**Resultado:** filtre por Positivo, Neutro, Negativo ou Sem resposta.',
          '**Tipo:** filtre por tipo de contato (Ligação, WhatsApp, E-mail, Reunião, Visita, Outro).',
          '**Busca livre:** procure por cliente, vendedor ou descrição da interação.',
        ],
      },
      {
        subtitle: 'Gráfico de produtividade',
        text: 'Para administradores: um gráfico de barras mostra o total de interações por vendedor, com destaque para interações positivas e negativas, facilitando análise de desempenho.',
      },
      {
        subtitle: 'Visualizar perfil do cliente',
        text: 'Clique no nome do cliente ou no ícone de olho (👁️) para abrir o perfil completo com todos os dados cadastrais, histórico de interações e próximos contatos agendados.',
      },
      {
        subtitle: 'Editar interação no relatório',
        text: 'Na tabela de detalhamento, clique no ícone de lápis (✏️) para editar tipo, resultado, data, descrição e próximo contato. Permissões: gerentes editam apenas suas interações; administradores editam qualquer uma.',
      },
      {
        subtitle: 'Salvar cliente em "Meus Clientes"',
        text: 'No modal do perfil, clique em "Salvar em Meus Clientes" para transferir o cliente/lead para a carteira de um gerente específico (administrador seleciona qual gerente receberá).',
      },
      {
        subtitle: 'Exportar relatório',
        text: 'Clique em "Exportar PDF" para gerar um documento com todas as interações do período filtrado, incluindo gráficos, resumo por vendedor e listagem detalhada.',
      },
    ],
  },
  {
    id: 'meus-clientes',
    icon: Briefcase,
    title: 'Meus Clientes',
    color: 'bg-green-50 text-green-600',
    border: 'border-green-200',
    content: [
      {
        subtitle: 'O que é "Meus Clientes"?',
        text: 'Menu para visualizar, gerenciar e interagir com sua carteira de clientes e leads. Permite registro de interações diárias, acompanhamento de próximos contatos e conversão de leads em clientes cativos.',
      },
      {
        subtitle: 'Criar novo lead/prospect manualmente',
        text: 'Você pode agora incluir novos leads/prospects diretamente no sistema sem necessidade de importação. Clique no botão "Novo Lead/Prospect" (localizado na mesma linha do filtro de vendedores, no canto direito). Um modal será aberto para preenchimento dos dados básicos: nome completo, CPF/CNPJ, telefone e e-mail.',
      },
      {
        subtitle: 'Fluxo de criação de novo lead',
        steps: [
          'Clique em "Novo Lead/Prospect" na barra superior.',
          'Preencha o nome completo do lead (obrigatório).',
          'Opcionalmente, adicione CPF/CNPJ, telefone e e-mail.',
          'Clique em "Criar e Registrar Interação".',
          'O lead é criado automaticamente vinculado a você como gerente (origem: nativo).',
          'O sistema abre imediatamente a jornada de "Nova Interação" para registro do primeiro contato.',
          'Preencha os detalhes da interação (tipo, resultado, data, descrição, etc.) e salve.',
          'O lead fica armazenado em sua carteira para futuras interações.',
        ],
      },
      {
        subtitle: 'Visão geral da carteira',
        text: 'Exibe lista de todos os clientes e leads atribuídos a você (ou que você gerencia), com contador total, filtro por tipo (Clientes, Leads) e busca por nome/CPF.',
      },
      {
        subtitle: 'Expandir cliente para ver detalhes',
        steps: [
          'Clique em qualquer cliente/lead para expandir e ver: dados cadastrais, histórico completo de interações e próximos contatos agendados.',
          'Você também pode editar o cadastro do cliente clicando no ícone de lápis (✏️).',
        ],
      },
      {
        subtitle: 'Registrar nova interação',
        text: 'Clique em "Nova Interação" no cliente expandido. Preencha todos os campos obrigatórios: Nome completo, CPF/CNPJ, Telefone, E-mail, Tipo de contato, Descrição e Resultado. Opcionalmente, marque a data do próximo contato e selecione os produtos abordados na conversa (seleção múltipla em colunas).',
      },
      {
        subtitle: 'Editar interação registrada',
        text: 'No histórico de interações do cliente, clique no ícone de lápis (✏️) para editar tipo, resultado, data, descrição e próximo contato. Gerentes só podem editar suas próprias interações; administradores podem editar qualquer uma.',
      },
      {
        subtitle: 'Tipos de interação',
        items: [
          'Ligação, WhatsApp, E-mail, Reunião, Visita, Outro — escolha o tipo mais apropriado.',
        ],
      },
      {
        subtitle: 'Resultado da interação',
        items: [
          '**Positivo:** cliente mostrou interesse.',
          '**Neutro:** conversação normal, sem compromisso aparente.',
          '**Negativo:** cliente recusou ou desinteressado.',
          '**Sem resposta:** cliente não atendeu ou não respondeu.',
        ],
      },
      {
        subtitle: 'Converter lead em cliente cativo',
        text: 'Quando um lead (origem "Lead") possui histórico de interações e cadastro completo (Nome, CPF/CNPJ, Telefone), clique em "Converter em Cliente" para transformá-lo em cliente permanente na carteira.',
      },
      {
        subtitle: 'Agenda diária de contatos',
        text: 'Na sua carteira de clientes, uma seção "Agenda de Contatos — Leads" mostra os leads agendados para contato diário, ordenados por data. Marque como "Realizado", "Não atendeu" ou "Reagendar" conforme o resultado de cada contato.',
      },
      {
        subtitle: 'Editar cadastro do cliente',
        steps: [
          'Clique no ícone de lápis (✏️) ao expandir o cliente.',
          'Atualize: Nome, CPF/CNPJ, Telefone, E-mail, Cidade, Estado e Observações.',
          'Clique em "Salvar". As informações serão atualizadas instantaneamente.',
        ],
      },
      {
        subtitle: 'Devolver leads não convertidos',
        text: 'Para usuários com múltiplos leads: selecione os leads (checkbox) que deseja devolver para "Não Distribuídos", facilitando redistribuição posterior pelo administrador.',
      },
      {
        subtitle: 'Seleção em lote (admin)',
        text: 'Se você for administrador, pode selecionar múltiplos clientes para: trocar de gerente responsável, devolver leads não convertidos ou excluir registros em lote.',
      },
    ],
  },
  {
    id: 'prospecccao',
    icon: TrendingUp,
    title: 'Prospecção — Novos Leads',
    color: 'bg-purple-50 text-purple-600',
    border: 'border-purple-200',
    content: [
      {
        subtitle: 'O que é o menu Prospecção?',
        text: 'Menu administrativo para importar listas de novos leads em lote, distribuir entre gerentes/vendedores e acompanhar o progresso de conversão de leads em clientes.',
      },
      {
        subtitle: 'Importar lista de leads',
        steps: [
          'Clique em "Importar Lista" no menu Prospecção.',
          'Faça upload de um arquivo CSV ou Excel com colunas: Nome, CPF/CNPJ, Telefone.',
          'Nomeie o lote (ex: "Lista SP - Março 2026").',
          'Verifique o preview dos leads a serem importados.',
          'Clique em "Importar". Os leads serão salvos como "Pendentes de Distribuição".',
        ],
      },
      {
        subtitle: 'Distribuir leads entre gerentes',
        steps: [
          'Selecione um lote de status "Pendente" e clique em "Distribuir".',
          'Escolha os gerentes/vendedores que receberão os leads (seleção múltipla).',
          'O sistema embaralha e distribui automaticamente entre os selecionados.',
          'Cada lead é transferido para "Meus Clientes" do gerente respectivo.',
          'Uma agenda de contatos é gerada automaticamente (até 5 contatos por dia).',
        ],
      },
      {
        subtitle: 'Acompanhar conversão',
        text: 'Para cada lote, veja em tempo real: total de leads, pendentes, distribuídos, convertidos e em tratamento. Uma barra de progresso mostra o percentual de conversão.',
      },
      {
        subtitle: 'Redistribuir leads não convertidos',
        text: 'Se alguns leads de um lote não foram convertidos após certo período, use "Redistribuir" para remover da carteira anterior e realocar para outros gerentes.',
      },
      {
        subtitle: 'Remover duplicados',
        text: 'Clique em "Remover Duplicados" para eliminar automaticamente leads duplicados (mesmo CPF/CNPJ ou nome) que nunca foram contactados. Leads com histórico de interação são preservados.',
      },
      {
        subtitle: 'Métricas e KPIs',
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
    title: 'Treinamentos',
    color: 'bg-rose-50 text-rose-600',
    border: 'border-rose-200',
    content: [
      {
        subtitle: 'O que é a plataforma de Treinamentos?',
        text: 'A plataforma de treinamentos reúne todos os conteúdos de capacitação da equipe em um só lugar. Os módulos são organizados por tema e podem conter aulas em vídeo, PDF, texto, imagens ou links externos.',
      },
      {
        subtitle: 'Acessar treinamentos',
        text: 'Clique em "Treinamentos" no menu lateral. Você verá todos os módulos publicados, com barra de progresso individual mostrando quantas aulas já foram concluídas em cada módulo.',
      },
      {
        subtitle: 'Assistir/consumir uma aula',
        steps: [
          'Clique em um módulo para expandir e ver suas aulas.',
          'Clique em uma aula para abrir o conteúdo (vídeo, PDF, texto, imagem ou link).',
          'Ao finalizar, clique em "Marcar como Concluída" para registrar seu progresso.',
          'A barra de progresso do módulo e da plataforma é atualizada automaticamente.',
        ],
      },
      {
        subtitle: 'Tipos de conteúdo disponíveis',
        items: [
          '**Vídeo:** reprodução direta na plataforma (upload ou link YouTube/Vimeo).',
          '**PDF:** visualização inline ou download do arquivo.',
          '**Texto:** conteúdo formatado diretamente na tela.',
          '**Imagem:** arquivo de imagem exibido na tela.',
          '**Link:** redirecionamento para um recurso externo.',
        ],
      },
      {
        subtitle: 'Notificações de novos conteúdos',
        text: 'Sempre que um novo conteúdo for adicionado a qualquer módulo, você receberá automaticamente um comunicado na plataforma para ficar atualizado.',
      },
      {
        subtitle: 'Administração de treinamentos (admin)',
        text: 'Administradores acessam "Treinamentos" no menu Administrativo para criar módulos, adicionar aulas e publicar ou ocultar conteúdos. O painel de Relatório de Progresso mostra o avanço de cada usuário em cada módulo.',
      },
      {
        subtitle: 'Criar módulo (admin)',
        steps: [
          'Acesse Administrativo > Treinamentos.',
          'Clique em "Novo Módulo" e preencha: Título, Descrição, Categoria, Ordem e Imagem de capa.',
          'Salve o módulo e clique nele para expandi-lo.',
          'Clique em "Adicionar Aula" e preencha: Título, Tipo de conteúdo, arquivo/URL, Descrição e Duração.',
          'Publique o módulo clicando em "Publicar" — módulos ocultos não aparecem para os usuários.',
        ],
      },
      {
        subtitle: 'Relatório de progresso (admin)',
        text: 'Em Treinamentos > Relatório de Progresso, selecione os usuários desejados e gere um relatório detalhado com: aulas concluídas por usuário, percentual de conclusão por módulo e progresso geral da equipe.',
      },
    ],
  },
  {
    id: 'assistente-ia',
    icon: Bot,
    title: 'Jarvis — Assistente IA',
    color: 'bg-blue-50 text-blue-600',
    border: 'border-blue-200',
    content: [
      {
        subtitle: 'O que é o Jarvis?',
        text: 'O Jarvis é o assistente de inteligência artificial da Villela Exchange. Ele fica disponível em todas as páginas da plataforma, no canto inferior direito da tela, podendo ser movido livremente pela tela (arraste o avatar). Ele acessa dados da plataforma e da internet para responder perguntas, gerar relatórios e enviar mensagens.',
      },
      {
        subtitle: 'Como acessar',
        text: 'Clique no avatar do Jarvis (robô) no canto inferior direito de qualquer página. O chat abre em um painel flutuante. O avatar pode ser arrastado para qualquer posição — inclusive em dispositivos móveis (toque e arraste).',
      },
      {
        subtitle: 'O que o Jarvis pode fazer',
        items: [
          '**Vendas e relatórios:** consultar volumes de venda, rankings, metas e gerar relatórios PDF automaticamente.',
          '**Clientes e leads:** localizar clientes, checar histórico de interações e leads não convertidos.',
          '**Treinamentos:** encontrar módulos, aulas e fornecer links diretos para documentos e PDFs.',
          '**Produtos e comunicados:** informar detalhes sobre produtos e resumir comunicados publicados.',
          '**Comissões e metas:** consultar saldo de comissões, metas do mês e progresso individual.',
          '**Agenda de prospecção:** mostrar contatos agendados para hoje e próximos dias.',
          '**Busca na Web:** pesquisar cotações, legislação, notícias do mercado financeiro em tempo real.',
          '**Envio de e-mails:** o administrador pode pedir ao Jarvis para enviar relatórios ou mensagens por e-mail.',
        ],
      },
      {
        subtitle: 'Mensagens do administrador via Jarvis',
        text: 'Administradores podem enviar mensagens diretamente para usuários específicos através do Jarvis. Quando você recebe uma mensagem, o avatar pisca em vermelho e exibe o número de mensagens não lidas. Clique no avatar para ler e marcar como lida — o admin recebe confirmação automática por e-mail.',
      },
      {
        subtitle: 'Gerar relatórios PDF pelo chat',
        text: 'Pergunte ao Jarvis: "Gere o relatório de comissões de [Vendedor] de [mês]" e ele cria e apresenta um botão de download do PDF diretamente no chat, sem precisar navegar para outras páginas.',
      },
      {
        subtitle: 'Nova conversa e histórico',
        text: 'O Jarvis mantém contexto durante a sessão. Clique no "+" no cabeçalho do chat para iniciar uma nova conversa limpa. Conversas antigas ficam inativas automaticamente após 30 minutos de inatividade ou ao trocar de dia.',
      },
      {
        subtitle: 'Sugestões rápidas',
        text: 'Ao abrir o chat, o Jarvis exibe sugestões de perguntas comuns. Após cada resposta, novas sugestões contextuais aparecem para facilitar a navegação por outros tópicos.',
      },
      {
        subtitle: 'Busca na web',
        text: 'Quando sua pergunta envolve informações externas (cotações, legislação, notícias do mercado), o assistente busca na internet e apresenta as respostas com links para as fontes consultadas.',
      },
      {
        subtitle: 'Privacidade e acesso',
        text: 'O Jarvis respeita as permissões da plataforma: acessa apenas informações disponíveis para seu perfil. Dados exclusivos de administradores não são expostos a usuários comuns.',
      },
    ],
  },
  {
    id: 'parcelas-vincendas',
    icon: CalendarClock,
    title: 'Parcelas Vincendas (Recebíveis)',
    color: 'bg-amber-50 text-amber-600',
    border: 'border-amber-200',
    content: [
      {
        subtitle: 'O que são Parcelas Vincendas?',
        text: 'Parcelas Vincendas são prestações do saldo restante de vendas parceladas. Quando uma venda é registrada com múltiplas parcelas, o sistema cria automaticamente um registro de cada parcela para acompanhamento completo do ciclo de recebimento.',
      },
      {
        subtitle: 'Como funcionam as parcelas geradas',
        text: 'Ao registrar uma venda parcelada (ex: Entrada + 3x), o sistema separa claramente dois fluxos: (1) o Valor de Entrada conta imediatamente para a meta do mês do vendedor; (2) o Saldo Restante é dividido em parcelas mensais que aparecem em "Parcelas Vincendas" e só contam para a meta quando efetivamente recebidas.',
      },
      {
        subtitle: 'Acessar Parcelas Vincendas',
        text: 'No Pipeline Comercial, clique na aba "Parcelas Vincendas" (ícone de calendário com relógio) para visualizar todas as parcelas pendentes. O badge ao lado do botão indica a quantidade de parcelas em aberto.',
      },
      {
        subtitle: 'Estrutura de pagamento ao registrar uma venda parcelada',
        steps: [
          'Acesse Vendas > Nova Venda e preencha os dados normais.',
          'Informe o Valor Total do Contrato (entrada + todas as parcelas).',
          'Selecione o número de parcelas do saldo restante no seletor (Ex: "Entrada + 3x de R$ X").',
          'Defina o Valor de Entrada — este valor conta para a meta do mês atual imediatamente.',
          'O sistema divide o Saldo Restante (Total − Entrada) automaticamente entre as parcelas.',
          'Ajuste manualmente o valor e a data de vencimento de cada parcela, se necessário.',
          'Um indicador mostra se os valores distribuídos estão corretos (✓ Valores OK).',
          'Ao salvar, as parcelas são criadas automaticamente no sistema e vinculadas ao Pipeline.',
        ],
      },
      {
        subtitle: 'Sincronizar / Atualizar parcelas',
        text: 'Clique no botão "Atualizar" na aba "Parcelas Vincendas" para sincronizar e criar automaticamente as parcelas de vendas que não as geraram (ex: vendas importadas via planilha ou registradas antes desta funcionalidade).',
      },
      {
        subtitle: 'Registrar recebimento de uma parcela',
        steps: [
          'Na tabela de "Parcelas Vincendas", localize a parcela a receber.',
          'Clique no botão "Receber" (ícone de moeda verde).',
          'Um modal de confirmação é exibido com os dados da parcela.',
          'Confirme ou ajuste a data de recebimento e o valor recebido (útil se houve desconto ou juros).',
          'Clique em "Confirmar Recebimento".',
          'O sistema cria automaticamente uma Venda para o mês do recebimento, gerando comissões para o vendedor e indicadores.',
          'A parcela é marcada como "Recebida" com data e venda gerada registradas.',
          'O registro no Pipeline Comercial é automaticamente marcado como "Fechado".',
        ],
      },
      {
        subtitle: 'Gerenciar parcelas via modal avançado',
        text: 'Clique em "Gerenciar / Editar" (ícone de engrenagem) na aba "Parcelas Vincendas" para abrir o modal de gestão completa. Nele é possível editar valor e vencimento de cada parcela, excluir parcelas individualmente, e registrar recebimentos com valores personalizados. Administradores veem todas as parcelas; gerentes veem apenas as suas.',
      },
      {
        subtitle: 'KPIs de Parcelas Vincendas',
        items: [
          '**Total de parcelas pendentes:** quantidade de parcelas ainda não recebidas — exibido em badge na aba.',
          '**Valor total a receber:** soma financeira de todas as parcelas pendentes.',
          '**Parcelas vencidas:** parcelas com data de vencimento no passado aparecem com fundo vermelho e badge "Vencida" para ação prioritária.',
          '**Por gerente:** ao filtrar por gerente no Pipeline, o card "💰 Parcelas a Receber" mostra o total específico daquele gerente.',
        ],
      },
      {
        subtitle: 'O que acontece automaticamente ao receber uma parcela',
        items: [
          '**Venda gerada:** uma nova Venda é criada com a data do recebimento, vinculando ao vendedor e produto originais.',
          '**Meta atualizada:** o valor recebido entra na meta do mês de recebimento (não do mês da venda original).',
          '**Comissões geradas:** comissão do vendedor e dos indicadores são calculadas e criadas automaticamente.',
          '**Pipeline fechado:** o registro do Pipeline vinculado é movido para "Fechado" automaticamente.',
          '**Parcela arquivada:** o status da parcela muda para "Recebida" com data e venda registradas para rastreabilidade.',
        ],
      },
      {
        subtitle: 'Parcelas no kanban do Pipeline',
        text: 'Negócios no Pipeline que correspondem a parcelas vincendas são marcados com o badge "💰 PARCELA" em fundo âmbar. O ícone de moeda ($) no hover do card permite registrar o recebimento diretamente do kanban sem precisar ir à aba de Parcelas Vincendas.',
      },
    ],
  },
  {
    id: 'pipeline',
    icon: TrendingUp,
    title: 'Pipeline Comercial',
    color: 'bg-indigo-50 text-indigo-600',
    border: 'border-indigo-200',
    content: [
      {
        subtitle: 'O que é o Pipeline?',
        text: 'O Pipeline Comercial é uma ferramenta de CRM pessoal para gerentes e vendedores acompanharem prospecções e negociações em andamento. Organizado no formato kanban por temperatura de negociação, permite rastrear cada oportunidade do primeiro contato até o fechamento.',
      },
      {
        subtitle: 'Como acessar',
        text: 'Clique em "Pipeline" no bloco "Apoio" da barra lateral. Gerentes veem apenas suas prospecções; administradores têm visão de toda a equipe com filtro por gerente.',
      },
      {
        subtitle: 'Temperaturas de negociação',
        items: [
          '🧊 **Frio:** prospecção inicial, sem engajamento confirmado.',
          '🌤️ **Morno:** cliente demonstrou interesse, negociação em andamento.',
          '🔥 **Quente:** negociação avançada, alta probabilidade de fechamento.',
          '✅ **Fechado:** negócio concluído (gerado venda no sistema).',
          '❌ **Perdido:** negociação encerrada sem resultado.',
        ],
      },
      {
        subtitle: 'Criar nova prospecção',
        steps: [
          'Clique em "Nova Prospecção".',
          'No campo "Cliente / Prospect", comece a digitar o nome — o sistema busca automaticamente na base de clientes cadastrados.',
          'Se o cliente já existir, selecione-o — CPF/CNPJ e telefone são preenchidos automaticamente.',
          'Se não existir, digite o nome e o sistema exibirá a opção "Inserir como novo cliente". Ao salvar, o cliente é criado na base automaticamente.',
          'Preencha Produto, Valor Estimado, Temperatura e Origem.',
          'Opcionalmente, defina data prevista de fechamento e próximo contato.',
          'Adicione descrição dos próximos passos e observações.',
          'Clique em "Adicionar ao Pipeline".',
        ],
      },
      {
        subtitle: 'Editar prospecção',
        text: 'Passe o mouse sobre o card no kanban e clique no ícone de lápis (✏️) para abrir o formulário de edição com todos os campos preenchidos.',
      },
      {
        subtitle: 'Converter prospecção em venda',
        text: 'Quando uma negociação for fechada, clique no ícone de carrinho (🛒) no card da prospecção. O sistema cria automaticamente um rascunho de venda com os dados do pipeline (produto, cliente, valor, vendedor) e redireciona para a página de Vendas, onde você pode completar as informações de comissões, espelhamentos, forma de pagamento e outros detalhes.',
      },
      {
        subtitle: 'Filtros e busca',
        items: [
          '**Busca livre:** filtre por nome de cliente ou produto.',
          '**Temperatura:** clique em qualquer temperatura para filtrar apenas aquelas negociações.',
          '**Gerente (admin):** selecione um gerente específico ou visualize todos.',
        ],
      },
      {
        subtitle: 'KPIs do Pipeline',
        items: [
          '**Negócios ativos:** total de prospecções em andamento (exceto Perdidas).',
          '**Em negociação:** soma do valor estimado de negócios não fechados e não perdidos.',
          '**Fechados:** quantidade de negócios marcados como Fechado.',
          '**Volume fechado:** soma do valor estimado dos negócios Fechados.',
        ],
      },
      {
        subtitle: 'Relatório PDF do Pipeline',
        text: 'Clique em "Relatório PDF" para gerar um documento com todos os negócios filtrados, incluindo KPIs, tabela detalhada por negócio e data de geração. O documento abre para impressão diretamente no navegador.',
      },
    ],
  },
  {
    id: 'comunicados',
    icon: Megaphone,
    title: 'Comunicados',
    color: 'bg-amber-50 text-amber-600',
    border: 'border-amber-200',
    content: [
      {
        subtitle: 'O que são Comunicados?',
        text: 'Comunicados são avisos e informações importantes publicados pelos administradores para toda a equipe. Eles aparecem automaticamente como um modal ao acessar a plataforma, garantindo que todos leiam as novidades.',
      },
      {
        subtitle: 'Receber um comunicado',
        text: 'Ao acessar a plataforma, se houver um comunicado que você ainda não leu, ele abrirá automaticamente. Clique em "Li e Entendi" para confirmar a leitura e fechar o modal. A confirmação é registrada no sistema.',
      },
      {
        subtitle: 'Criar comunicado (admin)',
        steps: [
          'Acesse Administrativo > Comunicados.',
          'Clique em "Novo Comunicado".',
          'Preencha o Título e a Mensagem.',
          'Clique em "Salvar". O comunicado é publicado imediatamente para todos os usuários que ainda não o viram.',
        ],
      },
      {
        subtitle: 'Gerenciar comunicados (admin)',
        items: [
          '**Ativar/Desativar:** comunicados inativos não são exibidos para novos usuários.',
          '**Ver quem leu:** clique no comunicado para ver a lista de usuários que confirmaram a leitura e a data/hora.',
          '**Excluir:** remove o comunicado e todo o histórico de leituras associado.',
        ],
      },
    ],
  },
  {
    id: 'contratos',
    icon: ScrollText,
    title: 'Contratos',
    color: 'bg-amber-50 text-amber-700',
    border: 'border-amber-200',
    content: [
      {
        subtitle: 'O que é o módulo de Contratos?',
        text: 'O módulo de Contratos permite gerar, gerenciar e acompanhar contratos de clientes diretamente na plataforma. Estão disponíveis três tipos: Conta Global, Conta Internacional e Dolarize Aqui. O sistema preenche automaticamente um PDF com os dados do contrato, salva o cliente na carteira do gerente e notifica os administradores automaticamente.',
      },
      {
        subtitle: 'Tipos de contrato disponíveis',
        items: [
          '**Conta Global:** conta em moeda estrangeira para câmbio e investimentos internacionais.',
          '**Conta Internacional:** abertura de conta internacional com transações em múltiplas moedas.',
          '**Dolarize Aqui:** dolarização de ativos e proteção patrimonial em dólar americano.',
        ],
      },
      {
        subtitle: 'Criar um novo contrato',
        steps: [
          'Acesse o menu "Contratos" no bloco Apoio da barra lateral.',
          'Clique no card do tipo de contrato desejado (Conta Global, Conta Internacional ou Dolarize Aqui).',
          'Opcionalmente, busque um cliente já cadastrado na base pelo campo de pesquisa — os dados serão preenchidos automaticamente.',
          'Preencha as abas: Dados Pessoais, Endereço, Financeiro e Obs. & Data.',
          'Na aba Financeiro, informe: Valor de Adesão, Valor da Parcela e número de parcelas — o Valor Total é calculado automaticamente.',
          'Clique em "Salvar Contrato". O cliente é criado automaticamente na sua carteira (Meus Clientes) se ainda não existir.',
          'Ao salvar, os administradores são notificados automaticamente via Jarvis, aba de Notificações e e-mail para que adicionem o link de assinatura online.',
        ],
      },
      {
        subtitle: 'Notificação automática aos administradores',
        text: 'Sempre que um novo contrato é criado, o sistema dispara automaticamente três notificações para todos os administradores: (1) mensagem no Jarvis com os dados do contrato, (2) card na aba "Notificações" da plataforma com botão "Marcar como resolvido", e (3) e-mail com resumo completo e instrução de ação.',
      },
      {
        subtitle: 'Link de assinatura online',
        text: 'Após receber a notificação, o administrador deve acessar o contrato, abrir o visualizador e adicionar o link de assinatura online no painel destacado em amarelo. O gerente verá o link disponível no visualizador e poderá copiá-lo ou acessá-lo diretamente para encaminhar ao cliente. Contratos sem link exibem o aviso "Link pendente" na listagem.',
      },
      {
        subtitle: 'Gerar o PDF do contrato',
        steps: [
          'Na lista de contratos, clique no ícone de olho (👁️) para abrir o visualizador do contrato.',
          'Clique em "Gerar PDF".',
          'O sistema preenche automaticamente o PDF com todos os dados do contrato (nome, CPF/CNPJ, endereço, valores, datas, forma de pagamento, etc.).',
          'O arquivo é baixado automaticamente no seu dispositivo.',
          'O status do contrato é atualizado para "PDF Gerado".',
        ],
      },
      {
        subtitle: 'Status do contrato',
        items: [
          '**Rascunho:** contrato criado mas ainda sem PDF gerado.',
          '**PDF Gerado:** PDF foi gerado e baixado pelo menos uma vez.',
          '**Assinado:** marcado manualmente após confirmação de assinatura pelo cliente.',
          '**No Pipeline:** contrato enviado ao Pipeline Comercial como nova prospecção.',
        ],
      },
      {
        subtitle: 'Marcar como Assinado',
        text: 'Após o cliente assinar o contrato, abra o visualizador e clique em "Assinado". O status é atualizado para "Assinado" e fica registrado no histórico do contrato.',
      },
      {
        subtitle: 'Enviar contrato ao Pipeline',
        text: 'Clique em "Enviar ao Pipeline" no visualizador ou diretamente na lista de contratos (ícone de tendência 📈). O sistema cria automaticamente uma prospecção no Pipeline Comercial com os dados do cliente, produto (tipo de contrato), valor total e vendedor responsável, permitindo acompanhar a evolução do negócio.',
      },
      {
        subtitle: 'Editar contrato',
        text: 'Clique no ícone de lápis (✏️) na lista ou no botão "Editar" no visualizador para alterar qualquer campo do contrato. Após editar, gere novamente o PDF para atualizar o documento.',
      },
      {
        subtitle: 'Excluir contrato',
        text: 'Clique no ícone de lixeira (🗑️) na lista de contratos. O contrato é excluído permanentemente — o cliente cadastrado na carteira não é afetado.',
      },
      {
        subtitle: 'Filtros e busca',
        items: [
          '**Busca:** filtre por nome do cliente ou CPF/CNPJ.',
          '**Tipo:** filtre por Conta Global, Conta Internacional ou Dolarize Aqui.',
          '**Status:** filtre por Rascunho, PDF Gerado, Assinado ou No Pipeline.',
          'Administradores veem contratos de toda a equipe; gerentes veem apenas os seus.',
        ],
      },
      {
        subtitle: 'Cadastro automático do cliente na carteira',
        text: 'Ao salvar ou gerar o PDF de um contrato, o sistema verifica automaticamente se o cliente (pelo CPF/CNPJ) já existe na carteira. Se não existir, cria o cadastro automaticamente em "Meus Clientes" vinculado ao gerente responsável pelo contrato.',
      },
    ],
  },
  {
    id: 'notas-fiscais',
    icon: Receipt,
    title: 'Notas Fiscais',
    color: 'bg-teal-50 text-teal-600',
    border: 'border-teal-200',
    content: [
      {
        subtitle: 'O que é o módulo de Notas Fiscais?',
        text: 'Módulo administrativo para controle do ciclo de emissão, envio e pagamento de notas fiscais. Permite anexar o mapa de produção (origem), vincular a NF gerada, e acompanhar o status de cada nota.',
      },
      {
        subtitle: 'Criar registro de NF',
        steps: [
          'Acesse Administrativo > Notas Fiscais.',
          'Clique em "Nova NF".',
          'Preencha: Cliente/Parceiro, Valor Líquido, Produto, Data de Emissão e ID de Cobrança.',
          'Opcionalmente, faça upload do Mapa de Produção (PDF/planilha).',
          'Salve o registro.',
        ],
      },
      {
        subtitle: 'Ciclo de vida da NF',
        items: [
          '**Solicitada:** marque quando a nota foi solicitada ao contador/emissor.',
          '**Enviada:** marque quando a NF foi enviada ao cliente/parceiro. Faça upload do arquivo PDF da NF.',
          '**Paga:** marque quando o pagamento da NF for confirmado — o sistema cria automaticamente uma Venda vinculada a este registro.',
        ],
      },
      {
        subtitle: 'Relatório de NFs',
        text: 'Clique em "Relatório PDF" para gerar um documento com todas as notas do período filtrado, incluindo totais por status (pendente, enviada, paga) e valor acumulado.',
      },
      {
        subtitle: 'Filtros disponíveis',
        items: [
          '**Busca livre:** por cliente, produto ou ID de cobrança.',
          '**Data de emissão:** filtre por período.',
          '**Status:** Todas, Pendentes, Enviadas ou Pagas.',
        ],
      },
    ],
  },
];

function Section({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  return (
    <div className={`rounded-2xl border ${section.border} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition"
      >
        <div className={`p-2.5 rounded-xl ${section.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="flex-1 font-semibold text-gray-900 text-base">{section.title}</span>
        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 space-y-5 bg-white">
          {section.content.map((block, i) => (
            <div key={i}>
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {block.subtitle}
              </h4>
              {block.text && (
                <p className="text-sm text-gray-600 leading-relaxed ml-6">{block.text}</p>
              )}
              {block.steps && (
                <ol className="ml-6 space-y-1.5">
                  {block.steps.map((step, si) => (
                    <li key={si} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1a3150] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {si + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              )}
              {block.items && (
                <ul className="ml-6 space-y-1.5">
                  {block.items.map((item, ii) => (
                    <li key={ii} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
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

  const toggle = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const expandAll = () => setOpenSections(sections.map(s => s.id));
  const collapseAll = () => setOpenSections([]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0f1e35] to-[#1a3150] rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Manual da Plataforma</h1>
              <p className="text-blue-200/70 text-sm mt-1">Villela Exchange – Gestão Comercial</p>
            </div>
          </div>
          <p className="text-blue-100/80 text-sm leading-relaxed max-w-2xl">
            Guia completo para utilização de todas as funcionalidades do sistema. 
            Clique em cada seção para expandir o conteúdo.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold">{sections.length}</p>
              <p className="text-[10px] text-blue-200/60 uppercase tracking-wider">Seções</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold">{sections.reduce((a, s) => a + s.content.length, 0)}</p>
              <p className="text-[10px] text-blue-200/60 uppercase tracking-wider">Tópicos</p>
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Navegação Rápida
            </h3>
            <div className="flex gap-2">
              <button onClick={expandAll} className="text-xs text-blue-600 hover:underline">Expandir tudo</button>
              <span className="text-gray-300">·</span>
              <button onClick={collapseAll} className="text-xs text-gray-400 hover:underline">Recolher tudo</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {sections.map(s => {
              const Icon = s.icon;
              const isOpen = openSections.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    toggle(s.id);
                    setTimeout(() => {
                      document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    isOpen ? 'bg-[#1a3150] text-white border-[#1a3150]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            <strong>Dica:</strong> Usuários não-administradores visualizam apenas os menus liberados pelo admin e somente seus próprios dados de vendas e comissões.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map(section => (
            <div key={section.id} id={`section-${section.id}`}>
              <Section
                section={section}
                isOpen={openSections.includes(section.id)}
                onToggle={() => toggle(section.id)}
              />
            </div>
          ))}
        </div>

        <div className="text-center py-6 text-xs text-gray-400">
          Villela Exchange – Gestão Comercial · Manual da Plataforma
        </div>
      </div>
    </div>
  );
}