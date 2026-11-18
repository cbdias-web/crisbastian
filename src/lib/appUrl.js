// Endereço público do app — usado em todo link compartilhado com o cliente.
// Links enviados ao cliente precisam apontar para o app publicado,
// nunca para o endereço de preview do editor.
export const APP_PUBLICO = 'https://villelaexchange.base44.app';

export function origemPublica() {
  return /preview-/i.test(window.location.origin) ? APP_PUBLICO : window.location.origin;
}

/** Monta o link público completo: linkPublico('/rnc-publica', token) */
export function linkPublico(path, token) {
  if (!token) return '';
  const base = origemPublica();
  const rota = path.startsWith('/') ? path : `/${path}`;
  return `${base}${rota}/${token}`;
}