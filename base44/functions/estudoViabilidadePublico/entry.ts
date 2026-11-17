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
      tipo: d.tipo, descricao: d.descricao, nome_arquivo: d.nome_arquivo, url: d.url, enviado_em: d.enviado_em,
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
      return resposta(estudo);
    }

    if (action === 'upload') {
      const { tipo, base64, nome, mime } = body;
      const item = checklistDocumentos(estudo.produto, estudo.tipo_cliente).find((d: any) => d.tipo === tipo);
      if (!item) return Response.json({ error: 'Tipo de documento inválido' }, { status: 400 });
      if (!base64) return Response.json({ error: 'Arquivo vazio' }, { status: 400 });
      const binary = atob(base64);
      if (binary.length > MAX_BYTES) return Response.json({ error: 'Arquivo acima de 10MB' }, { status: 413 });
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const file = new File([new Blob([bytes], { type: mime || 'application/octet-stream' })], nome || 'documento', { type: mime || 'application/octet-stream' });
      const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

      let documentos = [...(estudo.documentos || [])];
      if (!item.multiplo) documentos = documentos.filter((d: any) => d.tipo !== tipo);
      documentos.push({ tipo, descricao: item.descricao, nome_arquivo: nome, url: file_url, enviado_em: new Date().toISOString() });
      await Ent.update(estudo.id, marcarPreenchimento({ documentos }));
      estudo = await Ent.get(estudo.id);
      return resposta(estudo);
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
        return resposta(estudo, { enviado: false });
      }
      const agora = new Date().toISOString();
      await Ent.update(estudo.id, { ...u, status: 'recebido', data_recebimento: agora, link_preenchido_em: agora });
      estudo = await Ent.get(estudo.id);

      // Aviso ao consultor responsável (best-effort)
      if (estudo.responsavel_email) {
        try {
          const prod = (PRODUTOS_ESTUDO as any)[estudo.produto]?.nome || estudo.produto;
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: estudo.responsavel_email,
            subject: `Estudo de Viabilidade recebido — ${prod} — ${estudo.cliente_nome || ''}`,
            body: `O cliente ${estudo.cliente_nome || ''} concluiu o formulário de Estudo de Viabilidade (${prod}).\n\nAcesse o portal Villela Exchange > Comercial > Estudo de Viabilidade para revisar as respostas e documentos e encaminhar para a Análise Técnica.`,
          });
        } catch (_) { /* e-mail não bloqueia */ }
      }
      return resposta(estudo, { enviado: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
