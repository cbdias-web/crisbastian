export const TIPOS_CONTRATO = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'termo_adiantado', label: 'Termo Adiantado' },
  { value: 'parcelamento', label: 'Parcelamento' },
];

export const labelTipoContrato = (tipo) =>
  TIPOS_CONTRATO.find(t => t.value === tipo)?.label || 'Contrato';