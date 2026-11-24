import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, UserPlus, X, Check } from 'lucide-react';
import CadastroClienteRapido from '@/components/estudo/CadastroClienteRapido';

const A = {
  surface2: '#1c2333', border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
};
const inputStyle = { background: A.surface2, border: `1px solid ${A.border}`, color: A.text };
const labelStyle = { color: A.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };
const digitos = (v) => String(v || '').replace(/\D/g, '');
// Nomes com ( ) . + & quebram a expressão regular da busca — escapa antes de enviar.
const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Busca o cliente na base automaticamente (nome, CPF/CNPJ ou e-mail).
 * Ao selecionar, entrega o cadastro completo; se não existir, abre o cadastro rápido.
 */
export default function ClienteEstudoPicker({ onSelecionar }) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [cadastro, setCadastro] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const fora = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  useEffect(() => {
    const termo = busca.trim();
    if (selecionado || termo.length < 2) { setResultados([]); setBuscando(false); return; }
    let cancelado = false;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const rx = { $regex: escapar(termo), $options: 'i' };
        const r = await base44.entities.Cliente.filter({
          $or: [{ nome: rx }, { cpf_cnpj: rx }, { email: rx }, { telefone: rx }],
        }, { limit: 8, sort: 'nome' });
        if (cancelado) return;
        setResultados(Array.isArray(r) ? r : (r?.items || []));
      } catch {
        if (!cancelado) setResultados([]);
      }
      if (!cancelado) setBuscando(false);
    }, 350);
    return () => { cancelado = true; clearTimeout(t); };
  }, [busca, selecionado]);

  const escolher = (c) => {
    setSelecionado(c);
    setBusca(c.nome || '');
    setAberto(false);
    onSelecionar?.(c);
  };

  const trocar = () => {
    setSelecionado(null);
    setBusca('');
    setResultados([]);
    setAberto(false);
  };

  const abrirCadastro = () => {
    const termo = busca.trim();
    const ehDocumento = /^[\d.\-\/\s]+$/.test(termo) && digitos(termo).length > 0;
    setCadastro({
      tipo_pessoa: digitos(termo).length === 14 ? 'PJ' : 'PF',
      nome: ehDocumento ? '' : termo,
      cpf_cnpj: ehDocumento ? termo : '',
    });
    setAberto(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <label className="block mb-1" style={labelStyle}>Buscar cliente na base (nome, CPF/CNPJ ou e-mail)</label>

      {selecionado ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: A.accentDim, border: `1px solid ${A.accent}66` }}>
          <Check className="w-4 h-4 flex-shrink-0" style={{ color: A.accent }} />
          <span className="flex-1 truncate" style={{ color: A.text }}>
            {selecionado.nome}
            {selecionado.cpf_cnpj && <span className="text-[11px]" style={{ color: A.textMuted }}> · {selecionado.cpf_cnpj}</span>}
          </span>
          <button type="button" onClick={trocar} className="p-1 rounded" style={{ color: A.textMuted }} title="Trocar cliente">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: A.textMuted }} />
            <input value={busca}
              onChange={e => { setBusca(e.target.value); setAberto(true); }}
              onFocus={() => setAberto(true)}
              placeholder="Digite para buscar automaticamente..."
              style={inputStyle} className="w-full pl-9 pr-9 py-2 text-sm rounded-lg focus:outline-none" />
            {buscando && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: A.accent }} />}
          </div>

          {aberto && busca.trim().length >= 2 && (
            <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl"
              style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
              {buscando && (
                <p className="px-3 py-2.5 text-xs flex items-center gap-2" style={{ color: A.textMuted }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> Buscando na base...
                </p>
              )}
              {!buscando && resultados.map(c => (
                <button key={c.id} type="button" onClick={() => escolher(c)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/[0.05]">
                  <span className="flex-1 truncate" style={{ color: A.text }}>{c.nome}</span>
                  {c.cpf_cnpj && <span className="text-[11px] flex-shrink-0" style={{ color: A.textMuted }}>{c.cpf_cnpj}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: A.accentDim, color: A.accent }}>{c.tipo_pessoa || '—'}</span>
                </button>
              ))}
              {!buscando && resultados.length === 0 && (
                <p className="px-3 py-2.5 text-xs" style={{ color: A.textMuted }}>
                  Nenhum cliente encontrado para “{busca.trim()}”.
                </p>
              )}
              <button type="button" onClick={abrirCadastro}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold"
                style={{ borderTop: `1px solid ${A.border}`, color: A.accent }}>
                <UserPlus className="w-3.5 h-3.5" /> Cadastrar novo cliente
              </button>
            </div>
          )}
        </>
      )}

      {cadastro && (
        <CadastroClienteRapido inicial={cadastro} onClose={() => setCadastro(null)}
          onCriado={(c) => { setCadastro(null); escolher(c); }} />
      )}
    </div>
  );
}