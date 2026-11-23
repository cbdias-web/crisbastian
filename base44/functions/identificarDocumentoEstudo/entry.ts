import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { checklistDocumentos, PRODUTOS_ESTUDO } from '../../shared/estudoViabilidade.ts';

// Identifica o tipo de um documento já anexado ao estudo de viabilidade
// (balanço, DRE, IR do sócio, faturamento, contrato social...) para que ele
// entre no checklist do link do cliente como já recebido.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const { file_uri, produto, tipo_cliente } = await req.json().catch(() => ({}));
    if (!file_uri) return Response.json({ error: 'file_uri é obrigatório' }, { status: 400 });

    const tipoCliente = tipo_cliente === 'PJ' ? 'PJ' : 'PF';
    const checklist = checklistDocumentos(produto, tipoCliente);
    const tipos = checklist.map((d) => d.tipo);

    let fileUrl = file_uri;
    if (!/^https?:\/\//i.test(file_uri)) {
      const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
      fileUrl = signed?.signed_url || signed?.data?.signed_url || '';
    }
    if (!fileUrl) return Response.json({ error: 'Não foi possível abrir o arquivo enviado.' }, { status: 400 });

    const lista = checklist.map((d) => `- ${d.tipo}: ${d.descricao}`).join('\n');
    const prompt = `Identifique o tipo do documento anexado em um estudo de viabilidade de ${PRODUTOS_ESTUDO[produto]?.nome || 'estruturação patrimonial'} para um cliente ${tipoCliente === 'PJ' ? 'pessoa jurídica' : 'pessoa física'}.

Escolha exatamente um dos tipos abaixo (use "outros" quando o documento não se encaixar em nenhum):
${lista}

Regras obrigatorias:
- Classifique pelo conteudo do arquivo, nunca pelo nome do arquivo.
- Balanco Patrimonial, DRE, IRPJ/ECF, IRPF de socios, faturamento/receita e contrato social tem tipos proprios.
- Documento ilegivel ou que nao seja financeiro/societario: use "outros".
- resumo: uma linha objetiva dizendo o que o documento comprova (ex.: "Balanco Patrimonial 2024 da empresa X").
- competencia: exercicio ou periodo do documento (ex.: "2024"); deixe vazio se nao houver.`;

    const out = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: tipos },
          resumo: { type: 'string' },
          competencia: { type: 'string' },
        },
        required: ['tipo'],
      },
    });

    const tipo = tipos.includes(out?.tipo) ? out.tipo : 'outros';
    const item = checklist.find((d) => d.tipo === tipo);
    return Response.json({
      tipo,
      descricao: item?.descricao || 'Outros documentos',
      resumo: String(out?.resumo || '').trim(),
      competencia: String(out?.competencia || '').trim(),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}