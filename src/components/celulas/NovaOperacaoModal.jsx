import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Loader2, UserPlus, Check, Search } from 'lucide-react';
import { consultarCnpj } from '@/lib/autocomplete';
import { resolverVendedorDoUsuarioLogado } from '@/lib/vendedorContrato';
import { JORNADAS } from '@/lib/celulas';
import { BuscaCliente, dig, fmtDoc } from './NdaGeradorModal';
import CampoMoeda from '@/components/ui/campo-moeda';

// Abertura de uma operação dentro da célula: o cliente nasce (ou é escolhido) na base, já na carteira
// de quem cadastrou, e a operação começa pela negociação (Pipeline) ou pelo estudo de viabilidade.
const TEMPERATURAS = ['Frio', 'Morno', 'Quente'];
const ORIGENS = ['Carteira', 'Lead', 'Indicação', 'Prospecção Ativa', 'Outro'];
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

function Campo({ label, children, span = 1 }) {
  return <label style={{ fontSize: 11, color: '#8E97A8', display: 'flex', flexDirection: 'column', gap: 4, gridColumn: `span ${span}` }}>{label}{children}</label>;
}

export default function NovaOperacaoModal({ celula, produto, t, onClose, onCriada }) {
  const jornada = JORNADAS[produto];
  const porEstudo = celula.fonte === 'estudo';
  const [cliente, setCliente] = useState(null); // cadastro escolhido da base
  const [novo, setNovo] = useState({ tipo_pessoa: 'PJ', nome: '', cpf_cnpj: '', email: '', telefone: '', cidade: '', estado: '', responsavel_legal: '' });
  const [neg, setNeg] = useState({ valor_estimado: '', data_prevista: '', temperatura: 'Morno', origem: 'Prospecção Ativa', proximo_contato: '', descricao: '' });
  const [salvando, setSalvando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const setN = (patch) => setNovo(n => ({ ...n, ...patch }));
  const setG = (patch) => setNeg(n => ({ ...n, ...patch }));

  // Antes de cadastrar, confere se o CPF/CNPJ já existe na base (evita cliente duplicado)
  const conferirDoc = async () => {
    const d = dig(novo.cpf_cnpj);
    if (d.length !== 11 && d.length !== 14) return;
    const r = await base44.entities.Cliente.filter({ $or: [{ cpf_cnpj: fmtDoc(d) }, { cpf_cnpj: d }] }, '-created_date', 1).catch(() => []);
    if (r?.[0]) { setCliente(r[0]); toast.success('Este CPF/CNPJ já está na base — usamos o cadastro existente.'); return; }
    if (d.length === 14) {
      setBuscandoCnpj(true);
      const c = await consultarCnpj(d).catch(() => null);
      setBuscandoCnpj(false);
      if (c) setNovo(n => ({ ...n, nome: n.nome || c.razao_social || '', cidade: n.cidade || c.cidade || '', estado: n.estado || c.estado || '' }));
    }
  };

  const validar = () => {
    if (cliente) return null;
    if (!novo.nome.trim()) return 'Informe o nome / razão social do cliente.';
    const d = dig(novo.cpf_cnpj);
    if (novo.tipo_pessoa === 'PJ' && d.length !== 14) return 'CNPJ inválido.';
    if (novo.tipo_pessoa === 'PF' && d.length !== 11) return 'CPF inválido.';
    if (!novo.telefone.trim() && !novo.email.trim()) return 'Informe ao menos telefone ou e-mail do cliente.';
    return null;
  };

  const criar = async () => {
    const erro = validar();
    if (erro) { toast.error(erro); return; }
    setSalvando(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      let vend = null;
      try { vend = await resolverVendedorDoUsuarioLogado(); } catch { /* sem vínculo */ }
      const vendOk = vend?.id && vend.ativo !== false;
      const respNome = (vendOk && vend.nome) || me?.nome_tratamento || me?.full_name || me?.email || '';

      // 1) Cliente na base, na carteira de quem cadastrou
      let c = cliente;
      if (!c) {
        const limpo = Object.fromEntries(Object.entries({ ...novo, cpf_cnpj: fmtDoc(novo.cpf_cnpj) }).filter(([, v]) => String(v || '').trim()));
        c = await base44.entities.Cliente.create({
          ...limpo,
          origem: 'nativo',
          responsavel_origem: `${celula.nome} · ${jornada.nome}`,
          observacao: `Cadastro criado na abertura da operação ${jornada.nome}.`,
          ...(vendOk ? { vendedor_id: vend.id, vendedor_nome: vend.nome } : {}),
        });
      } else if (!c.vendedor_id && vendOk) {
        await base44.entities.Cliente.update(c.id, { vendedor_id: vend.id, vendedor_nome: vend.nome }).catch(() => {});
      }
      const tipo = c.tipo_pessoa || (dig(c.cpf_cnpj).length === 11 ? 'PF' : 'PJ');

      // 2) Operação
      if (porEstudo) {
        const e = await base44.entities.EstudoViabilidade.create({
          produto, tipo_cliente: tipo, cliente_id: c.id, cliente_nome: c.nome, cliente_documento: c.cpf_cnpj || '',
          cliente_email: c.email || '', cliente_telefone: c.telefone || '',
          responsavel_email: me?.email || '', responsavel_nome: respNome,
          status: 'rascunho', respostas: {}, documentos: [],
          observacoes_internas: neg.descricao || '',
        });
        toast.success(`Operação ${jornada.nome} aberta para ${c.nome}.`);
        onCriada?.(e.id);
      } else {
        const p = await base44.entities.Pipeline.create({
          ...(vendOk ? { vendedor_id: vend.id, vendedor_nome: vend.nome } : { vendedor_nome: respNome }),
          cliente_id: c.id, cliente_nome: c.nome, cliente_cpf_cnpj: c.cpf_cnpj || '', cliente_telefone: c.telefone || '',
          produto: jornada.nome,
          valor_estimado: Number(neg.valor_estimado) || 0,
          ...(neg.data_prevista ? { data_prevista: neg.data_prevista } : {}),
          temperatura: neg.temperatura, origem: neg.origem,
          ...(neg.proximo_contato ? { proximo_contato: neg.proximo_contato } : {}),
          descricao: neg.descricao || '',
        });
        toast.success(`Negociação ${jornada.nome} aberta para ${c.nome}.`);
        onCriada?.('p_' + p.id);
      }
    } catch (e) { toast.error(e.message || 'Não foi possível abrir a operação.'); }
    setSalvando(false);
  };

  const acc = t?.acc || '#C9A962';
  const inp = { height: 38, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EFE3', fontSize: 13, width: '100%' };
  const secao = { fontSize: 13, fontWeight: 600, color: '#F4EFE3', marginBottom: 8 };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Nova operação ${jornada.nome}`}
      style={{ background: 'rgba(3,6,10,0.7)', backdropFilter: 'blur(4px)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vx-suspensa w-full max-w-[760px] max-h-[92vh] flex flex-col rounded-3xl overflow-hidden" style={{ background: '#101826', border: `1px solid ${acc}55`, boxShadow: '0 40px 100px rgba(0,0,0,.7)' }}>
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: acc + '22', border: `1.5px solid ${acc}` }}><UserPlus className="w-5 h-5" style={{ color: acc }} /></span>
          <div className="flex-1">
            <p className="text-base font-semibold" style={{ color: '#F4EFE3' }}>Nova operação {jornada.nome}</p>
            <p className="text-xs" style={{ color: '#8E97A8' }}>{porEstudo ? 'O cliente entra na base e a operação começa pelo estudo de viabilidade.' : 'O cliente entra na base e a operação começa pela negociação (lead, valor, prazo e abordagens).'}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="vx-btn vx-btn-ghost vx-icon-btn"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <section>
            <p style={secao}>1. Cliente</p>
            {cliente ? (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: acc + '14', border: `1px solid ${acc}55` }}>
                <Check className="w-4 h-4" style={{ color: acc }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#F4EFE3' }}>{cliente.nome}</p>
                  <p className="text-xs" style={{ color: '#8E97A8' }}>{cliente.cpf_cnpj || 'sem documento'} · carteira {cliente.vendedor_nome || '—'}</p>
                </div>
                <button onClick={() => setCliente(null)} className="vx-btn vx-btn-ghost" style={{ height: 30, padding: '0 12px', fontSize: 12 }}>Trocar</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <BuscaCliente acc={acc} onEscolher={setCliente} vazioTexto="Nenhum cliente encontrado. Cadastre abaixo: ele entra na base, na sua carteira." />
                <div className="flex items-center gap-2 text-xs" style={{ color: '#8E97A8' }}><span className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} /> ou cadastre um novo cliente <span className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} /></div>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
                  <Campo label="Tipo">
                    <select value={novo.tipo_pessoa} onChange={e => setN({ tipo_pessoa: e.target.value })} style={inp}><option value="PJ">Pessoa jurídica</option><option value="PF">Pessoa física</option></select>
                  </Campo>
                  <Campo label={novo.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}>
                    <div className="flex items-center gap-1" style={{ ...inp, padding: '0 6px 0 12px' }}>
                      <input value={novo.cpf_cnpj} onChange={e => setN({ cpf_cnpj: e.target.value })} onBlur={conferirDoc} className="flex-1 bg-transparent outline-none min-w-0" style={{ color: '#F4EFE3', fontSize: 13 }} />
                      {buscandoCnpj ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: acc }} /> : <Search className="w-4 h-4" style={{ color: '#8E97A8' }} aria-hidden="true" />}
                    </div>
                  </Campo>
                  <Campo label={novo.tipo_pessoa === 'PJ' ? 'Razão social' : 'Nome completo'} span={2}>
                    <input value={novo.nome} onChange={e => setN({ nome: e.target.value })} style={inp} />
                  </Campo>
                  {novo.tipo_pessoa === 'PJ' && (
                    <Campo label="Responsável legal" span={2}><input value={novo.responsavel_legal} onChange={e => setN({ responsavel_legal: e.target.value })} style={inp} /></Campo>
                  )}
                  <Campo label="E-mail" span={2}><input type="email" value={novo.email} onChange={e => setN({ email: e.target.value })} style={inp} /></Campo>
                  <Campo label="Telefone / WhatsApp" span={2}><input value={novo.telefone} onChange={e => setN({ telefone: e.target.value })} style={inp} /></Campo>
                  <Campo label="Cidade"><input value={novo.cidade} onChange={e => setN({ cidade: e.target.value })} style={inp} /></Campo>
                  <Campo label="UF">
                    <select value={novo.estado} onChange={e => setN({ estado: e.target.value })} style={inp}><option value="">—</option>{UFS.map(u => <option key={u}>{u}</option>)}</select>
                  </Campo>
                </div>
              </div>
            )}
          </section>

          <section>
            <p style={secao}>{porEstudo ? '2. Observações iniciais' : '2. Negociação'}</p>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
              {!porEstudo && (
                <>
                  <Campo label="Valor estimado (R$)"><CampoMoeda asString value={neg.valor_estimado} onChange={v => setG({ valor_estimado: v })} style={inp} /></Campo>
                  <Campo label="Previsão de fechamento"><input type="date" value={neg.data_prevista} onChange={e => setG({ data_prevista: e.target.value })} style={inp} /></Campo>
                  <Campo label="Temperatura">
                    <select value={neg.temperatura} onChange={e => setG({ temperatura: e.target.value })} style={inp}>{TEMPERATURAS.map(x => <option key={x}>{x}</option>)}</select>
                  </Campo>
                  <Campo label="Origem">
                    <select value={neg.origem} onChange={e => setG({ origem: e.target.value })} style={inp}>{ORIGENS.map(x => <option key={x}>{x}</option>)}</select>
                  </Campo>
                  <Campo label="Próximo contato"><input type="date" value={neg.proximo_contato} onChange={e => setG({ proximo_contato: e.target.value })} style={inp} /></Campo>
                </>
              )}
              <Campo label={porEstudo ? 'O que o cliente busca, contexto da indicação…' : 'Contexto da negociação'} span={porEstudo ? 4 : 3}>
                <textarea value={neg.descricao} onChange={e => setG({ descricao: e.target.value })} rows={3} style={{ ...inp, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />
              </Campo>
            </div>
          </section>
        </div>

        <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="flex-1 text-xs" style={{ color: '#8E97A8' }}>Tudo desta operação fica vinculado ao cadastro do cliente (ID e CPF/CNPJ).</span>
          <button onClick={onClose} className="vx-btn vx-btn-ghost" style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Cancelar</button>
          <button onClick={criar} disabled={salvando} className="vx-btn vx-btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {porEstudo ? 'Abrir operação' : 'Abrir negociação'}
          </button>
        </div>
      </div>
    </div>
  );
}
