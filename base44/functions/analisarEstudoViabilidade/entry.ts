import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { montarPrompt, chamarIA, normalizarConteudo, urlsAnalisaveis, normClassificacao } from '../../shared/motorAnalise.ts';
import { SIGLA_PRODUTO } from '../../shared/propostaTecnica.ts';

// Motor de Análise Técnica do Estudo de Viabilidade.
// Ações:
//   analisar      { estudo_id }                                  → gera nova versão (origem ia)
//   revisar       { estudo_id, proposta_id, motivo, instrucoes } → IA revisa a versão base (origem revisao_ia)
//   nova_versao   { proposta_id, motivo }                        → clona a versão para edição manual (origem manual)

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

    // Análise de referência (outro cliente): usada só como método de trabalho.
    let referencia = null;
    if (action === 'analisar') {
      const refId = body.base_proposta_id || estudo.analise_base_id;
      if (refId) { try { referencia = await PT.get(refId); } catch (_) { referencia = null; } }
    }

    const prompt = montarPrompt(estudo, base, body.motivo, body.instrucoes, referencia);
    const out = await chamarIA(base44, prompt, urlsAnalisaveis(estudo));
    if (!out || !out.conteudo) return Response.json({ error: 'O motor de IA não retornou uma análise válida. Tente novamente.' }, { status: 502 });

    const conteudo: any = { ...normalizarConteudo(out.conteudo), justificativa_score: out.justificativa_score || '' };
    // Ao revisar, preserva o valor de honorários já definido pelo consultor.
    const valorDefinido = Number(base?.conteudo?.investimento?.valor) || 0;
    if (valorDefinido) conteudo.investimento.valor = valorDefinido;

    return Response.json(await registrarVersao(base44, user, estudo, {
      origem: base ? 'revisao_ia' : 'ia',
      motivo: body.motivo || (base ? '' : 'Análise inicial'),
      base,
      score: Math.max(0, Math.min(100, Math.round(Number(out.score_viabilidade) || 0))),
      classificacao: normClassificacao(out.classificacao, Number(out.score_viabilidade) || 0),
      conteudo,
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