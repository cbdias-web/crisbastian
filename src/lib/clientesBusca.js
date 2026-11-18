import { base44 } from '@/api/base44Client';
import { listAll } from '@/lib/listAll';

// Busca de clientes direto no servidor.
// A base passa de milhares de registros: listas com limite fixo (ex.: list('nome', 5000))
// escondiam os cadastros novos. Aqui a pesquisa e a contagem rodam no banco.
export const CLIENTES_POR_PAGINA = 60;

function escaparRegex(termo) {
  return termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function filtroClientes({ busca = '', vendedorId = '' } = {}) {
  const filtro = {};
  if (vendedorId) filtro.vendedor_id = vendedorId;
  const termo = (busca || '').trim();
  if (termo) {
    const rx = { $regex: escaparRegex(termo), $options: 'i' };
    filtro.$or = [{ nome: rx }, { cpf_cnpj: rx }, { email: rx }, { telefone: rx }];
  }
  return filtro;
}

export function buscarClientes({ busca = '', vendedorId = '', limite = CLIENTES_POR_PAGINA } = {}) {
  return base44.entities.Cliente.filter(filtroClientes({ busca, vendedorId }), '-created_date', limite);
}

export function contarClientes({ busca = '', vendedorId = '' } = {}) {
  return base44.entities.Cliente.count(filtroClientes({ busca, vendedorId }));
}

// Base completa (usada em exportações e verificações de duplicidade)
export function listarTodosClientes(filtro = {}) {
  return listAll(base44.entities.Cliente, filtro, 'nome');
}