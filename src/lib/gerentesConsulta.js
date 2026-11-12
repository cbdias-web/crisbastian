// Cadastros que NÃO são gerentes de negócios (ex.: administradores) e que não devem
// aparecer nas listas de consulta/menus de gerentes da plataforma.
const EMAILS_EXCLUIDOS = ['cris.morais@grupovillela.com'];
const NOMES_EXCLUIDOS = ['cris.morais'];

export function ehGerenteConsulta(registro = {}) {
  const email = (registro.email || '').trim().toLowerCase();
  const nome = (registro.nome || registro.vendedor_nome || registro.assessor_comercial || '')
    .trim()
    .toLowerCase();
  return !EMAILS_EXCLUIDOS.includes(email) && !NOMES_EXCLUIDOS.includes(nome);
}

export function filtrarGerentesConsulta(lista = []) {
  return (lista || []).filter(ehGerenteConsulta);
}