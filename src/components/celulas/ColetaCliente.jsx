import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Copy, ExternalLink, Send, FileText, RefreshCw, CheckCircle2, Clock, ClipboardList, MessageCircle } from 'lucide-react';
import { linkPublico, origemPublica } from '@/lib/appUrl';
import { mergeDocs as docsOffshore } from '@/lib/offshoreForm';
import { mensagemPadrao } from '@/components/contratos/DestinatarioLinkPanel';
import { buildDocInicial as docsCI } from '@/components/contratos/RncContaInternacionalModal';
import { buildDocInicial as docsCanal } from '@/components/contratos/RncCanalBancarioModal';
import OffshoreFormModal from '@/components/contratos/OffshoreFormModal';
import RncContaInternacionalModal from '@/components/contratos/RncContaInternacionalModal';
import RncCanalBancarioModal from '@/components/contratos/RncCanalBancarioModal';

// Links de coleta enviados ao cliente (dados + documentos): Offshore/LLC, Conta internacional e
// Canal bancário (RNC). Mesmos registros, funções e páginas públicas do modelo anterior.

const C = { card: 'rgba(255,255,255,0.03)', card2: 'rgba(255,255,255,0.05)', input: 'rgba(0,0,0,0.28)', line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.11)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799', ok: '#8FD9B0', warn: '#E3C982' };
const dig = (s) => String(s || '').replace(/\D/g, '');

export const COLETAS = {
  'OFFSHORE': { ent: 'RncOffshore', fn: 'gerarLinkOffshore', pdf: 'gerarOffshorePDF', path: '/offshore-publica', titulo: 'Formulário da LLC (Offshore)', msg: 'offshore', Modal: OffshoreFormModal, novo: () => ({ documentos: docsOffshore({}, []) }) },
  'CONTA INTERNACIONAL': { ent: 'RncContaInternacional', fn: 'gerarLinkContaInternacional', pdf: 'gerarContaInternacionalPDF', path: '/conta-internacional-publica', titulo: 'Formulário da conta internacional', msg: 'conta', Modal: RncContaInternacionalModal, novo: (tp) => ({ tipo_conta: tp, documentos: docsCI(tp) }) },
  'CANAL BANCÁRIO': { ent: 'RncCanalBancario', fn: 'gerarLinkRnc', pdf: 'gerarRncCanalBancarioPDF', path: '/rnc-publica', titulo: 'Formulário RNC do canal bancário', msg: 'canal', Modal: RncCanalBancarioModal, novo: (tp) => ({ tipo_canal: tp, documentos: docsCanal(tp, false) }) },
};

export const situacaoColeta = (r) => {
  if (!r) return { l: 'Não enviado', cor: C.muted, ok: false };
  if (r.link_preenchido_em || r.status === 'concluido') return { l: 'Preenchido pelo cliente', cor: C.ok, ok: true };
  if (r.link_token) return { l: 'Link enviado · aguardando o cliente', cor: C.warn, ok: false };
  return { l: 'Rascunho', cor: C.muted, ok: false };
};

const fmt = (d) => (d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

export default function ColetaCliente({ tipo, contrato, user, t, compacto = false }) {
  const cfg = COLETAS[tipo];
  const [reg, setReg] = useState(undefined);
  const [ocupado, setOcupado] = useState(null);
  const [modal, setModal] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!cfg || !contrato?.id) { setReg(null); return; }
    base44.entities[cfg.ent].filter({ contrato_id: contrato.id }, '-created_date', 1).then(l => setReg((l || [])[0] || null)).catch(() => setReg(null));
  }, [contrato?.id, recarga]);

  if (!cfg) return null;
  const link = reg?.link_token ? linkPublico(cfg.path, reg.link_token) : '';
  const sit = situacaoColeta(reg);
  const docs = Array.isArray(reg?.documentos) ? reg.documentos : [];
  const recebidos = docs.filter(d => d.recebido || d.url).length;

  const gerarLink = async () => {
    setOcupado('link');
    try {
      let r = reg;
      if (!r) {
        const tp = dig(contrato.cpf_cnpj).length === 11 ? 'PF' : 'PJ';
        r = await base44.entities[cfg.ent].create({
          contrato_id: contrato.id, cliente_nome: contrato.nome || '', status: 'rascunho',
          mensagem_cliente: mensagemPadrao(cfg.msg), responsavel_nome: contrato.vendedor_nome || user?.nome_tratamento || user?.full_name || '',
          preenchido_por: user?.nome_tratamento || user?.full_name || user?.email || '',
          ...cfg.novo(tp),
        });
      }
      const res = await base44.functions.invoke(cfg.fn, { rnc_id: r.id });
      if (!res?.data?.link) throw new Error(res?.data?.error || 'Não foi possível gerar o link.');
      const url = origemPublica() + res.data.link;
      navigator.clipboard?.writeText(url).catch(() => {});
      setReg({ ...r, link_token: res.data.token, link_gerado_em: new Date().toISOString() });
      toast.success('Link gerado e copiado. Envie ao cliente.');
    } catch (e) { toast.error(e.message); }
    setOcupado(null);
  };
  const gerarPdf = async () => {
    setOcupado('pdf');
    try {
      const res = await base44.functions.invoke(cfg.pdf, { rnc_id: reg.id });
      const d = res?.data || {};
      if (!d.pdf_base64) throw new Error(d.error || 'Não foi possível gerar o PDF.');
      const bin = atob(d.pdf_base64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const nome = d.filename || `${cfg.titulo}.pdf`;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); a.download = nome; a.click();
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([bytes], nome, { type: 'application/pdf' }) });
        await base44.entities[cfg.ent].update(reg.id, { pdf_url: file_url, pdf_nome: nome });
        setReg(r => ({ ...r, pdf_url: file_url, pdf_nome: nome }));
      } catch { /* PDF já baixado */ }
      toast.success('PDF do formulário gerado.');
    } catch (e) { toast.error(e.message); }
    setOcupado(null);
  };
  const whatsapp = () => {
    const tel = dig(contrato.telefone);
    const txt = encodeURIComponent(`${reg?.mensagem_cliente || mensagemPadrao(cfg.msg)}\n\n${link}`);
    window.open(`https://wa.me/${tel ? (tel.startsWith('55') ? tel : '55' + tel) : ''}?text=${txt}`, '_blank', 'noopener');
  };

  return (
    <div style={{ borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, padding: compacto ? 12 : 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ClipboardList className="w-4 h-4" style={{ color: t?.acc || C.warn }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, flex: 1 }}>{cfg.titulo}</span>
        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, color: sit.cor, border: `1px solid ${sit.cor}55`, background: `${sit.cor}14`, display: 'flex', alignItems: 'center', gap: 5 }}>
          {sit.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {sit.l}
        </span>
      </div>
      {!compacto && <p style={{ fontSize: 12, color: C.muted }}>Link para o cliente preencher os dados e enviar os documentos. O que ele enviar aparece aqui e na ficha do cliente.</p>}
      {reg === undefined ? <span style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 6, alignItems: 'center' }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando…</span> : (
        <>
          {link && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input readOnly value={link} aria-label="Link do formulário" style={{ flex: 1, height: 36, padding: '0 10px', borderRadius: 10, background: C.input, border: `1px solid ${C.line2}`, color: C.txt2, fontSize: 12 }} onFocus={e => e.target.select()} />
              <button onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado.'); }} className="vx-btn vx-btn-soft" style={{ height: 36, padding: '0 12px', fontSize: 12 }}><Copy className="w-3.5 h-3.5" /> Copiar</button>
              <button onClick={whatsapp} className="vx-btn vx-btn-soft" style={{ height: 36, padding: '0 12px', fontSize: 12 }}><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</button>
              <a href={link} target="_blank" rel="noreferrer" className="vx-btn vx-btn-ghost" style={{ height: 36, padding: '0 10px' }} aria-label="Abrir o formulário"><ExternalLink className="w-3.5 h-3.5" /></a>
            </div>
          )}
          {reg && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
              {reg.link_gerado_em && <span>Enviado em {fmt(reg.link_gerado_em)}</span>}
              {reg.link_preenchido_em && <span style={{ color: C.ok }}>Preenchido em {fmt(reg.link_preenchido_em)}</span>}
              {docs.length > 0 && <span>Documentos: {recebidos}/{docs.length}</span>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!link && (
              <button onClick={gerarLink} disabled={!!ocupado || !contrato?.id} className="vx-btn vx-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
                {ocupado === 'link' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gerar link para o cliente
              </button>
            )}
            {reg && (
              <button onClick={() => setModal(true)} className="vx-btn vx-btn-soft" style={{ height: 36, padding: '0 14px', fontSize: 13 }}><FileText className="w-4 h-4" /> Ver respostas e documentos</button>
            )}
            {reg && (
              <button onClick={gerarPdf} disabled={!!ocupado} className="vx-btn vx-btn-ghost" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
                {ocupado === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Gerar PDF do formulário
              </button>
            )}
            {reg?.pdf_url && <a href={reg.pdf_url} target="_blank" rel="noreferrer" className="vx-btn vx-btn-ghost" style={{ height: 36, padding: '0 12px', fontSize: 13 }}>Abrir PDF</a>}
          </div>
        </>
      )}
      {modal && reg && <cfg.Modal contrato={contrato} rncId={reg.id} user={user} onClose={() => { setModal(false); setRecarga(n => n + 1); }} />}
    </div>
  );
}

// Painel da célula: todos os links de coleta do produto (com ou sem contrato) + link avulso
export function LinksDeColeta({ tipo, user, t }) {
  const cfg = COLETAS[tipo];
  const [lista, setLista] = useState(null);
  const [aberto, setAberto] = useState(null); // { id } | { novo: true }
  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    if (!cfg) return;
    base44.entities[cfg.ent].list('-created_date', 100).then(l => setLista(l || [])).catch(() => setLista([]));
  }, [tipo, recarga]);
  if (!cfg) return null;
  return (
    <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList className="w-4 h-4" style={{ color: t?.acc }} /> Links de coleta do cliente</span>
      <span style={{ fontSize: 12, color: C.muted2, lineHeight: 1.45 }}>{cfg.titulo}: dados e documentos enviados pelo cliente.</span>
      <button onClick={() => setAberto({ novo: true })} className="vx-btn vx-btn-soft" style={{ height: 32, padding: '0 12px', fontSize: 12, alignSelf: 'flex-start' }}>+ Link avulso (sem contrato)</button>
      {lista === null && <span style={{ fontSize: 12, color: C.muted }}><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> Carregando…</span>}
      {lista?.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>Nenhum formulário ainda.</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflow: 'auto' }}>
        {(lista || []).slice(0, 40).map(r => {
          const s = situacaoColeta(r);
          const l = r.link_token ? linkPublico(cfg.path, r.link_token) : '';
          return (
            <div key={r.id} className="vx-row-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 10, fontSize: 12 }}>
              <button onClick={() => setAberto({ id: r.id })} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}>
                <span style={{ display: 'block', color: C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cliente_nome || r.nome || 'Sem nome'}</span>
                <span style={{ display: 'block', color: s.cor, fontSize: 11 }}>{s.l}{!r.contrato_id ? ' · avulso' : ''}</span>
              </button>
              {l && <button onClick={() => { navigator.clipboard.writeText(l); toast.success('Link copiado.'); }} className="vx-btn vx-btn-ghost" aria-label="Copiar link" style={{ width: 28, height: 28, padding: 0 }}><Copy className="w-3.5 h-3.5" /></button>}
            </div>
          );
        })}
      </div>
      {aberto && <cfg.Modal contrato={{}} rncId={aberto.id || null} user={user} onClose={() => { setAberto(null); setRecarga(n => n + 1); }} />}
    </div>
  );
}
