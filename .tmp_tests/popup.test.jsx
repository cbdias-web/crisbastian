import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { calls } from './mockClient.js';
vi.mock('@/api/base44Client', async () => (await import('/app/.tmp_tests/mockClient.js')));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/agenda/AgendaMeetModal', () => ({ default: () => null }));
import CapaContatoPopup from '@/components/fila/CapaContatoPopup';
const fila = { id: 'F1', tipo_origem: 'carteira', ref_id: 'R1', cliente_id: 'R1', nome: 'Codama Despachantes', telefone: '5199874556', vendedor_id: 'vA', vendedor_nome: 'Ana', status: 'pendente', produto: '' };
const wrap = (ui) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
describe('Popup do lead', () => {
  it('sem Atendeu/Não Atendeu; QRs são links; resultado simples salva com 1 toque e avança', async () => {
    const onProximo = vi.fn(); const onAtualizado = vi.fn();
    wrap(<CapaContatoPopup fila={fila} user={{ email: 'a@x' }} vendedor={{ id: 'vA', nome: 'Ana' }} onAtualizado={onAtualizado} onClose={() => {}} onProximo={onProximo} />);
    await screen.findByText('Registrar resultado do contato');
    expect(screen.queryByText('Atendeu')).toBeNull(); expect(screen.queryByText('Não Atendeu')).toBeNull();
    expect(screen.queryByText('Ligar no meu celular')).toBeNull();
    const wa = screen.getByAltText('QR WhatsApp').closest('a'); const tel = screen.getByAltText('QR Ligação').closest('a');
    expect(wa.getAttribute('href')).toBe('https://wa.me/555199874556'); expect(tel.getAttribute('href')).toBe('tel:+5551999874556');
    expect(screen.getByAltText('QR Ligação').getAttribute('src')).toContain('data:image/svg+xml');
    fireEvent.click(screen.getByText('Registrar resultado do contato'));
    fireEvent.click(await screen.findByText('Não atendeu'));
    await waitFor(() => expect(calls.invoke.length).toBe(1));
    expect(calls.invoke[0]).toMatchObject({ fn: 'registrarResultadoContato', body: { fila_id: 'F1', canal: 'ligacao', resultado: 'nao_atendeu' } });
    await waitFor(() => expect(onProximo).toHaveBeenCalledWith(fila)); expect(onAtualizado).toHaveBeenCalled();
  });
  it('resultado que exige dados (retorno) NÃO salva sozinho', async () => {
    calls.invoke.length = 0;
    wrap(<CapaContatoPopup fila={fila} user={{}} vendedor={{ id: 'vA', nome: 'Ana' }} onAtualizado={() => {}} onClose={() => {}} />);
    fireEvent.click(await screen.findByText('Registrar resultado do contato'));
    fireEvent.click(await screen.findByText('Atendeu — pediu retorno')); await new Promise(r => setTimeout(r, 80));
    expect(calls.invoke.length).toBe(0); expect(screen.getByText('Retorno em')).toBeTruthy();
  });
});
