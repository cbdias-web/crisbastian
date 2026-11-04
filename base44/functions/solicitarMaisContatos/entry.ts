import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hojeBrasilia } from '../../shared/diaUtil.ts';
import { CAP_FILA_DIA as CAP_PADRAO } from '../../shared/regrasEsteira.ts';
import { listAll, getConfigFila } from '../../shared/listAll.ts';

// Repõe a Agenda do Dia do gerente com novos leads da PRÓPRIA carteira, a pedido
// dele (botão "Solicitar mais clientes" na Fila de Contatos). Respeita o CAP 10:
// preenche apenas as vagas liberadas pelos contatos concluídos. Clientes sem
// telefone e já resolvidos (convertido/descartado) ficam de fora, seguindo as
// mesmas guardas da esteira.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const body = await req.json().catch(() => ({})) || {};
    const isAdmin = user.role === 'admin' || user.permissao_admin === true;

    // Resolve o gerente: admin (ex.: espelhando) pode passar vendedor_id;
    // gerente comum usa a própria carteira (casada por e-mail).
    let vendedor;
    if (body.vendedor_id && isAdmin) {
      vendedor = await base44.asServiceRole.entities.Vendedor.get(body.vendedor_id).catch(() => null);
    } else {
      const vends = await base44.entities.Vendedor.filter({ email: user.email });
      vendedor = vends[0] || null;
    }
    if (!vendedor) return Response.json({ error: 'Gerente não encontrado para o seu usuário' }, { status: 404 });

    const hoje = hojeBrasilia();
    const agora = new Date().toISOString();
    const cfg = await getConfigFila(base44);
    const CAP_FILA_DIA = Number(cfg.cap_carteira_dia) || CAP_PADRAO;

    // Vagas livres da carteira (cap 10 menos pendentes atuais)
    const pendentes = await base44.asServiceRole.entities.FilaContato.filter(
      { vendedor_id: vendedor.id, status: 'pendente', tipo_origem: 'carteira' }, '-created_date', 1000
    );
    const vagas = CAP_FILA_DIA - pendentes.length;
    if (vagas <= 0) {
      return Response.json({ success: true, adicionados: 0, motivo: 'cheia', pendentes: pendentes.length });
    }

    // Clientes da carteira ainda não na fila/agenda de hoje
    const clientes = await base44.asServiceRole.entities.Cliente.filter(
      { vendedor_id: vendedor.id }, '-score', 1500
    );
    const naFila = new Set(pendentes.map((f: any) => f.ref_id || f.cliente_id));
    const agendasHoje = await base44.asServiceRole.entities.AgendaContato.filter(
      { vendedor_id: vendedor.id, data_agendada: hoje }, 'posicao_dia', 500
    );
    const agendadosHoje = new Set(agendasHoje.map((a: any) => a.lead_id || a.cliente_id));

    // Anti-retrabalho: último estado do lead por cliente — resolvido não volta
    const todaFila = await listAll(base44.asServiceRole.entities.FilaContato, { vendedor_id: vendedor.id }, '-created_date');
    const agPend = await listAll(base44.asServiceRole.entities.AgendaContato, { vendedor_id: vendedor.id, status: 'pendente' }, 'data_agendada');
    const comAgendaPend = new Set(agPend.flatMap((a: any) => [a.lead_id, a.cliente_id].filter(Boolean)));
    const resolvidoPorCliente = new Map();
    for (const f of todaFila) {
      const cid = f.cliente_id || (f.tipo_origem === 'carteira' ? f.ref_id : '');
      if (cid && !resolvidoPorCliente.has(cid)) resolvidoPorCliente.set(cid, f.status);
    }

    const candidatos = clientes.filter((c: any) =>
      (c.telefone || '').replace(/\D/g, '').length >= 8 &&
      !naFila.has(c.id) &&
      !agendadosHoje.has(c.id) &&
      !comAgendaPend.has(c.id) && !(c.lead_id && comAgendaPend.has(c.lead_id)) &&
      c.consentimento_status !== 'opt_out' && c.consentimento_status !== 'nao_perturbe' &&
      !['convertido', 'descartado'].includes(resolvidoPorCliente.get(c.id) || '')
    );
    if (candidatos.length === 0) {
      return Response.json({ success: true, adicionados: 0, motivo: 'sem_candidatos' });
    }

    const selecionados = candidatos.slice(0, vagas);
    let posAgenda = agendasHoje.length + 1;
    let posFila = 1 + pendentes.reduce((m: number, f: any) => Math.max(m, f.posicao || 0), 0);

    for (const c of selecionados) {
      await base44.asServiceRole.entities.AgendaContato.create({
        lead_id: c.id,
        lead_nome: c.nome,
        lead_cpf_cnpj: c.cpf_cnpj || '',
        lead_telefone: c.telefone || '',
        cliente_id: c.id,
        vendedor_id: vendedor.id,
        vendedor_nome: vendedor.nome,
        data_agendada: hoje,
        posicao_dia: posAgenda++,
        lote_id: '',
        status: 'pendente',
        resultado: '',
      });
      const enr: any = {};
      for (const k of ['id_externo','produto_contratado','valor_contrato','responsavel_origem','tipo_pessoa','email','cidade','telefone_e164','telefone_valido','score','segmento','consentimento_status','cadencia_id']) {
        if (c[k] !== undefined && c[k] !== null && c[k] !== '') enr[k] = c[k];
      }
      if (c.estado) enr.uf = c.estado;
      await base44.asServiceRole.entities.FilaContato.create({
        ...enr,
        vendedor_email: vendedor.email || '',
        tipo_origem: 'carteira',
        ref_id: c.id,
        cliente_id: c.id,
        nome: c.nome || '',
        telefone: c.telefone || '',
        cpf_cnpj: c.cpf_cnpj || '',
        vendedor_id: vendedor.id,
        vendedor_nome: vendedor.nome || '',
        data_fila: hoje,
        prioridade: 1,
        posicao: posFila++,
        tentativas: 0,
        status: 'pendente',
        origem_label: 'Carteira',
        historico: [{ status: 'pendente', observacao: 'Item incluído na fila do dia (solicitação do gerente)', data: agora }],
      });
    }

    return Response.json({
      success: true,
      adicionados: selecionados.length,
      vagas_restantes: vagas - selecionados.length,
    });
  } catch (error) {
    console.error('solicitarMaisContatos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}