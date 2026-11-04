import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { base44, calls, tables } from './mockClient.js';
vi.mock('@/api/base44Client', async () => (await import('/app/.tmp_tests/mockClient.js')));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/agenda/AgendaMeetModal', () => ({ default: () => null }));
import FilaContato from '@/pages/FilaContato';
import ModoFocoMobile from '@/pages/ModoFocoMobile';

const wrap = (ui, path = '/') => { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></QueryClientProvider>); };
const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const F = (o) => ({ id: 'F' + Math.random(), tipo_origem: 'carteira', ref_id: 'R', nome: 'Fulano', telefone: '(51) 99999-0000', telefone_e164: '+5551999990000', vendedor_id: 'vA', vendedor_nome: 'Ana', status: 'pendente', posicao: 1, prioridade: 1, historico: [], data_fila: hoje, ...o });
beforeEach(() => { calls.invoke.length = 0; calls.filters.length = 0; for (const k of Object.keys(calls.creates)) delete calls.creates[k]; for (const k of Object.keys(tables)) delete tables[k]; sessionStorage.clear(); });

describe('Página Fila de Contatos', () => {
  it('gerente: filtra no servidor por vendedor_id e mostra coluna Reunião Marcada; troca de visões', async () => {
    base44.auth.me.mockResolvedValue({ id: 'u1', email: 'a@x', role: 'user' });
    tables.Vendedor = [{ id: 'vA', nome: 'Ana', email: 'a@x', ativo: true }];
    tables.FilaContato = [F({ id: 'k1', nome: 'Na agenda' }), F({ id: 'k2', nome: 'Com reunião', status: 'reuniao_marcada', reuniao_em: new Date().toISOString() }), F({ id: 'k3', nome: 'Outro gerente', vendedor_id: 'vB' })];
    wrap(<FilaContato />);
    await screen.findByText('Na agenda');
    expect(screen.getByText('Com reunião')).toBeTruthy();
    expect(screen.getAllByText('Reunião Marcada').length).toBeGreaterThan(0);
    const q = calls.filters.filter(x => x.name === 'FilaContato' && x.q.status === 'pendente');
    expect(q.length).toBeGreaterThan(0); expect(q.every(x => x.q.vendedor_id === 'vA')).toBe(true);
    expect(screen.queryByText('Importar leads')).toBeNull(); // só admin
    fireEvent.click(screen.getByText('Lista')); await screen.findByText('Ligar hoje');
    fireEvent.click(screen.getByText('Agenda')); await screen.findByText('Nova reunião (Meet)');
    fireEvent.click(screen.getByText('Modo Foco')); await screen.findByText(/Meta de hoje/);
    fireEvent.click(screen.getByText('Kanban')); await screen.findByText('Na agenda');
  });
  it('admin sem gerente: vê "Importar leads" e não filtra por vendedor; Modo Foco pede escolha de gerente', async () => {
    base44.auth.me.mockResolvedValue({ id: 'u0', email: 'adm@x', role: 'admin' });
    tables.Vendedor = [{ id: 'vA', nome: 'Ana', email: 'a@x', ativo: true }];
    tables.FilaContato = [F({ id: 'k1', nome: 'Qualquer' })];
    wrap(<FilaContato />);
    await screen.findByText('Qualquer'); expect(screen.getByText('Importar leads')).toBeTruthy();
    expect(calls.filters.filter(x => x.name === 'FilaContato' && x.q.status === 'pendente').every(x => !x.q.vendedor_id)).toBe(true);
    fireEvent.click(screen.getByText('Modo Foco')); expect(await screen.findByText(/Use "Ver como"/)).toBeTruthy();
  });
  it('?fila=ID abre o popup do lead (vindo de um alerta)', async () => {
    base44.auth.me.mockResolvedValue({ id: 'u0', email: 'adm@x', role: 'admin' });
    tables.Vendedor = []; tables.FilaContato = [F({ id: 'ALVO', nome: 'Lead do alerta', telefone: '(11) 98888-7777' })];
    wrap(<FilaContato />, '/FilaContato?fila=ALVO');
    expect(await screen.findByText('Registrar resultado (1 toque)')).toBeTruthy();
  });
});

describe('/m — celular do gerente', () => {
  it('mostra o comando enviado do computador com link tel: e abre o resultado ao voltar', async () => {
    base44.auth.me.mockResolvedValue({ id: 'u1', email: 'a@x', role: 'user' });
    tables.Vendedor = [{ id: 'vA', nome: 'Ana', email: 'a@x', ativo: true }];
    tables.ComandoDiscagem = [{ id: 'cmd1', vendedor_id: 'vA', canal: 'ligar', nome: 'Zé Cliente', telefone_e164: '+5551999990000', fila_id: 'FX', status: 'enviado', criado_em: new Date().toISOString() }];
    tables.FilaContato = [F({ id: 'FX', nome: 'Zé Cliente' })];
    wrap(<ModoFocoMobile />);
    expect(await screen.findByText('Toque para ligar')).toBeTruthy(); expect(screen.getByText('Zé Cliente', { selector: 'span.text-base' })).toBeTruthy();
    const loc = { href: '' }; Object.defineProperty(window, 'location', { value: { ...window.location, set href(v) { loc.href = v; }, get href() { return loc.href; }, origin: 'http://x' }, writable: true });
    fireEvent.click(screen.getByText('Toque para ligar'));
    await waitFor(() => expect(base44.entities.ComandoDiscagem.update).toHaveBeenCalledWith('cmd1', { status: 'aberto' }));
    expect(loc.href).toBe('tel:+5551999990000');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    expect(await screen.findByText('Resultado da ligação')).toBeTruthy();
  });
  it('usuário sem cadastro de gerente recebe aviso', async () => {
    base44.auth.me.mockResolvedValue({ id: 'u2', email: 'x@x', role: 'user' }); tables.Vendedor = [];
    wrap(<ModoFocoMobile />); expect(await screen.findByText(/não está cadastrado como gerente/)).toBeTruthy();
  });
});
