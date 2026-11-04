// Helper de QR code — geração 100% LOCAL (sem enviar telefone/dados a serviços externos).
// Gera um SVG (data URI) para um payload (tel: ou https://wa.me/...).
import QRCode from 'qrcode';
import { numeroDiscagem } from '@/lib/operadora';

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

export function telParaTel(tel, operadora) {
  if (!tel) return '';
  let d = String(tel).replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  // Celular no formato antigo (DDD + 8 dígitos começando em 6-9): a operadora exige o 9 na frente
  if (d.length === 10 && '6789'.includes(d[2])) d = d.slice(0, 2) + '9' + d.slice(2);
  if (d.length !== 10 && d.length !== 11) return `tel:${d}`;
  // Com a operadora do gerente, disca com o código dela na frente (ligação sem custo)
  const comCodigo = numeroDiscagem(d, operadora);
  return comCodigo ? `tel:${comCodigo}` : `tel:+55${d}`;
}

export function waLink(tel, texto) {
  const w = telParaWa(tel);
  if (!w) return '';
  return texto ? `https://wa.me/${w}?text=${encodeURIComponent(texto)}` : `https://wa.me/${w}`;
}