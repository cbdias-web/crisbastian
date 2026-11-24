import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Lê um NDA, proposta técnica/comercial ou documento de negociação e devolve os campos
// do formulário de Contrato (cliente + negociação + estrutura OFFSHORE) já no formato do portal.

const S = (description: string) => ({ type: 'string', description });
const N = (description: string) => ({ type: 'number', description });

const SCHEMA = {
  type: 'object',
  properties: {
    tipo_documento: { type: 'string', enum: ['NDA', 'PROPOSTA', 'CONTRATO', 'OUTRO'], description: 'Tipo do documento lido' },
    // Cliente
    tipo_pessoa: { type: 'string', enum: ['PF', 'PJ'] },
    nome: S('Nome completo (PF) ou razão social (PJ) do CLIENTE'),
    cpf_cnpj: S('CPF ou CNPJ do cliente, com pontuação'),
    responsavel_legal: S('Nome do responsável legal / signatário (somente PJ)'),
    cpf_responsavel: S('CPF do responsável legal (somente PJ)'),
    rg: S('RG ou documento de identidade (PF)'),
    nascimento: S('Data de nascimento AAAA-MM-DD (PF)'),
    nacionalidade: S('Nacionalidade, ex.: brasileiro / brasileira'),
    profissao: S('Profissão (PF) ou ramo de atividade (PJ)'),
    estado_civil: { type: 'string', enum: ['', 'Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'] },
    email: S('E-mail do cliente'),
    telefone: S('Telefone / WhatsApp do cliente'),
    cep: S('CEP'),
    endereco: S('Logradouro, número e complemento'),
    bairro: S('Bairro'),
    cidade: S('Cidade'),
    estado: S('UF com 2 letras'),
    // Negociação
    valor_total: N('Valor total negociado em reais (número, sem R$). 0 se não houver valor fechado'),
    valor_adesao: N('Valor da entrada em reais. 0 se não houver entrada'),
    num_parcelas: N('Número de parcelas do saldo (sem contar a entrada). 0 se à vista'),
    valor_parcela: N('Valor de cada parcela em reais. 0 se não informado'),
    forma_pagamento: { type: 'string', enum: ['', 'PIX', 'TED/DOC', 'DÉBITO EM CONTA', 'BOLETO', 'CARTÃO DE CRÉDITO'] },
    data_primeiro_pagamento: S('Data do pagamento da entrada AAAA-MM-DD'),
    data_primeira_parcela: S('Vencimento da 1ª parcela AAAA-MM-DD'),
    data_contrato: S('Data prevista do contrato/assinatura AAAA-MM-DD'),
    // Estrutura (OFFSHORE)
    estrutura_jurisdicao: S('Local/jurisdição da estrutura, no formato "Estado, País" (ex.: "Wyoming, EUA")'),
    offshore_tipo_entidade: S('Tipo de entidade, ex.: "Limited Liability Company (LLC)"'),
    offshore_estrutura_nacional: { type: 'boolean', description: 'true se o escopo inclui estrutura no Brasil (filial/representação, conta em BRL)' },
    prazo_implantacao_dias: N('Prazo de entrega/implantação da estrutura em dias. 0 se não informado'),
    offshore_manutencao_meses: N('Meses de manutenção inclusos. 0 se não informado'),
    local_assinatura: S('Cidade onde o contrato será assinado'),
    entrada_com_veiculo: { type: 'boolean', description: 'true se a entrada/pagamento for feito com a entrega de um veículo (dação em pagamento)' },
    veiculo: {
      type: 'object',
      properties: {
        marca_modelo: S('Marca/Modelo/Versão'), especie_tipo: S(''), carroceria: S(''),
        ano_fabricacao: S(''), ano_modelo: S(''), placa: S(''), renavam: S(''), chassi: S(''),
        motor: S(''), cor: S(''), combustivel: S(''), potencia: S(''), crv: S(''), municipio_registro: S(''),
      },
    },
    condicoes_especiais: S('Condições negociadas que não cabem nos campos acima (resumo objetivo, em português)'),
    resumo: S('Uma linha: o que o documento é e o que foi negociado'),
  },
  required: ['tipo_documento', 'nome'],
};

const PROMPT = (tipo: string) => `Você vai preencher o cadastro de um contrato do tipo ${tipo || 'OFFSHORE'} da RNC / Villela Exchange a partir do arquivo anexado (NDA, proposta técnica/comercial ou documento de negociação).

Regras obrigatórias:
- Extraia os dados do CLIENTE (contraparte / contratante). NUNCA use os dados da RNC, Villela Exchange, Grupo Villela ou do escritório.
- Se houver várias partes, priorize a identificada como CONTRATANTE / CLIENTE / TOMADOR.
- Deixe "" (texto) ou 0 (número) em todo campo que NÃO estiver escrito no documento. Nunca invente nem deduza.
- Valores: use o valor FECHADO/proposto. Se o documento trouxer apenas faixas ou estimativas (mínimo–máximo), deixe valor_total = 0 e descreva a faixa em condicoes_especiais.
- Se houver entrada + parcelas, valor_adesao = entrada e num_parcelas = quantidade de parcelas do saldo.
- Datas sempre AAAA-MM-DD. Preserve a pontuação original de CPF/CNPJ e telefones.
- estrutura_jurisdicao: estado e país onde a empresa/estrutura será constituída (ex.: "Wyoming, EUA", "Delaware, EUA").
- Se o pagamento envolver entrega de veículo, marque entrada_com_veiculo = true e preencha os dados do veículo que existirem.`;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const { file_uri, tipo } = await req.json().catch(() => ({}));
    if (!file_uri) return Response.json({ error: 'file_uri é obrigatório' }, { status: 400 });

    let fileUrl = file_uri;
    if (!/^https?:\/\//i.test(file_uri)) {
      const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
      fileUrl = signed?.signed_url || signed?.data?.signed_url || '';
    }
    if (!fileUrl) return Response.json({ error: 'Não foi possível abrir o arquivo enviado.' }, { status: 400 });

    const out: any = await base44.integrations.Core.InvokeLLM({
      prompt: PROMPT(tipo),
      file_urls: [fileUrl],
      response_json_schema: SCHEMA,
    });

    const txt = (v: any) => String(v ?? '').trim();
    const num = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
    const data = (v: any) => (/^\d{4}-\d{2}-\d{2}$/.test(txt(v)) ? txt(v) : '');

    const dados: Record<string, any> = {};
    for (const k of ['nome', 'cpf_cnpj', 'responsavel_legal', 'cpf_responsavel', 'rg', 'nacionalidade', 'profissao', 'estado_civil', 'email', 'telefone',
      'cep', 'endereco', 'bairro', 'cidade', 'forma_pagamento', 'estrutura_jurisdicao', 'offshore_tipo_entidade', 'local_assinatura']) {
      const v = txt(out?.[k]); if (v) dados[k] = v;
    }
    const uf = txt(out?.estado).toUpperCase(); if (/^[A-Z]{2}$/.test(uf)) dados.estado = uf;
    for (const k of ['nascimento', 'data_primeiro_pagamento', 'data_primeira_parcela', 'data_contrato']) { const v = data(out?.[k]); if (v) dados[k] = v; }
    for (const k of ['valor_total', 'valor_adesao', 'valor_parcela', 'prazo_implantacao_dias', 'offshore_manutencao_meses']) { const v = num(out?.[k]); if (v) dados[k] = v; }
    const np = Math.round(num(out?.num_parcelas)); if (np) dados.num_parcelas = np;
    if (typeof out?.offshore_estrutura_nacional === 'boolean') dados.offshore_estrutura_nacional = out.offshore_estrutura_nacional;
    if (out?.entrada_com_veiculo === true) {
      dados.offshore_entrada_forma = 'dacao_veiculo';
      const veic: Record<string, string> = {};
      for (const [k, v] of Object.entries(out?.veiculo || {})) if (txt(v)) veic[k] = txt(v);
      if (Object.keys(veic).length) dados.anexo_veiculo = veic;
    }

    if (!dados.nome) return Response.json({ error: 'Não foi possível identificar o cliente no documento.' }, { status: 422 });

    return Response.json({
      dados,
      tipo_documento: out?.tipo_documento || 'OUTRO',
      tipo_pessoa: out?.tipo_pessoa === 'PJ' ? 'PJ' : 'PF',
      condicoes_especiais: txt(out?.condicoes_especiais),
      resumo: txt(out?.resumo),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
