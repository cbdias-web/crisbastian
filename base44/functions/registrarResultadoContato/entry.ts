import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getConfigFila } from '../../shared/listAll.ts';
import { agoraBrasilia, hojeBrasilia, proximoDiaUtil, somarDiasUteis } from '../../shared/diaUtil.ts';

// Registra o resultado de UM toque (ligação ou WhatsApp) e executa a transição correta:
// FilaContato, AgendaContato, RegistroContato, InteracaoCliente, cadência e opt-out.
//
// Payload: { fila_id, canal: 'ligacao'|'whatsapp', resultado, observacao?, retorno?: {data, hora},
//            reuniao_em?, duracao_seg?, modelo_id? }
// resultado: atendeu_interessado | atendeu_retorno | atendeu_sem_interesse | caixa_postal | nao_atendeu |
//            numero_errado | opt_out | whatsapp_enviado | respondeu | reuniao_marcada | no_show

const ROTULO: Record<string, string> = {
  atendeu_interessado: 'Atendeu — interessado',
  atendeu_retorno: 'Atendeu — pediu retorno',
  atendeu_sem_interesse: 'Atendeu — sem interesse',
  caixa_postal: 'Caixa postal',
  nao_atendeu: 'Não atendeu',
  numero_errado: 'Número errado / inválido',
  opt_out: 'Não quer receber contato (opt-out)',
  whatsapp_enviado: 'WhatsApp enviado',
  respondeu: 'Lead respondeu no WhatsApp',
  reuniao_marcada: 'Reunião marcada',
  no_show: 'No-show (não compareceu)',
};

const dataMaisDias = (data: string, n: number) => {
  const [a, m, d] = data.split('-').map(Number);
  const dt = new Date(a, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({})) || {};
    const { fila_id, canal = 'ligacao', resultado, observacao = '', retorno, reuniao_em, duracao_seg, modelo_id } = body;
    if (!fila_id || !ROTULO[resultado]) return Response.json({ error: 'fila_id e resultado válidos são obrigatórios' }, { status: 400 });

    const sr = base44.asServiceRole.entities;
    const fila = await sr.FilaContato.get(fila_id).catch(() => null);
    if (!fila) return Response.json({ error: 'Item da fila não encontrado' }, { status: 404 });

    // Permissão: admin ou o próprio gerente dono do item
    const isAdmin = user.role === 'admin' || user.permissao_admin === true;
    if (!isAdmin) {
      const vs = await sr.Vendedor.filter({ email: user.email });
      if (!vs.some((v: any) => v.id === fila.vendedor_id)) return Response.json({ error: 'Sem permissão para este item' }, { status: 403 });
    }

    const cfg = await getConfigFila(base44);
    const agora = new Date();
    const agoraIso = agora.toISOString();
    const hoje = hojeBrasilia();
    const nowB = agoraBrasilia(agora);
    const hist = Array.isArray(fila.historico) ? [...fila.historico] : [];
    const upd: any = { ultima_tentativa_em: agoraIso };
    const rotulo = ROTULO[resultado];

    // ---------- Primeiro toque (speed-to-lead) ----------
    const primeiro = !fila.primeiro_toque_em;
    let segAte: number | undefined;
    if (primeiro) {
      upd.primeiro_toque_em = agoraIso;
      const base = fila.entrada_inbound_em || fila.created_date;
      if (base && fila.tipo_origem === 'indicacao') segAte = Math.max(0, Math.round((agora.getTime() - new Date(base.endsWith('Z') ? base : base + 'Z').getTime()) / 1000));
    }
    if (canal === 'whatsapp' && !fila.whatsapp_primeiro_em) upd.whatsapp_primeiro_em = agoraIso;

    // ---------- Avanço de cadência ----------
    const encerraCadencia = () => { upd.cadencia_passo = -1; upd.proximo_toque_em = null; };
    let proximoPasso: any = null;
    const avancarCadencia = async (): Promise<boolean> => {
      if (!fila.cadencia_id || (fila.cadencia_passo ?? 0) < 0) return false;
      const cad = await sr.Cadencia.get(fila.cadencia_id).catch(() => null);
      const passos = (cad?.passos || []).slice().sort((a: any, b: any) => (a.dias_uteis || 0) - (b.dias_uteis || 0) || (a.horas_apos_anterior || 0) - (b.horas_apos_anterior || 0));
      if (!passos.length) return false;
      const i = fila.cadencia_passo ?? 0;
      const atual = passos[i] || passos[passos.length - 1];
      const prox = passos[i + 1];
      if (!prox) {
        // fim da cadência
        encerraCadencia();
        const fim = cad.ao_final || 'nutricao';
        if (fim === 'nutricao') upd.status = 'nutricao';
        else if (fim === 'descartado') upd.status = 'descartado';
        hist.push({ status: upd.status || fila.status, observacao: `Cadência "${cad.nome}" concluída sem resposta → ${fim}`, data: agoraIso });
        return true;
      }
      upd.cadencia_passo = i + 1;
      proximoPasso = { canal: prox.canal, titulo: prox.titulo, modelo_id: prox.modelo_id };
      const mesmoDia = (prox.dias_uteis || 0) === (atual.dias_uteis || 0);
      const jan = (cfg.janela_fim || '18:00').split(':').map(Number);
      if (mesmoDia) {
        const h = prox.horas_apos_anterior ?? 2;
        const quando = new Date(agora.getTime() + h * 3600000);
        const qb = agoraBrasilia(quando);
        if (qb.data === hoje && qb.minutos <= jan[0] * 60 + (jan[1] || 0)) {
          upd.proximo_toque_em = quando.toISOString();
          hist.push({ status: fila.status, observacao: `Próximo toque da cadência (${prox.canal}) às ${Math.floor(qb.minutos / 60)}h${String(qb.minutos % 60).padStart(2, '0')}`, data: agoraIso });
          return true;
        }
      }
      const delta = Math.max(1, (prox.dias_uteis || 0) - (atual.dias_uteis || 0));
      const dataProx = somarDiasUteis(hoje, delta);
      const ini = (cfg.janela_inicio || '09:00').split(':').map(Number);
      upd.status = 'nao_atendeu'; // some do Kanban até a data; a esteira repromove na data
      upd.proximo_contato = dataProx;
      upd.proximo_contato_hora = `${String(ini[0]).padStart(2, '0')}:${String(ini[1] || 0).padStart(2, '0')}`;
      upd.proximo_toque_em = new Date(`${dataProx}T${upd.proximo_contato_hora}:00-03:00`).toISOString();
      upd.status_desde = agoraIso;
      await sr.AgendaContato.create({
        lead_id: fila.ref_id, lead_nome: fila.nome, lead_telefone: fila.telefone || '', lead_cpf_cnpj: fila.cpf_cnpj || '',
        cliente_id: fila.cliente_id || fila.ref_id, vendedor_id: fila.vendedor_id, vendedor_nome: fila.vendedor_nome || '',
        data_agendada: dataProx, horario: upd.proximo_contato_hora, posicao_dia: 0, lote_id: fila.lote_id || '', status: 'pendente', resultado: '',
      }).catch(() => {});
      hist.push({ status: 'nao_atendeu', observacao: `Cadência: próximo toque (${prox.canal}) em ${dataProx.split('-').reverse().join('/')}`, data: agoraIso });
      return true;
    };

    const retornoPadrao = () => {
      const ini = (cfg.janela_inicio || '09:00');
      return { data: proximoDiaUtil(dataMaisDias(hoje, 1)), hora: ini };
    };

    // ---------- Transições ----------
    switch (resultado) {
      case 'atendeu_interessado':
      case 'respondeu': {
        const r = retorno?.data ? retorno : retornoPadrao();
        upd.status = 'atendeu'; upd.status_desde = agoraIso; upd.tentativas_contato = 0; upd.alerta_stale = false;
        upd.proximo_contato = r.data; upd.proximo_contato_hora = r.hora || '09:00';
        encerraCadencia();
        break;
      }
      case 'atendeu_retorno': {
        const r = retorno?.data ? retorno : retornoPadrao();
        upd.status = 'atendeu'; upd.status_desde = agoraIso; upd.tentativas_contato = 0; upd.alerta_stale = false;
        upd.proximo_contato = r.data; upd.proximo_contato_hora = r.hora || '09:00';
        upd.proximo_toque_em = new Date(`${r.data}T${upd.proximo_contato_hora}:00-03:00`).toISOString();
        break; // cadência pausada até o retorno
      }
      case 'atendeu_sem_interesse':
        upd.status = 'descartado'; upd.status_desde = agoraIso; encerraCadencia(); break;
      case 'numero_errado':
        upd.status = 'descartado'; upd.status_desde = agoraIso; upd.telefone_valido = false; encerraCadencia(); break;
      case 'opt_out':
        upd.status = 'descartado'; upd.status_desde = agoraIso; upd.consentimento_status = 'opt_out'; encerraCadencia(); break;
      case 'reuniao_marcada':
        upd.status = 'reuniao_marcada'; upd.status_desde = agoraIso; upd.alerta_stale = false;
        if (reuniao_em) upd.reuniao_em = new Date(reuniao_em).toISOString();
        encerraCadencia(); break;
      case 'no_show': {
        const cads = await sr.Cadencia.filter({ padrao_para: 'no_show', ativa: true }, '-created_date', 1);
        upd.status = 'atendeu'; upd.status_desde = agoraIso;
        if (cads[0]) { upd.cadencia_id = cads[0].id; upd.cadencia_passo = 0; upd.proximo_toque_em = agoraIso; }
        break;
      }
      case 'whatsapp_enviado':
      case 'caixa_postal':
      case 'nao_atendeu': {
        if (fila.status === 'atendeu') {
          upd.tentativas_contato = (fila.tentativas_contato || 0) + 1; // ghosting: ≥4 sugere Nutrição
        } else {
          upd.tentativas = (fila.tentativas || 0) + (resultado === 'whatsapp_enviado' ? 0 : 1);
        }
        const temCadencia = await avancarCadencia();
        if (!temCadencia && fila.status === 'pendente' && resultado !== 'whatsapp_enviado') {
          // Sem cadência: comportamento clássico — reagenda para o próximo dia útil
          const dataProx = proximoDiaUtil(dataMaisDias(hoje, 1));
          upd.status = 'nao_atendeu'; upd.proximo_contato = dataProx; upd.status_desde = agoraIso;
          await sr.AgendaContato.create({
            lead_id: fila.ref_id, lead_nome: fila.nome, lead_telefone: fila.telefone || '', lead_cpf_cnpj: fila.cpf_cnpj || '',
            cliente_id: fila.cliente_id || fila.ref_id, vendedor_id: fila.vendedor_id, vendedor_nome: fila.vendedor_nome || '',
            data_agendada: dataProx, posicao_dia: 0, lote_id: fila.lote_id || '', status: 'pendente', resultado: '',
          }).catch(() => {});
        }
        break;
      }
    }

    // ---------- Opt-out: supressão global ----------
    if (resultado === 'opt_out') {
      await sr.ListaSupressao.create({ cpf_cnpj: (fila.cpf_cnpj || '').replace(/\D/g, ''), telefone_e164: fila.telefone_e164 || '', nome: fila.nome, motivo: 'opt_out', criado_por: user.email }).catch(() => {});
      const marca = { consentimento_status: 'opt_out', opt_out_em: agoraIso };
      for (const id of new Set([fila.ref_id, fila.cliente_id].filter(Boolean))) {
        await sr.Lead.update(id as string, marca).catch(() => {});
        await sr.Cliente.update(id as string, { consentimento_status: 'opt_out' }).catch(() => {});
      }
    }
    if (resultado === 'numero_errado') {
      for (const id of new Set([fila.ref_id, fila.cliente_id].filter(Boolean))) {
        await sr.Lead.update(id as string, { telefone_valido: false }).catch(() => {});
        await sr.Cliente.update(id as string, { telefone_valido: false }).catch(() => {});
      }
    }

    // ---------- Fecha agendas pendentes do dia/atrasadas deste lead (exceto a recém-criada p/ futuro) ----------
    if (['atendeu_interessado', 'atendeu_retorno', 'atendeu_sem_interesse', 'numero_errado', 'opt_out', 'reuniao_marcada', 'respondeu'].includes(resultado)) {
      const ags = await sr.AgendaContato.filter({ lead_id: fila.ref_id, vendedor_id: fila.vendedor_id, status: 'pendente', data_agendada: { $lte: hoje } }, 'data_agendada', 20).catch(() => []);
      for (const ag of ags) await sr.AgendaContato.update(ag.id, { status: 'realizado', realizado_em: agoraIso, resultado: rotulo }).catch(() => {});
    }

    // ---------- Histórico, registro e interação ----------
    hist.push({ status: upd.status || fila.status, observacao: `${canal === 'whatsapp' ? '💬' : '📞'} ${rotulo}${observacao ? ' — ' + observacao : ''}`, data: agoraIso });
    upd.historico = hist;
    await sr.FilaContato.update(fila_id, upd);

    await sr.RegistroContato.create({
      fila_id, cliente_id: fila.cliente_id || fila.ref_id, lead_nome: fila.nome,
      vendedor_id: fila.vendedor_id, vendedor_nome: fila.vendedor_nome || '',
      canal, resultado, duracao_seg: duracao_seg || undefined, passo_cadencia: fila.cadencia_passo ?? undefined,
      cadencia_id: fila.cadencia_id || undefined, modelo_id: modelo_id || undefined, observacao: observacao || undefined,
      data_dia: nowB.data, primeiro_toque: primeiro, segundos_ate_primeiro_toque: segAte,
    }).catch(() => {});

    if (modelo_id) {
      const m = await sr.ModeloMensagem.get(modelo_id).catch(() => null);
      if (m) await sr.ModeloMensagem.update(modelo_id, { envios: (m.envios || 0) + 1, respostas: (m.respostas || 0) + (resultado === 'respondeu' ? 1 : 0) }).catch(() => {});
    }

    await sr.InteracaoCliente.create({
      cliente_id: fila.cliente_id || fila.ref_id, cliente_nome: fila.nome,
      vendedor_id: fila.vendedor_id, vendedor_nome: fila.vendedor_nome || '',
      tipo: canal === 'whatsapp' ? 'WhatsApp' : 'Ligação',
      descricao: `${rotulo}${observacao ? ' — ' + observacao : ''}`,
      data_interacao: hoje,
      proximo_contato: upd.proximo_contato || null,
      resultado: ['atendeu_interessado', 'reuniao_marcada', 'respondeu'].includes(resultado) ? 'Positivo'
        : ['atendeu_sem_interesse', 'opt_out', 'numero_errado'].includes(resultado) ? 'Negativo'
        : ['nao_atendeu', 'caixa_postal', 'whatsapp_enviado'].includes(resultado) ? 'Sem resposta' : 'Neutro',
      status: 'realizada',
    }).catch(() => {});

    return Response.json({ success: true, status: upd.status || fila.status, proximo_contato: upd.proximo_contato || null, proximo_toque_em: upd.proximo_toque_em || null, proximo_passo: proximoPasso, sugerir_nutricao: (upd.tentativas_contato || 0) >= 4 });
  } catch (error) {
    console.error('registrarResultadoContato:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
