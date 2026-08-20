import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { proximoDaRoleta } from '../../shared/roletaDistribuicao.ts';

// Cria uma indicação a partir do painel autenticado do indicador.
// Localiza o parceiro pelo e-mail do usuário logado (não exige link_token).
// Reaproveita a mesma esteira de distribuição da Central de Leads usada pelo
// formulário público (indicacaoParceiroPublica).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.email) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const parceiros = await base44.asServiceRole.entities.Parceiro.filter({ email: user.email, ativo: true });
    if (parceiros.length === 0) {
      return Response.json({ error: 'Nenhum cadastro de indicador ativo vinculado ao seu usuário' }, { status: 404 });
    }
    const parceiro = parceiros[0];

    // Garante link_token (necessário para o portal público e como referência)
    let token = parceiro.link_token;
    if (!token) {
      token = 'ind_' + crypto.randomUUID().replace(/-/g, '');
      await base44.asServiceRole.entities.Parceiro.update(parceiro.id, {
        link_token: token,
        link_gerado_em: new Date().toISOString(),
      });
    }

    const body = await req.json();
    const dados = body.dados || {};

    // Sanitiza campos numéricos
    const numFields = ['valor_estimado', 'pf_renda', 'pj_faturamento'];
    for (const f of numFields) {
      if (dados[f] === '' || dados[f] === undefined) dados[f] = null;
    }

    // Validação mínima
    if (!dados.tipo || !dados.produto) {
      return Response.json({ error: 'Tipo e produto são obrigatórios' }, { status: 400 });
    }
    if (dados.tipo === 'PF' && !dados.pf_nome?.trim()) {
      return Response.json({ error: 'Nome do titular é obrigatório (PF)' }, { status: 400 });
    }
    if (dados.tipo === 'PJ' && !dados.pj_razao_social?.trim()) {
      return Response.json({ error: 'Razão Social é obrigatória (PJ)' }, { status: 400 });
    }

    const lead = await base44.asServiceRole.entities.LeadIndicacao.create({
      parceiro_id: parceiro.id,
      parceiro_nome: parceiro.nome,
      parceiro_email: parceiro.email,
      parceiro_percentual: parceiro.percentual_comissao ?? 0,
      link_token: token,
      link_preenchido_em: new Date().toISOString(),
      status: 'novo',
      ...dados,
    });

    // ── Distribuição na Central de Leads (ConversaWhatsapp + Lead) round-robin ──
    let conversa_id = null;
    let vendedor_atribuido = null;
    const telefoneRaw = dados.tipo === 'PF' ? (dados.pf_whatsapp || dados.pf_telefone) : (dados.pj_whatsapp || dados.pj_telefone);
    const telefone = telefoneRaw ? String(telefoneRaw).replace(/\D/g, '') : '';

    if (telefone) {
      try {
        const nomeLead = dados.tipo === 'PF' ? dados.pf_nome : dados.pj_razao_social;
        const docLead = dados.tipo === 'PF' ? dados.pf_cpf : dados.pj_cnpj;
        const emailLead = dados.tipo === 'PF' ? dados.pf_email : dados.pj_email;
        const valorTxt = dados.valor_estimado ? `Valor est.: R$ ${Number(dados.valor_estimado).toLocaleString('pt-BR')}` : '';
        const resumoTxt = dados.observacoes ? `Resumo de Vendas: ${dados.observacoes}` : '';
        const obsLead = ['Indicação de ' + parceiro.nome, valorTxt, resumoTxt].filter(Boolean).join(' · ');

        const todosVendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true }, 'nome');
        const vendedores = todosVendedores.filter(v => v.recebe_leads_indicacao !== false);

        if (vendedores.length > 0) {
          const agora = new Date();
          const statusGerentes = await base44.asServiceRole.entities.StatusGerente.list();
          const statusMap = {};
          for (const s of statusGerentes) statusMap[s.vendedor_id] = s;
          const disponiveis = vendedores.filter(v => {
            const st = statusMap[v.id];
            if (!st) return true;
            if (!st.disponivel) {
              if (st.bloqueado_ate && new Date(st.bloqueado_ate) < agora) return true;
              return false;
            }
            return true;
          });
          const pool = disponiveis.length > 0 ? disponiveis : vendedores;

          const vendedor = await proximoDaRoleta(base44, pool);
          vendedor_atribuido = vendedor?.nome || null;

          const leadCentral = await base44.asServiceRole.entities.Lead.create({
            nome: nomeLead,
            telefone,
            email: emailLead || '',
            cpf_cnpj: docLead || '',
            vendedor_id: vendedor.id,
            vendedor_nome: vendedor.nome,
            status: 'novo',
            origem: `Indicação · ${parceiro.nome}`,
            observacao: obsLead,
            produto_interesse: dados.produto || '',
          });

          const conversa = await base44.asServiceRole.entities.ConversaWhatsapp.create({
            lead_id: leadCentral.id,
            lead_nome: nomeLead,
            telefone,
            vendedor_id: vendedor.id,
            vendedor_nome: vendedor.nome,
            status: 'ativa',
            origem: `Indicação · ${parceiro.nome}`,
            produto_interesse: dados.produto || '',
            observacao_ia: obsLead,
            mensagens: [{
              de: 'Sistema',
              texto: `Lead indicado por ${parceiro.nome} (parceiro). Produto: ${dados.produto || '—'}${dados.valor_estimado ? ' · Valor est.: R$ ' + Number(dados.valor_estimado).toLocaleString('pt-BR') : ''}${dados.observacoes ? ' · Resumo de Vendas: ' + dados.observacoes : ''}.`,
              timestamp: agora.toISOString(),
              tipo: 'sistema',
            }],
            nao_lidas: 0,
            ultima_mensagem_em: agora.toISOString(),
            primeira_mensagem_lead_em: agora.toISOString(),
            migracoes: [],
            alerta_sem_resposta: false,
          });
          conversa_id = conversa.id;
        }
      } catch (e) {
        console.log('Falha ao criar card na Central de Leads:', e.message);
      }
    }

    return Response.json({ success: true, lead_id: lead.id, conversa_id, vendedor_atribuido });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}