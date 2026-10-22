import React from 'react';
import { formatarMoeda, digitosParaNumero } from '@/lib/mascaras';

/**
 * Campo de valor em Real (padrão brasileiro).
 * - Começa em 0,00 e os dígitos digitados entram pelos centavos: 3 5 0 0 0 0 -> 3.500,00
 * - Aceita valores grandes sem travar (R$ 3.500,00, R$ 1.250.000,00...).
 * - `value`  : número ou string numérica ("3500.5") — mesmo formato salvo hoje no banco.
 * - `onChange`: recebe o NÚMERO (ou '' quando vazio e allowEmpty).
 *   Para manter compatibilidade com estados que guardam string, use `asString`.
 */
export default function CampoMoeda({
  value,
  onChange,
  asString = false,
  allowEmpty = true,
  prefixo = 'R$',
  className = '',
  style,
  placeholder = '0,00',
  disabled,
  ...rest
}) {
  const vazio = value === '' || value === null || value === undefined;
  const exibido = vazio ? '' : formatarMoeda(value);

  const handleChange = (e) => {
    const texto = e.target.value;
    const soDigitos = texto.replace(/\D/g, '');
    if (!soDigitos || /^0+$/.test(soDigitos)) {
      onChange(allowEmpty ? (asString ? '' : '') : (asString ? '0' : 0));
      return;
    }
    const n = digitosParaNumero(texto);
    onChange(asString ? String(n) : n);
  };

  const handleFocus = (e) => {
    // Cursor sempre no final
    const el = e.target;
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  };

  return (
    <div className="relative">
      {prefixo && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold opacity-60 pointer-events-none">
          {prefixo}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={exibido}
        onChange={handleChange}
        onFocus={handleFocus}
        onClick={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={{ ...(prefixo ? { paddingLeft: '2.4rem' } : {}), ...style }}
        {...rest}
      />
    </div>
  );
}