import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

const FORMAS_PGTO_VALIDAS = ["DÉBITO EM CONTA", "CARTÃO DE CRÉDITO", "BOLETO", "PIX", "TRANSFERÊNCIA", "DINHEIRO"];

function normalizarFormaPgto(val) {
  if (!val) return undefined;
  const v = val.toString().toUpperCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v.includes("DEBITO") || v.includes("CONTA")) return "DÉBITO EM CONTA";
  if (v.includes("CREDITO") || v.includes("CARTAO")) return "CARTÃO DE CRÉDITO";
  if (v.includes("BOLETO")) return "BOLETO";
  if (v.includes("PIX")) return "PIX";
  if (v.includes("TRANSFER")) return "TRANSFERÊNCIA";
  if (v.includes("DINHEIR") || v.includes("ESPECIE")) return "DINHEIRO";
  return undefined;
}

function normalizarData(val) {
  if (!val) return null;
  const s = val.toString().trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // DD-MM-YYYY
  const br2 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (br2) return `${br2[3]}-${br2[2]}-${br2[1]}`;
  // Excel serial date
  if (/^\d{5}$/.test(s)) {
    const d = new Date((parseInt(s) - 25569) * 86400 * 1000);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }
  return null;
}

function normalizarValor(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = val.toString().replace(/[^\d,.]/g, '');
  // 1.234,56 → 1234.56
  if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (s.includes(',')) return parseFloat(s.replace(',', '.'));
  return parseFloat(s) || 0;
}

// Parse a single CSV row respecting quoted fields
function parseCSVRow(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { result.push(current); current = ''; }
    else { current += char; }
  }
  result.push(current);
  return result;
}

// Parse full CSV text into array of objects
function parseCSVText(text) {
  const firstLine = text.split('\n')[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0], delimiter).map(h =>
    h.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  );

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i], delimiter);
    if (values.every(v => !v.trim())) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

// Flexible field getter trying multiple possible column names
function getField(row, ...keys) {
  for (const k of keys) {
    const normalized = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
    const val = row[normalized] || row[k] || '';
    if (val) return val;
  }
  return '';
}

function mapCSVRow(row) {
  return {
    produto: getField(row, 'produto', 'product', 'nome_produto', 'servico'),
    assessor_comercial: getField(row, 'assessor_comercial', 'assessor', 'vendedor', 'seller', 'nome_vendedor', 'comercial'),
    time: getField(row, 'time', 'equipe', 'team'),
    valor: getField(row, 'valor', 'value', 'preco', 'price', 'entrada', 'adesao', 'valor_entrada'),
    data: getField(row, 'data', 'date', 'data_venda', 'data_da_venda'),
    forma_pagamento: getField(row, 'forma_pagamento', 'forma_de_pagamento', 'pagamento', 'payment', 'forma'),
    cpf_cnpj: getField(row, 'cpf_cnpj', 'cpf', 'cnpj', 'documento', 'cpf/cnpj'),
    cliente: getField(row, 'cliente', 'client', 'nome_cliente', 'customer', 'nome'),
    bitrix: getField(row, 'bitrix', 'link_bitrix', 'crm', 'link'),
    observacao: getField(row, 'observacao', 'obs', 'observacoes', 'notes', 'nota'),
    percentual_comissao: getField(row, 'percentual_comissao', 'comissao', 'pct_comissao', 'commission', 'percentual'),
    espelhamento: getField(row, 'espelhamento', 'indicador', 'indicator', 'referral'),
    percentual_espelhamento: getField(row, 'percentual_espelhamento', 'pct_espelhamento', 'comissao_indicador'),
  };
}

export default function ImportarVendasModal({ onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('upload'); // upload | preview | processing | done
  const [uploading, setUploading] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [erros, setErros] = useState([]);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [resultado, setResultado] = useState(null);

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list('nome'),
  });

  const { data: espelhamentos = [] } = useQuery({
    queryKey: ['espelhamentos'],
    queryFn: () => base44.entities.Espelhamento.list('nome'),
  });

  const matchVendedor = (nome) => {
    if (!nome) return null;
    const n = nome.trim().toUpperCase();
    return vendedores.find(v => v.nome?.trim().toUpperCase() === n) || null;
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setErros([]);
    try {
      let raw = [];

      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const isExcel = file.name.toLowerCase().match(/\.xlsx?$/);

      if (isCSV) {
        // Try UTF-8 first, then fallback to Windows-1252 (common in Brazil)
        let text = '';
        try {
          text = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = e => resolve(e.target.result);
            r.onerror = reject;
            r.readAsText(file, 'UTF-8');
          });
          // Detect encoding issues (replacement character)
          if (text.includes('\uFFFD')) {
            text = await new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = e => resolve(e.target.result);
              r.onerror = reject;
              r.readAsText(file, 'Windows-1252');
            });
          }
        } catch {
          text = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = e => resolve(e.target.result);
            r.onerror = reject;
            r.readAsText(file, 'Windows-1252');
          });
        }
        const csvRows = parseCSVText(text);
        raw = csvRows.map(mapCSVRow);
      } else if (isExcel) {
        // For Excel files, upload and use ExtractDataFromUploadedFile
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              vendas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    produto: { type: "string" },
                    assessor_comercial: { type: "string" },
                    time: { type: "string" },
                    valor: { type: "string" },
                    data: { type: "string" },
                    forma_pagamento: { type: "string" },
                    cpf_cnpj: { type: "string" },
                    cliente: { type: "string" },
                    bitrix: { type: "string" },
                    observacao: { type: "string" },
                    percentual_comissao: { type: "string" },
                    espelhamento: { type: "string" },
                    percentual_espelhamento: { type: "string" }
                  }
                }
              }
            }
          }
        });
        if (extractResult.status !== 'success' || !extractResult.output?.vendas?.length) {
          toast.error('Não foi possível extrair dados do arquivo Excel. Verifique o formato.');
          setUploading(false);
          return;
        }
        raw = extractResult.output.vendas;
      } else {
        toast.error('Formato não suportado. Use .csv, .xls ou .xlsx');
        setUploading(false);
        return;
      }

      if (!raw.length) {
        toast.error('Nenhuma linha encontrada no arquivo.');
        setUploading(false);
        return;
      }

      const processadas = [];
      const errosLista = [];

      raw.forEach((row, idx) => {
        const data = normalizarData(row.data);
        const valor = normalizarValor(row.valor);
        const forma_pagamento = normalizarFormaPgto(row.forma_pagamento);
        const vendedor = matchVendedor(row.assessor_comercial);
        const pctComissao = row.percentual_comissao
          ? normalizarValor(row.percentual_comissao)
          : vendedor?.percentual_comissao || 0;

        const avisos = [];
        if (!data) avisos.push('data inválida');
        if (!valor || valor <= 0) avisos.push('valor inválido');
        if (!row.produto) avisos.push('produto ausente');
        if (!vendedor) avisos.push(`vendedor "${row.assessor_comercial}" não encontrado`);

        processadas.push({
          linha: idx + 2,
          produto: row.produto || '',
          assessor_comercial: row.assessor_comercial || '',
          vendedor_id: vendedor?.id || '',
          time: row.time || vendedor?.time || '',
          valor,
          data: data || '',
          forma_pagamento,
          cpf_cnpj: row.cpf_cnpj || '',
          cliente: row.cliente || '',
          bitrix: row.bitrix || '',
          observacao: row.observacao || '',
          percentual_comissao: pctComissao,
          espelhamento: row.espelhamento || '',
          percentual_espelhamento: row.percentual_espelhamento ? normalizarValor(row.percentual_espelhamento) : 0,
          avisos,
          valida: avisos.length === 0
        });
      });

      setLinhas(processadas);
      setStep('preview');
    } catch (err) {
      toast.error('Erro ao processar arquivo: ' + err.message);
    }
    setUploading(false);
  };

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const withRetry = async (fn, retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (err?.message?.includes('429') || err?.message?.includes('Rate limit')) {
          await sleep(2000 * (attempt + 1));
        } else {
          throw err;
        }
      }
    }
    throw new Error('Rate limit após múltiplas tentativas');
  };

  const handleImportar = async () => {
    const validas = linhas.filter(l => l.valida);
    if (!validas.length) return;

    setStep('processing');
    setProgresso({ atual: 0, total: validas.length });

    let importadas = 0;
    let falhas = 0;

    for (let i = 0; i < validas.length; i++) {
      const row = validas[i];
      // Aguarda 600ms entre registros para evitar rate limit
      if (i > 0) await sleep(600);
      try {
        const vendaData = {
          produto: row.produto,
          assessor_comercial: row.assessor_comercial,
          vendedor_id: row.vendedor_id,
          time: row.time,
          valor: row.valor,
          data: row.data,
          forma_pagamento: row.forma_pagamento,
          cpf_cnpj: row.cpf_cnpj,
          cliente: row.cliente,
          bitrix: row.bitrix,
          observacao: row.observacao,
          percentual_comissao: row.percentual_comissao,
        };

        const venda = await base44.entities.Venda.create(vendaData);

        // Comissão do vendedor
        if (row.vendedor_id && row.valor > 0 && row.percentual_comissao > 0) {
          await base44.entities.Comissao.create({
            venda_id: venda.id,
            vendedor_id: row.vendedor_id,
            vendedor_nome: row.assessor_comercial,
            valor_venda: row.valor,
            percentual: row.percentual_comissao,
            valor_comissao: (row.valor * row.percentual_comissao) / 100,
            data_venda: row.data,
            pago: false
          });
        }

        // Comissão de espelhamento se houver
        if (row.espelhamento) {
          const esp = espelhamentos.find(e => e.nome?.trim().toUpperCase() === row.espelhamento.trim().toUpperCase());
          if (esp && row.percentual_espelhamento > 0) {
            await base44.entities.ComissaoEspelhamento.create({
              venda_id: venda.id,
              vendedor_id: esp.id,
              vendedor_nome: esp.nome,
              valor_venda: row.valor,
              percentual: row.percentual_espelhamento,
              valor_comissao: (row.valor * row.percentual_espelhamento) / 100,
              data_venda: row.data,
              pago: false
            });
          }
        }

        // Auto-vincular cliente
        if (row.cliente?.trim() && row.vendedor_id) {
          const clientesExist = await base44.entities.Cliente.filter({ nome: row.cliente.trim() });
          if (clientesExist.length === 0) {
            await base44.entities.Cliente.create({
              nome: row.cliente.trim(),
              cpf_cnpj: row.cpf_cnpj || '',
              vendedor_id: row.vendedor_id,
              vendedor_nome: row.assessor_comercial
            });
          } else if (!clientesExist[0].vendedor_id) {
            await base44.entities.Cliente.update(clientesExist[0].id, {
              vendedor_id: row.vendedor_id,
              vendedor_nome: row.assessor_comercial
            });
          }
        }

        importadas++;
      } catch {
        falhas++;
      }
      setProgresso({ atual: i + 1, total: validas.length });
    }

    queryClient.invalidateQueries(['vendas']);
    queryClient.invalidateQueries(['comissoes']);
    queryClient.invalidateQueries(['comissoesEspelhamento']);
    queryClient.invalidateQueries(['clientes']);
    queryClient.invalidateQueries(['metas']);

    setResultado({ importadas, falhas, ignoradas: linhas.filter(l => !l.valida).length });
    setStep('done');
  };

  const validas = linhas.filter(l => l.valida).length;
  const comAvisos = linhas.filter(l => !l.valida).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-[#1a3150]" />
            <h2 className="text-lg font-semibold text-gray-900">Importar Vendas Históricas</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* STEP: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center bg-gray-50">
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-[#1a3150] animate-spin" />
                    <p className="text-sm text-gray-600">Processando arquivo, aguarde...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-gray-700 mb-1">Selecione a planilha de vendas 2025</p>
                    <p className="text-sm text-gray-400 mb-4">Formatos aceitos: .xlsx, .xls, .csv</p>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" id="import-file" />
                    <label htmlFor="import-file">
                      <Button asChild className="bg-[#1a3150] hover:bg-[#0f1e35]">
                        <span><Upload className="w-4 h-4 mr-2" />Selecionar Arquivo</span>
                      </Button>
                    </label>
                  </>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold mb-2">Colunas esperadas na planilha:</p>
                <div className="grid grid-cols-2 gap-1">
                  <p>• <strong>produto</strong> — nome do produto</p>
                  <p>• <strong>assessor_comercial</strong> — nome do vendedor</p>
                  <p>• <strong>valor</strong> — valor da venda</p>
                  <p>• <strong>data</strong> — data (DD/MM/AAAA)</p>
                  <p>• <strong>forma_pagamento</strong> — forma de pgto</p>
                  <p>• <strong>cliente</strong> — nome do cliente</p>
                  <p>• <strong>cpf_cnpj</strong> — CPF ou CNPJ</p>
                  <p>• <strong>time</strong> — time do vendedor</p>
                  <p>• <strong>percentual_comissao</strong> — % comissão</p>
                  <p>• <strong>espelhamento</strong> — indicador (opcional)</p>
                  <p>• <strong>bitrix</strong> — link CRM (opcional)</p>
                  <p>• <strong>observacao</strong> — observações (opcional)</p>
                </div>
                <p className="mt-2 text-blue-600 text-xs">⚠️ O vendedor deve estar cadastrado na aba Vendedores para ser vinculado corretamente.</p>
              </div>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{validas}</p>
                  <p className="text-xs text-emerald-700 mt-1">Linhas prontas para importar</p>
                </div>
                <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{comAvisos}</p>
                  <p className="text-xs text-amber-700 mt-1">Linhas com problemas (serão ignoradas)</p>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700">{linhas.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Total de linhas lidas</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Linha</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Data</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Vendedor</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Produto</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Valor</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Cliente</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {linhas.map(l => (
                      <tr key={l.linha} className={l.valida ? 'hover:bg-gray-50/50' : 'bg-amber-50/40'}>
                        <td className="px-3 py-2 text-gray-400">{l.linha}</td>
                        <td className="px-3 py-2 text-gray-700">{l.data || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={l.vendedor_id ? 'text-gray-900 font-medium' : 'text-red-500'}>
                            {l.assessor_comercial || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{l.produto || '—'}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900">
                          {l.valor > 0 ? l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{l.cliente || '—'}</td>
                        <td className="px-3 py-2">
                          {l.valida ? (
                            <span className="text-emerald-600 font-medium">✓ OK</span>
                          ) : (
                            <span className="text-amber-600 text-xs">{l.avisos.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP: PROCESSING */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <Loader2 className="w-12 h-12 text-[#1a3150] animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-lg">Importando vendas...</p>
                <p className="text-gray-500 text-sm mt-1">
                  {progresso.atual} de {progresso.total} registros processados
                </p>
              </div>
              <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1a3150] rounded-full transition-all duration-300"
                  style={{ width: `${progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && resultado && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
              <h3 className="text-xl font-bold text-gray-900">Importação Concluída!</h3>
              <div className="flex gap-6 text-center">
                <div className="bg-emerald-50 rounded-xl p-4 min-w-[100px]">
                  <p className="text-3xl font-bold text-emerald-600">{resultado.importadas}</p>
                  <p className="text-xs text-emerald-700 mt-1">Importadas</p>
                </div>
                {resultado.ignoradas > 0 && (
                  <div className="bg-amber-50 rounded-xl p-4 min-w-[100px]">
                    <p className="text-3xl font-bold text-amber-600">{resultado.ignoradas}</p>
                    <p className="text-xs text-amber-700 mt-1">Ignoradas</p>
                  </div>
                )}
                {resultado.falhas > 0 && (
                  <div className="bg-red-50 rounded-xl p-4 min-w-[100px]">
                    <p className="text-3xl font-bold text-red-600">{resultado.falhas}</p>
                    <p className="text-xs text-red-700 mt-1">Falhas</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">Vendas, comissões e clientes foram atualizados.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                ← Voltar
              </Button>
              <Button
                onClick={handleImportar}
                disabled={validas === 0}
                className="bg-[#1a3150] hover:bg-[#0f1e35]"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Importar {validas} vendas
              </Button>
            </>
          )}
          {(step === 'upload' || step === 'done') && (
            <Button variant="outline" onClick={onClose}>
              {step === 'done' ? 'Fechar' : 'Cancelar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}