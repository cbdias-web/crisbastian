import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ChevronDown, ChevronRight, User, Building2, MapPin, Mail, Phone,
  Package, DollarSign, FileText, Calendar, Link2, FileCheck, XCircle,
} from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const fmtMoeda = (v) => v != null && v !== '' ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
const fmtData = (v) => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';

const STATUS_CFG = {
  novo: { label: 'Novo', color: '#00D4AA' },
  em_atendimento: { label: 'Em Atendimento', color: '#fbbf24' },
  convertido_cliente: { label: '→ Cliente', color: '#34d399' },
  convertido_contrato: { label: '→ Contrato', color: '#a78bfa' },
  convertido_venda: { label: '→ Venda', color: '#34d399' },
  descartado: { label: 'Descartado', color: '#9ca3af' },
};

// Localiza a LeadIndicacao de origem a partir de uma conversa da Central de Leads.
function useLeadIndicacao(conversa) {
  return useQuery({
    queryKey: ['lead-indicacao-origem', conversa?.id],
    queryFn: async () => {
      if (!conversa?.origem || !conversa.origem.startsWith('Indicação · ')) return null;
      const nomeParceiro = conversa.origem.replace('Indicação · ', '').trim();
      const tel = (conversa.telefone || '').replace(/\D/g, '');
      const todas = await base44.entities.LeadIndicacao.list('-created_date', 500);
      // 1) Por telefone/whatsapp
      if (tel) {
        const byTel = todas.find((li) => {
          const t = (li.tipo === 'PF' ? (li.pf_whatsapp || li.pf_telefone || '') : (li.pj_whatsapp || li.pj_telefone || '')).toString().replace(/\D/g, '');
          return t && t === tel;
        });
        if (byTel) return byTel;
      }
      // 2) Por parceiro + nome
      return todas.find((li) => li.parceiro_nome === nomeParceiro && (
        (li.pf_nome && li.pf_nome === conversa.lead_nome) ||
        (li.pj_razao_social && li.pj_razao_social === conversa.lead_nome)
      )) || null;
    },
    enabled: !!conversa?.origem && conversa.origem.startsWith('Indicação · '),
  });
}

function Linha({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: AURORA.textMuted }} />}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>{label}</p>
        <p className="text-xs break-words" style={{ color: AURORA.text }}>{value || '—'}</p>
      </div>
    </div>
  );
}

export default function CadastroLeadPanel({ conversa, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const { data: lead } = useLeadIndicacao(conversa);

  if (!lead) return null;

  const isPF = lead.tipo === 'PF';
  const st = STATUS_CFG[lead.status] || STATUS_CFG.novo;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5"
        style={{ borderBottom: open ? `1px solid ${AURORA.border}` : 'none' }}>
        {open ? <ChevronDown className="w-3.5 h-3.5" style={{ color: AURORA.accent }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />}
        <FileText className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Cadastro do Lead (Indicação)</p>
        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>
      </button>

      {open && (
        <div className="p-3 space-y-3">
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Linha icon={isPF ? User : Building2} label="Tipo" value={isPF ? 'Pessoa Física' : 'Pessoa Jurídica'} />
            <Linha icon={Package} label="Produto" value={lead.produto} />
            <Linha icon={DollarSign} label="Valor est." value={fmtMoeda(lead.valor_estimado)} />
            <Linha icon={Link2} label="Indicador" value={lead.parceiro_nome} />
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Linha icon={Mail} label="E-mail" value={isPF ? lead.pf_email : lead.pj_email} />
            <Linha icon={Phone} label="Telefone" value={isPF ? lead.pf_telefone : lead.pj_telefone} />
            <Linha icon={Phone} label="WhatsApp" value={isPF ? lead.pf_whatsapp : lead.pj_whatsapp} />
          </div>

          {/* Dados PF ou PJ */}
          {isPF ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.textMuted }}>Dados Pessoa Física</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Linha label="Nome" value={lead.pf_nome} />
                <Linha label="CPF" value={lead.pf_cpf} />
                <Linha label="RG" value={lead.pf_rg} />
                <Linha label="Nascimento" value={fmtDate(lead.pf_nascimento)} />
                <Linha label="Nacionalidade" value={lead.pf_nacionalidade} />
                <Linha label="Profissão" value={lead.pf_profissao} />
                <Linha label="Renda estimada" value={fmtMoeda(lead.pf_renda)} />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.textMuted }}>Dados Pessoa Jurídica</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Linha label="Razão Social" value={lead.pj_razao_social} />
                <Linha label="CNPJ" value={lead.pj_cnpj} />
                <Linha label="Responsável" value={lead.pj_nome_responsavel} />
                <Linha label="CPF Responsável" value={lead.pj_cpf_responsavel} />
                <Linha label="Ramo de atividade" value={lead.pj_ramo_atividade} />
                <Linha label="Faturamento" value={fmtMoeda(lead.pj_faturamento)} />
              </div>
            </div>
          )}

          {/* Endereço */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: AURORA.textMuted }}>
              <MapPin className="w-3 h-3" /> Endereço
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Linha label="CEP" value={isPF ? lead.pf_cep : lead.pj_cep} />
              <Linha label="Logradouro" value={isPF ? lead.pf_endereco : lead.pj_endereco} />
              <Linha label="Número" value={isPF ? lead.pf_numero : lead.pj_numero} />
              <Linha label="Complemento" value={isPF ? lead.pf_complemento : lead.pj_complemento} />
              <Linha label="Bairro" value={isPF ? lead.pf_bairro : lead.pj_bairro} />
              <Linha label="Cidade/UF" value={`${isPF ? lead.pf_cidade : lead.pj_cidade || ''} / ${isPF ? lead.pf_estado : lead.pj_estado || ''}`} />
            </div>
          </div>

          {/* Observações / Resumo de Vendas */}
          {lead.observacoes && (
            <div className="rounded-lg p-2.5" style={{ background: 'rgba(0,212,170,0.06)', border: `1px solid ${AURORA.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: AURORA.textMuted }}>Resumo de Vendas</p>
              <p className="text-xs leading-relaxed" style={{ color: AURORA.text }}>{lead.observacoes}</p>
            </div>
          )}

          {/* Jornada / vínculos */}
          <div className="flex flex-wrap gap-2 pt-1">
            {lead.cliente_id && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                <FileCheck className="w-3 h-3" /> Cliente criado
              </span>
            )}
            {lead.contrato_id && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
                <FileCheck className="w-3 h-3" /> Contrato gerado
              </span>
            )}
            {lead.venda_id && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.18)', color: '#34d399' }}>
                <FileCheck className="w-3 h-3" /> Venda gerada
              </span>
            )}
            {lead.status === 'descartado' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(100,100,100,0.18)', color: '#9ca3af' }}>
                <XCircle className="w-3 h-3" /> Descartado
              </span>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-2 pt-1" style={{ borderTop: `1px solid ${AURORA.border}` }}>
            <Linha icon={Calendar} label="Indicado em" value={fmtData(lead.created_date)} />
            <Linha icon={Calendar} label="Preenchido em" value={fmtData(lead.link_preenchido_em)} />
          </div>
        </div>
      )}
    </div>
  );
}