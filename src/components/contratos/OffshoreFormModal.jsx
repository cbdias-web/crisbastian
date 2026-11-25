import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  X, Globe2, User, Building2, FileCheck2, Upload, CheckCircle2, Circle, Plus, Trash2,
  Loader2, FileText, Download, Copy, Link2, MessageSquare, MessageCircle, Mail, Users, ShieldCheck, BarChart3, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { isoNowBrasilia } from '@/lib/dateUtils';
import DestinatarioLinkPanel, { mensagemPadrao } from '@/components/contratos/DestinatarioLinkPanel';
import { AURORA, inputStyle, labelStyle, CardSection, LI, RadioBtns, SelectField } from '@/components/contratos/ciFormControls';
import { linkPublico, origemPublica } from '@/lib/appUrl';
import { mergeDocs, calcularPendencias, FAIXAS_MOVIMENTACAO, ESTADOS_CIVIS } from '@/lib/offshoreForm';
import ClienteEstudoPicker from '@/components/estudo/ClienteEstudoPicker';

const CONTRATANTE_VAZIO = {
  contratante_nome: '', contratante_cpf: '', contratante_rg: '', contratante_nascimento: '',
  contratante_nacionalidade: 'Brasileira', contratante_estado_civil: '', contratante_profissao: '',
  contratante_passaporte: '', contratante_email: '', contratante_telefone: '',
  contratante_cep: '', contratante_endereco: '', contratante_bairro: '', contratante_cidade: '', contratante_estado: '',
};
const LLC_VAZIO = {
  llc_nome_opcao1: '', llc_nome_opcao2: '', llc_nome_opcao3: '', llc_atividade: '', llc_proposito: '',
  llc_tipo_membros: '', llc_gestor: '', llc_gestor_nome: '',
  socio_pj: '', socio_pj_razao_social: '', socio_pj_cnpj: '',
};
const PERFIL_VAZIO = { perfil_movimentacao_prevista: '', perfil_paises: '', perfil_pep: '', perfil_pep_detalhe: '' };
const MEMBRO_VAZIO = () => ({ nome: '', documento: '', tipo: 'PF', percentual: '' });

const Area = ({ label, value, onChange, placeholder, rows = 2 }) => (
  <div>
    <label className="block mb-1" style={labelStyle}>{label}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} />
  </div>
);

export default function OffshoreFormModal({ contrato, user, onClose, rncId }) {
  const queryClient = useQueryClient();
  const [rncExistente, setRncExistente] = useState(null);
  const [ct, setCt] = useState(CONTRATANTE_VAZIO);
  const [llc, setLlc] = useState(LLC_VAZIO);
  const [perfil, setPerfil] = useState(PERFIL_VAZIO);
  const [membros, setMembros] = useState([MEMBRO_VAZIO(), MEMBRO_VAZIO()]);
  const [declaracoes, setDeclaracoes] = useState({ declaracao_veracidade: false, autorizacao_lgpd: false, declaracoes_aceitas_em: '' });
  const [documentos, setDocumentos] = useState(mergeDocs({}, []));
  const [observacoes, setObservacoes] = useState('');
  const [destinatario, setDestinatario] = useState({ cliente_nome: '', mensagem_cliente: mensagemPadrao('offshore'), responsavel_nome: '' });
  const [linkRnc, setLinkRnc] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [open, setOpen] = useState({ ct: true, llc: true, socios: true, perfil: true, decl: true, docs: true, dest: true, obs: false });
  const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }));

  const aplicar = (r) => {
    setRncExistente(r);
    setCt(Object.fromEntries(Object.keys(CONTRATANTE_VAZIO).map(k => [k, r[k] ?? CONTRATANTE_VAZIO[k]])));
    setLlc(Object.fromEntries(Object.keys(LLC_VAZIO).map(k => [k, r[k] ?? ''])));
    setPerfil(Object.fromEntries(Object.keys(PERFIL_VAZIO).map(k => [k, r[k] ?? ''])));
    setMembros(r.llc_membros?.length > 0 ? r.llc_membros.map(m => ({ ...MEMBRO_VAZIO(), ...m, percentual: m.percentual ?? '' })) : [MEMBRO_VAZIO(), MEMBRO_VAZIO()]);
    setDeclaracoes({ declaracao_veracidade: !!r.declaracao_veracidade, autorizacao_lgpd: !!r.autorizacao_lgpd, declaracoes_aceitas_em: r.declaracoes_aceitas_em || '' });
    setDocumentos(mergeDocs(r, r.documentos));
    setObservacoes(r.observacoes || '');
    setDestinatario({
      cliente_nome: r.cliente_nome || r.contratante_nome || '',
      mensagem_cliente: r.mensagem_cliente || mensagemPadrao('offshore'),
      responsavel_nome: r.responsavel_nome || '',
    });
    if (r.link_token) setLinkRnc(linkPublico('/offshore-publica', r.link_token));
  };

  useEffect(() => {
    if (rncId) { base44.entities.RncOffshore.get(rncId).then(aplicar).catch(() => {}); return; }
    const preencherDoContrato = () => {
      if (!contrato?.id && !contrato?.nome) {
        setDestinatario(d => ({ ...d, responsavel_nome: user?.nome_tratamento || user?.full_name || '' }));
        return;
      }
      setCt(f => ({
        ...f,
        contratante_nome: contrato.responsavel_legal || contrato.nome || '',
        contratante_cpf: contrato.cpf_responsavel || contrato.cpf_cnpj || '',
        contratante_nascimento: contrato.nascimento || '',
        contratante_nacionalidade: contrato.nacionalidade || 'Brasileira',
        contratante_estado_civil: ESTADOS_CIVIS.includes(contrato.estado_civil) ? contrato.estado_civil : '',
        contratante_profissao: contrato.profissao || '',
        contratante_email: contrato.email || '', contratante_telefone: contrato.telefone || '',
        contratante_cep: contrato.cep || '', contratante_endereco: contrato.endereco || '',
        contratante_bairro: contrato.bairro || '', contratante_cidade: contrato.cidade || '', contratante_estado: contrato.estado || '',
      }));
      setDestinatario({ cliente_nome: contrato.responsavel_legal || contrato.nome || '', mensagem_cliente: mensagemPadrao('offshore'), responsavel_nome: user?.nome_tratamento || user?.full_name || '' });
    };
    if (!contrato?.id) { preencherDoContrato(); return; }
    base44.entities.RncOffshore.filter({ contrato_id: contrato.id })
      .then(rs => (rs.length > 0 ? aplicar(rs[0]) : preencherDoContrato()))
      .catch(() => preencherDoContrato());
  }, [contrato?.id, rncId]);

  // Checklist acompanha as respostas (vários sócios / empresa sócia)
  useEffect(() => {
    setDocumentos(prev => mergeDocs({ llc_tipo_membros: llc.llc_tipo_membros, socio_pj: llc.socio_pj }, prev));
  }, [llc.llc_tipo_membros, llc.socio_pj]);

  // Cliente escolhido na base preenche toda a identificação do contratante.
  // Cliente PJ: o contratante da LLC é o responsável legal da empresa.
  const aplicarCliente = (c) => {
    const isPJ = c.tipo_pessoa === 'PJ';
    const nome = (isPJ ? (c.responsavel_legal || c.nome) : c.nome) || '';
    const cpf = (isPJ ? c.cpf_responsavel : c.cpf_cnpj) || '';
    const pega = (v, atual) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : atual);
    setCt(f => ({
      ...f,
      contratante_nome: pega(nome, f.contratante_nome),
      contratante_cpf: pega(cpf, f.contratante_cpf),
      contratante_nascimento: isPJ ? f.contratante_nascimento : pega(c.nascimento, f.contratante_nascimento),
      contratante_nacionalidade: pega(c.nacionalidade, f.contratante_nacionalidade),
      contratante_estado_civil: ESTADOS_CIVIS.includes(c.estado_civil) ? c.estado_civil : f.contratante_estado_civil,
      contratante_profissao: isPJ ? f.contratante_profissao : pega(c.profissao, f.contratante_profissao),
      contratante_email: pega(c.email, f.contratante_email),
      contratante_telefone: pega(c.telefone, f.contratante_telefone),
      contratante_cep: pega(c.cep, f.contratante_cep),
      contratante_endereco: pega(c.endereco, f.contratante_endereco),
      contratante_bairro: pega(c.bairro, f.contratante_bairro),
      contratante_cidade: pega(c.cidade, f.contratante_cidade),
      contratante_estado: pega(c.estado, f.contratante_estado),
    }));
    setDestinatario(d => ({ ...d, cliente_nome: nome || c.nome || d.cliente_nome }));
    if (isPJ) toast.info('Cliente PJ: usei o responsável legal como contratante. Se a empresa for sócia da LLC, marque na seção Sócios.');
  };

  const nomeDestinatario = () => destinatario.cliente_nome?.trim() || ct.contratante_nome?.trim() || contrato?.nome?.trim() || '';

  const coletarDados = () => ({
    contrato_id: rncExistente?.contrato_id || contrato?.id || '',
    ...ct, ...llc, ...perfil,
    llc_membros: llc.llc_tipo_membros === 'multi'
      ? membros.filter(m => m.nome).map(m => ({ ...m, percentual: m.percentual !== '' && m.percentual != null ? Number(m.percentual) : null }))
      : [],
    declaracao_veracidade: declaracoes.declaracao_veracidade,
    autorizacao_lgpd: declaracoes.autorizacao_lgpd,
    documentos, observacoes,
    cliente_nome: nomeDestinatario(),
    mensagem_cliente: destinatario.mensagem_cliente || mensagemPadrao('offshore'),
    responsavel_nome: destinatario.responsavel_nome || '',
    preenchido_por: rncExistente?.preenchido_por || user?.nome_tratamento || user?.full_name || user?.email || '',
    data_preenchimento: rncExistente?.data_preenchimento || isoNowBrasilia(),
  });

  const persistir = async (statusForcado) => {
    const base = coletarDados();
    const completo = calcularPendencias(base).length === 0;
    const status = statusForcado || (completo || rncExistente?.status === 'concluido' ? 'concluido' : 'rascunho');
    const dados = { ...base, status };
    if (rncExistente?.id) {
      await base44.entities.RncOffshore.update(rncExistente.id, dados);
      const novo = { ...rncExistente, ...dados };
      setRncExistente(novo);
      return novo;
    }
    const created = await base44.entities.RncOffshore.create(dados);
    setRncExistente(created);
    return created;
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await persistir();
      queryClient.invalidateQueries({ queryKey: ['rnc-offshore-lista'] });
      toast.success('Formulário salvo.');
    } catch (e) { toast.error('Erro ao salvar: ' + e.message); }
    setSalvando(false);
  };

  const handleUploadDoc = async (index, file) => {
    setUploadingDoc(index);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocumentos(docs => docs.map((d, i) => i === index ? { ...d, recebido: true, url: file_url, nome_arquivo: file.name } : d));
      toast.success('Documento anexado!');
    } catch (e) { toast.error('Erro no upload: ' + e.message); }
    setUploadingDoc(null);
  };
  const handleRemoveDoc = (index) => setDocumentos(docs => docs.map((d, i) => i === index ? { ...d, recebido: false, url: '', nome_arquivo: '' } : d));

  const handleGerarPdf = async () => {
    setGerandoPdf(true);
    try {
      const reg = await persistir();
      const res = await base44.functions.invoke('gerarOffshorePDF', { rnc_id: reg.id });
      if (!res?.data?.pdf_base64) { toast.error(res?.data?.error || 'Erro ao gerar PDF.'); setGerandoPdf(false); return; }
      const byteChars = atob(res.data.pdf_base64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = res.data.filename || 'Offshore_LLC.pdf'; a.click();
      URL.revokeObjectURL(url);
      try {
        const file = new File([blob], res.data.filename, { type: 'application/pdf' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.RncOffshore.update(reg.id, { pdf_url: file_url, pdf_nome: res.data.filename });
        setRncExistente(prev => ({ ...prev, pdf_url: file_url, pdf_nome: res.data.filename }));
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['rnc-offshore-lista'] });
      toast.success('PDF gerado e baixado!');
    } catch (e) { toast.error('Erro: ' + e.message); }
    setGerandoPdf(false);
  };

  const handleGerarLink = async () => {
    if (!nomeDestinatario()) { toast.error('Informe o nome do cliente para o link sair identificado.'); setOpen(o => ({ ...o, dest: true })); return; }
    if (!destinatario.cliente_nome?.trim()) setDestinatario(d => ({ ...d, cliente_nome: nomeDestinatario() }));
    setGerandoLink(true);
    try {
      const reg = await persistir();
      const res = await base44.functions.invoke('gerarLinkOffshore', { rnc_id: reg.id });
      if (res?.data?.link) {
        const fullUrl = origemPublica() + res.data.link;
        setLinkRnc(fullUrl);
        setRncExistente(prev => ({ ...prev, link_token: res.data.token }));
        navigator.clipboard?.writeText(fullUrl).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['rnc-offshore-lista'] });
        toast.success('Link gerado e copiado!');
      } else { toast.error(res?.data?.error || 'Erro ao gerar link.'); }
    } catch (e) { toast.error('Erro: ' + e.message); }
    setGerandoLink(false);
  };

  const textoConvite = () => {
    const nome = destinatario.cliente_nome || ct.contratante_nome || '';
    { const corpo_ = destinatario.mensagem_cliente || mensagemPadrao('offshore'); return `${/^\s*ol[aá]\b/i.test(corpo_) ? '' : `Olá${nome ? ', ' + nome.split(' ')[0] : ''}! `}${corpo_}\n\n${linkRnc}`; }
  };
  const telWhats = (() => {
    const t = String(ct.contratante_telefone || '').replace(/\D/g, '');
    return t ? (t.length <= 11 ? '55' + t : t) : '';
  })();

  const isMulti = llc.llc_tipo_membros === 'multi';
  const somaPct = membros.reduce((s, m) => s + (Number(m.percentual) || 0), 0);
  const pendencias = calcularPendencias({ ...coletarDados(), documentos });
  const setC = (k) => (v) => setCt(f => ({ ...f, [k]: v }));
  const setL = (k) => (v) => setLlc(f => ({ ...f, [k]: v }));
  const setP = (k) => (v) => setPerfil(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-3xl max-h-[calc(100vh-140px)] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: AURORA.bg, border: `1px solid ${AURORA.borderActive}` }}>

        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${AURORA.surface} 0%, ${AURORA.surface2} 100%)`, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
              <Globe2 className="w-5 h-5" style={{ color: '#22d3ee' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: AURORA.text }}>Offshore — Constituição de LLC</h2>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>
                {rncExistente ? `Formulário salvo · ${ct.contratante_nome || contrato?.nome || ''}` : `Contrato: ${contrato?.nome || '— (formulário independente)'}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-white/10">
            <X className="w-5 h-5" style={{ color: AURORA.textMuted }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {pendencias.length > 0 ? (
            <div className="rounded-xl p-3" style={{ background: AURORA.goldDim, border: '1px solid rgba(251,191,36,0.25)' }}>
              <p className="text-xs font-bold flex items-center gap-1.5 mb-1" style={{ color: AURORA.gold }}>
                <AlertTriangle className="w-3.5 h-3.5" /> {pendencias.length} pendência(s) para concluir
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(251,191,36,0.85)' }}>{pendencias.slice(0, 6).join(' · ')}{pendencias.length > 6 ? ' · …' : ''}</p>
            </div>
          ) : (
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: '#34d399' }} />
              <p className="text-xs font-semibold" style={{ color: '#34d399' }}>Todos os dados e documentos obrigatórios foram recebidos.</p>
            </div>
          )}

          <CardSection title="Envio ao cliente" icon={MessageSquare} open={open.dest} onToggle={() => toggle('dest')}
            badge={destinatario.cliente_nome ? destinatario.cliente_nome.split(' ')[0] : 'definir cliente'}>
            <DestinatarioLinkPanel tipo="offshore" valor={destinatario}
              onChange={(patch) => setDestinatario(d => ({ ...d, ...patch }))}
              onSelecionarCliente={aplicarCliente} />
          </CardSection>
          <CardSection title="Seção 1 — Dados do Contratante" icon={User} open={open.ct} onToggle={() => toggle('ct')}
            badge={ct.contratante_nome ? ct.contratante_nome.split(' ')[0] : 'definir cliente'}>
            <div className="mb-3"><ClienteEstudoPicker onSelecionar={aplicarCliente} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><LI label="Nome completo *" value={ct.contratante_nome} onChange={setC('contratante_nome')} /></div>
              <LI label="CPF *" value={ct.contratante_cpf} onChange={setC('contratante_cpf')} />
              <LI label="RG / CNH" value={ct.contratante_rg} onChange={setC('contratante_rg')} />
              <LI label="Data de nascimento *" type="date" value={ct.contratante_nascimento} onChange={setC('contratante_nascimento')} />
              <LI label="Nacionalidade *" value={ct.contratante_nacionalidade} onChange={setC('contratante_nacionalidade')} />
              <SelectField label="Estado civil" value={ct.contratante_estado_civil} onChange={setC('contratante_estado_civil')} options={ESTADOS_CIVIS} />
              <LI label="Profissão" value={ct.contratante_profissao} onChange={setC('contratante_profissao')} />
              <LI label="Nº do passaporte" value={ct.contratante_passaporte} onChange={setC('contratante_passaporte')} />
              <LI label="E-mail *" value={ct.contratante_email} onChange={setC('contratante_email')} />
              <LI label="Telefone *" value={ct.contratante_telefone} onChange={setC('contratante_telefone')} />
              <LI label="CEP" value={ct.contratante_cep} onChange={setC('contratante_cep')} />
              <div className="col-span-2"><LI label="Endereço (rua, nº, complemento) *" value={ct.contratante_endereco} onChange={setC('contratante_endereco')} /></div>
              <LI label="Bairro" value={ct.contratante_bairro} onChange={setC('contratante_bairro')} />
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><LI label="Cidade *" value={ct.contratante_cidade} onChange={setC('contratante_cidade')} /></div>
                <LI label="UF" value={ct.contratante_estado} onChange={setC('contratante_estado')} />
              </div>
            </div>
          </CardSection>

          <CardSection title="Seção 2 — Dados da LLC" icon={Building2} open={open.llc} onToggle={() => toggle('llc')}>
            <div className="space-y-3">
              <p className="text-[11px]" style={{ color: AURORA.textMuted }}>Opções de nome em ordem de preferência — usamos a próxima caso a anterior não esteja disponível.</p>
              <div className="grid grid-cols-3 gap-2">
                <LI label="1ª opção *" value={llc.llc_nome_opcao1} onChange={setL('llc_nome_opcao1')} placeholder="Ex.: Alfa Holdings LLC" />
                <LI label="2ª opção *" value={llc.llc_nome_opcao2} onChange={setL('llc_nome_opcao2')} />
                <LI label="3ª opção" value={llc.llc_nome_opcao3} onChange={setL('llc_nome_opcao3')} />
              </div>
              <Area label="Atividade da empresa *" value={llc.llc_atividade} onChange={setL('llc_atividade')} placeholder="O que a LLC vai fazer (consultoria, holding de participações, comércio exterior...)" />
              <Area label="Propósito da estrutura *" value={llc.llc_proposito} onChange={setL('llc_proposito')} placeholder="Proteção patrimonial, recebimentos do exterior, investimentos..." />
              <RadioBtns label="Gestor (manager) *" value={llc.llc_gestor} onChange={setL('llc_gestor')}
                opts={[{ value: 'contratante', label: 'O próprio contratante' }, { value: 'outro', label: 'Outra pessoa' }]} />
              {llc.llc_gestor === 'outro' && <LI label="Nome do gestor *" value={llc.llc_gestor_nome} onChange={setL('llc_gestor_nome')} />}
            </div>
          </CardSection>

          <CardSection title="Sócios (members)" icon={Users} open={open.socios} onToggle={() => toggle('socios')}
            badge={isMulti ? `${membros.filter(m => m.nome).length} sócio(s) · ${somaPct}%` : llc.llc_tipo_membros === 'single' ? 'Sócio único' : undefined}>
            <div className="space-y-3">
              <RadioBtns label="Estrutura societária *" value={llc.llc_tipo_membros} onChange={setL('llc_tipo_membros')}
                opts={[{ value: 'single', label: 'Sócio único (single-member)' }, { value: 'multi', label: 'Vários sócios (multi-member)' }]} />
              {llc.llc_tipo_membros === 'single' && (
                <p className="text-xs" style={{ color: AURORA.textMuted }}>O contratante será o único sócio, com 100% de participação.</p>
              )}
              {isMulti && (
                <>
                  {membros.map((m, i) => {
                    const up = (k, v) => setMembros(ms => ms.map((x, j) => j === i ? { ...x, [k]: v } : x));
                    return (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <input value={m.nome} onChange={e => up('nome', e.target.value)} placeholder={`Sócio ${i + 1} — nome`} style={inputStyle} className="col-span-4 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                        <select value={m.tipo || 'PF'} onChange={e => up('tipo', e.target.value)} style={inputStyle} className="col-span-2 px-2 py-2 text-sm rounded-lg focus:outline-none">
                          <option value="PF">PF</option><option value="PJ">PJ</option>
                        </select>
                        <input value={m.documento} onChange={e => up('documento', e.target.value)} placeholder="CPF/CNPJ/Passaporte" style={inputStyle} className="col-span-3 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                        <input value={m.percentual} onChange={e => up('percentual', e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} placeholder="%" style={inputStyle} className="col-span-2 px-3 py-2 text-sm rounded-lg focus:outline-none" />
                        <button onClick={() => setMembros(ms => ms.filter((_, j) => j !== i))} disabled={membros.length <= 2} className="col-span-1 disabled:opacity-30" style={{ color: AURORA.danger }}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between">
                    <button onClick={() => setMembros(ms => [...ms, MEMBRO_VAZIO()])}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                      <Plus className="w-3 h-3" /> Adicionar sócio
                    </button>
                    <span className="text-xs font-bold" style={{ color: Math.abs(somaPct - 100) < 0.01 ? '#34d399' : AURORA.gold }}>Total: {somaPct}%</span>
                  </div>
                </>
              )}
              <div className="h-px" style={{ background: AURORA.border }} />
              <RadioBtns label="Alguma empresa será sócia da LLC? *" value={llc.socio_pj} onChange={setL('socio_pj')}
                opts={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]} />
              {llc.socio_pj === 'sim' && (
                <div className="grid grid-cols-2 gap-3">
                  <LI label="Razão social *" value={llc.socio_pj_razao_social} onChange={setL('socio_pj_razao_social')} />
                  <LI label="CNPJ *" value={llc.socio_pj_cnpj} onChange={setL('socio_pj_cnpj')} />
                </div>
              )}
            </div>
          </CardSection>

          <CardSection title="Seção 3 — Perfil da Operação" icon={BarChart3} open={open.perfil} onToggle={() => toggle('perfil')}>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Movimentação prevista *" value={perfil.perfil_movimentacao_prevista} onChange={setP('perfil_movimentacao_prevista')} options={FAIXAS_MOVIMENTACAO} />
              <LI label="Países de operação *" value={perfil.perfil_paises} onChange={setP('perfil_paises')} placeholder="Ex.: EUA, Brasil, Portugal" />
              <div className="col-span-2">
                <RadioBtns label="O contratante é pessoa politicamente exposta (PEP)? *" value={perfil.perfil_pep} onChange={setP('perfil_pep')}
                  opts={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]} />
              </div>
              {perfil.perfil_pep === 'sim' && (
                <div className="col-span-2"><LI label="Cargo / vínculo (PEP)" value={perfil.perfil_pep_detalhe} onChange={setP('perfil_pep_detalhe')} /></div>
              )}
            </div>
          </CardSection>

          <CardSection title="Documentação" icon={FileText} open={open.docs} onToggle={() => toggle('docs')}
            badge={`${documentos.filter(d => d.recebido).length}/${documentos.length}`}>
            <div className="space-y-2">
              {documentos.map((doc, i) => (
                <div key={doc.tipo} className="rounded-lg p-3 flex items-center gap-3"
                  style={{ background: AURORA.surface2, border: `1px solid ${doc.recebido ? 'rgba(0,212,170,0.3)' : AURORA.border}` }}>
                  {doc.recebido ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: AURORA.accent }} /> : <Circle className="w-5 h-5 flex-shrink-0" style={{ color: doc.obrigatorio ? AURORA.danger : AURORA.textMuted }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: AURORA.text }}>{doc.descricao}{!doc.obrigatorio && <span style={{ color: AURORA.textMuted }}> (opcional)</span>}</p>
                    {doc.recebido && doc.nome_arquivo && <p className="text-[10px] truncate" style={{ color: AURORA.accent }}>{doc.nome_arquivo}</p>}
                  </div>
                  {doc.recebido ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Abrir documento" className="p-1.5 rounded-lg" style={{ color: '#60a5fa', background: 'rgba(59,130,249,0.12)' }}>
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => handleRemoveDoc(i)} title="Remover" className="p-1.5 rounded-lg" style={{ color: AURORA.danger, background: 'rgba(248,113,113,0.1)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer p-1.5 rounded-lg flex items-center" style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                      {uploadingDoc === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <input type="file" className="hidden" onChange={e => e.target.files[0] && handleUploadDoc(i, e.target.files[0])} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </CardSection>

          <CardSection title="Declarações do contratante" icon={ShieldCheck} open={open.decl} onToggle={() => toggle('decl')}
            badge={declaracoes.declaracao_veracidade && declaracoes.autorizacao_lgpd ? 'aceitas' : 'pendentes'}>
            <div className="space-y-2 text-xs" style={{ color: AURORA.text }}>
              <p className="flex items-center gap-2">{declaracoes.declaracao_veracidade ? <CheckCircle2 className="w-4 h-4" style={{ color: AURORA.accent }} /> : <Circle className="w-4 h-4" style={{ color: AURORA.textMuted }} />} Confirmação de veracidade das informações</p>
              <p className="flex items-center gap-2">{declaracoes.autorizacao_lgpd ? <CheckCircle2 className="w-4 h-4" style={{ color: AURORA.accent }} /> : <Circle className="w-4 h-4" style={{ color: AURORA.textMuted }} />} Autorização de uso dos dados (LGPD)</p>
              <p className="text-[11px]" style={{ color: AURORA.textMuted }}>
                {declaracoes.declaracoes_aceitas_em
                  ? `Aceite feito pelo cliente em ${new Date(declaracoes.declaracoes_aceitas_em).toLocaleString('pt-BR')}.`
                  : 'O aceite é feito pelo próprio cliente no link do formulário.'}
              </p>
            </div>
          </CardSection>


          <CardSection title="Observações internas" icon={FileText} open={open.obs} onToggle={() => toggle('obs')}>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} placeholder="Observações sobre a constituição da LLC..." />
          </CardSection>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 flex-shrink-0" style={{ background: AURORA.surface, borderTop: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {rncExistente?.pdf_url && (
              <a href={rncExistente.pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: 'rgba(59,130,249,0.15)', border: '1px solid rgba(59,130,249,0.3)', color: '#60a5fa' }}>
                <Download className="w-3.5 h-3.5" /> Ver PDF
              </a>
            )}
            <button onClick={handleGerarLink} disabled={gerandoLink || salvando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 disabled:opacity-50"
              style={{ background: 'rgba(59,130,249,0.15)', border: '1px solid rgba(59,130,249,0.3)', color: '#60a5fa' }}>
              {gerandoLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Gerar Link p/ Cliente
            </button>
            {linkRnc && (
              <div className="flex items-center gap-1.5 min-w-0 flex-1 px-2 py-1 rounded-lg" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <span className="text-[10px] truncate flex-1" style={{ color: AURORA.accent }}>{linkRnc}</span>
                <a href={`https://wa.me/${telWhats}?text=${encodeURIComponent(textoConvite())}`} target="_blank" rel="noreferrer" className="p-1 rounded flex-shrink-0" style={{ color: '#25D366' }} title="Enviar por WhatsApp">
                  <MessageCircle className="w-3 h-3" />
                </a>
                <a href={`mailto:${ct.contratante_email || ''}?subject=${encodeURIComponent('Constituição da sua LLC — Villela Exchange')}&body=${encodeURIComponent(textoConvite())}`} className="p-1 rounded flex-shrink-0" style={{ color: '#60a5fa' }} title="Enviar por e-mail">
                  <Mail className="w-3 h-3" />
                </a>
                <button onClick={() => { navigator.clipboard?.writeText(linkRnc); toast.success('Link copiado!'); }} className="p-1 rounded flex-shrink-0" style={{ color: AURORA.accent }} title="Copiar link">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSalvar} disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Salvar
            </button>
            <button onClick={handleGerarPdf} disabled={gerandoPdf || salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              style={{ background: AURORA.accent, color: '#0d1117' }}>
              {gerandoPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
              Gerar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
