import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Save, X, Phone, MessageSquare, Mail, Users, MapPin, Video, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { isDiaUtil, mensagemNaoDiaUtil } from '@/lib/diaUtil';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const today = () => new Date().toISOString().split('T')[0];

export default function RegistroLigacaoForm({ fila, onConcluido, onCancelar }) {
  const [form, setForm] = useState({ tipo: 'Ligação', descricao: '', data_interacao: today(), proximo_contato: '', resultado: 'Positivo' });
  const [meet, setMeet] = useState({ gerar: false, horario: '09:00', link: '', loading: false });
  const [salvando, setSalvando] = useState(false);

  const gerarMeet = async () => {
    setMeet(p => ({ ...p, loading: true }));
    try {
      const res = await base44.functions.invoke('criarMeetAgenda', {
        agenda_id: fila.ref_id,
        lead_nome: fila.nome,
        data_agendada: form.proximo_contato || form.data_interacao,
        horario_inicio: meet.horario || '09:00',
        com_meet: true,
      });
      const data = res?.data || res;
      setMeet(p => ({ ...p, link: data.meet_link, loading: false }));
      toast.success('Link Meet gerado!');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || '';
      if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('no active')) {
        const url = await base44.connectors.connectAppUser('69fb9176f017da4e4ddd9ff8');
        window.open(url, '_blank');
        toast.info('Conecte sua conta Google e tente novamente');
      } else {
        toast.error('Erro ao gerar Meet: ' + msg);
      }
      setMeet(p => ({ ...p, loading: false }));
    }
  };

  const salvar = async () => {
    if (!form.descricao.trim()) { toast.error('Descreva a interação'); return; }
    if (form.proximo_contato && !isDiaUtil(form.proximo_contato)) {
      toast.error('Próximo contato inválido: ' + mensagemNaoDiaUtil(form.proximo_contato));
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        tipo: form.tipo,
        descricao: form.descricao.trim(),
        data_interacao: form.data_interacao,
        proximo_contato: form.proximo_contato || '',
        resultado: form.resultado,
      };
      const res = await base44.functions.invoke('registrarTentativaContato', { fila_id: fila.id, acao: 'atendeu', interacao: payload });
      const data = res?.data || res;
      if (meet.link) {
        await base44.entities.FilaContato.update(fila.id, { meet_link: meet.link }).catch(() => {});
      }
      toast.success('Ligação registrada!');
      onConcluido?.(data);
    } catch (e) {
      toast.error('Erro: ' + (e?.response?.data?.error || e.message));
    }
    setSalvando(false);
  };

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)' }}>
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4" style={{ color: AURORA.accent }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Registrar Ligação Atendida</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Tipo</label>
          <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
            {['Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Visita', 'Outro'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Resultado</label>
          <select value={form.resultado} onChange={e => setForm(p => ({ ...p, resultado: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
            {['Positivo', 'Neutro', 'Negativo', 'Sem resposta'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Data</label>
          <input type="date" value={form.data_interacao} onChange={e => setForm(p => ({ ...p, data_interacao: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
        </div>
        <div>
          <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Próximo contato</label>
          <input type="date" value={form.proximo_contato} disabled={form.resultado === 'Negativo'}
            onChange={e => setForm(p => ({ ...p, proximo_contato: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none disabled:opacity-40" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
        </div>
      </div>
      <div>
        <label className="text-[11px] mb-1 block" style={{ color: AURORA.textMuted }}>Descrição *</label>
        <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
          rows={3} autoFocus placeholder="O que foi tratado, próximos passos, interesses do cliente..."
          className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
      </div>
      {/* Meet */}
      <div className="rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={meet.gerar} onChange={e => setMeet(p => ({ ...p, gerar: e.target.checked, link: '' }))} className="w-4 h-4" style={{ accentColor: '#818cf8' }} />
          <Video className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
          <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>Agendar Google Meet</span>
        </label>
        {meet.gerar && (
          <div className="mt-2 flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: AURORA.textMuted }}>Horário</label>
              <input type="time" value={meet.horario} onChange={e => setMeet(p => ({ ...p, horario: e.target.value }))}
                className="px-2 py-1.5 text-sm rounded-lg focus:outline-none" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            </div>
            {!meet.link && (
              <button onClick={gerarMeet} disabled={meet.loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-40" style={{ background: '#6366f1' }}>
                {meet.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />} Gerar Link
              </button>
            )}
            {meet.link && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg flex-wrap" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                <a href={meet.link} target="_blank" rel="noreferrer" className="text-[11px] truncate" style={{ color: '#818cf8', maxWidth: 180 }}>{meet.link}</a>
                <button onClick={() => { navigator.clipboard.writeText(meet.link); toast.success('Copiado!'); }} className="p-1 rounded" style={{ color: AURORA.textMuted }}><Copy className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40" style={{ background: AURORA.accent, color: '#0d1117' }}>
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
        </button>
        <button onClick={onCancelar}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
          <X className="w-4 h-4" /> Cancelar
        </button>
      </div>
    </div>
  );
}