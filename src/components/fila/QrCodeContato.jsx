// Helper de QR code — usa serviço público api.qrserver.com (sem dependência npm).
// Gera URL de QR code para um payload (tel: ou https://wa.me/...).

export function qrUrl(payload, size = 140) {
  // QR preto sobre fundo branco — máximo contraste, leitura rápida e visual limpo.
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}&bgcolor=ffffff&color=0d1117&qzone=1`;
}

// Normaliza telefone brasileiro para wa.me (apenas dígitos, com DDI 55).
export function telParaWa(tel) {
  if (!tel) return '';
  const digits = String(tel).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

export function telParaTel(tel) {
  if (!tel) return '';
  const digits = String(tel).replace(/\D/g, '');
  return digits ? `tel:${digits}` : '';
}

export function waLink(tel) {
  const w = telParaWa(tel);
  return w ? `https://wa.me/${w}` : '';
}