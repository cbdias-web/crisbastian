import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Sanitization helpers ──────────────────────────────────────────────
// LLMs frequentemente retornam numeros como strings formatadas em pt-BR
// ("R$ 5.000,00", "12", "3.5%") e datas como DD/MM/YYYY.
// A entidade exige numbers reais e datas YYYY-MM-DD.

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'number') return val;
  let s = String(val).trim();
  // Remove prefixos de moeda, %, espacos
  s = s.replace(/R\$|\$|USD|EUR|BRL|%/gi, '').trim();
  // Se nao tem virgula nem ponto, e inteiro puro
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  // Formato pt-BR: 1.234,56 ou 1234,56
  if (s.includes(',')) {
    // Remove separadores de milhar (pontos), troca virgula decimal por ponto
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function parseDate(val) {
  if (!val || typeof val !== 'string') return val;
  const s = val.trim();
  // DD/MM/YYYY → YYYY-MM-DD
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // DD/MM/YYYY HH:mm → YYYY-MM-DD
  const brTime = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s/);
  if (brTime) return `${brTime[3]}-${brTime[2]}-${brTime[1]}`;
  return s;
}

const NUMERICOS_CONTRATO = [
  'valor_adesao', 'valor_parcela', 'num_parcelas', 'valor_total',
  'cotacao', 'valor_em_moeda', 'prazo_meses', 'dia_vencimento',
  'mensalidade', 'valor_divida', 'percentual_montante',
];
const NUMERICOS_VENDA = [
  'valor', 'valor_total_contrato', 'num_parcelas', 'percentual_comissao',
];
const DATE_FIELDS = [
  'data_contrato', 'data_primeiro_pagamento', 'nascimento', 'data',
  'parcelamento',
];

function sanitizeDados(dados, camposNumericos) {
  const limpo = {};
  for (const [k, v] of Object.entries(dados)) {
    if (v === null || v === undefined || v === '') continue;
    let val = v;
    if (camposNumericos.includes(k)) {
      val = parseNumber(v);
      if (val === undefined) continue;
    } else if (DATE_FIELDS.includes(k)) {
      val = parseDate(v);
    }
    limpo[k] = val;
  }
  return limpo;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const { chamado_id, acao } = body;
    if (!chamado_id || !acao || !acao.tipo) {
      return Response.json({ error: 'chamado_id e acao.tipo sao obrigatorios' }, { status: 400 });
    }

    const admin = base44.asServiceRole;
    const tipo = acao.tipo;

    // Validar campos obrigatorios ANTES de sanitizar (strings cruas do LLM)
    if (tipo === 'criar_contrato') {
      const dadosRaw = acao.dados || {};
      if (!dadosRaw.tipo || !dadosRaw.nome || !dadosRaw.cpf_cnpj) {
        return Response.json({
          success: false,
          error: 'Dados insuficientes para criar contrato. Campos obrigatorios: tipo, nome, cpf_cnpj.'
        }, { status: 400 });
      }
    }
    if (tipo === 'criar_venda') {
      const dadosRaw = acao.dados || {};
      if (!dadosRaw.produto || !dadosRaw.assessor_comercial || dadosRaw.valor === undefined || !dadosRaw.data || !dadosRaw.tipo_venda) {
        return Response.json({
          success: false,
          error: 'Dados insuficientes para criar venda. Campos obrigatorios: produto, assessor_comercial, valor, data, tipo_venda.'
        }, { status: 400 });
      }
    }

    // Sanitizar dados: converter strings numericas → numbers, datas pt-BR → ISO
    const camposNumericos = tipo === 'criar_venda' ? NUMERICOS_VENDA : NUMERICOS_CONTRATO;
    const dados = sanitizeDados(acao.dados || {}, camposNumericos);

    // Buscar o chamado para contexto
    let chamado = null;
    try { chamado = await admin.entities.ChamadoSuporte.get(chamado_id); } catch (_) {}

    if (tipo === 'criar_contrato') {
      // Garantir que o vendedor esteja vinculado se possivel
      if (!dados.vendedor_id && chamado?.usuario_email) {
        try {
          const vendedores = await admin.entities.Vendedor.list();
          const vendedor = vendedores.find(v => v.email === chamado.usuario_email);
          if (vendedor) {
            dados.vendedor_id = vendedor.id;
            dados.vendedor_nome = vendedor.nome;
          }
        } catch (_) {}
      }

      const contrato = await admin.entities.Contrato.create({
        ...dados,
        status: 'gerado',
        data_contrato: dados.data_contrato || new Date().toISOString().slice(0, 10),
      });

      // Notificacao de novo contrato
      try {
        await admin.functions.invoke('notificarNovoContrato', { contrato_id: contrato.id });
      } catch (_) {}

      return Response.json({
        success: true,
        tipo: 'criar_contrato',
        contrato_id: contrato.id,
        mensagem: `Contrato ${dados.tipo} criado para ${dados.nome}.`,
      });
    }

    if (tipo === 'criar_venda') {
      const venda = await admin.entities.Venda.create({
        ...dados,
        considerar_acumulado: dados.considerar_acumulado !== false,
      });

      // Criar parcelas se aplicavel
      if (dados.num_parcelas && dados.num_parcelas > 0) {
        try {
          await admin.functions.invoke('criarParcelasVenda', { venda_id: venda.id });
        } catch (_) {}
      }

      return Response.json({
        success: true,
        tipo: 'criar_venda',
        venda_id: venda.id,
        mensagem: `Venda de ${dados.produto} registrada para ${dados.cliente || dados.assessor_comercial}.`,
      });
    }

    if (tipo === 'atualizar_contrato') {
      const contratoId = acao.dados?.contrato_id;
      if (!contratoId) {
        return Response.json({
          success: false,
          error: 'contrato_id e obrigatorio para atualizar_contrato.'
        }, { status: 400 });
      }
      const updateData = { ...dados };
      delete updateData.contrato_id;

      const contrato = await admin.entities.Contrato.update(contratoId, updateData);

      return Response.json({
        success: true,
        tipo: 'atualizar_contrato',
        contrato_id: contratoId,
        mensagem: `Contrato atualizado.`,
      });
    }

    return Response.json({
      success: true,
      tipo: 'nenhuma',
      mensagem: 'Nenhuma acao executavel necessaria.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});