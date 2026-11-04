import { vi } from 'vitest';
export const calls = { bulk: [], creates: {}, updates: {}, invoke: [], filters: [] };
export const tables = {};
const ent = (name) => ({
  filter: vi.fn(async (q, sort, limit, skip) => { calls.filters.push({ name, q, sort, limit, skip }); return (tables[name] || []).filter(() => true).slice(skip || 0, (skip || 0) + (limit || 50)); }),
  list: vi.fn(async () => tables[name] || []),
  get: vi.fn(async (id) => (tables[name] || []).find(x => x.id === id) || null),
  create: vi.fn(async (o) => { (calls.creates[name] = calls.creates[name] || []).push(o); return { id: `${name}_${(calls.creates[name]).length}`, ...o }; }),
  update: vi.fn(async (id, p) => { (calls.updates[name] = calls.updates[name] || []).push({ id, p }); return {}; }),
  bulkCreate: vi.fn(async (arr) => { calls.bulk.push(...arr); return arr; }),
  delete: vi.fn(async () => ({})),
  subscribe: vi.fn(() => () => {}),
});
export const base44 = {
  auth: { me: vi.fn(async () => ({ id: 'u1', email: 'adm@x', role: 'admin' })), redirectToLogin: vi.fn() },
  entities: new Proxy({}, { get: (t, name) => (t[name] = t[name] || ent(name)) }),
  functions: { invoke: vi.fn(async (fn, body) => { calls.invoke.push({ fn, body }); return { data: { success: true } }; }) },
  integrations: { Core: { InvokeLLM: vi.fn(async () => ({ resumo: 'Resumo', sentimento: 'positivo', proximo_passo: 'Enviar proposta', dias_uteis_ate_retorno: 2 })) } },
};
