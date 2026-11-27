import { montarPdfProposta } from '../base44/shared/propostaPdf.ts';
const p = JSON.parse(await Deno.readTextFile(new URL('./edp.json', import.meta.url)));
const bytes = montarPdfProposta(p, { full_name: 'Cris Bastian', email: 'x@y' }, undefined, null);
await Deno.writeFile(new URL('./edp.pdf', import.meta.url), bytes);
console.log('ok', bytes.length);
