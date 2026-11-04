import { vi } from 'vitest';
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.HTMLElement.prototype.scrollIntoView = vi.fn();
