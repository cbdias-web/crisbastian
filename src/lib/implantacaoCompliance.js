import { base44 } from '@/api/base44Client';

// Registra o marco "Rejeitado por Compliance" no histórico da LeadIndicacao de
// origem, para que a informação acompanhe o lead em toda a jornada — inclusive
// no Dash Parceiro. Localiza a indicação pela venda ou pelo contrato vinculado.
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
    const marco = {
      status: 'implantacao_rejeitada',
      label: 'Implantação rejeitada por Compliance',
      data: new Date().toISOString(),
    };
    for (const li of indicacoes) {
      const historico = [...(li.historico || []), marco];
      await base44.entities.LeadIndicacao.update(li.id, { historico });
    }
  } catch (e) {}
}