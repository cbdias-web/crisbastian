import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  X, Loader2, Sparkles, Landmark, Globe2, Wallet, User, Building2, CheckCircle2, AlertTriangle, Link2,
} from 'lucide-react';
import { PRODUTOS_ESTUDO, OBJETIVOS_POR_PRODUTO } from '@/lib/estudoViabilidade';
import ClienteEstudoPicker from '@/components/estudo/ClienteEstudoPicker';

const A = {
  surface: '#161b22', surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', muted: 'rgba(230,237,243,0.55)', gold: '#fbbf24', danger: '#f87171',
};
const inputStyle = { background: A.surface2, border: `1px solid ${A.border}`, color: A.text };
const label = { color: A.muted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' };
const ICONE = { holding: Landmark, offshore: Globe2, conta_internacional: Wallet };

// Gera uma análise técnica sem passar pelo link do cliente:
// o consultor informa os dados manualmente (ou escolhe um cliente já cadastrado)
// e pode usar uma análise já existente como referência de método.
export default function NovaAnaliseManualModal({ user, onClose, onConcluido }) {
  const [produto, setProduto] = useState('holding');
  const [tipo, setTipo] = useState('PF');
  const [cliente, setCliente] = useState({ id: '', nome: '', doc: '', email: '', telefone: '' });
  const [objetivos, setObjetivos] = useState([]);
  const [proposito, setProposito] = useState('');
  const [expectativa, setExpectativa] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [obsInternas, setObsInternas] = useState('');
  const [baseId, setBaseId] = useState('');
  const [propostas, setPropostas] = useState([]);
  const [rodando, setRodando] = useState(false);
  const [estudoId, setEstudoId] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    base44.entities.PropostaTecnica.list('-created_date', 200).then(l => setPropostas(l || [])).catch(() => {});
  }, []);

  const set = (k, v) => setCliente(c => ({ ...c, [k]: v }));
  const toggleObjetivo = (o) => setObjetivos(v => (v.includes(o) ? v.filter(x => x !== o) : [...v, o]));
  const opcoes = OBJETIVOS_POR_PRODUTO[produto] || [];

  const gerar = async () => {
    if (!cliente.nome.trim()) return toast.error('Informe o nome do cliente.');
    if (!objetivos.length) return toast.error('Selecione ao menos um objetivo do cliente.');
    if (!proposito.trim()) return toast.error('Descreva o propósito / contexto do cliente.');
    setRodando(true); setErro('');
    try {
      let id = estudoId;
      if (!id) {
        const agora = new Date().toISOString();
        const quem = user?.nome_tratamento || user?.full_name || user?.email || '';
        const estudo = await base44.entities.EstudoViabilidade.create({
          produto, tipo_cliente: tipo,
          cliente_id: cliente.id || '', cliente_nome: cliente.nome.trim(),
          cliente_documento: cliente.doc || '', cliente_email: cliente.email || '', cliente_telefone: cliente.telefone || '',
          status: 'em_analise_tecnica', data_recebimento: agora, data_envio_analise: agora,
          responsavel_email: user?.email || '', responsavel_nome: quem, preenchido_por_nome: quem,
          observacoes_internas: obsInternas, analise_base_id: baseId || '',
          respostas: {
            [tipo === 'PJ' ? 'razao_social' : 'nome']: cliente.nome.trim(),
            [tipo === 'PJ' ? 'cnpj' : 'cpf']: cliente.doc || '',
            email: cliente.email || '', telefone: cliente.telefone || '',
            objetivos, proposito_descricao: proposito, expectativa, patrimonio_total: patrimonio,
          },
        });
        id = estudo.id;
        setEstudoId(id);
      }
      const res = await base44.functions.invoke('analisarEstudoViabilidade', {
        action: 'analisar', estudo_id: id, base_proposta_id: baseId || undefined,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success(`Proposta v${res.data.proposta.versao} gerada.`);
      onConcluido(id);
    } catch (e) {
      setErro(e?.response?.data?.error || e.message || 'Falha ao gerar a análise.');
    } finally { setRodando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.68)' }} onClick={rodando ? undefined : onClose}>
      <div className="w-full max-w-2xl rounded-2xl my-6" style={{ background: A.surface, border: `1px solid ${A.border}` }} onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: A.accent }}>Análise manual</p>
              <h2 className="text-lg font-bold" style={{ color: A.text }}>Gerar análise técnica sem o formulário do cliente</h2>
            </div>
            <button type="button" onClick={onClose} disabled={rodando} style={{ color: A.muted }}><X className="w-5 h-5" /></button>
          </div>

          {rodando ? (
            <div className="rounded-xl p-6 text-center space-y-3" style={{ background: A.accentDim, border: `1px solid ${A.borderActive}` }}>
              <Loader2 className="w-7 h-7 animate-spin mx-auto" style={{ color: A.accent }} />
              <p className="text-sm font-bold" style={{ color: A.text }}>O motor de IA está montando a proposta…</p>
              <p className="text-[11px]" style={{ color: A.muted }}>Considera as premissas do sistema e pode levar até 2 minutos.</p>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-1.5" style={label}>Produto</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(PRODUTOS_ESTUDO).map(p => {
                    const Icon = ICONE[p.id];
                    const on = produto === p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => { setProduto(p.id); setObjetivos([]); }}
                        className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold"
                        style={{ background: on ? A.accentDim : A.surface2, border: `1px solid ${on ? A.accent : A.border}`, color: on ? A.accent : A.text }}>
                        <Icon className="w-5 h-5" /> {p.nome}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5" style={label}>Natureza do cliente</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'PF', l: 'Pessoa Física', I: User }, { v: 'PJ', l: 'Pessoa Jurídica', I: Building2 }].map(o => (
                    <button key={o.v} type="button" onClick={() => setTipo(o.v)}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold"
                      style={tipo === o.v ? { background: A.accent, color: '#0d1117' } : inputStyle}>
                      <o.I className="w-3.5 h-3.5" /> {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <ClienteEstudoPicker onSelecionar={(c) => setCliente({
                id: c.id || '', nome: c.nome || '', doc: c.cpf_cnpj || '', email: c.email || '', telefone: c.telefone || '',
              })} />

              <div>
                <p className="mb-1" style={label}>{tipo === 'PJ' ? 'Razão social *' : 'Nome do cliente *'}</p>
                <input value={cliente.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome que aparece na proposta"
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1" style={label}>{tipo === 'PJ' ? 'CNPJ' : 'CPF'}</p>
                  <input value={cliente.doc} onChange={e => set('doc', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <p className="mb-1" style={label}>WhatsApp</p>
                  <input value={cliente.telefone} onChange={e => set('telefone', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} />
                </div>
              </div>
              <div>
                <p className="mb-1" style={label}>E-mail</p>
                <input type="email" value={cliente.email} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} />
              </div>

              <div>
                <p className="mb-1.5" style={label}>Objetivos do cliente *</p>
                <div className="flex flex-wrap gap-1.5">
                  {opcoes.map(o => {
                    const on = objetivos.includes(o);
                    return (
                      <button key={o} type="button" onClick={() => toggleObjetivo(o)} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={on ? { background: A.accent, color: '#0d1117' } : { background: A.surface2, color: A.muted, border: `1px solid ${A.border}` }}>
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1" style={label}>Propósito / contexto *</p>
                <textarea value={proposito} onChange={e => setProposito(e.target.value)} rows={3} placeholder="O que o cliente quer resolver, o que motivou a contratação, o que já existe hoje."
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y" style={inputStyle} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="mb-1" style={label}>Expectativa</p>
                  <textarea value={expectativa} onChange={e => setExpectativa(e.target.value)} rows={2} placeholder="Resultado esperado e prazo desejado."
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y" style={inputStyle} />
                </div>
                <div>
                  <p className="mb-1" style={label}>Patrimônio estimado</p>
                  <input value={patrimonio} onChange={e => setPatrimonio(e.target.value)} placeholder="Ex.: R$ 4,5 milhões (imóveis + aplicações)"
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} />
                </div>
              </div>
              <div>
                <p className="mb-1" style={label}>Observações internas (não vão ao PDF)</p>
                <textarea value={obsInternas} onChange={e => setObsInternas(e.target.value)} rows={2} placeholder="Pontos de atenção, contexto comercial, o que já foi combinado."
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y" style={inputStyle} />
              </div>

              <div>
                <p className="mb-1 flex items-center gap-1.5" style={label}><Link2 className="w-3 h-3" /> Usar uma análise já criada como base (opcional)</p>
                <select value={baseId} onChange={e => setBaseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle}>
                  <option value="">Nenhuma — análise do zero</option>
                  {propostas.map(p => (
                    <option key={p.id} value={p.id}>{p.cliente_nome} · {p.codigo} · v{p.versao}</option>
                  ))}
                </select>
                <p className="text-[11px] mt-1 flex items-start gap-1.5" style={{ color: A.muted }}>
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  A IA usa a análise escolhida só como método (estrutura, etapas, riscos e padrão de redação). Dados, valores e fatos são sempre os deste cliente.
                </p>
              </div>

              {erro && (
                <p className="text-[11.5px] rounded-lg px-3 py-2" style={{ background: 'rgba(248,113,113,0.12)', color: A.danger, border: '1px solid rgba(248,113,113,0.35)' }}>
                  {erro}{estudoId ? ' O registro do cliente foi criado — clique em gerar novamente para tentar de novo.' : ''}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ ...inputStyle, color: A.muted }}>Cancelar</button>
                <button type="button" onClick={gerar} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: A.accent, color: '#0d1117' }}>
                  <Sparkles className="w-3.5 h-3.5" /> Gerar análise técnica
                </button>
              </div>
            </>
          )}

          {rodando && (
            <p className="text-[11px] flex items-center gap-1.5" style={{ color: A.muted }}>
              <CheckCircle2 className="w-3 h-3" style={{ color: A.accent }} /> {cliente.nome} · {PRODUTOS_ESTUDO[produto]?.nome} · {tipo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}