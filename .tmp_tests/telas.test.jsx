import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { base44, calls, tables } from './mockClient.js';
vi.mock('@/api/base44Client', async () => (await import('/app/.tmp_tests/mockClient.js')));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/agenda/AgendaMeetModal', () => ({ default: () => null }));
import PosChamadaSheet from '@/components/fila/PosChamadaSheet';
import FilaLista from '@/components/fila/FilaLista';
import ModoFoco from '@/components/fila/ModoFoco';
import ConfigProspeccao from '@/pages/ConfigProspeccao';
import AlertasSino from '@/components/fila/AlertasSino';
import AgendarPublicaPage from '@/pages/AgendarPublicaPage';
import { qrUrl } from '@/components/fila/QrCodeContato';

const wrap = (ui, path = '/') => { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></QueryClientProvider>); };
const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const F = (o) => ({ id: 'F' + Math.random(), tipo_origem: 'carteira', ref_id: 'R', nome: 'Fulano', telefone: '(51) 99999-0000', telefone_e164: '+5551999990000', vendedor_id: 'vA', vendedor_nome: 'Ana', status: 'pendente', posicao: 1, historico: [], ...o });

beforeEach(() => { calls.invoke.length = 0; calls.filters.length = 0; for (const k of Object.keys(calls.creates)) delete calls.creates[k]; for (const k of Object.keys(tables)) delete tables[k]; });

describe('QR local', () => {
  it('gera SVG data URI sem chamada externa', () => {
    const u = qrUrl('tel:+5551999990000', 88);
    expect(u.startsWith('data:image/svg+xml')).toBe(true); expect(u).not.toContain('qrserver'); expect(decodeURIComponent(u)).toContain('<path');
  });
});

describe('PosChamadaSheet', () => {
  it('opt-out envia resultado e avisa; retorno exige data', async () => {
    const onDone = vi.fn();
    render(<PosChamadaSheet fila={F({ id: 'F1' })} canal="ligacao" onDone={onDone} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Atendeu — pediu retorno'));
    expect(screen.getByText('Retorno em')).toBeTruthy();
    fireEvent.click(screen.getByText('Salvar resultado'));
    await waitFor(() => expect(calls.invoke.length).toBe(1));
    expect(calls.invoke[0].fn).toBe('registrarResultadoContato');
    expect(calls.invoke[0].body).toMatchObject({ fila_id: 'F1', canal: 'ligacao', resultado: 'atendeu_retorno' });
    expect(calls.invoke[0].body.retorno.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });
  it('WhatsApp só mostra opções de WhatsApp e reunião pede data', async () => {
    render(<PosChamadaSheet fila={F({ id: 'F2' })} canal="whatsapp" onDone={() => {}} onClose={() => {}} />);
    expect(screen.queryByText('Caixa postal')).toBeNull(); expect(screen.getByText('WhatsApp enviado')).toBeTruthy();
    fireEvent.click(screen.getByText('Reunião marcada')); expect(screen.getByText('Reunião em')).toBeTruthy();
    fireEvent.click(screen.getByText('Salvar resultado'));
    await waitFor(() => expect(calls.invoke[0].body.reuniao_em).toBeTruthy());
  });
  it('resumo por IA preenche observação e data', async () => {
    render(<PosChamadaSheet fila={F()} canal="ligacao" onDone={() => {}} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex\.: cliente pediu/), { target: { value: 'cliente quer proposta de conta internacional' } });
    fireEvent.click(screen.getByText('Resumir com IA'));
    await waitFor(() => expect(screen.getByDisplayValue(/Resumo Próximo passo: Enviar proposta/)).toBeTruthy());
  });
});

describe('FilaLista', () => {
  it('lista paginada no servidor, visão e filtros geram a query certa', async () => {
    tables.FilaContato = Array.from({ length: 60 }, (_, i) => F({ id: 'L' + i, nome: 'Lead ' + i, score: 90 - i, segmento: 'quente', produto_contratado: 'VERDE' }));
    wrap(<FilaLista vendedor={{ id: 'vA', nome: 'Ana' }} isAdmin={false} adminTudo={false} vendedores={[]} cadencias={[]} onSelect={() => {}} />);
    await screen.findByText('Lead 0');
    const c = calls.filters.find(x => x.name === 'FilaContato');
    expect(c.q).toMatchObject({ status: 'pendente', vendedor_id: 'vA' }); expect(c.limit).toBe(26); expect(c.skip).toBe(0); expect(c.sort).toBe('-score');
    expect(screen.getAllByRole('row').length).toBe(26); // cabeçalho + 25
    fireEvent.click(screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-chevron-right')));
    await waitFor(() => expect(calls.filters.some(x => x.skip === 25)).toBe(true));
    fireEvent.click(screen.getByText('Retornos vencidos'));
    await waitFor(() => expect(calls.filters.some(x => x.q.status === 'atendeu' && x.q.proximo_contato?.$lte)).toBe(true));
  });
  it('admin vê filtro por gerente e não aplica vendedor_id por padrão', async () => {
    tables.FilaContato = [F({ id: 'A1', nome: 'Alguém' })];
    wrap(<FilaLista vendedor={null} isAdmin adminTudo vendedores={[{ id: 'vA', nome: 'Ana' }]} cadencias={[]} onSelect={() => {}} />);
    await screen.findByText('Alguém');
    expect(calls.filters.find(x => x.name === 'FilaContato').q.vendedor_id).toBeFalsy();
    expect(screen.getByText('Todos os gerentes')).toBeTruthy();
  });
});

describe('ModoFoco', () => {
  it('ordena: inbound sem 1º toque > retornos > carteira por score; desktop envia comando ao celular', async () => {
    tables.FilaContato = [
      F({ id: 'c1', nome: 'Carteira baixa', score: 20 }), F({ id: 'c2', nome: 'Carteira alta', score: 80 }),
      F({ id: 'in1', nome: 'Inbound novo', tipo_origem: 'indicacao', prioridade: 0 }),
    ];
    tables.ConfigFila = [{ chave: 'padrao', toques_dia: 80 }];
    tables.ModeloMensagem = [{ id: 'm1', nome: 'Indicação — 1º contato', canal: 'whatsapp', publico: 'indicacao', primeiro_contato: true, texto: 'Olá, {{primeiro_nome}}! Aqui é {{gerente}}.' }];
    wrap(<ModoFoco vendedor={{ id: 'vA', nome: 'ANA PAULA', celular_operadora: '+5551999998888' }} user={{ email: 'a@x' }} />);
    await screen.findByText('Inbound novo');
    expect(screen.getByDisplayValue(/Olá, Inbound! Aqui é Ana\./)).toBeTruthy();
    fireEvent.click(screen.getByText('Ligar no meu celular'));
    await waitFor(() => expect((calls.creates.ComandoDiscagem || []).length).toBe(1));
    expect(calls.creates.ComandoDiscagem[0]).toMatchObject({ vendedor_id: 'vA', canal: 'ligar', telefone_e164: '+5551999990000' });
    fireEvent.click(screen.getByText('Pular'));
    await screen.findByText('Carteira alta');
    fireEvent.click(screen.getByText(/Registrar resultado/));
    expect(await screen.findByText('Resultado da ligação')).toBeTruthy();
  });
  it('bloqueia 1º WhatsApp acima do limite diário', async () => {
    tables.FilaContato = [F({ id: 'x', nome: 'Sem WA ainda' })];
    tables.ConfigFila = [{ chave: 'padrao', limite_primeiro_whatsapp_dia: 2 }];
    tables.RegistroContato = [{ canal: 'whatsapp' }, { canal: 'whatsapp' }, { canal: 'whatsapp' }];
    wrap(<ModoFoco vendedor={{ id: 'vA', nome: 'Ana' }} user={{}} />);
    await screen.findByText('Sem WA ainda');
    await waitFor(() => expect(screen.getByText(/3\/2 1ºs contatos/)).toBeTruthy());
    fireEvent.click(screen.getByText('WhatsApp no meu celular'));
    await new Promise(r => setTimeout(r, 50));
    expect((calls.creates.ComandoDiscagem || []).length).toBe(0);
  });
});

describe('ConfigProspeccao — carregar padrões', () => {
  it('cria config, 8 modelos, 4 cadências, roteiros e FAQ sem duplicar', async () => {
    window.confirm = () => true;
    wrap(<ConfigProspeccao />);
    fireEvent.click(await screen.findByRole('button', { name: /Carregar padrões/ }));
    await waitFor(() => expect((calls.creates.ModeloMensagem || []).length).toBe(8), { timeout: 10000 });
    await waitFor(() => expect((calls.creates.Cadencia || []).length).toBe(4));
    expect(calls.creates.ConfigFila.length).toBe(1); expect(calls.creates.ConfigFila[0]).toMatchObject({ cap_carteira_dia: 40, novos_por_dia: 15, toques_dia: 80 });
    expect((calls.creates.RoteiroProduto || []).length).toBeGreaterThanOrEqual(6); expect((calls.creates.FaqItem || []).length).toBeGreaterThan(10);
    const inbound = calls.creates.Cadencia.find(c => c.padrao_para === 'indicacao'); expect(inbound.passos.length).toBe(8); expect(inbound.passos[0]).toMatchObject({ canal: 'ligacao', imediato: true });
    const base = calls.creates.Cadencia.find(c => c.padrao_para === 'base_clientes'); expect(base.passos.filter(p => p.modelo_id).length).toBe(3);
  });
  it('não-admin é bloqueado', async () => {
    base44.auth.me.mockResolvedValueOnce({ email: 'u@x', role: 'user' });
    wrap(<ConfigProspeccao />);
    expect(await screen.findByText(/Acesso restrito/)).toBeTruthy();
  });
});

describe('AlertasSino', () => {
  it('mostra contador e marca como lido', async () => {
    tables.AlertaGerente = [{ id: 'a1', vendedor_id: 'vA', titulo: 'Retorno agora: Zé', texto: '14:30', prioridade: 'alta', lido: false }];
    wrap(<AlertasSino vendedorId="vA" />);
    const btn = await screen.findByTitle('Alertas'); await waitFor(() => expect(btn.textContent).toBe('1'));
    fireEvent.click(btn); fireEvent.click(await screen.findByText('Retorno agora: Zé'));
    await waitFor(() => expect(base44.entities.AlertaGerente.update).toHaveBeenCalledWith('a1', { lido: true }));
  });
});

describe('Página pública de agendamento', () => {
  it('lista horários, confirma e mostra o Meet', async () => {
    base44.functions.invoke.mockImplementation(async (fn, body) => { calls.invoke.push({ fn, body });
      if (body.action === 'info') return { data: { gerente: 'Ana Paula', lead: 'Zé Silva', duracao_min: 30, slots: [{ data: '2030-01-07', hora: '10:00', iso: '2030-01-07T10:00:00-03:00' }, { data: '2030-01-07', hora: '10:30', iso: '2030-01-07T10:30:00-03:00' }] } };
      return { data: { success: true, quando: body.slot, meet_link: 'https://meet.google.com/abc', gerente: 'Ana Paula' } }; });
    const { MemoryRouter: M, Routes, Route } = await import('react-router-dom');
    const qc = new QueryClient(); render(<M initialEntries={['/agendar/tok123']}><Routes><Route path="/agendar/:token" element={<AgendarPublicaPage />} /></Routes></M>);
    await screen.findByText(/Olá, Zé!/); fireEvent.click(screen.getByText('10:30')); fireEvent.click(screen.getByText('Confirmar horário'));
    expect(await screen.findByText('Reunião confirmada!')).toBeTruthy(); expect(screen.getByText('Link do Google Meet').getAttribute('href')).toBe('https://meet.google.com/abc');
    expect(calls.invoke.find(c => c.body.action === 'agendar').body).toMatchObject({ token: 'tok123', slot: '2030-01-07T10:30:00-03:00' });
  });
});
