import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { PRODUTOS_ESTUDO, checklistDocumentos } from '../../shared/estudoViabilidade.ts';
import { REFERENCIA_HONORARIOS, SCHEMA_ANALISE, SIGLA_PRODUTO, CONDICOES_GERAIS_PADRAO } from '../../shared/propostaTecnica.ts';

// Motor de Análise Técnica do Estudo de Viabilidade.
// Ações:
//   analisar      { estudo_id }                                  → gera nova versão (origem ia)
//   revisar       { estudo_id, proposta_id, motivo, instrucoes } → IA revisa a versão base (origem revisao_ia)
//   nova_versao   { proposta_id, motivo }                        → clona a versão para edição manual (origem manual)

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

function urlsAnalisaveis(estudo: any) {
  return (estudo.documentos || [])
    .filter((d: any) => d.url && /\.(pdf|png|jpe?g|webp)(\?|$)/i.test(d.nome_arquivo || d.url))
    .slice(0, 10)
    .map((d: any) => d.url);
}

function montarPrompt(estudo: any, base?: any, motivo?: string, instrucoes?: string) {
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
- Etapas: de 3 a 6 fases sequenciais (ex.: Diagnóstico e planejamento → Constituição/estruturação → Transferência/integralização ou abertura → Governança/sucessão → Acompanhamento), cada uma com objetivo, atividades, entregáveis, prazo em dias corridos e faixa de honorários (investimento_min/investimento_max em BRL, números inteiros).
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

async function chamarIA(base44: any, prompt: string, fileUrls: string[]) {
  const exec = (files?: string[]) => base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: files && files.length ? files : undefined,
    response_json_schema: SCHEMA_ANALISE,
  });
  let res;
  try { res = await exec(fileUrls); } catch (_e) { res = await exec(); }
  return typeof res === 'string' ? JSON.parse(res) : res;
}

function normalizarConteudo(c: any) {
  const conteudo = { ...(c || {}) };
  conteudo.etapas = (conteudo.etapas || []).map((e: any, i: number) => ({
    fase: e.fase || `Fase ${i + 1}`,
    titulo: e.titulo || '',
    objetivo: e.objetivo || '',
    atividades: e.atividades || [],
    entregaveis: e.entregaveis || [],
    prazo_dias: Math.max(0, Math.round(Number(e.prazo_dias) || 0)),
    investimento_min: Math.max(0, Math.round(Number(e.investimento_min) || 0)),
    investimento_max: Math.max(0, Math.round(Number(e.investimento_max) || 0)),
  }));
  if (!conteudo.condicoes_gerais) conteudo.condicoes_gerais = CONDICOES_GERAIS_PADRAO;
  return conteudo;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;
    const PT = base44.entities.PropostaTecnica;
    const EV = base44.entities.EstudoViabilidade;

    // ── nova versão manual (clone) ──
    if (action === 'nova_versao') {
      const base = await PT.get(body.proposta_id);
      if (!base) return Response.json({ error: 'Proposta não encontrada' }, { status: 404 });
      const estudo = await EV.get(base.estudo_id);
      return Response.json(await registrarVersao(base44, user, estudo, {
        origem: 'manual', motivo: body.motivo || '', base,
        score: base.score_viabilidade, classificacao: base.classificacao,
        conteudo: base.conteudo, notas: base.notas_internas_ia,
      }));
    }

    const estudo = await EV.get(body.estudo_id);
    if (!estudo) return Response.json({ error: 'Estudo não encontrado' }, { status: 404 });

    let base = null;
    if (action === 'revisar') {
      base = await PT.get(body.proposta_id);
      if (!base) return Response.json({ error: 'Versão base não encontrada' }, { status: 404 });
    } else if (action !== 'analisar') {
      return Response.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const prompt = montarPrompt(estudo, base, body.motivo, body.instrucoes);
    const out = await chamarIA(base44, prompt, urlsAnalisaveis(estudo));
    if (!out || !out.conteudo) return Response.json({ error: 'O motor de IA não retornou uma análise válida. Tente novamente.' }, { status: 502 });

    return Response.json(await registrarVersao(base44, user, estudo, {
      origem: base ? 'revisao_ia' : 'ia',
      motivo: body.motivo || (base ? '' : 'Análise inicial'),
      base,
      score: Math.max(0, Math.min(100, Math.round(Number(out.score_viabilidade) || 0))),
      classificacao: out.classificacao,
      conteudo: { ...normalizarConteudo(out.conteudo), justificativa_score: out.justificativa_score || '' },
      notas: out.notas_internas || {},
    }));
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function registrarVersao(base44: any, user: any, estudo: any, o: any) {
  const PT = base44.entities.PropostaTecnica;
  const existentes = await PT.filter({ estudo_id: estudo.id }, '-versao', 200);
  const versao = (existentes[0]?.versao || 0) + 1;
  const ano = new Date().getFullYear();
  const codigo = `PT-${(SIGLA_PRODUTO as any)[estudo.produto] || 'EST'}-${ano}-${String(estudo.id).slice(-5).toUpperCase()}-v${versao}`;

  const nova = await PT.create({
    estudo_id: estudo.id, versao, codigo,
    produto: estudo.produto, tipo_cliente: estudo.tipo_cliente,
    cliente_nome: estudo.cliente_nome, cliente_documento: estudo.cliente_documento,
    responsavel_email: estudo.responsavel_email || user.email,
    responsavel_nome: estudo.responsavel_nome || user.full_name || user.email,
    status: 'rascunho', origem: o.origem, motivo_revisao: o.motivo || '',
    versao_anterior_id: o.base?.id || existentes[0]?.id || '',
    score_viabilidade: o.score, classificacao: o.classificacao,
    conteudo: o.conteudo || {}, notas_internas_ia: o.notas || {},
    validade_dias: o.base?.validade_dias || 15,
  });

  // versões anteriores ainda abertas passam a "substituída"
  for (const p of existentes) {
    if (!['aceita', 'recusada', 'substituida'].includes(p.status)) {
      try { await PT.update(p.id, { status: 'substituida' }); } catch (_) { /* ignore */ }
    }
  }

  const upd: any = {
    proposta_atual_id: nova.id, proposta_versao: versao, proposta_status: 'rascunho',
    score_viabilidade: o.score, classificacao_viabilidade: o.classificacao,
    analise_gerada_em: new Date().toISOString(),
  };
  if (!['em_analise_tecnica', 'concluido'].includes(estudo.status)) {
    upd.status = 'em_analise_tecnica';
    upd.data_envio_analise = new Date().toISOString();
  }
  await base44.entities.EstudoViabilidade.update(estudo.id, upd);
  return { proposta: nova };
}
