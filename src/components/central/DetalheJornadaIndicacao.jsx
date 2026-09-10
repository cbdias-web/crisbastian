import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, ChevronDown, ChevronRight, Mail, Phone, MapPin, History, MessageSquare,
} from 'lucide-react';
import JornadaCliente from '@/components/portal/JornadaCliente';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  warning: '#fbbf24',
  green: '#34d399',
  purple: '#a78bfa',
  danger: '#f87171',
};

const STATUS_CFG = {
  novo: { label: 'Novo' },
  em_atendimento: { label: 'Em Atendimento' },
  convertido_cliente: { label: '→ Cliente' },
  convertido_contrato: { label: '→ Contrato' },
  convertido_venda: { label: '→ Venda' },
  rejeitado_compliance: { label: 'Rejeitado por Compliance' },
  descartado: { label: 'Descartado' },
};

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

// Carrega a jornada completa do lead: contrato, venda, parcelas, interações, conversa e implantação.
function useDetalheJornada(lead) {
  return useQuery({
    queryKey: ['detalhe-jornada-indicacao', lead?.id],
    queryFn: async () => {
      const doc = lead.tipo === 'PF' ? lead.pf_cpf : lead.pj_cnpj;
      const tel = lead.tipo === 'PF' ? (lead.pf_whatsapp || lead.pf_telefone) : (lead.pj_whatsapp || lead.pj_telefone);

      let contrato = null;
      if (lead.contrato_id) {
        try { contrato = await base44.entities.Contrato.get(lead.contrato_id); } catch {}
      }
      if (!contrato && lead.cliente_id) {
        try { const cs = await base44.entities.Contrato.filter({ cliente_id: lead.cliente_id }); contrato = cs[0] || null; } catch {}
      }

      let venda = null;
      if (lead.venda_id) {
        try { venda = await base44.entities.Venda.get(lead.venda_id); } catch {}
      }
      if (!venda && doc) {
        try { const vs = await base44.entities.Venda.filter({ cpf_cnpj: doc }, '-data'); venda = vs[0] || null; } catch {}
      }

      let parcelas = [];
      if (venda) {
        try { parcelas = await base44.entities.ParcelaVenda.filter({ venda_id: venda.id }); } catch {}
      }

      let interacoes = [];
      // Busca por cliente_id (lead já convertido) — chave primária de vínculo.
      if (lead.cliente_id) {
        try { interacoes = await base44.entities.InteracaoCliente.filter({ cliente_id: lead.cliente_id }, '-data_interacao', 50); } catch {}
      }
      // Fallback por nome: a Fila de Contatos grava a interação com cliente_nome = nome do lead
      // (mesmo antes da conversão em Cliente), então o histórico aparece no portal desde o 1º contato.
      const nomeLead = (lead.tipo === 'PF' ? lead.pf_nome : lead.pj_razao_social) || lead.pf_nome || lead.pj_razao_social || '';
      if (nomeLead && nomeLead.trim().length >= 3) {
        try {
          const porNome = await base44.entities.InteracaoCliente.filter({ cliente_nome: nomeLead.trim() }, '-data_interacao', 50);
          // merge + dedupe por id
          const seen = new Set(interacoes.map(i => i.id));
          for (const it of porNome) {
            if (!seen.has(it.id)) { interacoes.push(it); seen.add(it.id); }
          }
          interacoes.sort((a, b) => new Date(b.data_interacao || b.created_date || 0) - new Date(a.data_interacao || a.created_date || 0));
        } catch {}
      }

      let conversa = null;
      // 1) Pela FilaContato vinculada: lead_indicacao_id → ref_id (id da conversa).
      //    A ConversaWhatsapp é criada com lead_id = id da entidade Lead (não da
      //    LeadIndicacao), então buscar direto por lead_id não casa. O vínculo
      //    correto vive na FilaContato (lead_indicacao_id + ref_id = conversa).
      if (lead.id) {
        try {
          const filas = await base44.entities.FilaContato.filter({ lead_indicacao_id: lead.id });
          const refId = filas.find(f => f.ref_id && f.tipo_origem === 'indicacao')?.ref_id;
          if (refId) conversa = await base44.entities.ConversaWhatsapp.get(refId).catch(() => null);
        } catch {}
      }
      // 2) Por lead_id (fallback — alguns fluxos antigos usam lead_id = LeadIndicacao id)
      if (!conversa && lead.id) {
        try { const cs = await base44.entities.ConversaWhatsapp.filter({ lead_id: lead.id }); conversa = cs[0] || null; } catch {}
      }
      // 3) Por telefone (fallback robusto — normaliza dígitos)
      if (!conversa && tel) {
        const telNorm = String(tel).replace(/\D/g, '');
        try {
          const cs = await base44.entities.ConversaWhatsapp.filter({ telefone: telNorm });
          conversa = cs.find(c => String(c.telefone || '').replace(/\D/g, '') === telNorm) || cs[0] || null;
        } catch {}
      }

      let implantacao = null;
      if (venda) {
        try { const imps = await base44.entities.Implantacao.filter({ venda_id: venda.id }); implantacao = imps[0] || null; } catch {}
      }
      if (!implantacao && contrato) {
        try { const imps = await base44.entities.Implantacao.filter({ contrato_id: contrato.id }); implantacao = imps[0] || null; } catch {}
      }

      return { lead, contrato, venda, parcelas, interacoes, conversa, implantacao };
    },
    enabled: !!lead?.id,
    staleTime: 60_000,
  });
}

function Info({ label, value, icon }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1" style={{ color: AURORA.textMuted }}>{icon}{label}</p>
      <p className="text-sm" style={{ color: AURORA.text }}>{value || '—'}</p>
    </div>
  );
}

function CadastroGrid({ lead }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Info icon={<Mail className="w-3 h-3" />} label="E-mail" value={lead.tipo === 'PF' ? lead.pf_email : lead.pj_email} />
        <Info icon={<Phone className="w-3 h-3" />} label="Telefone" value={lead.tipo === 'PF' ? lead.pf_telefone : lead.pj_telefone} />
        <Info icon={<Phone className="w-3 h-3" />} label="WhatsApp" value={lead.tipo === 'PF' ? lead.pf_whatsapp : lead.pj_whatsapp} />
      </div>
      {lead.tipo === 'PF' ? (
        <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.accent }}>Dados Pessoa Física</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Info label="CPF" value={lead.pf_cpf} />
            <Info label="RG" value={lead.pf_rg} />
            <Info label="Nascimento" value={lead.pf_nascimento} />
            <Info label="Nacionalidade" value={lead.pf_nacionalidade} />
            <Info label="Profissão" value={lead.pf_profissao} />
            <Info label="Renda" value={fmtMoeda(lead.pf_renda)} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.accent }}>Dados Pessoa Jurídica</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Info label="CNPJ" value={lead.pj_cnpj} />
            <Info label="Responsável" value={lead.pj_nome_responsavel} />
            <Info label="CPF Responsável" value={lead.pj_cpf_responsavel} />
            <Info label="Ramo" value={lead.pj_ramo_atividade} />
            <Info label="Faturamento" value={fmtMoeda(lead.pj_faturamento)} />
          </div>
        </div>
      )}
      <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: AURORA.accent }}><MapPin className="w-3 h-3" />Endereço</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Info label="CEP" value={lead.tipo === 'PF' ? lead.pf_cep : lead.pj_cep} />
          <Info label="Logradouro" value={lead.tipo === 'PF' ? lead.pf_endereco : lead.pj_endereco} />
          <Info label="Número" value={lead.tipo === 'PF' ? lead.pf_numero : lead.pj_numero} />
          <Info label="Complemento" value={lead.tipo === 'PF' ? lead.pf_complemento : lead.pj_complemento} />
          <Info label="Bairro" value={lead.tipo === 'PF' ? lead.pf_bairro : lead.pj_bairro} />
          <Info label="Cidade/UF" value={`${lead.tipo === 'PF' ? lead.pf_cidade : lead.pj_cidade || ''} / ${lead.tipo === 'PF' ? lead.pf_estado : lead.pj_estado || ''}`} />
        </div>
      </div>
      {lead.observacoes && (
        <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          <p className="text-[11px] font-bold mb-1" style={{ color: AURORA.textMuted }}>OBSERVAÇÕES</p>
          <p className="text-xs" style={{ color: AURORA.text }}>{lead.observacoes}</p>
        </div>
      )}
    </div>
  );
}

export default function DetalheJornadaIndicacao({ lead }) {
  const [expandido, setExpandido] = useState(false);
  const { data: detalhe, isLoading } = useDetalheJornada(lead);

  return (
    <div className="space-y-4">
      {/* ─── Dados cadastrais (recolhidos por padrão) ─── */}
      <div className="rounded-xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
        <button onClick={() => setExpandido(p => !p)}
          className="w-full flex items-center justify-between px-3 py-2.5 transition"
          style={{ color: AURORA.text }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span className="flex items-center gap-2 text-xs font-bold" style={{ color: AURORA.accent }}>
            <MapPin className="w-3.5 h-3.5" /> Dados cadastrais do lead
          </span>
          {expandido
            ? <ChevronDown className="w-4 h-4" style={{ color: AURORA.textMuted }} />
            : <ChevronRight className="w-4 h-4" style={{ color: AURORA.textMuted }} />}
        </button>
        {expandido && <div className="px-3 pb-3"><CadastroGrid lead={lead} /></div>}
      </div>

      {/* ─── Jornada completa (negociação, valores, parcelamento, parcelas futuras) ─── */}
      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: AURORA.accent }} /></div>
      ) : detalhe ? (
        <>
          <JornadaCliente detalhe={detalhe} />

          {/* ─── Histórico de interações / atualizações ─── */}
          <div>
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: AURORA.accent }}>
              <History className="w-3.5 h-3.5" /> Histórico de atualizações
            </p>
            {detalhe.interacoes?.length > 0 ? (
              <div className="space-y-2">
                {detalhe.interacoes.map((it, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: AURORA.text }}>{it.tipo} · {it.resultado || '—'}</span>
                      <span className="text-[10px]" style={{ color: AURORA.textMuted }}>{fmtData(it.data_interacao)}</span>
                    </div>
                    {it.descricao && <p className="text-xs" style={{ color: AURORA.textMuted }}>{it.descricao}</p>}
                    {it.vendedor_nome && <p className="text-[10px] mt-1" style={{ color: AURORA.purple }}>por {it.vendedor_nome}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-4 text-center" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <MessageSquare className="w-6 h-6 mx-auto mb-2" style={{ color: AURORA.textMuted }} />
                <p className="text-xs" style={{ color: AURORA.textMuted }}>Nenhuma interação registrada ainda</p>
              </div>
            )}
          </div>

          {/* ─── Conversa WhatsApp ─── */}
          {detalhe.conversa && detalhe.conversa.mensagens?.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: AURORA.accent }}>
                <MessageSquare className="w-3.5 h-3.5" /> Conversa WhatsApp ({detalhe.conversa.mensagens.length} msgs)
              </p>
              <div className="rounded-xl p-3 max-h-56 overflow-y-auto space-y-1.5" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                {detalhe.conversa.mensagens.slice(-40).map((m, i) => (
                  <div key={i} className="text-[11px] leading-relaxed" style={{ color: m.de === 'lead' ? AURORA.text : AURORA.accent }}>
                    <span style={{ color: AURORA.textMuted }}>{m.timestamp ? new Date(m.timestamp).toLocaleString('pt-BR') : ''}</span> · {m.texto}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-center py-8" style={{ color: AURORA.textMuted }}>Não foi possível carregar a jornada.</p>
      )}
    </div>
  );
}