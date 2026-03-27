const KEY = 'impersonated_vendedor';

export function getImpersonatedVendedor() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setImpersonatedVendedor(vendedor) {
  if (vendedor) {
    sessionStorage.setItem(KEY, JSON.stringify(vendedor));
  } else {
    sessionStorage.removeItem(KEY);
  }
  window.dispatchEvent(new Event('impersonation-change'));
}

export function clearImpersonation() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event('impersonation-change'));
}