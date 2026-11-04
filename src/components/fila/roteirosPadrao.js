// Roteiros e FAQ padrão (fallback quando as entidades RoteiroProduto/FaqItem estão vazias)
// Roteiros fixos por produto (placeholder editável — ajuste o conteúdo com o time comercial).
export const ROTEIROS = {
  REATIVACAO: {
    nome: 'Cliente do Grupo (reativação)',
    pitch: `Abertura: "Oi [NOME], tudo bem? Aqui é [GERENTE], da Villela Exchange, vertical do Grupo Villela — o mesmo grupo com quem você já tem contrato.

Estou entrando em contato porque a Exchange cuida de proteção patrimonial e soluções em moeda forte para clientes do grupo, e achei que pode fazer sentido conversarmos rapidamente.

Perguntas de qualificação:
• Hoje você tem alguma operação ou conta fora do país?
• Já pensou em proteger parte do caixa/patrimônio em dólar?
• Posso te explicar em 2 minutos como funciona?

Ganchos: relacionamento já existente com o grupo, proteção patrimonial, simplicidade.
Importante: não prometa rentabilidade ou prazos; se o cliente pedir para não ser contatado, registre o opt-out.`,
    objecoes: ['"Já tenho banco/corretora"', '"Agora não tenho tempo"', '"Como vocês conseguiram meu contato?"', '"Quero pensar"'],
  },
  DOLARIZE: {
    nome: 'Dolarize',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange. Tudo bem?

Deixa eu te contextualizar: a Villela Exchange é a vertical do Grupo Villela que viabiliza e entrega soluções financeiras com engenharia técnica para clientes dos mais diversos perfis. O Grupo Villela tem mais de 20 anos em soluções financeiras e recuperação de empresas — câmbio e soluções internacionais são a vertente de negócios da Exchange.

Você foi indicado para o Dolarize — a forma mais simples de investir em dólar sem complicação.

Principais benefícios:
• Acesso ao dólar com starting price justo
• Sem burocracia de corretora tradicional
• Liquidez diária
• Ideal para proteger-se da volatilidade do real

Ganchos: proteção cambial, reserva em moeda forte, simplicidade.`,
    objecoes: ['"É seguro?"', '"Qual a rentabilidade?"', '"Qual o valor mínimo?"', '"Como funciona o resgate?"'],
  },
  'CONTA INTERNACIONAL': {
    nome: 'Conta Internacional',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

A Villela Exchange é a vertical do Grupo Villela que viabiliza soluções financeiras com engenharia técnica — o Grupo Villela tem mais de 20 anos em soluções financeiras e recuperação de empresas — câmbio e soluções internacionais são a vertente de negócios da Exchange.

Você foi indicado para a Conta Internacional — abrir uma conta nos EUA como residente no Brasil.

Diferenciais:
• Conta corrente/poupança em dólar nos EUA
• Cartão de débito internacional
• Remessas simplificadas
• Sem necessidade de ir aos EUA
• Estrutura para PF e PJ

Ganchos: dolarização de caixa, pagamentos internacionais, proteção patrimonial.`,
    objecoes: ['"Precisa ir aos EUA?"', '"Qual o valor mínimo de depósito?"', '"Tenho que declarar no IR?"', '"Quanto tempo leva?"'],
  },
  OFFSHORE: {
    nome: 'Offshore',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

A Villela Exchange é a vertical do Grupo Villela que entrega soluções financeiras com engenharia técnica — e proteção patrimonial é o nosso foco. O Grupo Villela tem mais de 20 anos em soluções financeiras e recuperação de empresas — câmbio e soluções internacionais são a vertente de negócios da Exchange.

Você foi indicado para estruturação Offshore — proteção patrimonial e planejamento sucessório internacional.

Diferenciais:
• Estrutura em jurisdição segura
• Holding patrimonial / sucessória
• Confidencialidade e proteção de ativos
• Acompanhamento jurídico e contábil

Ganchos: proteção patrimonial, sucessão facilitada, isolamento de risco, dolarização de estrutura.`,
    objecoes: ['"É legal?"', '"Qual custo?"', '"Preciso declarar?"', '"Quanto tempo para estruturar?"'],
  },
  RATING: {
    nome: 'Rating',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

Você foi indicado para o Rating — avaliação de crédito e rating empresarial para fortalecer o seu acesso a crédito e mercados.

Diferenciais:
• Rating independente reconhecido
• Relatório completo de análise
• Suporte em captação e negociação

Ganchos: acesso a crédito mais barato, credibilidade com fornecedores, negociação bancária.`,
    objecoes: ['"Quanto custa?"', '"Serve pra PJ pequena?"', '"Qual o prazo?"', '"Como é usado?"'],
  },
  'CANAL BANCÁRIO': {
    nome: 'Canal Bancário',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

Você foi indicado para o Canal Bancário — estrutura para operar valores em reais (PF ou PJ).

Diferenciais:
• Operação acima de R$ 270.000 em 12 meses
• Estrutura para PF e PJ
• Acompanhamento completo

Ganchos: capacidade operacional, proteção e estruturação financeira.`,
    objecoes: ['"Qual o limite?"', '"PF ou PJ?"', '"Qual custo?"', '"Como funciona?"'],
  },
  'HISTÓRIA DO GRUPO VILLELA': {
    nome: 'História do Grupo Villela',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

Deixa eu te contar quem somos: a Villela Exchange é a vertical do Grupo Villela que viabiliza e entrega soluções financeiras com engenharia técnica para clientes dos mais diversos perfis. O Grupo Villela tem mais de 20 anos em soluções financeiras e recuperação de empresas. Câmbio e soluções internacionais são a vertente de negócios da Exchange.

Quem somos:
• Especialistas em câmbio, remessas e investimentos no exterior
• Atendimento consultivo e personalizado
• Estrutura regulada e segura
• Rede de parceiros internacionais

Foco: proteção patrimonial — offshore, conta internacional e câmbio conversam diretamente com essa vertente.

Ganchos: solidez, expertise, acompanhamento próximo, soluções sob medida.`,
    objecoes: ['"Vocês são corretora?"', '"Têm selo do BC?"', '"Como ganham?"', '"Posso confiar?"'],
  },
};

export const DEFAULT_ROTEIRO = {
  nome: 'Abordagem Geral',
  pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange. Tudo bem?

Deixa eu te apresentar: a Villela Exchange é a vertical do Grupo Villela que viabiliza e entrega soluções financeiras com engenharia técnica para clientes dos mais diversos perfis. O Grupo Villela tem mais de 20 anos em soluções financeiras e recuperação de empresas — câmbio e soluções internacionais são a vertente de negócios da Exchange.

Nosso foco é proteção patrimonial — offshore, conta internacional e câmbio conversam diretamente com essa vertente. A Exchange possui diversas possibilidades de produtos.

Perguntas de qualificação:
• Já investe no exterior hoje?
• Qual o objetivo principal (proteção, pagamento, investimento)?
• Qual o prazo e valor aproximado?`,
  objecoes: ['"Já tenho corretora"', '"Não tenho urgência"', '"Quero pensar"', '"Qual o custo?"'],
};

// FAQ construído com base nos produtos e no material de capacitação do portal.
export const FAQ = [
  { cat: 'Institucional', q: 'Quem é a Villela Exchange?', a: 'A vertical do Grupo Villela que viabiliza e entrega soluções financeiras com engenharia técnica para clientes dos mais diversos perfis. O Grupo Villela tem mais de 20 anos em soluções financeiras e recuperação de empresas — câmbio e soluções internacionais são a vertente de negócios da Exchange.' },
  { cat: 'Institucional', q: 'Qual o foco da Exchange?', a: 'Câmbio e soluções internacionais são a vertente de negócios da Exchange, com foco em proteção patrimonial — offshore, conta internacional e câmbio conversam diretamente com essa vertente. A Exchange possui diversas possibilidades de produtos.' },
  { cat: 'Institucional', q: 'Vocês são corretora?', a: 'Não. Somos uma vertical consultiva que estrutura soluções financeiras sob medida, com engenharia técnica e acompanhamento jurídico e contábil.' },
  { cat: 'Institucional', q: 'É seguro? É regulado?', a: 'Atuamos com estrutura regulada e parceiros internacionais, sempre dentro da legalidade.' },
  { cat: 'Dolarize', q: 'O que é o Dolarize?', a: 'A forma mais simples de investir em dólar sem complicação, com starting price justo e liquidez diária.' },
  { cat: 'Dolarize', q: 'Preciso de corretora?', a: 'Não. Sem burocracia de corretora tradicional.' },
  { cat: 'Dolarize', q: 'Qual a vantagem?', a: 'Proteção cambial e reserva em moeda forte, ideal para diversificar e proteger-se da volatilidade do real.' },
  { cat: 'Conta Internacional', q: 'Precisa ir aos EUA?', a: 'Não. A abertura é feita do Brasil, para PF e PJ.' },
  { cat: 'Conta Internacional', q: 'Tenho que declarar no IR?', a: 'Sim. Operações no exterior devem ser declaradas — sua equipe contábil orienta.' },
  { cat: 'Conta Internacional', q: 'Quanto tempo leva?', a: 'Processo estruturado com acompanhamento completo do início ao fim.' },
  { cat: 'Offshore', q: 'É legal?', a: 'Sim. Estruturação legítima em jurisdições seguras para proteção patrimonial e planejamento sucessório.' },
  { cat: 'Offshore', q: 'Qual o custo?', a: 'Variável conforme a estrutura; apresentado em proposta personalizada.' },
  { cat: 'Offshore', q: 'Preciso declarar?', a: 'Sim, as obrigações declaratórias aplicam-se e são orientadas pela equipe.' },
  { cat: 'Canal Bancário', q: 'O que é?', a: 'Canal bancário para operar valores em reais, disponível para PF e PJ.' },
  { cat: 'Canal Bancário', q: 'Quando preciso?', a: 'Para operações superiores a R$ 270.000 no período de 12 meses.' },
  { cat: 'Garantias', q: 'O que é Garantias?', a: 'Administração de débitos com foco em proteção patrimonial.' },
  { cat: 'Rating', q: 'Para que serve o Rating?', a: 'Avaliação de crédito independente que fortalece o acesso a crédito e mercados.' },
  { cat: 'Rating', q: 'Serve para PJ pequena?', a: 'Sim, independente do porte — amplia credibilidade com fornecedores e bancos.' },
];

