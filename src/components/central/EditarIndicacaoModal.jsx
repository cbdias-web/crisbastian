import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  sectionLabel: 'rgba(0,212,170,0.9)',
};

const PRODUTOS = ['CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF', 'CANAL BANCÁRIO', 'OFFSHORE', 'GARANTIAS', 'HORA TÉCNICA', 'RATING'];
const STATUS = [
  { v: 'novo', l: 'Novo' },
  { v: 'em_atendimento', l: 'Em Atendimento' },
  { v: 'convertido_cliente', l: '→ Cliente' },
  { v: 'convertido_contrato', l: '→ Contrato' },
  { v: 'convertido_venda', l: 'Venda Convertida' },
  { v: 'descartado', l: 'Descartado' },
];
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const inputCls = "w-full px-3 py-2 rounded-xl text-sm focus:outline-none";

function Field({ label, full, children }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${AURORA.border}` }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.sectionLabel }}>{children}</p>
    </div>
  );
}

export default function EditarIndicacaoModal({ lead, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const { data: parceiros = [] } = useQuery({
    queryKey: ['parceiros-editar-indicacao'],
    queryFn: () => base44.entities.Parceiro.list('nome'),
  });

  useEffect(() => {
    if (!lead) return;
    setForm({
      parceiro_id: lead.parceiro_id || '',
      produto: lead.produto || '',
      valor_estimado: lead.valor_estimado ?? '',
      status: lead.status || 'novo',
      observacoes: lead.observacoes || '',
      // PF
      pf_nome: lead.pf_nome || '',
      pf_cpf: lead.pf_cpf || '',
      pf_rg: lead.pf_rg || '',
      pf_nascimento: lead.pf_nascimento || '',
      pf_nacionalidade: lead.pf_nacionalidade || '',
      pf_profissao: lead.pf_profissao || '',
      pf_email: lead.pf_email || '',
      pf_telefone: lead.pf_telefone || '',
      pf_whatsapp: lead.pf_whatsapp || '',
      pf_renda: lead.pf_renda ?? '',
      pf_cep: lead.pf_cep || '',
      pf_endereco: lead.pf_endereco || '',
      pf_numero: lead.pf_numero || '',
      pf_complemento: lead.pf_complemento || '',
      pf_bairro: lead.pf_bairro || '',
      pf_cidade: lead.pf_cidade || '',
      pf_estado: lead.pf_estado || '',
      // PJ
      pj_razao_social: lead.pj_razao_social || '',
      pj_cnpj: lead.pj_cnpj || '',
      pj_nome_responsavel: lead.pj_nome_responsavel || '',
      pj_cpf_responsavel: lead.pj_cpf_responsavel || '',
      pj_email: lead.pj_email || '',
      pj_telefone: lead.pj_telefone || '',
      pj_whatsapp: lead.pj_whatsapp || '',
      pj_ramo_atividade: lead.pj_ramo_atividade || '',
      pj_faturamento: lead.pj_faturamento ?? '',
      pj_cep: lead.pj_cep || '',
      pj_endereco: lead.pj_endereco || '',
      pj_numero: lead.pj_numero || '',
      pj_complemento: lead.pj_complemento || '',
      pj_bairro: lead.pj_bairro || '',
      pj_cidade: lead.pj_cidade || '',
      pj_estado: lead.pj_estado || '',
    });
  }, [lead]);

  if (!lead || !form) return null;
  const isPF = lead.tipo === 'PF';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const salvar = async () => {
    setSalvando(true);
    try {
      const parceiroSel = parceiros.find(p => p.id === form.parceiro_id);
      const payload = {
        parceiro_id: form.parceiro_id || null,
        parceiro_nome: parceiroSel?.nome || '',
        parceiro_email: parceiroSel?.email || '',
        parceiro_percentual: parceiroSel?.percentual_comissao ?? 0,
        produto: form.produto,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
        status: form.status,
        observacoes: form.observacoes,
      };
      if (isPF) {
        Object.assign(payload, {
          pf_nome: form.pf_nome, pf_cpf: form.pf_cpf, pf_rg: form.pf_rg,
          pf_nascimento: form.pf_nascimento || null,
          pf_nacionalidade: form.pf_nacionalidade, pf_profissao: form.pf_profissao,
          pf_email: form.pf_email, pf_telefone: form.pf_telefone, pf_whatsapp: form.pf_whatsapp,
          pf_renda: form.pf_renda ? Number(form.pf_renda) : null,
          pf_cep: form.pf_cep, pf_endereco: form.pf_endereco, pf_numero: form.pf_numero,
          pf_complemento: form.pf_complemento, pf_bairro: form.pf_bairro,
          pf_cidade: form.pf_cidade, pf_estado: form.pf_estado,
        });
      } else {
        Object.assign(payload, {
          pj_razao_social: form.pj_razao_social, pj_cnpj: form.pj_cnpj,
          pj_nome_responsavel: form.pj_nome_responsavel, pj_cpf_responsavel: form.pj_cpf_responsavel,
          pj_email: form.pj_email, pj_telefone: form.pj_telefone, pj_whatsapp: form.pj_whatsapp,
          pj_ramo_atividade: form.pj_ramo_atividade,
          pj_faturamento: form.pj_faturamento ? Number(form.pj_faturamento) : null,
          pj_cep: form.pj_cep, pj_endereco: form.pj_endereco, pj_numero: form.pj_numero,
          pj_complemento: form.pj_complemento, pj_bairro: form.pj_bairro,
          pj_cidade: form.pj_cidade, pj_estado: form.pj_estado,
        });
      }
      await base44.entities.LeadIndicacao.update(lead.id, payload);
      queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['indicacoes-novas-badge'] });
      toast.success('Indicação atualizada');
      onClose();
    } catch (e) { toast.error('Erro: ' + e.message); }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <div>
            <p className="font-bold text-sm" style={{ color: AURORA.text }}>Manutenção da Indicação</p>
            <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{isPF ? 'Pessoa Física' : 'Pessoa Jurídica'} · {lead.parceiro_nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-1">
          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Indicador (parceiro)">
              <select value={form.parceiro_id} onChange={set('parceiro_id')} className={inputCls} style={inputStyle}>
                <option value="">— Nenhum —</option>
                {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={inputCls} style={inputStyle}>
                {STATUS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="Produto">
              <select value={form.produto} onChange={set('produto')} className={inputCls} style={inputStyle}>
                <option value="">Selecione...</option>
                {PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Valor estimado (R$)">
              <input type="number" value={form.valor_estimado} onChange={set('valor_estimado')} className={inputCls} style={inputStyle} />
            </Field>
          </div>

          {isPF ? (
            <>
              <SectionTitle>Dados Pessoa Física</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nome completo"><input value={form.pf_nome} onChange={set('pf_nome')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CPF"><input value={form.pf_cpf} onChange={set('pf_cpf')} className={inputCls} style={inputStyle} /></Field>
                <Field label="RG"><input value={form.pf_rg} onChange={set('pf_rg')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Nascimento"><input type="date" value={form.pf_nascimento} onChange={set('pf_nascimento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Nacionalidade"><input value={form.pf_nacionalidade} onChange={set('pf_nacionalidade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Profissão"><input value={form.pf_profissao} onChange={set('pf_profissao')} className={inputCls} style={inputStyle} /></Field>
                <Field label="E-mail"><input value={form.pf_email} onChange={set('pf_email')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Telefone"><input value={form.pf_telefone} onChange={set('pf_telefone')} className={inputCls} style={inputStyle} /></Field>
                <Field label="WhatsApp"><input value={form.pf_whatsapp} onChange={set('pf_whatsapp')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Renda estimada (R$)"><input type="number" value={form.pf_renda} onChange={set('pf_renda')} className={inputCls} style={inputStyle} /></Field>
              </div>

              <SectionTitle>Endereço</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="CEP"><input value={form.pf_cep} onChange={set('pf_cep')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Logradouro"><input value={form.pf_endereco} onChange={set('pf_endereco')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Número"><input value={form.pf_numero} onChange={set('pf_numero')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Complemento"><input value={form.pf_complemento} onChange={set('pf_complemento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Bairro"><input value={form.pf_bairro} onChange={set('pf_bairro')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Cidade"><input value={form.pf_cidade} onChange={set('pf_cidade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Estado (UF)">
                  <select value={form.pf_estado} onChange={set('pf_estado')} className={inputCls} style={inputStyle}>
                    <option value="">—</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </Field>
              </div>
            </>
          ) : (
            <>
              <SectionTitle>Dados Pessoa Jurídica</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Razão Social"><input value={form.pj_razao_social} onChange={set('pj_razao_social')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CNPJ"><input value={form.pj_cnpj} onChange={set('pj_cnpj')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Responsável legal"><input value={form.pj_nome_responsavel} onChange={set('pj_nome_responsavel')} className={inputCls} style={inputStyle} /></Field>
                <Field label="CPF do responsável"><input value={form.pj_cpf_responsavel} onChange={set('pj_cpf_responsavel')} className={inputCls} style={inputStyle} /></Field>
                <Field label="E-mail"><input value={form.pj_email} onChange={set('pj_email')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Telefone"><input value={form.pj_telefone} onChange={set('pj_telefone')} className={inputCls} style={inputStyle} /></Field>
                <Field label="WhatsApp"><input value={form.pj_whatsapp} onChange={set('pj_whatsapp')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Ramo de atividade"><input value={form.pj_ramo_atividade} onChange={set('pj_ramo_atividade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Faturamento estimado (R$)"><input type="number" value={form.pj_faturamento} onChange={set('pj_faturamento')} className={inputCls} style={inputStyle} /></Field>
              </div>

              <SectionTitle>Endereço</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="CEP"><input value={form.pj_cep} onChange={set('pj_cep')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Logradouro"><input value={form.pj_endereco} onChange={set('pj_endereco')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Número"><input value={form.pj_numero} onChange={set('pj_numero')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Complemento"><input value={form.pj_complemento} onChange={set('pj_complemento')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Bairro"><input value={form.pj_bairro} onChange={set('pj_bairro')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Cidade"><input value={form.pj_cidade} onChange={set('pj_cidade')} className={inputCls} style={inputStyle} /></Field>
                <Field label="Estado (UF)">
                  <select value={form.pj_estado} onChange={set('pj_estado')} className={inputCls} style={inputStyle}>
                    <option value="">—</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          <SectionTitle>Observações</SectionTitle>
          <Field label="Observações" full>
            <textarea value={form.observacoes} onChange={set('observacoes')} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none" style={inputStyle} />
          </Field>
        </div>

        <div className="p-4 flex justify-end gap-2" style={{ background: AURORA.surface2, borderTop: `1px solid ${AURORA.border}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40" style={{ background: AURORA.accent, color: '#0d1117' }}>
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}