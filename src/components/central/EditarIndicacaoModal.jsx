import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const PRODUTOS = ['CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF', 'CANAL BANCÁRIO', 'OFFSHORE', 'GARANTIAS', 'HORA TÉCNICA', 'RATING'];
const STATUS = ['novo', 'em_atendimento', 'convertido_cliente', 'convertido_contrato', 'convertido_venda', 'descartado'];

const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const inputCls = "w-full px-3 py-2 rounded-xl text-sm focus:outline-none";

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>{label}</label>
      {children}
    </div>
  );
}

export default function EditarIndicacaoModal({ lead, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setForm({
      produto: lead.produto || '',
      valor_estimado: lead.valor_estimado ?? '',
      status: lead.status || 'novo',
      observacoes: lead.observacoes || '',
      pf_nome: lead.pf_nome || '',
      pf_cpf: lead.pf_cpf || '',
      pf_email: lead.pf_email || '',
      pf_telefone: lead.pf_telefone || '',
      pf_whatsapp: lead.pf_whatsapp || '',
      pj_razao_social: lead.pj_razao_social || '',
      pj_cnpj: lead.pj_cnpj || '',
      pj_email: lead.pj_email || '',
      pj_telefone: lead.pj_telefone || '',
      pj_whatsapp: lead.pj_whatsapp || '',
    });
  }, [lead]);

  if (!lead || !form) return null;
  const isPF = lead.tipo === 'PF';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const salvar = async () => {
    setSalvando(true);
    try {
      const payload = {
        produto: form.produto,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
        status: form.status,
        observacoes: form.observacoes,
      };
      if (isPF) Object.assign(payload, { pf_nome: form.pf_nome, pf_cpf: form.pf_cpf, pf_email: form.pf_email, pf_telefone: form.pf_telefone, pf_whatsapp: form.pf_whatsapp });
      else Object.assign(payload, { pj_razao_social: form.pj_razao_social, pj_cnpj: form.pj_cnpj, pj_email: form.pj_email, pj_telefone: form.pj_telefone, pj_whatsapp: form.pj_whatsapp });
      await base44.entities.LeadIndicacao.update(lead.id, payload);
      queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
      toast.success('Indicação atualizada');
      onClose();
    } catch (e) { toast.error('Erro: ' + e.message); }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <p className="font-bold text-sm" style={{ color: AURORA.text }}>Editar Indicação</p>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Produto"><select value={form.produto} onChange={set('produto')} className={inputCls} style={inputStyle}><option value="">Selecione...</option>{PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Valor estimado (R$)"><input type="number" value={form.valor_estimado} onChange={set('valor_estimado')} className={inputCls} style={inputStyle} /></Field>
            <Field label="Status"><select value={form.status} onChange={set('status')} className={inputCls} style={inputStyle}>{STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
          </div>
          <div className="pt-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.accent }}>{isPF ? 'Dados Pessoa Física' : 'Dados Pessoa Jurídica'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {isPF ? (
                <>
                  <Field label="Nome"><input value={form.pf_nome} onChange={set('pf_nome')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="CPF"><input value={form.pf_cpf} onChange={set('pf_cpf')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="E-mail"><input value={form.pf_email} onChange={set('pf_email')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Telefone"><input value={form.pf_telefone} onChange={set('pf_telefone')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="WhatsApp"><input value={form.pf_whatsapp} onChange={set('pf_whatsapp')} className={inputCls} style={inputStyle} /></Field>
                </>
              ) : (
                <>
                  <Field label="Razão Social"><input value={form.pj_razao_social} onChange={set('pj_razao_social')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="CNPJ"><input value={form.pj_cnpj} onChange={set('pj_cnpj')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="E-mail"><input value={form.pj_email} onChange={set('pj_email')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Telefone"><input value={form.pj_telefone} onChange={set('pj_telefone')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="WhatsApp"><input value={form.pj_whatsapp} onChange={set('pj_whatsapp')} className={inputCls} style={inputStyle} /></Field>
                </>
              )}
            </div>
          </div>
          <Field label="Observações"><textarea value={form.observacoes} onChange={set('observacoes')} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none" style={inputStyle} /></Field>
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