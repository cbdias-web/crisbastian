import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import JornadaCliente from '@/components/portal/JornadaCliente';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Monta o detalhe { lead, contrato, venda, parcelas, implantacao } para o JornadaCliente
// a partir de um Cliente da carteira, e permite editar dados cadastrais faltantes.
export default function CadastroCarteiraPanel({ clienteId, fila }) {
  const [detalhe, setDetalhe] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const c = await base44.entities.Cliente.get(clienteId).catch(() => null);
        if (!active) return;
        if (!c) { setCliente(null); setLoading(false); return; }
        setCliente(c);
        setForm({
          nome: c.nome || '', cpf_cnpj: c.cpf_cnpj || '', telefone: c.telefone || '',
          email: c.email || '', cidade: c.cidade || '', estado: c.estado || '',
        });
        // Monta detalhe para JornadaCliente
        const [leads, contratos, vendas, implantacoes] = await Promise.all([
          base44.entities.LeadIndicacao.filter({ cliente_id: clienteId }).catch(() => []),
          base44.entities.Contrato.filter({ cliente_id: clienteId }).catch(() => []),
          base44.entities.Venda.filter({ cpf_cnpj: c.cpf_cnpj }).catch(() => []),
          base44.entities.Implantacao.filter({ venda_id: '' }).catch(() => []),
        ]);
        const venda = vendas[0] || null;
        let parcelas = [];
        if (venda?.id) {
          parcelas = await base44.entities.ParcelaVenda.filter({ venda_id: venda.id }).catch(() => []);
        }
        const impl = await base44.entities.Implantacao.filter({ contrato_id: contratos[0]?.id || '' }).catch(() => []);
        if (active) {
          setDetalhe({
            lead: leads[0] || { produto: fila?.produto || '—', created_date: c.created_date, cliente_id: c.id, convertido_em: c.created_date },
            contrato: contratos[0] || null,
            venda,
            parcelas,
            implantacao: impl[0] || null,
          });
        }
      } catch (e) { /* noop */ }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [clienteId]);

  const salvar = async () => {
    setSalvando(true);
    try {
      await base44.entities.Cliente.update(clienteId, form);
      setCliente(c => ({ ...c, ...form }));
      setEditando(false);
      toast.success('Cadastro atualizado!');
    } catch (e) { toast.error('Erro ao atualizar: ' + (e?.message || e)); }
    setSalvando(false);
  };

  if (loading) return <div className="py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>;
  if (!cliente) return <p className="text-xs italic py-3" style={{ color: AURORA.textMuted }}>Cliente não encontrado.</p>;

  return (
    <div className="space-y-3">
      {detalhe && <JornadaCliente detalhe={detalhe} />}
      <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Dados Cadastrais</p>
          {!editando && (
            <button onClick={() => setEditando(true)} className="text-[11px] font-semibold" style={{ color: AURORA.accent }}>Editar</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: 'nome', l: 'Nome' }, { k: 'cpf_cnpj', l: 'CPF/CNPJ' },
            { k: 'telefone', l: 'Telefone' }, { k: 'email', l: 'E-mail' },
            { k: 'cidade', l: 'Cidade' }, { k: 'estado', l: 'UF' },
          ].map(f => (
            <div key={f.k}>
              <label className="text-[10px] block mb-0.5" style={{ color: AURORA.textMuted }}>{f.l}</label>
              {editando ? (
                <input value={form[f.k] || ''} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              ) : (
                <p className="text-xs" style={{ color: AURORA.text }}>{cliente[f.k] || '—'}</p>
              )}
            </div>
          ))}
        </div>
        {editando && (
          <div className="flex gap-2 mt-2">
            <button onClick={salvar} disabled={salvando} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: AURORA.accent, color: '#0d1117' }}>
              {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
            </button>
            <button onClick={() => { setEditando(false); setForm({ nome: cliente.nome||'', cpf_cnpj: cliente.cpf_cnpj||'', telefone: cliente.telefone||'', email: cliente.email||'', cidade: cliente.cidade||'', estado: cliente.estado||'' }); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}>
              <X className="w-3 h-3" /> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}