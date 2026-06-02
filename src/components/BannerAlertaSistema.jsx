import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Info, X, Wifi } from 'lucide-react';

export default function BannerAlertaSistema({ user }) {
  const [alerta, setAlerta] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState('aviso');
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  useEffect(() => {
    // Carrega o alerta ativo inicial
    base44.entities.AlertaSistema.filter({ ativo: true })
      .then(results => setAlerta(results[0] || null))
      .catch(() => {});

    // Atualização em tempo real
    const unsub = base44.entities.AlertaSistema.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        if (event.data?.ativo) {
          setAlerta(event.data);
        } else {
          setAlerta(prev => (prev?.id === event.id ? null : prev));
        }
      } else if (event.type === 'delete') {
        setAlerta(prev => (prev?.id === event.id ? null : prev));
      }
    });

    return unsub;
  }, []);

  const handleCriar = async () => {
    if (!mensagem.trim()) return;
    setSaving(true);
    try {
      const anteriores = await base44.entities.AlertaSistema.filter({ ativo: true });
      for (const a of anteriores) {
        await base44.entities.AlertaSistema.update(a.id, { ativo: false });
      }
      await base44.entities.AlertaSistema.create({ mensagem: mensagem.trim(), ativo: true, tipo });
      setShowForm(false);
      setMensagem('');
    } catch (e) {}
    setSaving(false);
  };

  const handleDesativar = async () => {
    if (!alerta) return;
    await base44.entities.AlertaSistema.update(alerta.id, { ativo: false });
    setAlerta(null);
  };

  const styles = {
    aviso: 'bg-amber-50 border-amber-300 text-amber-800',
    erro:  'bg-red-50 border-red-300 text-red-800',
    info:  'bg-blue-50 border-blue-300 text-blue-800',
  };

  const Icon = alerta?.tipo === 'erro' ? AlertTriangle : Info;

  if (!alerta && !isAdmin) return null;

  return (
    <div className="px-4 pt-2 pb-1 space-y-1.5">
      {alerta && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium ${styles[alerta.tipo || 'aviso']}`}>
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{alerta.mensagem}</span>
          {isAdmin && (
            <button
              onClick={handleDesativar}
              className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition font-semibold ml-2"
            >
              <X className="w-3.5 h-3.5" /> Desativar
            </button>
          )}
        </div>
      )}

      {isAdmin && !alerta && (
        showForm ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl border border-dashed border-gray-300">
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="aviso">⚠️ Aviso</option>
              <option value="erro">🔴 Erro</option>
              <option value="info">ℹ️ Info</option>
            </select>
            <input
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              placeholder="Mensagem do alerta para todos os usuários..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-amber-400"
              onKeyDown={e => e.key === 'Enter' && handleCriar()}
            />
            <button
              onClick={handleCriar}
              disabled={saving || !mensagem.trim()}
              className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-40 transition"
            >
              {saving ? '...' : 'Enviar'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-600 transition px-1"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Enviar alerta ao sistema</span>
          </button>
        )
      )}
    </div>
  );
}