import { vi } from 'vitest';
export const calls = { invoke: [], creates: {}, updates: {} };
export const tables = {};
const ent = (name) => ({
  filter: vi.fn(async () => tables[name] || []), list: vi.fn(async () => tables[name] || []), get: vi.fn(async (id) => (tables[name] || []).find(x => x.id === id) || null),
  create: vi.fn(async (o) => { (calls.creates[name] = calls.creates[name] || []).push(o); return { id: 'n', ...o }; }),
  update: vi.fn(async (id, p) => { (calls.updates[name] = calls.updates[name] || []).push({ id, p }); return {}; }), delete: vi.fn(async () => ({})), subscribe: vi.fn(() => () => {}),
});
export const base44 = {
  auth: { me: vi.fn(async () => ({ id: 'u', email: 'a@x', role: 'user' })) },
  entities: new Proxy({}, { get: (t, n) => (t[n] = t[n] || ent(n)) }),
  functions: { invoke: vi.fn(async (fn, body) => { calls.invoke.push({ fn, body }); return { data: { success: true } }; }) },
  integrations: { Core: { InvokeLLM: vi.fn(async () => ({})) } },
};
