import { base44 } from '@/api/base44Client';

// Nome normalizado para comparação (suporta espelhamentos cadastrados com nome
// abreviado em relação ao nome do parceiro, ex.: "Juliana Bertaco" vs
// "Juliana Bertaco Rosa" — mesmo indicador, registros com nomes diferentes).
const nomeNorm = (s) => String(s || '').trim().toUpperCase();
const mesmaPessoa = (nomeA, nomeB) => {
  const a = nomeNorm(nomeA), b = nomeNorm(nomeB);
  return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
};

// Ao rejeitar uma implantação por Compliance, o lead de origem Dash Parceiro
// deixa de contar como convertido para o indicador:
//  - status da LeadIndicacao vira 'rejeitado_compliance'
//  - o vínculo com a venda (venda_id) é desfeito — Dash Parceiro/Consolidado
//    param de contabilizar a venda, parcelas e comissão do indicador
//  - o indicador é removido do espelhamento da Venda, do Contrato e das
//    Parcelas vinculadas, e a ComissaoEspelhamento dele é excluída —
//    nenhuma comissão é contabilizada nas demais entidades
export async function registrarRejeicaoComplianceLead(implantacao) {
  try {
    if (!implantacao) return;
    let indicacoes = [];
    if (implantacao.venda_id) {
      indicacoes = await base44.entities.LeadIndicacao.filter({ venda_id: implantacao.venda_id });
    }
    if (indicacoes.length === 0 && implantacao.contrato_id) {
      indicacoes = await base44.entities.LeadIndicacao.filter({ contrato_id: implantacao.contrato_id });
    }
    // Fallback: reconcilia pelo documento (mesma lógica da sincronização da jornada)
    if (indicacoes.length === 0 && implantacao.cpf_cnpj) {
      const doc = String(implantacao.cpf_cnpj).replace(/\D/g, '');
      if (doc) {
        const todas = await base44.entities.LeadIndicacao.list('-created_date', 500);
        indicacoes = todas.filter(l =>
          l.parceiro_id &&
          l.status !== 'descartado' &&
          String(l.tipo === 'PF' ? l.pf_cnpj || '' : l.pj_cnpj || '').replace(/\D/g, '') === doc
        );
      }
    }

    // Apenas leads com origem no portal (Dash Parceiro) têm indicador/comissão
    const leadsPortal = indicacoes.filter(l => l.parceiro_id && l.status !== 'rejeitado_compliance');
    if (leadsPortal.length === 0) return;

    const marco = {
      status: 'implantacao_rejeitada',
      label: 'Implantação rejeitada por Compliance — comissão do indicador cancelada',
      data: new Date().toISOString(),
    };

    for (const li of leadsPortal) {
      const ehIndicador = (i) => i && (
        i.id === li.parceiro_id ||
        mesmaPessoa(i.nome, li.parceiro_nome)
      );
      // Remove o indicador do espelhamento da venda, do contrato e das parcelas,
      // e cancela a comissão de espelhamento gravada
      await removerIndicadorDoEspelhamento('Venda', implantacao.venda_id, li, ehIndicador);
      await removerIndicadorDoEspelhamento('Contrato', implantacao.contrato_id, li, ehIndicador);
      await limparParcelasEComissao(implantacao.venda_id, li, ehIndicador);
      // Deixa de contar como convertido: status rejeitado + vínculo da venda desfeito
      await base44.entities.LeadIndicacao.update(li.id, {
        status: 'rejeitado_compliance',
        venda_id: '',
        historico: [...(li.historico || []), marco],
      });
    }
  } catch (e) {}
}

// Remove a entrada do indicador do array `indicadores` da Venda/Contrato,
// cancelando o espelhamento — a comissão deixa de ser contada.
async function removerIndicadorDoEspelhamento(entity, id, li, ehIndicador) {
  try {
    if (!id) return;
    const reg = await base44.entities[entity].get(id);
    if (!reg || !Array.isArray(reg.indicadores)) return;
    const indicadores = reg.indicadores.filter(i => !ehIndicador(i));
    if (indicadores.length === reg.indicadores.length) return;
    const payload = { indicadores };
    const espelhava = reg.espelhamento_id === li.parceiro_id || mesmaPessoa(reg.espelhamento, li.parceiro_nome);
    if (espelhava) {
      payload.espelhamento_id = '';
      payload.espelhamento = '';
      payload.percentual_comissao_espelhamento = 0;
    }
    await base44.entities[entity].update(id, payload);
  } catch (e) {}
}

// Limpa o indicador das parcelas da venda e exclui a ComissaoEspelhamento dele
async function limparParcelasEComissao(vendaId, li, ehIndicador) {
  try {
    if (!vendaId) return;
    const parcelas = await base44.entities.ParcelaVenda.filter({ venda_id: vendaId });
    for (const p of parcelas) {
      if (!Array.isArray(p.indicadores)) continue;
      const indicadores = p.indicadores.filter(i => !ehIndicador(i));
      if (indicadores.length !== p.indicadores.length) {
        await base44.entities.ParcelaVenda.update(p.id, { indicadores });
      }
    }
    const coms = await base44.entities.ComissaoEspelhamento.filter({ venda_id: vendaId });
    for (const c of coms) {
      if (ehIndicador({ id: c.vendedor_id, nome: c.vendedor_nome })) {
        await base44.entities.ComissaoEspelhamento.delete(c.id);
      }
    }
  } catch (e) {}
}