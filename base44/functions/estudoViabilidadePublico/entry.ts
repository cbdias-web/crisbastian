import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  PRODUTOS_ESTUDO, checklistDocumentos, calcularPendenciasEstudo, STATUS_BLOQUEADOS_CLIENTE,
} from '../../shared/estudoViabilidade.ts';

// Endpoint público (acesso por token) do formulário de Estudo de Viabilidade.
// Ações: buscar | salvar | upload | remover_documento | enviar

const MAX_BYTES = 10 * 1024 * 1024;

function sanitize(e: any) {
  return {
    id: e.id,
    produto: e.produto,
    tipo_cliente: e.tipo_cliente,
    cliente_nome: e.cliente_nome,
    status: e.status,
    respostas: e.respostas || {},
    documentos: (e.documentos || []).map((d: any) => ({
      tipo: d.tipo, descricao: d.descricao, nome_arquivo: d.nome_arquivo, url: d.url, enviado_em: d.enviado_em, origem: d.origem || '',
    })),
    aceite_lgpd: !!e.aceite_lgpd,
    preenchido_por_nome: e.preenchido_por_nome || '',
    responsavel_nome: e.responsavel_nome || '',
    bloqueado: STATUS_BLOQUEADOS_CLIENTE.includes(e.status),
  };
}

function resposta(e: any, extra: Record<string, unknown> = {}) {
  return Response.json({
    estudo: sanitize(e),
    checklist: checklistDocumentos(e.produto, e.tipo_cliente),
    pendencias: calcularPendenciasEstudo(e),
    ...extra,
  });
}

const JANELA_ALERTA_MS = 3 * 60 * 60 * 1000;

// Avisa consultor responsável + admins (Jarvis + e-mail) sobre a devolução do formulário.
async function notificar(base44: any, estudo: any, assunto: string, mensagem: string) {
  const emails = new Set<string>();
  if (estudo.responsavel_email) emails.add(estudo.responsavel_email);
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    (admins || []).forEach((u: any) => { if (u.email && u.ativo !== false) emails.add(u.email); });
  } catch (_) { /* sem lista de admins não bloqueia */ }

  const prod = (PRODUTOS_ESTUDO as any)[estudo.produto]?.nome || estudo.produto;
  const resumo = `\n\nCliente: ${estudo.cliente_nome || '—'} · Produto: ${prod}\nAcesse Comercial > Estudo de Viabilidade para revisar.`;

  for (const email of emails) {
    try {
      await base44.asServiceRole.entities.JarvisMensagem.create({
        destinatario_email: email,
        remetente_nome: 'Jarvis',
        mensagem: mensagem + resumo,
      });
    } catch (_) { /* Jarvis não bloqueia */ }
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: assunto,
        body: mensagem + `\n\nCliente: ${estudo.cliente_nome || '—'}\nProduto: ${prod}\n\nAcesse o portal Villela Exchange > Comercial > Estudo de Viabilidade para revisar as respostas e documentos.`,
      });
    } catch (_) { /* e-mail não bloqueia */ }
  }
}

// Cliente devolveu o formulário (informações + documentos obrigatórios completos).
// Marca a devolução e avisa consultor/admins uma vez a cada 3h.
async function registrarDevolucaoCliente(base44: any, estudo: any) {
  if (!['rascunho', 'enviado_cliente', 'em_preenchimento'].includes(estudo.status)) return;
  const pendencias = calcularPendenciasEstudo(estudo).filter((p: string) => !p.startsWith('Declaração'));
  if (pendencias.length > 0) return;

  const agora = new Date().toISOString();
  const anterior = estudo.ultimo_alerta_cliente_em ? new Date(estudo.ultimo_alerta_cliente_em).getTime() : 0;
  const deveAlertar = Date.now() - anterior >= JANELA_ALERTA_MS;
  const patch: any = {};
  if (!estudo.cliente_devolveu_em) patch.cliente_devolveu_em = agora;
  if (deveAlertar) patch.ultimo_alerta_cliente_em = agora;
  if (Object.keys(patch).length === 0) return;

  try {
    await base44.asServiceRole.entities.EstudoViabilidade.update(estudo.id, patch);
  } catch (_) { /* não bloqueia */ }
  if (deveAlertar) {
    await notificar(base44, estudo, `Estudo de Viabilidade devolvido — ${estudo.cliente_nome || ''}`,
      'O cliente preencheu as informações e enviou os documentos do estudo de viabilidade. Faltam apenas as declarações finais para concluir o envio.');
  }
}

async function subirArquivo(base44: any, base64: string, nome: string, mime: string) {
  if (!base64) throw new Error('Arquivo vazio');
  const binary = atob(base64);
  if (binary.length > MAX_BYTES) throw new Error('Arquivo acima de 10MB');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const file = new File([new Blob([bytes], { type: mime || 'application/octet-stream' })], nome || 'documento', { type: mime || 'application/octet-stream' });
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  return file_url as string;
}

// Identifica por IA a qual item do checklist o arquivo pertence (fallback: "outros").
async function classificarArquivo(base44: any, estudo: any, file_url: string, nome: string) {
  const itens = checklistDocumentos(estudo.produto, estudo.tipo_cliente).filter((d: any) => d.tipo !== 'outros');
  const lista = itens.map((d: any) => `- ${d.tipo}: ${d.descricao}`).join('\n');
  try {
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Identifique a qual item do checklist o documento anexado corresponde.\n\nItens disponíveis:\n${lista}\n\nNome do arquivo: ${nome}\n\nResponda apenas com o código (tipo) do item correspondente. Se nenhum item corresponder com segurança, responda "outros".`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: { tipo: { type: 'string', description: 'Código do item do checklist ou "outros"' } },
        required: ['tipo'],
      },
    });
    const tipo = String((res as any)?.tipo || '').trim();
    return itens.some((d: any) => d.tipo === tipo) ? tipo : 'outros';
  } catch (_) {
    return 'outros';
  }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;
    if (!token) return Response.json({ error: 'Token obrigatorio' }, { status: 400 });

    const lista = await base44.asServiceRole.entities.EstudoViabilidade.filter({ link_token: token });
    if (!lista || lista.length === 0) return Response.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    let estudo = lista[0];
    const Ent = base44.asServiceRole.entities.EstudoViabilidade;

    if (estudo.status === 'cancelado') return Response.json({ error: 'Este formulário foi cancelado. Fale com seu consultor Villela Exchange.' }, { status: 410 });

    if (action === 'buscar') {
      try { await Ent.update(estudo.id, { link_ultimo_acesso_em: new Date().toISOString() }); } catch (_) { /* não bloqueia */ }
      return resposta(estudo);
    }

    const bloqueado = STATUS_BLOQUEADOS_CLIENTE.includes(estudo.status);
    if (bloqueado) return Response.json({ error: 'Formulário já enviado. Para alterações, fale com seu consultor.' }, { status: 409 });

    const marcarPreenchimento = (u: any) => {
      if (!estudo.status || estudo.status === 'rascunho' || estudo.status === 'enviado_cliente') u.status = 'em_preenchimento';
      return u;
    };

    if (action === 'salvar') {
      const u: any = marcarPreenchimento({
        respostas: { ...(estudo.respostas || {}), ...(body.respostas || {}) },
      });
      if (typeof body.aceite_lgpd === 'boolean') u.aceite_lgpd = body.aceite_lgpd;
      if (typeof body.preenchido_por_nome === 'string') u.preenchido_por_nome = body.preenchido_por_nome.slice(0, 200);
      await Ent.update(estudo.id, u);
      estudo = await Ent.get(estudo.id);
      await registrarDevolucaoCliente(base44, estudo);
      return resposta(estudo);
    }

    if (action === 'upload' || action === 'upload_auto') {
      const { base64, nome, mime } = body;
      const auto = action === 'upload_auto';
      if (!auto) {
        const itemTipo = checklistDocumentos(estudo.produto, estudo.tipo_cliente).find((d: any) => d.tipo === body.tipo);
        if (!itemTipo) return Response.json({ error: 'Tipo de documento inválido' }, { status: 400 });
      }
      if (!base64) return Response.json({ error: 'Arquivo vazio' }, { status: 400 });
      const file_url = await subirArquivo(base44, base64, nome, mime);
      const tipo = auto ? await classificarArquivo(base44, estudo, file_url, nome || '') : body.tipo;
      const item = checklistDocumentos(estudo.produto, estudo.tipo_cliente).find((d: any) => d.tipo === tipo);
      if (!item) return Response.json({ error: 'Tipo de documento inválido' }, { status: 400 });

      let documentos = [...(estudo.documentos || [])];
      if (!item.multiplo) documentos = documentos.filter((d: any) => d.tipo !== tipo);
      documentos.push({ tipo, descricao: item.descricao, nome_arquivo: nome, url: file_url, enviado_em: new Date().toISOString() });
      await Ent.update(estudo.id, marcarPreenchimento({ documentos }));
      estudo = await Ent.get(estudo.id);
      await registrarDevolucaoCliente(base44, estudo);
      return resposta(estudo, { tipo_identificado: tipo, descricao_identificada: item.descricao, nome_arquivo: nome });
    }

    if (action === 'remover_documento') {
      const { url } = body;
      const documentos = (estudo.documentos || []).filter((d: any) => d.url !== url);
      await Ent.update(estudo.id, { documentos });
      estudo = await Ent.get(estudo.id);
      return resposta(estudo);
    }

    if (action === 'enviar') {
      // salva o último estado antes de validar
      const u: any = { respostas: { ...(estudo.respostas || {}), ...(body.respostas || {}) } };
      if (typeof body.aceite_lgpd === 'boolean') u.aceite_lgpd = body.aceite_lgpd;
      if (typeof body.preenchido_por_nome === 'string') u.preenchido_por_nome = body.preenchido_por_nome.slice(0, 200);
      const candidato = { ...estudo, ...u };
      const pend = calcularPendenciasEstudo(candidato);
      if (pend.length > 0) {
        await Ent.update(estudo.id, marcarPreenchimento(u));
        estudo = await Ent.get(estudo.id);
        await registrarDevolucaoCliente(base44, estudo);
        return resposta(estudo, { enviado: false });
      }
      const agora = new Date().toISOString();
      await Ent.update(estudo.id, {
        ...u, status: 'recebido', data_recebimento: agora, link_preenchido_em: agora,
        ultimo_alerta_cliente_em: agora, cliente_devolveu_em: estudo.cliente_devolveu_em || agora,
      });
      estudo = await Ent.get(estudo.id);

      // Aviso ao consultor responsável e admins (Jarvis + e-mail)
      await notificar(base44, estudo, `Estudo de Viabilidade recebido — ${estudo.cliente_nome || ''}`,
        'O cliente concluiu o envio do formulário de Estudo de Viabilidade. As respostas e os documentos já estão disponíveis para revisão.');
      return resposta(estudo, { enviado: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}