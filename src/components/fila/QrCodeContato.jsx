// Helper de QR code — geração 100% LOCAL (sem enviar telefone/dados a serviços externos).
// Gera um SVG (data URI) para um payload (tel: ou https://wa.me/...).
import QRCode from 'qrcode';

const cache = new Map();

export function qrUrl(payload, size = 140) {
  const texto = String(payload || ' ');
  const key = `${texto}|${size}`;
  if (cache.has(key)) return cache.get(key);
  let uri = '';
  try {
    const qr = QRCode.create(texto, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const data = qr.modules.data;
    const quiet = 2;
    const total = n + quiet * 2;
    let path = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (data[y * n + x]) path += `M${x + quiet},${y + quiet}h1v1h-1z`;
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${path}" fill="#0d1117"/></svg>`;
    uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch (e) { uri = ''; }
  if (cache.size > 300) cache.clear();
  cache.set(key, uri);
  return uri;
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
  if (!digits) return '';
  const completo = digits.startsWith('55') && digits.length >= 12 ? digits : (digits.length >= 10 && digits.length <= 11 ? `55${digits}` : digits);
  return `tel:+${completo}`;
}

export function waLink(tel, texto) {
  const w = telParaWa(tel);
  if (!w) return '';
  return texto ? `https://wa.me/${w}?text=${encodeURIComponent(texto)}` : `https://wa.me/${w}`;
}
