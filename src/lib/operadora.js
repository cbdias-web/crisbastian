// Código de seleção de prestadora (CSP) por operadora.
// Discando com o código na frente da chamada, a ligação sai pela própria
// operadora do gerente — é a regra que evita custo extra de telefonia.
export const CODIGO_OPERADORA = {
  Vivo: '15',
  Claro: '21',
  TIM: '41',
  Oi: '31',
};

export function codigoOperadora(operadora) {
  return CODIGO_OPERADORA[operadora] || '';
}

// Número no formato nacional de discagem: 0 + código da operadora + DDD + número.
// Ex.: Claro, (51) 99999-8888 -> 02151999998888
export function numeroDiscagem(tel, operadora) {
  const codigo = codigoOperadora(operadora);
  if (!codigo) return '';
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 10 && '6789'.includes(d[2])) d = d.slice(0, 2) + '9' + d.slice(2);
  if (d.length !== 10 && d.length !== 11) return '';
  return `0${codigo}${d}`;
}