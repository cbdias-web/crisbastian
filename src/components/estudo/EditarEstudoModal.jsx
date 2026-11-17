import { useState } from 'react';
import { X, Save, Loader2, Landmark, Globe2, Wallet, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { PRODUTOS_ESTUDO } from '@/lib/estudoViabilidade';
import ClienteEstudoPicker from '@/components/estudo/ClienteEstudoPicker';

const A = {
  surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
};
const inputStyle = { background: A.surface2, border: `1px solid ${A.border}`, color: A.text };
const labelStyle = { color: A.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };
const ICONE = { holding: Landmark, offshore: Globe2, conta_internacional: Wallet };

/** Edição administrativa do estudo e do resultado recebido do cliente. */
export default function EditarEstudoModal({ estudo, onClose, onSalvar }) {
  const [form, setForm] = useState({
    produto: estudo.produto || 'holding',
    tipo_cliente: estudo.tipo_cliente || 'PF',
    cliente_id: estudo.cliente_id || '',
    cliente_nome: estudo.cliente_nome || '',
    cliente_documento: estudo.cliente_documento || '',
    cliente_email: estudo.cliente_email || '',
    cliente_telefone: estudo.cliente_telefone || '',
    observacoes_internas: estudo.observacoes_internas || '',
    parecer_tecnico: estudo.parecer_tecnico || '',
  });
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const salvar = async () => {
    if (!form.cliente_nome.trim()) return toast.error('Informe o nome do cliente.');
    setSalvando(true);
    try {
      await onSalvar({ ...form, cliente_nome: form.cliente_nome.trim() });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.72)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl my-6" style={{ background: A.surface, border: `1px solid ${A.border}` }}
        onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: A.accent }}>Edição administrativa</p>
              <h2 className="text-lg font-bold" style={{ color: A.text }}>Editar estudo</h2>
            </div>
            <button type="button" onClick={onClose} style={{ color: A.textMuted }}><X className="w-5 h-5" /></button>
          </div>

          <div>
            <label className="block mb-1.5" style={labelStyle}>Produto</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(PRODUTOS_ESTUDO).map(p => {
                const Icon = ICONE[p.id];
                const on = form.produto === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => set('produto', p.id)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold"
                    style={{ background: on ? A.accentDim : A.surface2, border: `1px solid ${on ? A.accent : A.border}`, color: on ? A.accent : A.text }}>
                    <Icon className="w-5 h-5" /> {p.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block mb-1.5" style={labelStyle}>Natureza do cliente</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: 'PF', l: 'Pessoa Física', I: User }, { v: 'PJ', l: 'Pessoa Jurídica', I: Building2 }].map(o => (
                <button key={o.v} type="button" onClick={() => set('tipo_cliente', o.v)}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold"
                  style={form.tipo_cliente === o.v ? { background: A.accent, color: '#0d1117' } : inputStyle}>
                  <o.I className="w-3.5 h-3.5" /> {o.l}
                </button>
              ))}
            </div>
          </div>

          <ClienteEstudoPicker onSelecionar={(c) => setForm(f => ({
            ...f,
            cliente_id: c.id || '',
            cliente_nome: c.nome || '',
            cliente_documento: c.cpf_cnpj || '',
            cliente_email: c.email || '',
            cliente_telefone: c.telefone || '',
            tipo_cliente: c.tipo_pessoa === 'PF' ? 'PF' : (c.tipo_pessoa === 'PJ' ? 'PJ' : f.tipo_cliente),
          }))} />

          <div>
            <label className="block mb-1" style={labelStyle}>{form.tipo_cliente === 'PJ' ? 'Razão social *' : 'Nome do cliente *'}</label>
            <input value={form.cliente_nome} onChange={e => set('cliente_nome', e.target.value)}
              style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1" style={labelStyle}>{form.tipo_cliente === 'PJ' ? 'CNPJ' : 'CPF'}</label>
              <input value={form.cliente_documento} onChange={e => set('cliente_documento', e.target.value)}
                style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>WhatsApp</label>
              <input value={form.cliente_telefone} onChange={e => set('cliente_telefone', e.target.value)}
                style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>E-mail</label>
            <input type="email" value={form.cliente_email} onChange={e => set('cliente_email', e.target.value)}
              style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>Parecer técnico</label>
            <textarea value={form.parecer_tecnico} onChange={e => set('parecer_tecnico', e.target.value)} rows={3}
              style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y" />
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>Observações internas</label>
            <textarea value={form.observacoes_internas} onChange={e => set('observacoes_internas', e.target.value)} rows={3}
              style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ ...inputStyle, color: A.textMuted }}>Cancelar</button>
            <button type="button" onClick={salvar} disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-60"
              style={{ background: A.accent, color: '#0d1117' }}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}