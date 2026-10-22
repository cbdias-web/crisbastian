import React from 'react';
import { maskCPF, maskCNPJ, maskCpfCnpj, maskCEP, maskTelefone } from '@/lib/mascaras';

const MASCARAS = {
  cpf: { fn: maskCPF, placeholder: '000.000.000-00', maxLength: 14 },
  cnpj: { fn: maskCNPJ, placeholder: '00.000.000/0000-00', maxLength: 18 },
  cpfcnpj: { fn: maskCpfCnpj, placeholder: 'CPF ou CNPJ', maxLength: 18 },
  cep: { fn: maskCEP, placeholder: '00000-000', maxLength: 9 },
  telefone: { fn: maskTelefone, placeholder: '(00) 00000-0000', maxLength: 19 },
};

/**
 * Input com máscara brasileira.
 * tipo: 'cpf' | 'cnpj' | 'cpfcnpj' | 'cep' | 'telefone'
 * Funciona com os mesmos handlers onChange(e) já usados nos formulários:
 * o valor do evento (e.target.value) já chega formatado.
 */
export default function CampoMascara({ tipo, value, onChange, placeholder, ...rest }) {
  const cfg = MASCARAS[tipo];

  const handleChange = (e) => {
    const formatado = cfg.fn(e.target.value);
    // Reaproveita o próprio evento: os handlers existentes leem e.target.value
    e.target.value = formatado;
    onChange?.(e);
  };

  return (
    <input
      type="text"
      inputMode={tipo === 'telefone' || tipo === 'cep' ? 'tel' : 'numeric'}
      value={cfg.fn(value || '')}
      onChange={handleChange}
      placeholder={placeholder ?? cfg.placeholder}
      maxLength={cfg.maxLength}
      {...rest}
    />
  );
}