import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { montarPrompt, chamarIA, normalizarConteudo } from '../../shared/motorAnalise.ts';
import { montarPdfProposta } from '../../shared/propostaPdf.ts';

// FUNÇÃO TEMPORÁRIA DE TESTE — será removida.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (body.chave !== 'teste-claude-20261118') return Response.json({ error: 'no' }, { status: 403 });
    const lista = await base44.asServiceRole.entities.EstudoViabilidade.filter({ cliente_nome: 'DEMO — Carlos Alberto Fictício' });
    const estudo = lista[0];
    const t0 = Date.now();
    const out = await chamarIA(base44.asServiceRole, montarPrompt(estudo), []);
    const p = {
      versao: 1, codigo: 'PT-HOL-2026-DEMO-v1', produto: estudo.produto, tipo_cliente: estudo.tipo_cliente,
      cliente_nome: estudo.cliente_nome, cliente_documento: estudo.cliente_documento, responsavel_nome: estudo.responsavel_nome,
      score_viabilidade: out.score_viabilidade, classificacao: out.classificacao, validade_dias: 15,
      conteudo: { ...normalizarConteudo(out.conteudo), justificativa_score: out.justificativa_score },
    };
    const bytes = montarPdfProposta(p, { full_name: 'Teste' });
    const file = new File([new Blob([bytes], { type: 'application/pdf' })], 'teste.pdf', { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    return Response.json({ segundos: Math.round((Date.now() - t0) / 1000), pdf_url: file_url, score: p.score_viabilidade, classificacao: p.classificacao, conteudo: p.conteudo, notas: out.notas_internas });
  } catch (e) {
    return Response.json({ error: (e as Error).message, stack: (e as Error).stack }, { status: 500 });
  }
}
