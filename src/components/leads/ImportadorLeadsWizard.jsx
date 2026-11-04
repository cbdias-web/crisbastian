import { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, AlertTriangle, CheckCircle2, Download, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { CAMPOS_IMPORT, mapearColunas, parseDoc, parsePhone, cleanName, clean, parseValor, calcularScore, onlyDigits } from '@/lib/leadUtils';

const CHUNK = 100;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function lerArquivo(file) {
  const buf = await file.arrayBuffer();
  if (/\.xlsx?$/i.test(file.name)) {
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    return { headers: (rows[0] || []).map(String), rows: rows.slice(1) };
  }
  let texto;
  try { texto = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { texto = new TextDecoder('windows-1252').decode(buf); }
  texto = texto.replace(/^\uFEFF/, '');
  const res = Papa.parse(texto, { skipEmptyLines: 'greedy' });
  const all = res.data;
  return { headers: (all[0] || []).map(String), rows: all.slice(1) };
}

function baixarCSV(nome, linhas) {
  const csv = Papa.unparse(linhas);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function ImportadorLeadsWizard({ leadsExistentes = [], onClose, onConcluido }) {
  const [passo, setPasso] = useState(1);
  const [arquivo, setArquivo] = useState(null);
  const [dados, setDados] = useState(null); // { headers, rows }
  const [mapa, setMapa] = useState({});
  const [nomeLote, setNomeLote] = useState('');
  const [cadenciaId, setCadenciaId] = useState('');
  const [liberacao, setLiberacao] = useState('automatica'); // automatica | manual
  const [cadencias, setCadencias] = useState([]);
  const [cfg, setCfg] = useState({});
  const [supressao, setSupressao] = useState({ tel: new Set(), doc: new Set() });
  const [validacao, setValidacao] = useState(null);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const pausadoRef = useRef(false);
  const [pausado, setPausado] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const carregarContexto = async () => {
    try {
      const [cads, cfgs, sup] = await Promise.all([
        base44.entities.Cadencia.filter({ ativa: true }, 'nome', 50),
        base44.entities.ConfigFila.filter({ chave: 'padrao' }, '-created_date', 1),
        base44.entities.ListaSupressao.list('-created_date', 5000),
      ]);
      setCadencias(cads);
      setCfg(cfgs[0] || {});
      const padrao = cads.find(c => c.padrao_para === 'base_clientes');
      if (padrao) setCadenciaId(padrao.id);
      setSupressao({
        tel: new Set(sup.map(s => s.telefone_e164).filter(Boolean)),
        doc: new Set(sup.map(s => onlyDigits(s.cpf_cnpj)).filter(Boolean)),
      });
    } catch (e) { /* contexto opcional */ }
  };

  const onArquivo = async (file) => {
    if (!file) return;
    try {
      const d = await lerArquivo(file);
      if (!d.rows.length) { toast.error('Arquivo sem linhas de dados.'); return; }
      setArquivo(file); setDados(d);
      setMapa(mapearColunas(d.headers));
      setNomeLote(file.name.replace(/\.[^.]+$/, ''));
      await carregarContexto();
      setPasso(2);
    } catch (e) { toast.error('Erro ao ler arquivo: ' + (e.message || 'formato inválido')); }
  };

  const obrigatoriosOk = ['nome', 'cpf_cnpj', 'telefone'].every(k => mapa[k] !== undefined && mapa[k] !== '');

  const existentes = useMemo(() => {
    const ext = new Set(), doc = new Set(), tel = new Set();
    for (const l of leadsExistentes) {
      if (l.id_externo) ext.add(String(l.id_externo));
      if (l.cpf_cnpj) doc.add(onlyDigits(l.cpf_cnpj));
      if (l.telefone_e164) tel.add(l.telefone_e164);
    }
    return { ext, doc, tel };
  }, [leadsExistentes]);

  const validar = () => {
    const get = (r, k) => (mapa[k] === undefined || mapa[k] === '' ? '' : clean(r[mapa[k]]));
    const validos = [], rejeitados = [];
    const vistoExt = new Set(), vistoDoc = new Set();
    const cont = { sem_nome: 0, doc_invalido: 0, tel_invalido: 0, duplicado_arquivo: 0, ja_na_base: 0, suprimido: 0, tel_compartilhado: 0 };
    // Telefones que aparecem em mais de um cliente (CPF/CNPJ diferentes): são mantidos e marcados, não descartados
    const freqTel = new Map();
    for (const r of dados.rows) { const p = parsePhone(get(r, 'telefone')); if (p) freqTel.set(p.e164, (freqTel.get(p.e164) || 0) + 1); }
    dados.rows.forEach((r, idx) => {
      const rej = (motivo, chave) => { cont[chave]++; rejeitados.push({ linha: idx + 2, motivo, nome: get(r, 'nome'), cpf_cnpj: get(r, 'cpf_cnpj'), telefone: get(r, 'telefone') }); };
      const nome = cleanName(get(r, 'nome'));
      if (!nome) return rej('Sem nome', 'sem_nome');
      const doc = parseDoc(get(r, 'cpf_cnpj'));
      if (!doc) return rej('CPF/CNPJ ausente ou inválido', 'doc_invalido');
      const tel = parsePhone(get(r, 'telefone'));
      if (!tel) return rej('Telefone ausente ou inválido', 'tel_invalido');
      const ext = get(r, 'id_externo');
      if (supressao.doc.has(doc.digitos) || supressao.tel.has(tel.e164)) return rej('Na lista de supressão (opt-out)', 'suprimido');
      if ((ext && existentes.ext.has(ext)) || existentes.doc.has(doc.digitos)) return rej('Já existe na base', 'ja_na_base');
      if ((ext && vistoExt.has(ext)) || vistoDoc.has(doc.digitos)) return rej('Duplicado no arquivo (mesmo CPF/CNPJ)', 'duplicado_arquivo');
      if (ext) vistoExt.add(ext); vistoDoc.add(doc.digitos);
      const compartilhado = (freqTel.get(tel.e164) || 0) > 1 || existentes.tel.has(tel.e164);
      if (compartilhado) cont.tel_compartilhado++;
      const tipoArq = get(r, 'tipo_pessoa').toUpperCase();
      const lead = {
        nome, cpf_cnpj: doc.formatado, telefone: tel.formatado, telefone_e164: tel.e164, telefone_valido: true,
        tipo_pessoa: doc.tipo || (tipoArq === 'PJ' || tipoArq === 'PF' ? tipoArq : undefined),
        id_externo: ext || undefined,
        produto_contratado: get(r, 'produto_contratado') || undefined,
        valor_contrato: parseValor(get(r, 'valor_contrato')) ?? undefined,
        responsavel_origem: get(r, 'responsavel_origem') || undefined,
        endereco: get(r, 'endereco') || undefined, cidade: get(r, 'cidade') || undefined,
        uf: get(r, 'uf') || undefined, cep: get(r, 'cep') || undefined, email: get(r, 'email') || undefined,
        observacao: compartilhado ? 'Telefone compartilhado com outro cliente da base (conferir antes de ligar)' : undefined,
      };
      Object.assign(lead, calcularScore(lead, cfg));
      validos.push(lead);
    });
    setValidacao({ validos, rejeitados, cont, total: dados.rows.length });
    setPasso(3);
  };

  const importar = async () => {
    const { validos } = validacao;
    if (!nomeLote.trim()) { toast.error('Informe o nome do lote'); return; }
    setImportando(true); setPasso(4);
    setProgresso({ atual: 0, total: validos.length });
    pausadoRef.current = false; setPausado(false);
    let criados = 0, falhas = 0;
    try {
      const lote = await base44.entities.LoteLead.create({ nome: nomeLote.trim(), total: validos.length, status: liberacao === 'automatica' ? 'em_liberacao' : 'pendente', liberacao, liberados: 0, pausado: false });
      // quentes primeiro: liberação por score
      const ordenados = [...validos].sort((a, b) => (b.score || 0) - (a.score || 0));
      for (let i = 0; i < ordenados.length; i += CHUNK) {
        while (pausadoRef.current) await sleep(500);
        const chunk = ordenados.slice(i, i + CHUNK).map(l => ({
          ...l, lote_id: lote.id, lote_nome: lote.nome, status: 'pendente', convertido: false,
          origem: 'base_clientes', consentimento_status: 'base_cliente',
          base_legal: cfg.base_legal_padrao || undefined, cadencia_id: cadenciaId || undefined,
        }));
        let ok = false;
        for (let t = 0; t < 4 && !ok; t++) {
          try { await base44.entities.Lead.bulkCreate(chunk); ok = true; }
          catch (e) { await sleep(800 * Math.pow(2, t)); }
        }
        if (ok) criados += chunk.length; else falhas += chunk.length;
        setProgresso({ atual: Math.min(i + CHUNK, ordenados.length), total: ordenados.length });
      }
      if (criados !== validos.length) await base44.entities.LoteLead.update(lote.id, { total: criados }).catch(() => {});
      let primeira = null;
      if (liberacao === 'automatica') { try { const r = await base44.functions.invoke('liberarLeadsAutomatico', { lote_id: lote.id }); primeira = (r?.data || r)?.liberados ?? null; } catch (e) { /* o agendador libera depois */ } }
      setResultado({ criados, falhas, lote: lote.nome, automatica: liberacao === 'automatica', primeira });
      toast.success(`${criados} leads importados!`);
      onConcluido?.();
    } catch (e) {
      toast.error('Erro na importação: ' + (e.message || e));
      setResultado({ criados, falhas: validos.length - criados, erro: e.message });
    }
    setImportando(false);
  };

  const Cont = ({ rotulo, valor, cor }) => (
    <div className="rounded-xl border border-gray-100 p-3 text-center">
      <p className={`text-xl font-bold ${cor}`}>{valor.toLocaleString('pt-BR')}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{rotulo}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#1a3150]" />
            <h3 className="font-semibold text-gray-900">Importar leads · passo {Math.min(passo, 4)} de 4</h3>
          </div>
          {!importando && <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {passo === 1 && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                Aceita <strong>CSV</strong> (vírgula ou ponto e vírgula, UTF-8 ou Latin-1) e <strong>Excel</strong>. Colunas reconhecidas automaticamente: ID Negócio, Nome, CPF/CNPJ, Telefone, Valor do Contrato, Produto Contratado, Responsável, Endereço, Cidade, UF, CEP, E-mail. Os dados são lidos no seu navegador — nenhuma IA é usada na leitura.
              </div>
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${dragging ? 'border-[#1a3150] bg-blue-50' : 'border-gray-200 hover:border-[#1a3150]'}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); onArquivo(e.dataTransfer.files[0]); }}>
                <FileText className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Clique ou arraste o arquivo aqui</p>
                <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={e => { onArquivo(e.target.files[0]); e.target.value = ''; }} />
              </div>
              <button className="text-xs text-[#1a3150] underline flex items-center gap-1"
                onClick={() => baixarCSV('modelo_leads.csv', [{ 'ID Negócio': '123', 'Nome do Contratante': 'Empresa Exemplo Ltda', 'CPF/CNPJ': '11.222.333/0001-81', Telefone: '(51) 99999-0000', 'Valor do Contrato (R$)': '3500.00', 'Produto Contratado': 'VERDE REGULARIZE', 'Responsável': 'Nome do responsável', Endereço: 'Rua Exemplo, 100', Cidade: 'Porto Alegre', UF: 'RS', CEP: '90000-000' }])}>
                <Download className="w-3 h-3" /> Baixar arquivo-modelo
              </button>
            </>
          )}

          {passo === 2 && dados && (
            <>
              <p className="text-sm text-gray-600"><strong>{arquivo?.name}</strong> · {dados.rows.length.toLocaleString('pt-BR')} linhas. Confira o mapeamento das colunas:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAMPOS_IMPORT.map(c => (
                  <div key={c.key}>
                    <label className="text-[11px] text-gray-500 block mb-0.5">{c.label}</label>
                    <select value={mapa[c.key] ?? ''} onChange={e => setMapa(m => ({ ...m, [c.key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                      className={`w-full px-2 py-1.5 text-xs border rounded-lg ${c.obrigatorio && mapa[c.key] === undefined ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                      <option value="">— não importar —</option>
                      {dados.headers.map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nome do lote *</label>
                  <input value={nomeLote} onChange={e => setNomeLote(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cadência a aplicar</label>
                  <select value={cadenciaId} onChange={e => setCadenciaId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl">
                    <option value="">Sem cadência</option>
                    {cadencias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Como liberar os leads aos gerentes?</p>
                <label className="flex items-start gap-2 text-xs cursor-pointer"><input type="radio" className="mt-0.5" checked={liberacao === 'automatica'} onChange={() => setLiberacao('automatica')} />
                  <span><b>Automática (recomendado)</b> — importa tudo agora e libera aos poucos: cada gerente recebe uma cota diária ({cfg.novos_por_dia || 15} novos/dia) <b>somente se</b> tiver menos de {cfg.backlog_max_por_gerente || 60} itens em aberto. Os melhores leads (score) saem primeiro. Roda sozinho, de hora em hora, em dias úteis.</span></label>
                <label className="flex items-start gap-2 text-xs cursor-pointer"><input type="radio" className="mt-0.5" checked={liberacao === 'manual'} onChange={() => setLiberacao('manual')} />
                  <span><b>Manual</b> — importa e você distribui o lote depois pelo botão "Distribuir".</span></label>
              </div>
              {!obrigatoriosOk && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Mapeie Nome, CPF/CNPJ e Telefone para continuar.</p>}
            </>
          )}

          {passo === 3 && validacao && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Cont rotulo="Prontos para importar" valor={validacao.validos.length} cor="text-emerald-600" />
                <Cont rotulo="Rejeitados" valor={validacao.rejeitados.length} cor="text-red-600" />
                <Cont rotulo="Linhas no arquivo" valor={validacao.total} cor="text-gray-700" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {[['Sem nome', 'sem_nome'], ['CPF/CNPJ inválido', 'doc_invalido'], ['Telefone inválido', 'tel_invalido'], ['Mesmo CPF/CNPJ repetido', 'duplicado_arquivo'], ['Já existe na base', 'ja_na_base'], ['Opt-out / supressão', 'suprimido'], ['Telefone repetido (mantidos)', 'tel_compartilhado']].map(([r, k]) => (
                  <div key={k} className="flex justify-between border border-gray-100 rounded-lg px-2 py-1.5"><span className="text-gray-500">{r}</span><strong>{validacao.cont[k]}</strong></div>
                ))}
              </div>
              <div className="text-xs text-gray-500">
                Quentes: <strong>{validacao.validos.filter(l => l.segmento === 'quente').length}</strong> · Mornos: <strong>{validacao.validos.filter(l => l.segmento === 'morno').length}</strong> · Frios: <strong>{validacao.validos.filter(l => l.segmento === 'frio').length}</strong> (score). A distribuição libera os quentes primeiro.
              </div>
              {validacao.rejeitados.length > 0 && (
                <button className="text-xs text-[#1a3150] underline flex items-center gap-1" onClick={() => baixarCSV('rejeitados.csv', validacao.rejeitados)}>
                  <Download className="w-3 h-3" /> Baixar rejeitados.csv (com o motivo de cada linha)
                </button>
              )}
            </>
          )}

          {passo === 4 && (
            <div className="space-y-3">
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progresso.total ? (progresso.atual / progresso.total) * 100 : 0}%` }} />
              </div>
              <p className="text-sm text-gray-600 text-center">{progresso.atual.toLocaleString('pt-BR')} / {progresso.total.toLocaleString('pt-BR')} leads</p>
              {importando && (
                <div className="text-center">
                  <Button variant="outline" size="sm" onClick={() => { pausadoRef.current = !pausadoRef.current; setPausado(pausadoRef.current); }}>
                    {pausado ? <><Play className="w-3.5 h-3.5 mr-1" />Retomar</> : <><Pause className="w-3.5 h-3.5 mr-1" />Pausar</>}
                  </Button>
                </div>
              )}
              {resultado && (
                <div className={`rounded-xl p-3 text-sm ${resultado.falhas ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                  <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {resultado.criados.toLocaleString('pt-BR')} leads importados no lote "{resultado.lote}".</p>
                  {resultado.falhas > 0 && <p className="text-xs mt-1">{resultado.falhas} não puderam ser gravados — reenvie o arquivo: os já importados serão ignorados como duplicados.</p>}
                  <p className="text-xs mt-1">{resultado.automatica ? `Liberação automática ativada${resultado.primeira != null ? ` — primeira onda: ${resultado.primeira} lead(s) liberados agora` : ''}. O restante será liberado sozinho conforme a capacidade de cada gerente.` : 'Próximo passo: distribuir o lote aos gerentes (botão "Distribuir" na lista de lotes).'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-2 flex-shrink-0">
          <div>{passo > 1 && passo < 4 && <Button variant="outline" onClick={() => setPasso(passo - 1)}>Voltar</Button>}</div>
          <div className="flex gap-2">
            {passo === 2 && <Button onClick={validar} disabled={!obrigatoriosOk || !nomeLote.trim()} className="bg-[#0f1e35] hover:bg-[#1a3150]">Validar dados</Button>}
            {passo === 3 && <Button onClick={importar} disabled={!validacao?.validos.length} className="bg-[#0f1e35] hover:bg-[#1a3150]">Importar {validacao?.validos.length.toLocaleString('pt-BR')} leads</Button>}
            {passo === 4 && !importando && <Button onClick={onClose} className="bg-[#0f1e35] hover:bg-[#1a3150]">Fechar</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
