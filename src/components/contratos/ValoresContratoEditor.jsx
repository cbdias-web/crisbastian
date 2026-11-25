import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Edit2, Save, X, Loader2 } from 'lucide-react';
import CampoMoeda from '@/components/ui/campo-moeda';

// Tipos de contrato que possuem mensalidade negociada (RATE é exclusivo do MONITORE)
const TIPOS_COM_MENSALIDADE = ['MONITORE', 'SCORE', 'GARANTIAS', 'RATING'];

const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Edição rápida dos valores negociados (mensalidade e RATE) direto no contrato.
 * Disponível para todos os usuários — não depende de permissão de administrador.
 */
export default function ValoresContratoEditor({ contrato, onUpdate }) {
  const mostraRate = contrato.tipo === 'MONITORE' || contrato.rate != null;
  const [editando, setEditando] = useState(false);
  const [mensalidade, setMensalidade] = useState('');
  const [rate, setRate] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!TIPOS_COM_MENSALIDADE.includes(contrato.tipo) && !mostraRate) return null;

  const abrirEdicao = () => {
    setMensalidade(contrato.mensalidade != null ? String(contrato.mensalidade) : '');
    setRate(contrato.rate != null ? String(contrato.rate) : '');
    setEditando(true);
  };

  const salvar = async () => {
    const dados = { mensalidade: num(mensalidade) };
    if (mostraRate) dados.rate = num(rate);
    if (mensalidade !== '' && dados.mensalidade <= 0) {
      toast.error('Informe um valor de mensalidade válido.');
      return;
    }
    setSalvando(true);
    try {
      await base44.entities.Contrato.update(contrato.id, dados);
      onUpdate({ ...contrato, ...dados });
      setEditando(false);
      toast.success('Valores do contrato atualizados!');
    } catch (err) {
      toast.error('Erro ao salvar valores: ' + err.message);
    }
    setSalvando(false);
  };

  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pct = (v) => `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>
          Valores negociados
        </p>
        {!editando && (
          <button onClick={abrirEdicao}
            className="flex items-center gap-1 text-[10px] font-semibold normal-case transition"
            style={{ color: '#00D4AA' }}>
            <Edit2 className="w-3 h-3" /> Editar valores
          </button>
        )}
      </div>

      {editando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'rgba(230,237,243,0.45)' }}>
              Mensalidade (R$)
            </label>
            <CampoMoeda asString value={mensalidade} onChange={setMensalidade}
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ background: '#17223A', border: '1px solid rgba(0,212,170,0.25)', color: '#e6edf3' }} />
          </div>
          {mostraRate && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'rgba(230,237,243,0.45)' }}>
                RATE (%)
              </label>
              <input type="number" step="0.01" min="0" max="100" value={rate} onChange={e => setRate(e.target.value)}
                placeholder="Ex: 0,89"
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ background: '#17223A', border: '1px solid rgba(0,212,170,0.25)', color: '#e6edf3' }} />
            </div>
          )}
          <div className="sm:col-span-2 flex items-center gap-2">
            <button onClick={salvar} disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition disabled:opacity-50"
              style={{ background: '#00D4AA', color: '#0B111C' }}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
            </button>
            <button onClick={() => setEditando(false)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition"
              style={{ background: '#17223A', color: 'rgba(230,237,243,0.7)', border: '1px solid rgba(0,212,170,0.2)' }}>
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.4)' }}>Mensalidade</p>
            <p className="text-sm mt-0.5 font-medium" style={{ color: '#e6edf3' }}>
              {contrato.mensalidade ? brl(contrato.mensalidade) : '—'}
            </p>
          </div>
          {mostraRate && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.4)' }}>RATE</p>
              <p className="text-sm mt-0.5 font-medium" style={{ color: '#e6edf3' }}>
                {contrato.rate != null ? pct(contrato.rate) : '—'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}