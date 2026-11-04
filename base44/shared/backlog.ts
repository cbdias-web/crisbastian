import { listAll } from './listAll.ts';

// Itens "abertos" (ainda sem tratamento) de um gerente: fila pendente + retornos vencidos.
// É o que define se ele tem capacidade para receber novos leads.
export async function calcularBacklog(sr: any, vendedorId: string, hoje: string): Promise<number> {
  const pend = await listAll(sr.FilaContato, { vendedor_id: vendedorId, status: 'pendente' }, '-created_date');
  const ret = await listAll(sr.FilaContato, { vendedor_id: vendedorId, status: 'atendeu', proximo_contato: { $lte: hoje } }, 'proximo_contato');
  return pend.length + ret.length;
}

export const NOMES_EXCLUIDOS_LIBERACAO = ['cris bastian', 'cris.bastian', 'crisbastian'];
export const excluido = (v: any) => {
  const nome = String(v.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const email = String(v.email || '').toLowerCase();
  return NOMES_EXCLUIDOS_LIBERACAO.some((n) => nome.includes(n) || email.includes(n));
};
