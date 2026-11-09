import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Move os leads em aberto de um gerente (ex.: em férias) para outro gerente.
async function mover(entidade, filtro, dados) {
  let total = 0;
  for (let i = 0; i < 40; i++) {
    const r = await entidade.updateMany(filtro, { $set: dados });
    const n = r?.updated ?? r?.updated_count ?? r?.count ?? 0;
    total += n;
    if (!r?.has_more || n === 0) break;
  }
  return total;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user || (user.role !== 'admin' && !user.permissao_admin)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const origemId = body.vendedor_origem_id;
    const destinoId = body.vendedor_destino_id;
    const incluirFila = body.incluir_fila !== false;
    const incluirAgenda = body.incluir_agenda !== false;
    const incluirCarteira = body.incluir_carteira === true;

    if (!origemId || !destinoId) {
      return Response.json({ error: 'Informe o gerente de origem e o gerente de destino' }, { status: 400 });
    }
    if (origemId === destinoId) {
      return Response.json({ error: 'O destino deve ser diferente do gerente de origem' }, { status: 400 });
    }

    const destino = await base44.asServiceRole.entities.Vendedor
      .get(destinoId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!destino) return Response.json({ error: 'Gerente de destino não encontrado' }, { status: 404 });

    const dadosGerente = { vendedor_id: destino.id, vendedor_nome: destino.nome };
    const resultado = { fila: 0, conversas: 0, leads: 0, agenda: 0, carteira: 0 };

    if (incluirFila) {
      resultado.fila = await mover(
        base44.asServiceRole.entities.FilaContato,
        {
          vendedor_id: origemId,
          status: { $in: ['pendente', 'atendeu', 'nao_atendeu', 'reuniao_marcada', 'qualificado', 'nutricao'] },
        },
        { ...dadosGerente, vendedor_email: destino.email || '' }
      );
      resultado.conversas = await mover(
        base44.asServiceRole.entities.ConversaWhatsapp,
        { vendedor_id: origemId, status: 'ativa' },
        dadosGerente
      );
      resultado.leads = await mover(
        base44.asServiceRole.entities.Lead,
        { vendedor_id: origemId, status: { $in: ['novo', 'em_contato'] } },
        dadosGerente
      );
    }

    if (incluirAgenda) {
      resultado.agenda = await mover(
        base44.asServiceRole.entities.AgendaContato,
        { vendedor_id: origemId, status: 'pendente' },
        dadosGerente
      );
    }

    if (incluirCarteira) {
      resultado.carteira = await mover(
        base44.asServiceRole.entities.Cliente,
        { vendedor_id: origemId },
        dadosGerente
      );
    }

    return Response.json({ success: true, destino: destino.nome, ...resultado });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}