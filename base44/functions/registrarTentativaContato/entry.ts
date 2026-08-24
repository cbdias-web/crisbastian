import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hojeBrasilia, proximoDiaUtil } from '../../shared/diaUtil.ts';

// Registra o resultado de uma tentativa de contato na FilaContato.
//
// Payload: {
//   fila_id: string,
//   acao: 'atendeu' | 'nao_atendeu',
//   interacao?: { tipo, descricao, resultado, data_interacao, proximo_contato }  // quando atendeu
// }
//
// - atendeu: cria InteracaoCliente (realizada), seta FilaContato.status=atendeu,
//           remove da fila do dia. Se interacao.proximo_contato, agenda novo contato.
// - nao_atendeu: tentativas++, status=nao_atendeu, cria AgendaContato no proximo dia util,
//           seta FilaContato.proximo_contato, remove da fila do dia.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    const { fila_id, acao, interacao } = body;
    if (!fila_id) return Response.json({ error: 'fila_id é obrigatório' }, { status: 400 });
    if (!['atendeu', 'nao_atendeu'].includes(acao)) {
      return Response.json({ error: 'acao deve ser atendeu ou nao_atendeu' }, { status: 400 });
    }

    const fila = await base44.asServiceRole.entities.FilaContato.get(fila_id).catch(() => null);
    if (!fila) return Response.json({ error: 'Item da fila não encontrado' }, { status: 404 });
    if (fila.status !== 'pendente') {
      return Response.json({ error: 'Item já foi atendido nesta fila' }, { status: 400 });
    }

    const agora = new Date().toISOString();
    const clienteId = fila.cliente_id || fila.ref_id;

    if (acao === 'atendeu') {
      const i = interacao || {};
      const tipo = i.tipo || 'Ligação';
      const descricao = (i.descricao || '').trim();
      const resultado = i.resultado || 'Neutro';
      const dataInter = i.data_interacao || hojeBrasilia();
      const proximoContato = i.proximo_contato || '';

      if (!descricao) {
        return Response.json({ error: 'Descrição da interação é obrigatória' }, { status: 400 });
      }

      // 1) Cria Interação realizada
      const inter = await base44.asServiceRole.entities.InteracaoCliente.create({
        cliente_id: clienteId,
        cliente_nome: fila.nome,
        vendedor_id: fila.vendedor_id,
        vendedor_nome: fila.vendedor_nome,
        tipo,
        descricao,
        data_interacao: dataInter,
        proximo_contato: proximoContato || null,
        resultado,
        status: 'realizada',
      });

      // 2) Se agendou próximo contato, cria interação agendada + AgendaContato
      if (proximoContato && resultado !== 'Negativo') {
        await base44.asServiceRole.entities.InteracaoCliente.create({
          cliente_id: clienteId,
          cliente_nome: fila.nome,
          vendedor_id: fila.vendedor_id,
          vendedor_nome: fila.vendedor_nome,
          tipo,
          data_interacao: proximoContato,
          descricao: '',
          resultado: 'Sem resposta',
          status: 'agendada',
        }).catch(() => {});
        await base44.asServiceRole.entities.AgendaContato.create({
          lead_id: clienteId,
          lead_nome: fila.nome,
          lead_telefone: fila.telefone,
          lead_cpf_cnpj: fila.cpf_cnpj || '',
          cliente_id: clienteId,
          vendedor_id: fila.vendedor_id,
          vendedor_nome: fila.vendedor_nome,
          data_agendada: proximoContato,
          posicao_dia: 0,
          lote_id: '',
          status: 'pendente',
          resultado: '',
        }).catch(() => {});
      }

      // 3) Atualiza FilaContato
      await base44.asServiceRole.entities.FilaContato.update(fila_id, {
        status: 'atendeu',
        ultima_tentativa_em: agora,
        historico: [
          ...(fila.historico || []),
          { status: 'atendeu', observacao: descricao, data: agora },
        ],
      });

      return Response.json({
        success: true,
        acao: 'atendeu',
        interacao_id: inter.id,
        fila_id,
      });
    }

    // acao === 'nao_atendeu' — reagendar a partir de AMANHÃ (não atendeu sai da fila de hoje)
    const hojeStr = hojeBrasilia();
    const [yy, mm, dd] = hojeStr.split('-').map(Number);
    const amanha = new Date(yy, mm - 1, dd + 1);
    const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
    const novaData = proximoDiaUtil(amanhaStr);
    const tentativas = (fila.tentativas || 0) + 1;

    // 1) Reagenda no proximo dia util (AgendaContato)
    await base44.asServiceRole.entities.AgendaContato.create({
      lead_id: clienteId,
      lead_nome: fila.nome,
      lead_telefone: fila.telefone,
      lead_cpf_cnpj: fila.cpf_cnpj || '',
      cliente_id: clienteId,
      vendedor_id: fila.vendedor_id,
      vendedor_nome: fila.vendedor_nome,
      data_agendada: novaData,
      posicao_dia: 0,
      lote_id: '',
      status: 'pendente',
      resultado: 'Não atendeu',
    }).catch(() => {});

    // 2) Atualiza FilaContato (sai da fila de hoje)
    await base44.asServiceRole.entities.FilaContato.update(fila_id, {
      status: 'nao_atendeu',
      tentativas,
      ultima_tentativa_em: agora,
      proximo_contato: novaData,
      historico: [
        ...(fila.historico || []),
        { status: 'nao_atendeu', observacao: `Tentativa ${tentativas} — reagendado para ${novaData}`, data: agora },
      ],
    });

    return Response.json({
      success: true,
      acao: 'nao_atendeu',
      tentativas,
      proximo_contato: novaData,
      fila_id,
    });
  } catch (error) {
    console.error('registrarTentativaContato:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}