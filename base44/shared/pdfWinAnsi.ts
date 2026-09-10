// Sanitiza texto para as fontes padrão do pdf-lib (WinAnsi / cp1252).
// Dados enviados pelos formulários públicos chegam em Unicode decomposto
// (NFD) — ex.: "C" + cedilha combinante (U+0327) em "ALTERAC\u0327A\u0303O" —
// e podem conter quebras de linha. A Helvetica padrão do PDF não consegue
// codificar esses caracteres combinantes, o que quebra a geração do PDF
// (erro 500). Toda string desenhada no PDF deve passar por winAnsi().
const CP1252_EXTRA = new Set(
  '\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152' +
  '\u0161\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A' +
  '\u0153\u017E\u0178'.split('')
);

export function winAnsi(s: any): string {
  return String(s ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .normalize('NFC')
    .split('')
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code <= 0xFF) return ch;
      if (CP1252_EXTRA.has(ch)) return ch;
      return '';
    })
    .join('');
}