import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hojeBrasilia } from '../../shared/diaUtil.ts';
import { CAP_FILA_DIA, DIAS_SEM_CONTATO } from '../../shared/regrasEsteira.ts';

// Monta/sincroniza a esteira "Fila de Contatos / Agenda do Dia" de um vendedor
// (ou de todos os ativos — chamada diária da automação).
//
// Regras da esteira:
// - CAP 10 (CARTEIRA): máximo de 10 leads pendentes da CARTEIRA por gerente/SDR.
//   Indicações do Dash Parceiro entram 100% na esteira, sem limite de vagas —
//   e permanecem registradas mesmo depois de convertidas em clientes.
// - 5 DIAS: lead pendente há mais de 5 dias sem contato sai da esteira
//   (descartado). O "Voltar à fila" do gerente o traz de volta e reinicia a
//   contagem (entrada reagendada para hoje, no fim da fila).
// - Anti-retrabalho/oxigenação (mantidos): lead resolvido (desqualificado/
//   convertido) nunca volta como pendente; lead já trabalhado não reentra
//   automaticamente — apenas via "Voltar à fila".
// - Apenas perfis internos sem agenda/carteira (ex.: Cris Bastian) ficam fora;
//   administradores que atuam como gerente/SDR (ex.: Jonathan Dutra)
//   participam normalmente da esteira.
//
// Payload: { vendedor_id?: string }

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Tarefas agendadas invocam sem usuário autenticado: nesse caso roda como
    // service role para todos os vendedores ativos (promoção diária automática
    // da Agenda do Dia). Quando chamada por um usuário, respeita admin/não-admin.
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({})) || {};
    const hoje = hojeBrasilia();
    const agora = new Date().toISOString();

    // ── Vendedores alvo ──
    let vendedores;
    if (body.vendedor_id) {
      const v = await base44.asServiceRole.entities.Vendedor.get(body.vendedor_id).catch(() => null);
      vendedores = v ? [v] : [];
    } else if (user) {
      const isAdmin = user.role === 'admin' || user.permissao_admin === true;
      if (!isAdmin) {
        vendedores = await base44.entities.Vendedor.filter({ email: user.email });
      } else {
        vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });
      }
    } else {
      // Scheduler (sem usuário): todos os vendedores ativos
      vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });
    }

    // ── Exclusão: perfis internos sem agenda/carteira (ex.: Cris Bastian) ──
    const semAcento = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const NOMES_EXCLUIDOS = ['cris bastian', 'cris.bastian', 'crisbastian'];
    const excluido = (v: any) => {
      const n = semAcento(v.nome);
      const e = (v.email || '').toLowerCase();
      return NOMES_EXCLUIDOS.some((x) => n.includes(x) || e.includes(x));
    };
    const vendedoresAtivos = vendedores.filter((v) => v.ativo !== false && !excluido(v));

    // ── Cargas globais ──
    const todaFila = await base44.asServiceRole.entities.FilaContato.list('-created_date', 2000);
    const todasConversas = await base44.asServiceRole.entities.ConversaWhatsapp.list('-created_date', 1000);
    const todasIndicacoes = await base44.asServiceRole.entities.LeadIndicacao.list('-created_date', 1000);

    const norm = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const dataEntrada = (f: any) => f.data_fila || (f.created_date || '').slice(0, 10);

    // Item mais recente por (origem|ref|vendedor) — lista em ordem decrescente
    const porRefMap = new Map();
    for (const f of todaFila) {
      const k = `${f.tipo_origem}|${f.ref_id}|${f.vendedor_id}`;
      if (!porRefMap.has(k)) porRefMap.set(k, f);
    }

    // ── Leads resolvidos (anti-retrabalho) ──
    // Considera o estado MAIS RECENTE do lead (por conversa / cliente / nome),
    // permitindo que "Voltar à fila" desfaça um descarte anterior.
    const resolvidoStatusPorConversa = new Map();
    for (const [k, f] of porRefMap) {
      if (!k.startsWith('indicacao|')) continue;
      if (f.status === 'descartado' || f.status === 'convertido') {
        resolvidoStatusPorConversa.set(k.split('|')[1], f.status);
      }
    }
    const statusConversaResolvido = (s: string): string | null => {
      if (s === 'desqualificado' || s === 'encerrada') return 'descartado';
      if (s === 'convertido') return 'convertido';
      return null;
    };
    for (const c of todasConversas) {
      const rs = statusConversaResolvido(c.status);
      if (rs) resolvidoStatusPorConversa.set(c.id, rs);
    }

    const ultimoPorCliente = new Map();
    const ultimoPorNome = new Map();
    for (const f of todaFila) { // mais recentes primeiro
      if (f.cliente_id && !ultimoPorCliente.has(f.cliente_id)) ultimoPorCliente.set(f.cliente_id, f);
      const nm = f.nome ? norm(f.nome) : '';
      if (nm && !ultimoPorNome.has(nm)) ultimoPorNome.set(nm, f);
    }
    const resolvidoPorClienteId = new Map();
    const resolvidoPorNome = new Map();
    for (const [cid, f] of ultimoPorCliente) {
      if (f.status === 'convertido' || f.status === 'descartado') resolvidoPorClienteId.set(cid, f.status);
    }
    for (const [nm, f] of ultimoPorNome) {
      if (f.status === 'convertido' || f.status === 'descartado') resolvidoPorNome.set(nm, f.status);
    }

    // ── Limpeza 1: move itens pendentes de leads resolvidos para a coluna de destino ──
    let itensLimpos = 0;
    for (const f of todaFila) {
      if (f.status !== 'pendente') continue;
      let rs: string | null = null;
      if (f.tipo_origem === 'indicacao' && f.ref_id) rs = resolvidoStatusPorConversa.get(f.ref_id) || null;
      if (!rs && f.cliente_id) rs = resolvidoPorClienteId.get(f.cliente_id) || null;
      if (!rs && f.nome) rs = resolvidoPorNome.get(norm(f.nome)) || null;
      if (!rs) continue;
      // Protege "Voltar à fila" manual recente (não desfazer ação explícita do gerente)
      const upd = new Date(f.updated_date || f.created_date || agora).getTime();
      if (Date.now() - upd < 5 * 60 * 1000) continue;
      const hist = Array.isArray(f.historico) ? f.historico : [];
      hist.push({ status: rs, observacao: 'Limpeza automática: lead resolvido retirado da fila ativa', data: agora });
      await base44.asServiceRole.entities.FilaContato.update(f.id, { status: rs, historico: hist }).catch(() => {});
      itensLimpos++;
    }

    // ── Limpeza 2 (regra dos 5 dias): pendente sem contato há mais de 5 dias sai da esteira ──
    const [hy, hm, hdd] = hoje.split('-').map(Number);
    const dCorte = new Date(hy, hm - 1, hdd - DIAS_SEM_CONTATO);
    const dataCorte = `${dCorte.getFullYear()}-${String(dCorte.getMonth() + 1).padStart(2, '0')}-${String(dCorte.getDate()).padStart(2, '0')}`;
    const foraDaEsteira = new Set(); // ids descartados nesta execução (fora da contagem de vagas)
    let itensDescartados5d = 0;
    for (const f of todaFila) {
      if (f.status !== 'pendente') continue;
      const entrada = dataEntrada(f);
      if (!entrada || entrada >= dataCorte) continue;
      const hist = Array.isArray(f.historico) ? f.historico : [];
      hist.push({ status: 'descartado', observacao: `Limpeza automática: ${DIAS_SEM_CONTATO} dias sem contato`, data: agora });
      await base44.asServiceRole.entities.FilaContato.update(f.id, { status: 'descartado', historico: hist }).catch(() => {});
      foraDaEsteira.add(f.id);
      if (f.tipo_origem === 'indicacao' && f.ref_id) resolvidoStatusPorConversa.set(f.ref_id, 'descartado');
      if (f.cliente_id) resolvidoPorClienteId.set(f.cliente_id, 'descartado');
      if (f.nome) resolvidoPorNome.set(norm(f.nome), 'descartado');
      itensDescartados5d++;
    }

    // ── CAP 10 (CARTEIRA): máximo de leads pendentes da CARTEIRA por gerente ──
    // Mantém os 10 mais antigos (FIFO); excedentes da CARTEIRA saem da esteira
    // (itens pendentes removidos para que o lead possa reentrar pela reposição
    // futura). Indicações do Dash Parceiro NÃO contam no cap e NUNCA são
    // removidas: 100% dos leads de indicação devem constar na esteira.
    const pendentesEfetivos = todaFila.filter((f) => f.status === 'pendente' && !foraDaEsteira.has(f.id));
    const grupos = new Map(); // (origem|ref|vendedor) -> itens pendentes
    for (const f of pendentesEfetivos) {
      const k = `${f.tipo_origem}|${f.ref_id}|${f.vendedor_id}`;
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(f);
    }
    const gruposPorVendedor = new Map(); // vendedor_id -> [{k, entrada}]
    for (const [k, itens] of grupos) {
      const vid = itens[0].vendedor_id;
      if (!gruposPorVendedor.has(vid)) gruposPorVendedor.set(vid, []);
      gruposPorVendedor.get(vid).push({ k, entrada: itens.map((i) => dataEntrada(i)).sort()[0] });
    }
    const gruposDeletados = new Set();
    let gruposRemovidosCap = 0;
    for (const [vid, lista] of gruposPorVendedor) {
      // Cap vale apenas para a carteira
      const listaCarteira = lista.filter((g) => g.k.startsWith('carteira|'));
      if (listaCarteira.length > CAP_FILA_DIA) {
        listaCarteira.sort((a, b) => (a.entrada < b.entrada ? -1 : a.entrada > b.entrada ? 1 : 0));
        for (const g of listaCarteira.slice(CAP_FILA_DIA)) {
          gruposDeletados.add(g.k);
          for (const it of grupos.get(g.k)) {
            await base44.asServiceRole.entities.FilaContato.delete(it.id).catch(() => {});
          }
          gruposRemovidosCap++;
        }
      }
      gruposPorVendedor.set(vid, lista.map((g) => g.k));
    }

    const resolverLeadIndicacao = (c: any) => {
      const tel = (c.telefone || '').toString().replace(/\D/g, '');
      if (tel) {
        const byTel = todasIndicacoes.find((li) => {
          const t = (li.tipo === 'PF' ? (li.pf_whatsapp || li.pf_telefone || '') : (li.pj_whatsapp || li.pj_telefone || '')).toString().replace(/\D/g, '');
          return t && t === tel;
        });
        if (byTel) return byTel;
      }
      const nomeParceiro = (c.origem || '').replace(/^Indica[çc][aã]o\s*[·\-–]\s*/i, '').trim();
      return todasIndicacoes.find((li) => li.parceiro_nome === nomeParceiro && (
        (li.pf_nome && li.pf_nome === c.lead_nome) ||
        (li.pj_razao_social && li.pj_razao_social === c.lead_nome)
      )) || null;
    };

    // Mapeia status da ConversaWhatsapp → status da FilaContato
    const statusConversaParaFila = (s: string): string | null => {
      if (!s || s === 'ativa' || s === 'aguardando') return 'pendente';
      if (s === 'qualificado') return 'qualificado';
      if (s === 'convertido') return 'convertido';
      if (s === 'desqualificado' || s === 'encerrada') return 'descartado';
      return null;
    };

    let itensCriados = 0;
    let itensAtualizados = 0;

    for (const v of vendedoresAtivos) {
      const naEsteira = new Set(gruposPorVendedor.get(v.id) || []);
      // Vagas do cap contam apenas itens da CARTEIRA (indicações não ocupam vagas)
      const carteiraNaEsteira = [...naEsteira].filter((k) => k.startsWith('carteira|')).length;
      let vagas = Math.max(0, CAP_FILA_DIA - carteiraNaEsteira);
      let pos = 1 + pendentesEfetivos
        .filter((f) => f.vendedor_id === v.id)
        .reduce((m, f) => Math.max(m, f.posicao || 0), 0);

      // ── Indicações (ConversaWhatsapp — qualquer status) ──
      const conversas = await base44.asServiceRole.entities.ConversaWhatsapp.filter(
        { vendedor_id: v.id }, '-ultima_mensagem_em', 500
      );
      // FIFO: o lead que espera há mais tempo é o primeiro a entrar na reposição
      for (const c of [...conversas].reverse()) {
        const target = statusConversaParaFila(c.status || 'ativa');
        if (!target) continue;
        const key = `indicacao|${c.id}|${v.id}`;
        const deletado = gruposDeletados.has(key);

        if (target !== 'pendente') {
          // Não-pendente: sincroniza (atualiza item existente ou cria novo)
          if (deletado) continue;
          const existente = porRefMap.get(key);
          if (existente) {
            if (existente.status !== target) {
              const hist = Array.isArray(existente.historico) ? existente.historico : [];
              hist.push({ status: target, observacao: `Status sincronizado (${c.status})`, data: agora });
              await base44.asServiceRole.entities.FilaContato.update(existente.id, { status: target, historico: hist });
              itensAtualizados++;
            }
          } else {
            const li = resolverLeadIndicacao(c);
            await base44.asServiceRole.entities.FilaContato.create({
              tipo_origem: 'indicacao',
              ref_id: c.id,
              lead_indicacao_id: li?.id || '',
              nome: c.lead_nome || '',
              telefone: c.telefone || '',
              cpf_cnpj: li ? (li.tipo === 'PF' ? li.pf_cnpj : li.pj_cnpj) : '',
              produto: c.produto_interesse || li?.produto || '',
              valor_estimado: li?.valor_estimado ?? null,
              parceiro_nome: li?.parceiro_nome || '',
              parceiro_percentual: li?.parceiro_percentual ?? null,
              vendedor_id: v.id,
              vendedor_nome: v.nome || '',
              data_fila: hoje,
              prioridade: 0,
              posicao: pos++,
              tentativas: 0,
              status: target,
              origem_label: li?.parceiro_nome ? `Indicação · ${li.parceiro_nome}` : (c.origem || 'Indicação'),
              historico: [{ status: target, observacao: `Item sincronizado (${c.status})`, data: agora }],
            });
            itensCriados++;
          }
          continue;
        }

        // Pendente: indicações entram SEMPRE (sem cap — 100% na esteira),
        // passando apenas pelas guardas anti-retrabalho/oxigenação.
        if (naEsteira.has(key)) continue; // já está na esteira
        if (resolvidoStatusPorConversa.has(c.id)) continue; // resolvido nunca volta
        const recente = deletado ? null : porRefMap.get(key);
        if (recente && recente.status !== 'pendente') continue; // oxigenação: já foi trabalhado

        const li = resolverLeadIndicacao(c);
        await base44.asServiceRole.entities.FilaContato.create({
          tipo_origem: 'indicacao',
          ref_id: c.id,
          lead_indicacao_id: li?.id || '',
          nome: c.lead_nome || '',
          telefone: c.telefone || '',
          cpf_cnpj: li ? (li.tipo === 'PF' ? li.pf_cnpj : li.pj_cnpj) : '',
          produto: c.produto_interesse || li?.produto || '',
          valor_estimado: li?.valor_estimado ?? null,
          parceiro_nome: li?.parceiro_nome || '',
          parceiro_percentual: li?.parceiro_percentual ?? null,
          vendedor_id: v.id,
          vendedor_nome: v.nome || '',
          data_fila: hoje,
          prioridade: 0,
          posicao: pos++,
          tentativas: 0,
          status: 'pendente',
          origem_label: li?.parceiro_nome ? `Indicação · ${li.parceiro_nome}` : (c.origem || 'Indicação'),
          historico: [{ status: 'pendente', observacao: 'Item incluído na fila do dia', data: agora }],
        });
        naEsteira.add(key);
        itensCriados++;
      }

      // ── Carteira (prioridade 1): agendas pendentes de hoje ──
      const agendas = await base44.asServiceRole.entities.AgendaContato.filter(
        { vendedor_id: v.id, data_agendada: hoje }, 'posicao_dia'
      );
      for (const a of agendas) {
        if (a.status !== 'pendente' && a.status) continue;
        if (vagas <= 0) break;
        const key = `carteira|${a.lead_id}|${v.id}`;
        if (naEsteira.has(key)) continue;
        const deletado = gruposDeletados.has(key);
        // Guarda anti-retrabalho: carteira resolvida não reentra
        const recenteCart = deletado ? null : porRefMap.get(key);
        if (recenteCart && (recenteCart.status === 'convertido' || recenteCart.status === 'descartado')) continue;
        // Cross-origem: cliente já convertido/desqualificado não volta
        const cid = a.cliente_id || a.lead_id || '';
        if (cid && resolvidoPorClienteId.has(cid)) continue;
        if (a.lead_nome && resolvidoPorNome.has(norm(a.lead_nome))) continue;

        await base44.asServiceRole.entities.FilaContato.create({
          tipo_origem: 'carteira',
          ref_id: a.lead_id || a.cliente_id || '',
          cliente_id: a.cliente_id || a.lead_id || '',
          nome: a.lead_nome || '',
          telefone: a.lead_telefone || '',
          cpf_cnpj: a.lead_cpf_cnpj || '',
          vendedor_id: v.id,
          vendedor_nome: v.nome || '',
          data_fila: hoje,
          prioridade: 1,
          posicao: pos++,
          tentativas: 0,
          status: 'pendente',
          origem_label: 'Carteira',
          meet_link: a.meet_link || '',
          google_event_id: a.google_event_id || '',
          historico: [{ status: 'pendente', observacao: 'Item incluído na fila do dia', data: agora }],
        });
        naEsteira.add(key);
        vagas--;
        itensCriados++;
      }
    }

    // ── LeadIndicações convertidas SEM ConversaWhatsapp ──
    const leadIndicacaoJaNaFila = new Set(
      todaFila.filter((f) => f.lead_indicacao_id).map((f) => f.lead_indicacao_id)
    );
    const telConversaSet = new Set(todasConversas.map((c) => (c.telefone || '').toString().replace(/\D/g, '')).filter(Boolean));
    const convertidas = todasIndicacoes.filter((li) => {
      if (!['convertido_venda', 'convertido_contrato', 'convertido_cliente'].includes(li.status)) return false;
      if (leadIndicacaoJaNaFila.has(li.id)) return false;
      const tel = (li.tipo === 'PF' ? (li.pf_whatsapp || li.pf_telefone || '') : (li.pj_whatsapp || li.pj_telefone || '')).toString().replace(/\D/g, '');
      if (tel && telConversaSet.has(tel)) return false;
      return true;
    });
    for (const li of convertidas) {
      let vendedorId = '';
      let vendedorNome = '';
      if (li.cliente_id) {
        const cli = await base44.asServiceRole.entities.Cliente.get(li.cliente_id).catch(() => null);
        if (cli?.vendedor_id) { vendedorId = cli.vendedor_id; vendedorNome = cli.vendedor_nome || ''; }
      }
      if (!vendedorId && li.contrato_id) {
        const ctr = await base44.asServiceRole.entities.Contrato.get(li.contrato_id).catch(() => null);
        if (ctr?.vendedor_id) { vendedorId = ctr.vendedor_id; vendedorNome = ctr.vendedor_nome || ''; }
      }
      if (!vendedorId) continue;
      if (body.vendedor_id && vendedorId !== body.vendedor_id) continue;

      const nome = li.tipo === 'PF' ? li.pf_nome : li.pj_razao_social;
      const telefone = li.tipo === 'PF' ? (li.pf_whatsapp || li.pf_telefone || '') : (li.pj_whatsapp || li.pj_telefone || '');
      const doc = li.tipo === 'PF' ? li.pf_cnpj : li.pj_cnpj;

      await base44.asServiceRole.entities.FilaContato.create({
        tipo_origem: 'indicacao',
        ref_id: li.id,
        lead_indicacao_id: li.id,
        cliente_id: li.cliente_id || '',
        nome: nome || '',
        telefone: telefone || '',
        cpf_cnpj: doc || '',
        produto: li.produto || '',
        valor_estimado: li.valor_estimado ?? null,
        parceiro_nome: li.parceiro_nome || '',
        parceiro_percentual: li?.parceiro_percentual ?? null,
        vendedor_id: vendedorId,
        vendedor_nome: vendedorNome,
        data_fila: hoje,
        prioridade: 0,
        posicao: 1,
        tentativas: 0,
        status: 'convertido',
        origem_label: li.parceiro_nome ? `Indicação · ${li.parceiro_nome}` : 'Indicação',
        historico: [{ status: 'convertido', observacao: 'Indicação convertida sincronizada na esteira', data: agora }],
      });
      itensCriados++;
    }

    return Response.json({
      success: true,
      data_fila: hoje,
      vendedores_processados: vendedoresAtivos.length,
      itens_criados: itensCriados,
      itens_atualizados: itensAtualizados,
      itens_limpos: itensLimpos,
      itens_descartados_5dias: itensDescartados5d,
      grupos_removidos_cap: gruposRemovidosCap,
    });
  } catch (error) {
    console.error('montarFilaContatoDia:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}