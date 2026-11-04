import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { base44, calls, tables } from './mockClient.js';
vi.mock('@/api/base44Client', async () => (await import('/app/.tmp_tests/mockClient.js')));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
import ImportadorLeadsWizard from '@/components/leads/ImportadorLeadsWizard';

const cpf = (n) => { const b = String(100000000 + n).slice(0, 9).split('').map(Number); const d = (arr, f) => { let s = 0; arr.forEach((x, i) => s += x * (f - i)); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; const d1 = d(b, 10); const d2 = d([...b, d1], 11); const t = [...b, d1, d2].join(''); return `${t.slice(0,3)}.${t.slice(3,6)}.${t.slice(6,9)}-${t.slice(9)}`; };
const cnpj = (n) => { const b = (String(10000000 + n) + '0001').split('').map(Number); const dv = (arr) => { const w = arr.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; const s = arr.reduce((a, x, i) => a + x * w[i], 0); const r = s % 11; return r < 2 ? 0 : 11 - r; }; const d1 = dv(b); const d2 = dv([...b, d1]); const t = [...b, d1, d2].join(''); return `${t.slice(0,2)}.${t.slice(2,5)}.${t.slice(5,8)}/${t.slice(8,12)}-${t.slice(12)}`; };

function gerarCSV(N) {
  const hdr = ['ID Negócio', 'Nome do Contratante', 'Tipo Pessoa', 'CPF/CNPJ', 'Telefone', 'Valor do Contrato (R$)', 'Produto Contratado', 'Responsável', 'Endereço', 'Cidade', 'UF', 'CEP'];
  const rows = [hdr]; const esp = { validos: 0, docInv: 0, telInv: 0, dupArq: 0, semNome: 0 };
  for (let i = 1; i <= N; i++) {
    const pj = i % 5 === 0; const ddd = ['51', '11', '47', '31', '21'][i % 5];
    let nome = pj ? `EMPRESA ${i}, COMERCIO & CIA LTDA` : `Cliente ${i}`; let doc = pj ? cnpj(i) : cpf(i); let tel = `(${ddd}) 9${String(80000000 + i).slice(0, 4)}-${String(1000 + (i % 9000)).padStart(4, '0')}`; let id = String(i);
    const k = i % 100;
    if (k === 1) { doc = '123.456.789-00'; esp.docInv++; }
    else if (k === 2) { tel = '99 99999999'; esp.telInv++; }
    else if (k === 3) { tel = '2147483647'; esp.telInv++; }
    else if (k === 4) { nome = ''; esp.semNome++; }
    else if (k === 5 && i > 100) { doc = cpf(i - 100); tel = rows[i - 99]?.[4] || tel; id = String(100000 + i); esp.dupArq++; }
    else esp.validos++;
    rows.push([id, i % 7 === 0 ? `MONITORE - ${nome}` : nome, pj ? 'PJ' : 'PF', doc, tel, i % 3 === 0 ? '6.000,00' : '1500', i % 2 ? 'VERDE REGULARIZE - 857367' : 'DIAGNOSTICO', `Resp ${i % 9}`, `Rua ${i}, ${i}`, 'Porto Alegre', 'RS', '90000-000']);
  }
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return { csv: rows.map(r => r.map(q).join(',')).join('\n'), esp };
}

beforeEach(() => { calls.bulk.length = 0; for (const k of Object.keys(calls.creates)) delete calls.creates[k]; tables.Cadencia = [{ id: 'cadBase', nome: 'Reativação da base', padrao_para: 'base_clientes', ativa: true }]; tables.ConfigFila = [{ chave: 'padrao', base_legal_padrao: 'Legítimo interesse' }]; tables.ListaSupressao = []; });

describe('Assistente de importação', () => {
  it('importa 11.000 linhas com validação, dedupe e progresso', async () => {
    const { csv, esp } = gerarCSV(11000);
    const onConcluido = vi.fn();
    const { container } = render(<ImportadorLeadsWizard leadsExistentes={[]} onClose={() => {}} onConcluido={onConcluido} />);
    const input = container.querySelector('input[type=file]');
    const file = new File(['\uFEFF' + csv], 'leads.csv', { type: 'text/csv' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    await screen.findByText(/passo 2 de 4/, {}, { timeout: 30000 });
    // mapeamento automático
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(10);
    await act(async () => { fireEvent.click(screen.getByText('Validar dados')); });
    await screen.findByText(/passo 3 de 4/, {}, { timeout: 30000 });
    const txt = container.textContent;
    console.log('RESUMO PASSO 3 =>', txt.match(/Prontos para importar[\s\S]{0,200}/)?.[0].slice(0, 160));
    expect(txt).toContain('Prontos para importar');
    // números esperados
    const prontos = Number((txt.match(/([\d.]+)Prontos para importar/) || [])[1]?.replace(/\./g, ''));
    console.log('prontos', prontos, 'esperado ~', esp.validos);
    expect(Math.abs(prontos - esp.validos)).toBeLessThanOrEqual(120); // duplicados por telefone/doc podem reduzir
    await act(async () => { fireEvent.click(screen.getByText(/^Importar [\d.]+ leads$/)); });
    await waitFor(() => expect(screen.getByText(/leads importados no lote/)).toBeTruthy(), { timeout: 60000 });
    expect(calls.bulk.length).toBe(prontos);
    const l0 = calls.bulk[0];
    expect(l0.status).toBe('pendente'); expect(l0.cadencia_id).toBe('cadBase'); expect(l0.base_legal).toBe('Legítimo interesse'); expect(l0.consentimento_status).toBe('base_cliente');
    expect(l0.telefone_e164).toMatch(/^\+55\d{10,11}$/); expect(l0.cpf_cnpj).toMatch(/\d/);
    // quentes primeiro
    const scores = calls.bulk.map(l => l.score); expect(scores[0]).toBeGreaterThanOrEqual(scores[scores.length - 1]);
    // nome limpo (MONITORE -) e vírgula dentro do nome preservada
    expect(calls.bulk.some(l => /^MONITORE/i.test(l.nome))).toBe(false);
    expect(calls.bulk.some(l => l.nome.includes('COMERCIO & CIA'))).toBe(true);
    // lote criado
    expect(calls.creates.LoteLead?.length).toBe(1);
    expect(onConcluido).toHaveBeenCalled();
  }, 120000);

  it('rejeita quem já existe na base e quem está na lista de supressão', async () => {
    const csv = `"ID Negócio","Nome do Contratante","CPF/CNPJ","Telefone"\n"1","Ana","${cpf(1)}","(51) 99999-0001"\n"2","Beto","${cpf(2)}","(51) 99999-0002"\n"3","Carla","${cpf(3)}","(51) 99999-0003"\n`;
    tables.ListaSupressao = [{ cpf_cnpj: cpf(3).replace(/\D/g, ''), telefone_e164: '' }];
    const existentes = [{ id_externo: '1', cpf_cnpj: cpf(1) }];
    const { container } = render(<ImportadorLeadsWizard leadsExistentes={existentes} onClose={() => {}} />);
    await act(async () => { fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [new File([csv], 'x.csv')] } }); });
    await screen.findByText(/passo 2 de 4/);
    await act(async () => { fireEvent.click(screen.getByText('Validar dados')); });
    await screen.findByText(/passo 3 de 4/);
    const t = container.textContent;
    expect(t).toMatch(/Já existe na base1/); expect(t).toMatch(/Opt-out \/ supressão1/); expect(t).toMatch(/1Prontos para importar/);
  });
});
