// Valores mínimos de adesão por produto nos formulários de indicação.
// Valores diferentes do mínimo são tratados pela equipe comercial.
export const VALOR_MINIMO_INDICACAO = {
  'CONTA INTERNACIONAL': 10000,
  'OFFSHORE': 100000,
};

export const msgValorMinimo = (produto, min) =>
  `Valor mínimo para ${produto}: R$ ${min.toLocaleString('pt-BR')}. Valores diferentes serão tratados pela equipe comercial.`;