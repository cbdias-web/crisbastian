import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, User, Building2, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import CampoMascara from '@/components/ui/campo-mascara';

const A = {
  surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
};
const inputStyle = { background: A.surface2, border: `1px solid ${A.border}`, color: A.text };
const labelStyle = { color: A.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

/** Cadastro rápido de cliente na base — usado quando o cliente não é encontrado. */
export default function CadastroClienteRapido({ inicial = {}, onClose, onCriado }) {
  const [form, setForm] = useState({
    tipo_pessoa: inicial.tipo_pessoa || 'PJ',
    nome: inicial.nome || '',
    cpf_cnpj: inicial.cpf_cnpj || '',
    email: inicial.email || '',
    telefone: inicial.telefone || '',
  });
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Informe o nome do cliente.');
    setSalvando(true);
    try {
      const novo = await base44.entities.Cliente.create({
        tipo_pessoa: form.tipo_pessoa,
        nome: form.nome.trim(),
        cpf_cnpj: form.cpf_cnpj || '',
        email: form.email || '',
        telefone: form.telefone || '',
      });
      toast.success('Cliente cadastrado na base');
      onCriado(novo);
    } catch (e) {
      toast.error('Erro ao cadastrar cliente: ' + (e?.message || ''));
    }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-3 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl my-6" style={{ background: A.surface, border: `1px solid ${A.border}` }}
        onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: A.accent }}>Cliente não encontrado</p>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: A.text }}>
                <UserPlus className="w-4 h-4" style={{ color: A.accent }} /> Cadastrar novo cliente
              </h2>
            </div>
            <button type="button" onClick={onClose} style={{ color: A.textMuted }}><X className="w-5 h-5" /></button>
          </div>

          <div>
            <label className="block mb-1.5" style={labelStyle}>Natureza</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: 'PF', l: 'Pessoa Física', I: User }, { v: 'PJ', l: 'Pessoa Jurídica', I: Building2 }].map(o => (
                <button key={o.v} type="button" onClick={() => set('tipo_pessoa', o.v)}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold"
                  style={form.tipo_pessoa === o.v ? { background: A.accent, color: '#0d1117' } : inputStyle}>
                  <o.I className="w-3.5 h-3.5" /> {o.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>{form.tipo_pessoa === 'PJ' ? 'Razão social *' : 'Nome completo *'}</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)} autoFocus
              style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1" style={labelStyle}>{form.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}</label>
              <CampoMascara tipo="cpfcnpj" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)}
                style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block mb-1" style={labelStyle}>WhatsApp</label>
              <CampoMascara tipo="telefone" value={form.telefone} onChange={e => set('telefone', e.target.value)}
                style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>E-mail</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              style={inputStyle} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ ...inputStyle, color: A.textMuted }}>Cancelar</button>
            <button type="button" onClick={salvar} disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-60"
              style={{ background: A.accent, color: '#0d1117' }}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Cadastrar e usar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}