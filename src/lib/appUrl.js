// Endereço público do app — usado em todo link compartilhado com o cliente.
// Links enviados ao cliente precisam apontar para o app publicado,
// nunca para o endereço de preview do editor.
export const APP_PUBLICO = 'https://villelaexchange.base44.app';

// Todo link enviado ao cliente usa SEMPRE o app publicado, independente do
// ambiente em que o colaborador está trabalhando (editor, preview ou app).
export function origemPublica() {
  return APP_PUBLICO;
}

/** Monta o link público completo: linkPublico('/rnc-publica', token) */
export function linkPublico(path, token) {
  if (!token) return '';
  const base = origemPublica();
  const rota = path.startsWith('/') ? path : `/${path}`;
  return `${base}${rota}/${token}`;
}