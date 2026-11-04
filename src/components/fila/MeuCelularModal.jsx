import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Smartphone, Loader2, CheckCircle2, PhoneCall, MessageCircle } from 'lucide-react';
import { qrUrl, telParaTel, waLink } from './QrCodeContato';
import { codigoOperadora } from '@/lib/operadora';

const A = { surface: '#161b22', surface2: '#1c2333', border: 'rgba(255,255,255,0.08)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };
const inp = { background: A.surface2, color: A.text, border: `1px solid ${A.border}` };

// Cadastro do celular/operadora do gerente: as ligações saem do chip do próprio gerente (sem custo de telefonia no CRM).
export default function MeuCelularModal({ vendedorId, onClose, onSalvo }) {
  const [v, setV] = useState(null);
  const [form, setForm] = useState({ celular_operadora: '', operadora: 'Vivo', whatsapp_no_mesmo_numero: true, janela_inicio: '', janela_fim: '', meta_diaria_toques: '', canal_alerta: 'ambos', alertas_silenciados: false });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    base44.functions.invoke('salvarPerfilGerente', { apenas_ler: true, vendedor_id: vendedorId || undefined })
      .then(r => {
        const x = (r?.data || r)?.vendedor; if (!x) return;
        setV(x);
        setForm({
          celular_operadora: x.celular_operadora || '', operadora: x.operadora || 'Vivo', whatsapp_no_mesmo_numero: x.whatsapp_no_mesmo_numero !== false,
          janela_inicio: x.janela_inicio || '', janela_fim: x.janela_fim || '', meta_diaria_toques: x.meta_diaria_toques || '',
          canal_alerta: x.canal_alerta || 'ambos', alertas_silenciados: !!x.alertas_silenciados,
        });
      }).catch(() => toast.error('Não encontrei seu cadastro de gerente.'));
  }, [vendedorId]);

  const salvar = async (extra = {}) => {
    setSalvando(true);
    try {
      const r = await base44.functions.invoke('salvarPerfilGerente', { ...form, meta_diaria_toques: form.meta_diaria_toques || undefined, vendedor_id: vendedorId || undefined, ...extra });
      const d = r?.data || r;
      if (d?.error) throw new Error(d.error);
      setV(d.vendedor); toast.success(extra.confirmar_teste ? 'Celular confirmado!' : 'Preferências salvas.');
      onSalvo?.(d.vendedor);
    } catch (e) { toast.error(e?.response?.data?.error || e.message); }
    setSalvando(false);
  };

  const meu = v?.celular_operadora;
  const urlMobile = `${window.location.origin}/m`;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl overflow-hidden max-h-[92vh] flex flex-col" style={{ background: A.surface, border: `1px solid ${A.border}` }} onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${A.border}` }}>
          <div className="flex items-center gap-2"><Smartphone className="w-4 h-4" style={{ color: A.accent }} /><p className="font-bold text-sm" style={{ color: A.text }}>Meu celular e alertas</p></div>
          <button onClick={onClose} style={{ color: A.muted }}><X className="w-4 h-4" /></button>
        </div>
        {!v ? <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: A.accent }} /></div> : (
          <div className="p-5 overflow-y-auto space-y-4 text-xs" style={{ color: A.text }}>
            <p style={{ color: A.muted }}>Cadastre o celular do seu chip (operadora). As ligações e os WhatsApps saem dele — o CRM não cobra telefonia. O lead verá este número.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1"><label className="block mb-1" style={{ color: A.muted }}>Celular (com DDD)</label>
                <input value={form.celular_operadora} onChange={e => setForm(f => ({ ...f, celular_operadora: e.target.value }))} placeholder="(51) 99999-8888" className="w-full px-3 py-2 rounded-xl" style={inp} /></div>
              <div><label className="block mb-1" style={{ color: A.muted }}>Operadora</label>
                <select value={form.operadora} onChange={e => setForm(f => ({ ...f, operadora: e.target.value }))} className="w-full px-3 py-2 rounded-xl" style={inp}>{['Vivo', 'Claro', 'TIM', 'Oi', 'Outra'].map(o => <option key={o}>{o}</option>)}</select>
                {codigoOperadora(form.operadora) && <p className="mt-1" style={{ color: A.muted }}>Ligações saem com o código {codigoOperadora(form.operadora)}</p>}</div>
              <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={form.whatsapp_no_mesmo_numero} onChange={e => setForm(f => ({ ...f, whatsapp_no_mesmo_numero: e.target.checked }))} /> Meu WhatsApp usa este mesmo número</label>
              <div><label className="block mb-1" style={{ color: A.muted }}>Janela — início</label><input type="time" value={form.janela_inicio} onChange={e => setForm(f => ({ ...f, janela_inicio: e.target.value }))} className="w-full px-3 py-2 rounded-xl" style={inp} /></div>
              <div><label className="block mb-1" style={{ color: A.muted }}>Janela — fim</label><input type="time" value={form.janela_fim} onChange={e => setForm(f => ({ ...f, janela_fim: e.target.value }))} className="w-full px-3 py-2 rounded-xl" style={inp} /></div>
              <div><label className="block mb-1" style={{ color: A.muted }}>Meta diária de toques</label><input type="number" value={form.meta_diaria_toques} onChange={e => setForm(f => ({ ...f, meta_diaria_toques: e.target.value }))} placeholder="padrão do time" className="w-full px-3 py-2 rounded-xl" style={inp} /></div>
              <div><label className="block mb-1" style={{ color: A.muted }}>Receber alertas por</label>
                <select value={form.canal_alerta} onChange={e => setForm(f => ({ ...f, canal_alerta: e.target.value }))} className="w-full px-3 py-2 rounded-xl" style={inp}><option value="ambos">App e e-mail</option><option value="push">Só no app</option><option value="email">Só e-mail</option></select></div>
              <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={form.alertas_silenciados} onChange={e => setForm(f => ({ ...f, alertas_silenciados: e.target.checked }))} /> Silenciar e-mails (alertas continuam no sino)</label>
            </div>
            <button onClick={() => salvar()} disabled={salvando} className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: A.accent, color: '#0d1117' }}>{salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar</button>

            {meu && (
              <div className="rounded-2xl p-3 space-y-2" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
                <p className="font-bold">Teste no seu celular {v.celular_validado_em && <span style={{ color: '#34d399' }}><CheckCircle2 className="w-3.5 h-3.5 inline" /> confirmado</span>}</p>
                <div className="flex gap-2 flex-wrap">
                  <a href={telParaTel(meu)} className="px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1" style={{ background: 'rgba(59,130,249,0.15)', color: '#60a5fa' }}><PhoneCall className="w-3.5 h-3.5" /> Testar ligação</a>
                  <a href={waLink(meu, 'Teste Villela Exchange: este é o meu número de trabalho.')} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}><MessageCircle className="w-3.5 h-3.5" /> Testar WhatsApp</a>
                  <button onClick={() => salvar({ confirmar_teste: true })} className="px-3 py-1.5 rounded-lg font-semibold" style={{ background: A.surface, color: A.accent, border: `1px solid ${A.border}` }}>Funcionou — confirmar</button>
                </div>
              </div>
            )}

            <div className="rounded-2xl p-3 flex gap-3 items-center" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
              <img src={qrUrl(urlMobile, 110)} alt="QR Modo Foco" className="rounded-lg bg-white" style={{ width: 110, height: 110 }} />
              <div>
                <p className="font-bold mb-1">Parear o celular (1 vez)</p>
                <p style={{ color: A.muted }}>Aponte a câmera do celular, entre com seu login e toque em "Adicionar à tela inicial". Depois, ao clicar em <b>Ligar</b> ou <b>WhatsApp</b> no computador, o botão aparece na hora no celular.</p>
                <p className="mt-1 break-all" style={{ color: A.accent }}>{urlMobile}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}