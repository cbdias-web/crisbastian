import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { listAll } from '../../shared/listAll.ts';

// IMPORTAÇÃO ÚNICA (temporária): lê um arquivo de leads CRIPTOGRAFADO (AES-256-GCM) a partir de uma URL,
// decifra com a chave guardada no segredo IMPORT_KEY e grava os leads em lotes. Retomável e idempotente
// (pula leads do lote cujo id_externo já existe). Sem a chave, o arquivo público é ilegível.
// Args: { url, lote_nome, total_esperado? }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e: any) {
      if (i < tries - 1) await sleep(800 * 2 ** i); else throw e;
    }
  }
  throw new Error('retry esgotado');
}
const b64 = (s: string) => Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0));

Deno.serve(async (req) => {
  const t0 = Date.now(); const BUDGET = 40000;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin' && !user.permissao_admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });
    const body = await req.json().catch(() => ({})) || {};
    const keyB64 = Deno.env.get('IMPORT_KEY');
    if (!keyB64) return Response.json({ error: 'IMPORT_KEY ausente' }, { status: 400 });
    if (!body.url || !body.lote_nome) return Response.json({ error: 'url e lote_nome são obrigatórios' }, { status: 400 });
    const sr = base44.asServiceRole.entities;

    // 1) baixa, decifra e descompacta
    const blob = b64(await (await fetch(body.url)).text());
    const key = await crypto.subtle.importKey('raw', b64(keyB64), 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.slice(0, 12), additionalData: new TextEncoder().encode('villela-import') }, key, blob.slice(12));
    const ds = new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip')));
    const leads: any[] = JSON.parse(await ds.text());

    // 2) lote (cria uma vez; liberação fica PAUSADA até terminar a importação)
    let lote = (await sr.LoteLead.filter({ nome: body.lote_nome }, '-created_date', 1))[0];
    if (!lote) lote = await sr.LoteLead.create({ nome: body.lote_nome, total: leads.length, status: 'em_liberacao', liberacao: 'automatica', liberados: 0, pausado: true });

    // 3) o que já foi importado neste lote
    const ja = new Set((await listAll(sr.Lead, { lote_id: lote.id }, '-created_date')).map((l: any) => l.id_externo).filter(Boolean));
    const pendentes = leads.filter((l) => !ja.has(String(l.id_externo)));

    let gravados = 0;
    for (let i = 0; i < pendentes.length; i += 100) {
      if (Date.now() - t0 > BUDGET) break;
      const chunk = pendentes.slice(i, i + 100).map((l) => ({ ...l, lote_id: lote.id, lote_nome: lote.nome }));
      await withRetry(() => sr.Lead.bulkCreate(chunk));
      gravados += chunk.length;
    }
    const restantes = pendentes.length - gravados;
    if (restantes === 0) await sr.LoteLead.update(lote.id, { total: leads.length, pausado: false });
    return Response.json({ success: true, total_arquivo: leads.length, ja_importados: ja.size, gravados_nesta_execucao: gravados, restantes, concluido: restantes === 0, lote_id: lote.id });
  } catch (error: any) {
    console.error('importarLeadsCriptografado:', error?.message);
    return Response.json({ error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
});
