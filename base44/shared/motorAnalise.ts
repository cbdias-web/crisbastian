import { PRODUTOS_ESTUDO, checklistDocumentos } from './estudoViabilidade.ts';
import { REFERENCIA_HONORARIOS, SCHEMA_ANALISE, CONDICOES_GERAIS_PADRAO } from './propostaTecnica.ts';

// Motor de IA da Análise Técnica (prompt, chamada e normalização).
const CONTEXTO_PRODUTO: Record<string, string> = {
  holding: `HOLDING (patrimonial, familiar/sucessória, de participações, SPE). Considere, quando pertinente:
- Integralização de imóveis ao capital: imunidade de ITBI (CF art. 156 §2º, I) e suas exceções (atividade imobiliária preponderante; STF Tema 796 sobre valor excedente ao capital); opção entre valor declarado no IR e valor de mercado (ganho de capital).
- Tributação de aluguéis na PJ (lucro presumido) vs. carnê-leão na PF (até 27,5%); efeitos da Reforma Tributária (EC 132/2023, LC 214/2025: IBS/CBS sobre locação e venda de imóveis na transição) e ITCMD progressivo.
- Sucessão: doação de quotas com reserva de usufruto, cláusulas de incomunicabilidade, impenhorabilidade, inalienabilidade e reversão; acordo de sócios/protocolo familiar; regime de bens do casal.
- Limites: estruturação não pode configurar fraude contra credores ou à execução, nem abuso de personalidade jurídica (CC art. 50). Se houver débitos, processos ou bloqueios, trate isso como risco central e sequencie a regularização (a banca do Grupo Villela é especializada em recuperação tributária).`,
  offshore: `OFFSHORE / ESTRUTURA INTERNACIONAL. Considere, quando pertinente:
- Escolha de jurisdição e veículo (LLC EUA — Delaware/Wyoming/Flórida, BVI, Cayman, Panamá, Uruguai, UE) conforme finalidade: proteção patrimonial, investimentos, operação comercial, sucessão.
- Tributação no Brasil de entidades controladas no exterior e trusts (Lei 14.754/2023: regime de tributação anual de lucros de offshores, opção de transparência fiscal, trusts), declaração no IRPF e DCBE ao Banco Central (marco cambial Lei 14.286/2021).
- Compliance internacional: KYC/PLD, beneficiário final, CRS/FATCA, obrigações de reporte da jurisdição escolhida e custos de manutenção anual.
- Residência fiscal, substância econômica e risco de recaracterização.`,
  conta_internacional: `CONTA INTERNACIONAL (Dolarize Villela Exchange: conta global multimoedas, canais bancários internacionais, conta digital com escrow account para mitigar bloqueios e penhoras). Considere, quando pertinente:
- Finalidade (dolarização do caixa, recebimentos/pagamentos internacionais, investimentos, escrow), volume e moedas.
- Marco cambial (Lei 14.286/2021), declaração no IRPF e DCBE quando aplicável, tributação de aplicações financeiras no exterior (Lei 14.754/2023).
- Processo de onboarding/KYC, documentação de origem de recursos, titulares e assinantes, prazos de abertura.
- Uso do escrow e da custódia sempre dentro da legalidade, sem frustrar direitos de credores.`,
};

function resumoRespostas(estudo: any) {
  const r = estudo.respostas || {};
  const linhas: string[] = [];
  for (const [k, v] of Object.entries(r)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    linhas.push(`- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  }
  return linhas.join('\n');
}

function docsInfo(estudo: any) {
  const cl = checklistDocumentos(estudo.produto, estudo.tipo_cliente);
  const docs = estudo.documentos || [];
  return cl.map((c: any) => {
    const n = docs.filter((d: any) => d.tipo === c.tipo).length;
    return `- ${c.descricao}: ${n > 0 ? `${n} arquivo(s) recebido(s)` : (c.obrigatorio ? 'NÃO ENVIADO (obrigatório)' : 'não enviado')}`;
  }).join('\n');
}

export function urlsAnalisaveis(estudo: any) {
  return (estudo.documentos || [])
    .filter((d: any) => d.url && /\.(pdf|png|jpe?g|webp)(\?|$)/i.test(d.nome_arquivo || d.url))
    .slice(0, 10)
    .map((d: any) => d.url);
}

export function montarPrompt(estudo: any, base?: any, motivo?: string, instrucoes?: string) {
  const prod = (PRODUTOS_ESTUDO as any)[estudo.produto];
  const ref = (REFERENCIA_HONORARIOS as any)[estudo.produto] || [];
  const refTxt = ref.map((x: any) => `- ${x.escopo}: ${x.recorrente ? 'recorrente' : 'pontual'} ${x.min || x.max ? `R$ ${x.min.toLocaleString('pt-BR')} a R$ ${x.max.toLocaleString('pt-BR')}` : (x.observacao || '')}`).join('\n');

  let p = `Você é o motor de Análise Técnica da Villela Exchange (razão social RNC — Rede Nacional de Câmbio), vertical financeira do Grupo Villela, banca especializada em recuperação tributária. Sua tarefa é avaliar a viabilidade e redigir o conteúdo de uma PROPOSTA TÉCNICA EXECUTIVA para o cliente abaixo, no padrão das propostas de consultoria da RNC: rigor técnico com leitura executiva, plano em etapas com prazos e investimento em faixas por etapa, success fee opcional quando fizer sentido e autoria atribuída à "equipe técnica RNC".

PRODUTO DO ESTUDO: ${prod?.titulo} (${estudo.tipo_cliente === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'})
CLIENTE: ${estudo.cliente_nome || ''}

DIRETRIZES TÉCNICAS DO PRODUTO:
${CONTEXTO_PRODUTO[estudo.produto] || ''}

RESPOSTAS DO FORMULÁRIO DO CLIENTE (chave: valor):
${resumoRespostas(estudo) || '(sem respostas)'}

SITUAÇÃO DOS DOCUMENTOS:
${docsInfo(estudo)}
Os documentos em PDF/imagem estão anexados para leitura: extraia deles dados relevantes (bens, valores declarados, faturamento, regime, quadro societário, endividamento) e cite-os no diagnóstico.

TABELA DE REFERÊNCIA DE HONORÁRIOS DA RNC (balize as faixas de investimento por etapa por ela; a soma das etapas deve ser coerente com a complexidade):
${refTxt}

OBSERVAÇÕES INTERNAS DO CONSULTOR: ${estudo.observacoes_internas || '—'}

REGRAS DE REDAÇÃO:
- Português do Brasil, tom executivo, claro e consultivo; frases objetivas; sem jargão desnecessário.
- NÃO invente fatos, números ou documentos. Quando uma informação faltar, registre-a em "premissas" e/ou "documentos_pendentes" e em notas_internas.informacoes_faltantes.
- Score de viabilidade 0-100 considerando: aderência entre objetivos e solução, patrimônio/escala vs. custo, riscos jurídico-fiscais (débitos, processos, bloqueios), completude documental e prazo desejado.
- Profundidade mínima: diagnóstico com 5 ou mais achados; riscos com 4 ou mais itens; benefícios com 4 ou mais; próximos passos com 4 ou mais; premissas com 3 ou mais; alternativas com 2 ou mais. Use os números informados pelo cliente (valores de mercado vs. valores no IR, renda de aluguéis, débitos) para quantificar impactos e estimativas de economia quando possível, deixando claro que são estimativas.
- Linguagem: use "proteção patrimonial" e "organização patrimonial"; não use "blindagem".
- Etapas: OBRIGATORIAMENTE de 4 a 6 fases sequenciais (ex.: Diagnóstico e planejamento → Constituição/estruturação → Transferência/integralização ou abertura → Governança/sucessão → Acompanhamento), cada uma com objetivo, atividades, entregáveis, prazo em dias corridos e faixa de honorários (investimento_min/investimento_max em BRL, números inteiros).
- Custos de terceiros (ITBI, ITCMD, cartórios, juntas, agentes no exterior) vão em custos_recorrentes ou premissas, nunca somados aos honorários.
- Riscos com nível e mitigação concreta. Diagnóstico com impacto.
- base_legal: liste apenas normas efetivamente pertinentes.
- notas_internas: são apenas para o time comercial (não vão ao cliente): pontos de atenção, objeções prováveis, argumentos de venda, alertas de compliance.`;

  if (base) {
    p += `

ESTA É UMA REVISÃO. Versão anterior (v${base.versao}) da proposta, em JSON:
${JSON.stringify({ score: base.score_viabilidade, classificacao: base.classificacao, conteudo: base.conteudo }).slice(0, 30000)}

MOTIVO DA REVISÃO / MUDANÇA NA NEGOCIAÇÃO: ${motivo || '—'}
INSTRUÇÕES ESPECÍFICAS: ${instrucoes || '—'}
Mantenha o que continua válido, ajuste o que a mudança exige (escopo, etapas, prazos, faixas, riscos) e reflita a mudança no sumário executivo de forma natural (sem mencionar "versão anterior").`;
  }
  return p;
}

// Modelo usado na análise técnica (raciocínio jurídico-tributário + leitura de documentos).
// Precisa aceitar o JSON Schema completo e responder dentro do limite de tempo das funções.
export const MODELO_ANALISE = 'gemini_3_1_pro';

export async function chamarIA(base44: any, prompt: string, fileUrls: string[]) {
  const exec = (files?: string[], model?: string) => base44.integrations.Core.InvokeLLM({
    prompt,
    model,
    file_urls: files && files.length ? files : undefined,
    response_json_schema: SCHEMA_ANALISE,
  });
  const valido = (o: any) => o && o.conteudo && (o.conteudo.sumario_executivo || (o.conteudo.etapas || []).length);
  const tentativas: [string[] | undefined, string | undefined][] = [
    [fileUrls, MODELO_ANALISE], [undefined, MODELO_ANALISE], [undefined, undefined],
  ];
  let ultimoErro: unknown;
  for (const [f, m] of tentativas) {
    if (f === undefined && m === MODELO_ANALISE && !(fileUrls || []).length && tentativas[0][1] === m && ultimoErro === undefined) continue;
    try {
      const res = await exec(f, m);
      const out = typeof res === 'string' ? JSON.parse(res) : res;
      if (valido(out)) { out._modelo = m || 'default'; out._com_arquivos = !!(f && f.length); out._erro_anterior = ultimoErro ? String((ultimoErro as Error).message || ultimoErro).slice(0, 300) : ''; return out; }
    } catch (e) { ultimoErro = e; }
  }
  throw ultimoErro || new Error('Falha no motor de IA');
}

// Garante classificação válida (alta | media | baixa | inviavel), derivando do score se preciso.
export function normClassificacao(c: any, score: number) {
  const v = String(c || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (['alta', 'media', 'baixa', 'inviavel'].includes(v)) return v;
  return score >= 75 ? 'alta' : score >= 55 ? 'media' : score >= 35 ? 'baixa' : 'inviavel';
}
