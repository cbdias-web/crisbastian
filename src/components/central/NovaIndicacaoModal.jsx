import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, User, Building2, X, CheckCircle2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const PRODUTOS = [
  'CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF',
  'CANAL BANCÁRIO', 'OFFSHORE', 'GARANTIAS', 'HORA TÉCNICA', 'RATING',
];

const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none';

function Field({ label, children, required }) {
  return (
    <div>
      <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>
        {label}{required && <span style={{ color: '#f87171' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function NovaIndicacaoModal({ parceiro, onClose }) {
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [tipo, setTipo] = useState('PF');
  const [produto, setProduto] = useState('');
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [pf, setPf] = useState({});
  const [pj, setPj] = useState({});

  const setField = (setter) => (k) => (e) => setter(prev => ({ ...prev, [k]: e.target.value }));

  const salvar = async () => {
    if (!produto) { toast.error('Selecione o produto'); return; }
    if (tipo === 'PF' && !pf.pf_nome?.trim()) { toast.error('Informe o nome do titular'); return; }
    if (tipo === 'PF' && !(pf.pf_whatsapp || pf.pf_telefone)?.trim()) { toast.error('Informe o WhatsApp/telefone do titular — é obrigatório para direcionar o lead à Central'); return; }
    if (tipo === 'PJ' && !pj.pj_razao_social?.trim()) { toast.error('Informe a razão social'); return; }
    if (tipo === 'PJ' && !(pj.pj_whatsapp || pj.pj_telefone)?.trim()) { toast.error('Informe o WhatsApp/telefone da empresa — é obrigatório para direcionar o lead à Central'); return; }

    setEnviando(true);
    try {
      const dados = {
        tipo, produto,
        valor_estimado: valor ? Number(valor) : null,
        observacoes: obs,
        ...(tipo === 'PF' ? pf : pj),
      };
      const res = await base44.functions.invoke('indicacaoParceiroAuth', { dados });
      const r = res?.data || res;
      if (r?.success) {
        toast.success('Indicação enviada com sucesso! 🙌');
        queryClient.invalidateQueries({ queryKey: ['lead-indicacoes'] });
        setSucesso({ vendedor: r.vendedor_atribuido });
      } else if (r?.error) {
        toast.error(r.error);
      }
    } catch (e) {
      toast.error('Erro ao enviar: ' + (e?.message || ''));
    }
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={sucesso ? onClose : undefined}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[92vh] flex flex-col" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: AURORA.text }}>Nova Indicação</p>
              <p className="text-[11px]" style={{ color: AURORA.textMuted }}>Indicador: <strong style={{ color: AURORA.accent }}>{parceiro?.nome}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
        </div>

        {sucesso ? (
          <div className="p-6 overflow-y-auto">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)' }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: AURORA.accent }} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: AURORA.text }}>Indicação enviada!</h3>
              <p className="text-sm" style={{ color: AURORA.textMuted }}>Muito obrigado, <strong style={{ color: AURORA.accent }}>{parceiro?.nome?.split(' ')[0]}</strong>! 🙌</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(0,212,170,0.08)', border: `1px solid ${AURORA.border}` }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: AURORA.text }}>Lead direcionado à esteira comercial</p>
                  <p className="text-xs leading-relaxed" style={{ color: AURORA.textMuted }}>
                    Sua indicação foi encaminhada para a nossa esteira comercial{sucesso.vendedor ? ` e já está com ${sucesso.vendedor}` : ''}. Acompanhe o andamento abaixo.
                  </p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: AURORA.accent, color: '#0d1117' }}>
              Ver minhas indicações
            </button>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Tipo */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: AURORA.textMuted }}>Tipo de cliente</p>
              <div className="grid grid-cols-2 gap-2">
                {['PF', 'PJ'].map(t => (
                  <button key={t} onClick={() => setTipo(t)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                    style={{ background: tipo === t ? AURORA.accent : AURORA.surface2, color: tipo === t ? '#0d1117' : AURORA.text, border: `1px solid ${tipo === t ? AURORA.accent : AURORA.border}` }}>
                    {t === 'PF' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    {t === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Produto de interesse" required>
                <select value={produto} onChange={e => setProduto(e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="">Selecione...</option>
                  {PRODUTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Valor estimado de adesão (R$)">
                <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 5000" className={inputCls} style={inputStyle} />
              </Field>
            </div>

            {tipo === 'PF' && (
              <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Dados Pessoa Física</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nome completo" required><input value={pf.pf_nome || ''} onChange={setField(setPf)('pf_nome')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="CPF"><input value={pf.pf_cpf || ''} onChange={setField(setPf)('pf_cpf')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="RG"><input value={pf.pf_rg || ''} onChange={setField(setPf)('pf_rg')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Data de nascimento"><input type="date" value={pf.pf_nascimento || ''} onChange={setField(setPf)('pf_nascimento')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Nacionalidade"><input value={pf.pf_nacionalidade || ''} onChange={setField(setPf)('pf_nacionalidade')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Profissão"><input value={pf.pf_profissao || ''} onChange={setField(setPf)('pf_profissao')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="E-mail"><input value={pf.pf_email || ''} onChange={setField(setPf)('pf_email')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Telefone"><input value={pf.pf_telefone || ''} onChange={setField(setPf)('pf_telefone')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="WhatsApp" required><input value={pf.pf_whatsapp || ''} onChange={setField(setPf)('pf_whatsapp')} placeholder="Ex: 5511999998888" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Renda estimada (R$)"><input type="number" value={pf.pf_renda || ''} onChange={setField(setPf)('pf_renda')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="CEP"><input value={pf.pf_cep || ''} onChange={setField(setPf)('pf_cep')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Endereço"><input value={pf.pf_endereco || ''} onChange={setField(setPf)('pf_endereco')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Número"><input value={pf.pf_numero || ''} onChange={setField(setPf)('pf_numero')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Complemento"><input value={pf.pf_complemento || ''} onChange={setField(setPf)('pf_complemento')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Bairro"><input value={pf.pf_bairro || ''} onChange={setField(setPf)('pf_bairro')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Cidade"><input value={pf.pf_cidade || ''} onChange={setField(setPf)('pf_cidade')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Estado (UF)"><input value={pf.pf_estado || ''} onChange={setField(setPf)('pf_estado')} className={inputCls} style={inputStyle} /></Field>
                </div>
              </div>
            )}

            {tipo === 'PJ' && (
              <div className="space-y-3 pt-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Dados Pessoa Jurídica</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Razão Social" required><input value={pj.pj_razao_social || ''} onChange={setField(setPj)('pj_razao_social')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="CNPJ"><input value={pj.pj_cnpj || ''} onChange={setField(setPj)('pj_cnpj')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Nome do responsável"><input value={pj.pj_nome_responsavel || ''} onChange={setField(setPj)('pj_nome_responsavel')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="CPF do responsável"><input value={pj.pj_cpf_responsavel || ''} onChange={setField(setPj)('pj_cpf_responsavel')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="E-mail"><input value={pj.pj_email || ''} onChange={setField(setPj)('pj_email')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Telefone"><input value={pj.pj_telefone || ''} onChange={setField(setPj)('pj_telefone')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="WhatsApp" required><input value={pj.pj_whatsapp || ''} onChange={setField(setPj)('pj_whatsapp')} placeholder="Ex: 5511999998888" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Ramo de atividade"><input value={pj.pj_ramo_atividade || ''} onChange={setField(setPj)('pj_ramo_atividade')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Faturamento estimado (R$)"><input type="number" value={pj.pj_faturamento || ''} onChange={setField(setPj)('pj_faturamento')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="CEP"><input value={pj.pj_cep || ''} onChange={setField(setPj)('pj_cep')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Endereço"><input value={pj.pj_endereco || ''} onChange={setField(setPj)('pj_endereco')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Número"><input value={pj.pj_numero || ''} onChange={setField(setPj)('pj_numero')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Complemento"><input value={pj.pj_complemento || ''} onChange={setField(setPj)('pj_complemento')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Bairro"><input value={pj.pj_bairro || ''} onChange={setField(setPj)('pj_bairro')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Cidade"><input value={pj.pj_cidade || ''} onChange={setField(setPj)('pj_cidade')} className={inputCls} style={inputStyle} /></Field>
                  <Field label="Estado (UF)"><input value={pj.pj_estado || ''} onChange={setField(setPj)('pj_estado')} className={inputCls} style={inputStyle} /></Field>
                </div>
              </div>
            )}

            <Field label="Observações sobre o lead">
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Contexto, urgência, pontos de atenção..." className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none" style={inputStyle} />
            </Field>
          </div>
        )}

        {!sucesso && (
          <div className="p-4 flex justify-end gap-2" style={{ background: AURORA.surface2, borderTop: `1px solid ${AURORA.border}` }}>
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: AURORA.surface, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>Cancelar</button>
            <button onClick={salvar} disabled={enviando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}>
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar Indicação
            </button>
          </div>
        )}
      </div>
    </div>
  );
}