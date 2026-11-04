import { vi } from 'vitest';
// jsdom: File.arrayBuffer / matchMedia / scrollTo / Notification
if (!File.prototype.arrayBuffer) File.prototype.arrayBuffer = function () { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(this); }); };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.HTMLElement.prototype.scrollIntoView = vi.fn();
