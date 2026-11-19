import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const SCHEMA = {
  type: 'object',
  properties: {
    tipo_pessoa: { type: 'string', enum: ['PF', 'PJ'], description: 'PF quando a contraparte for pessoa fisica, PJ quando for empresa' },
    nome: { type: 'string', description: 'Nome completo (PF) ou razao social (PJ) da contraparte do NDA' },
    cpf_cnpj: { type: 'string', description: 'CPF ou CNPJ da contraparte, com pontuacao' },
    email: { type: 'string' },
    telefone: { type: 'string' },
    endereco: { type: 'string', description: 'Logradouro, numero e complemento' },
    bairro: { type: 'string' },
    cidade: { type: 'string' },
    estado: { type: 'string', description: 'UF ou estado' },
    cep: { type: 'string' },
    profissao: { type: 'string', description: 'Profissao (PF) ou ramo de atividade (PJ)' },
    nascimento: { type: 'string', description: 'Data de nascimento no formato AAAA-MM-DD (PF)' },
    nacionalidade: { type: 'string' },
    responsavel_legal: { type: 'string', description: 'Nome do responsavel legal / signatario (PJ)' },
    cpf_responsavel: { type: 'string', description: 'CPF do responsavel legal (PJ)' },
    resumo: { type: 'string', description: 'Em 2 linhas: objeto do NDA e o que a contraparte pretende' },
  },
  required: ['nome'],
};

const PROMPT = `Analise o arquivo anexado (NDA / acordo de confidencialidade) e extraia os dados cadastrais da CONTRAPARTE, ou seja, do CLIENTE do escritorio.

Regras obrigatorias:
- NUNCA extraia os dados da Villela Exchange / Grupo Villela / escritorio: a contraparte e a outra parte do documento.
- Se houver varias partes, priorize a parte identificada como CONTRATANTE / CLIENTE / TOMADOR.
- Deixe como string vazia ("") todo campo que nao estiver escrito no documento. Nunca invente, complete ou deduza dados que nao aparecem.
- Preserve a pontuacao original de CPF/CNPJ e telefones.
- Datas sempre no formato AAAA-MM-DD.
- Se o documento estiver ilegivel ou nao for um NDA, devolva nome vazio.`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const { file_uri } = await req.json().catch(() => ({}));
    if (!file_uri) return Response.json({ error: 'file_uri é obrigatório' }, { status: 400 });

    let fileUrl = file_uri;
    if (!/^https?:\/\//i.test(file_uri)) {
      const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
      fileUrl = signed?.signed_url || signed?.data?.signed_url || '';
    }
    if (!fileUrl) return Response.json({ error: 'Não foi possível abrir o arquivo enviado.' }, { status: 400 });

    const extraido = await base44.integrations.Core.InvokeLLM({
      prompt: PROMPT,
      file_urls: [fileUrl],
      response_json_schema: SCHEMA,
    });

    const dados: Record<string, string> = {};
    for (const campo of Object.keys(SCHEMA.properties)) {
      dados[campo] = String(extraido?.[campo] ?? '').trim();
    }
    dados.tipo_pessoa = dados.tipo_pessoa === 'PJ' ? 'PJ' : 'PF';
    if (!dados.nome) {
      return Response.json({ error: 'Não foi possível identificar o cliente no arquivo enviado.' }, { status: 422 });
    }

    return Response.json({ dados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}