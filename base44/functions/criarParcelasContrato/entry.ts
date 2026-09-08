import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createWithRetry(fn, retries = 3, delay = 600) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i < retries - 1) await sleep(delay * (i + 1));
      else throw e;
    }
  }
}

// Data de hoje no formato YYYY-MM-DD no fuso de Brasília
function todayBrasiliaISO() {
  return new Date()
    .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .split('/').reverse().join('-');
}

function daysInMonthUTC(y, mIdx) {
  return new Date(Date.UTC(y, mIdx + 1, 0)).getUTCDate();
}

// Vencimento da parcela i (1-based): data-base + (i-1) meses,
// aplicando o dia de vencimento fixo do contrato quando informado.
function vencimentoParcela(isoBase, indiceParcela, diaVencimento) {
  const [y, m, d] = isoBase.split('-').map(Number);
  const totalMonths = (m - 1) + (indiceParcela - 1);
  const ny = y + Math.floor(totalMonths / 12);
  const nm = ((totalMonths % 12) + 12) % 12;
  const diaAlvo = (diaVencimento >= 1 && diaVencimento <= 31) ? Math.round(diaVencimento) : d;
  const dia = Math.min(diaAlvo, daysInMonthUTC(ny, nm));
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Gera as ParcelaVenda (parcelas vincendas) de um contrato para a venda informada.
// Idempotente: pula parcelas cujo número já existe para a venda.
async function gerarParcelas(base44, contrato, vendaId) {
  const numParcelas = Math.round(contrato.num_parcelas || 0);
  if (numParcelas <= 0 || !vendaId) return { criadas: 0, motivo: 'sem parcelas' };

  const existentes = await base44.asServiceRole.entities.ParcelaVenda.filter({ venda_id: vendaId });
  const numerosExistentes = new Set(existentes.map((p) => p.numero_parcela));

  const restante = (contrato.valor_total || 0) - (contrato.valor_adesao || 0);
  const valorParcela = contrato.valor_parcela > 0
    ? contrato.valor_parcela
    : (restante > 0 ? restante / numParcelas : (contrato.valor_total || 0) / numParcelas);

  const baseISO = contrato.data_primeiro_pagamento || contrato.data_contrato || todayBrasiliaISO();

  let criadas = 0;
  for (let i = 1; i <= numParcelas; i++) {
    if (numerosExistentes.has(i)) continue;
    if (criadas > 0) await sleep(400);
    await createWithRetry(() =>
      base44.asServiceRole.entities.ParcelaVenda.create({
        venda_id: vendaId,
        numero_parcela: i,
        total_parcelas: numParcelas,
        valor_parcela: Math.round(valorParcela * 100) / 100,
        data_vencimento: vencimentoParcela(baseISO, i, contrato.dia_vencimento),
        status: 'pendente',
        pipeline_id: '',
        cliente_nome: contrato.nome || '',
        cliente_cpf_cnpj: contrato.cpf_cnpj || '',
        produto: contrato.tipo || '',
        vendedor_id: contrato.vendedor_id || '',
        vendedor_nome: contrato.vendedor_nome || '',
        percentual_comissao: 0,
        indicadores: contrato.indicadores || [],
        forma_pagamento: contrato.origem_pagamento || contrato.forma_pagamento || '',
      })
    );
    criadas++;
  }
  return { criadas };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Modo individual: contrato acabou de gerar a venda — cria as parcelas dele
    if (body?.contrato_id && body?.venda_id) {
      const contrato = await base44.asServiceRole.entities.Contrato.get(body.contrato_id);
      const res = await gerarParcelas(base44, contrato, body.venda_id);
      return Response.json({ success: true, ...res });
    }

    // Modo retroativo (admin): aplica aos contratos gerados no mês corrente
    if (body?.retroativo) {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const mesAtual = todayBrasiliaISO().slice(0, 7); // YYYY-MM
      const contratos = await base44.asServiceRole.entities.Contrato.list('-created_date', 500);
      const doMes = contratos.filter(
        (c) => (c.created_date || '').startsWith(mesAtual) && (c.num_parcelas || 0) > 0
      );

      const vendas = await base44.asServiceRole.entities.Venda.list('-created_date', 1000);

      let processados = 0;
      let semVenda = 0;
      let jaPossuia = 0;
      let parcelasCriadas = 0;

      for (const ct of doMes) {
        // Localiza a venda gerada por este contrato (marca de origem na observação)
        const venda = vendas.find(
          (v) =>
            v.cpf_cnpj === ct.cpf_cnpj &&
            v.produto === ct.tipo &&
            (v.observacao || '').includes('Originado do Contrato')
        );
        if (!venda) { semVenda++; continue; }

        const res = await gerarParcelas(base44, ct, venda.id);
        parcelasCriadas += res.criadas;
        if (res.criadas > 0) processados++;
        else jaPossuia++;
      }

      return Response.json({
        success: true,
        mes: mesAtual,
        contratosParceladosNoMes: doMes.length,
        processados,
        semVenda,
        jaPossuia,
        parcelasCriadas,
      });
    }

    return Response.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}