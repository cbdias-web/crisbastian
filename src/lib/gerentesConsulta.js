import { normNome } from '@/lib/nomes';

// Cadastros que NÃO são gerentes de negócios (ex.: administradores) e que não devem
// aparecer nas listas de consulta/menus de gerentes da plataforma.
const EMAILS_EXCLUIDOS = ['cris.morais@grupovillela.com'];
const NOMES_EXCLUIDOS = ['cris.morais'];

export function ehGerenteConsulta(registro = {}) {
  const email = (registro.email || '').trim().toLowerCase();
  const nome = normNome(registro.nome || registro.vendedor_nome || registro.assessor_comercial);
  return !EMAILS_EXCLUIDOS.includes(email) && !NOMES_EXCLUIDOS.map(normNome).includes(nome);
}

export function filtrarGerentesConsulta(lista = []) {
  return (lista || []).filter(ehGerenteConsulta);
}