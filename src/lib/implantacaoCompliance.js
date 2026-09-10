import { base44 } from '@/api/base44Client';

// Ao rejeitar uma implantação por Compliance, o lead de origem Dash Parceiro
// deixa de contar como convertido para o indicador:
//  - status da LeadIndicacao vira 'rejeitado_compliance'
//  - o vínculo com a venda (venda_id) é desfeito — Dash Parceiro/Consolidado
//    param de contabilizar a venda, parcelas e comissão do indicador
//  - o indicador é removido do espelhamento da Venda e do Contrato vinculados,
//    para que nenhuma comissão seja contabilizada nas demais entidades
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
      // Remove o indicador do espelhamento da venda e do contrato vinculados
      await removerIndicadorDoEspelhamento('Venda', implantacao.venda_id, li);
      await removerIndicadorDoEspelhamento('Contrato', implantacao.contrato_id, li);
      // Deixa de contar como convertido: status rejeitado + vínculo da venda desfeito
      await base44.entities.LeadIndicacao.update(li.id, {
        status: 'rejeitado_compliance',
        venda_id: '',
        historico: [...(li.historico || []), marco],
      });
    }
  } catch (e) {}
}

// Remove a entrada do indicador (parceiro do lead) do array `indicadores` da
// Venda/Contrato, cancelando o espelhamento — a comissão deixa de ser contada.
async function removerIndicadorDoEspelhamento(entity, id, li) {
  try {
    if (!id) return;
    const reg = await base44.entities[entity].get(id);
    if (!reg || !Array.isArray(reg.indicadores)) return;
    const ehIndicador = (i) => i && (
      i.id === li.parceiro_id ||
      (i.nome && li.parceiro_nome && i.nome.toUpperCase() === li.parceiro_nome.toUpperCase())
    );
    const indicadores = reg.indicadores.filter(i => !ehIndicador(i));
    if (indicadores.length === reg.indicadores.length) return;
    const payload = { indicadores };
    const espelhava = reg.espelhamento_id === li.parceiro_id ||
      (reg.espelhamento && li.parceiro_nome && reg.espelhamento.toUpperCase() === li.parceiro_nome.toUpperCase());
    if (espelhava) {
      payload.espelhamento_id = '';
      payload.espelhamento = '';
      payload.percentual_comissao_espelhamento = 0;
    }
    await base44.entities[entity].update(id, payload);
  } catch (e) {}
}