import { useEffect } from 'react';
import { toast } from 'sonner';

// Arrastar e soltar em TODO o portal: qualquer área de anexo que use um <input type="file"> (escondido atrás
// de um botão/label) passa a aceitar o arquivo arrastado. O arquivo é entregue ao próprio input, que dispara
// o mesmo onChange do clique — a validação e o upload continuam os de cada tela.
// Áreas que já tratam o drop por conta própria (chamam preventDefault no onDrop) não são afetadas.

const CLASSE = 'vx-drop-alvo';
const MAX_SUBIDA = 6;

function temArquivos(e) {
  const tipos = e.dataTransfer?.types;
  return !!tipos && Array.from(tipos).includes('Files');
}

// Sobe a partir do elemento sob o cursor até achar um bloco com UM único input de arquivo habilitado.
function alvoDoDrop(el) {
  let n = el instanceof Element ? el : el?.parentElement;
  for (let i = 0; n && i < MAX_SUBIDA && n !== document.body; i++, n = n.parentElement) {
    if (n.matches?.('input[type="file"]')) return n.disabled ? null : { caixa: n.closest('label') || n.parentElement || n, input: n };
    const inputs = n.querySelectorAll?.('input[type="file"]');
    if (inputs && inputs.length === 1) return inputs[0].disabled ? null : { caixa: n, input: inputs[0] };
    if (inputs && inputs.length > 1) return null;
  }
  return null;
}

function aceita(arquivo, accept) {
  if (!accept) return true;
  const nome = (arquivo.name || '').toLowerCase();
  return accept.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(a =>
    a.startsWith('.') ? nome.endsWith(a)
      : a.endsWith('/*') ? (arquivo.type || '').startsWith(a.slice(0, -1))
        : arquivo.type === a || (a === 'application/pdf' && nome.endsWith('.pdf')));
}

export function ArrastarArquivosGlobal() {
  useEffect(() => {
    let atual = null;
    const limpar = () => { if (atual) { atual.classList.remove(CLASSE); atual = null; } };
    const marcar = (caixa) => { if (atual === caixa) return; limpar(); if (caixa) { caixa.classList.add(CLASSE); atual = caixa; } };

    const onOver = (e) => {
      if (!temArquivos(e)) return;
      // Sempre impede o navegador de abrir o arquivo numa aba nova se ele cair fora de uma área de anexo.
      e.preventDefault();
      if (e.defaultPrevented && e.__vxProprio) return;
      const alvo = alvoDoDrop(e.target);
      e.dataTransfer.dropEffect = alvo ? 'copy' : 'none';
      marcar(alvo?.caixa || null);
    };
    const onLeave = (e) => { if (!e.relatedTarget) limpar(); };
    const onDrop = (e) => {
      if (!temArquivos(e)) return;
      const jaTratado = e.defaultPrevented; // a própria tela tratou o drop (ex.: áreas com onDrop)
      e.preventDefault();
      limpar();
      if (jaTratado) return;
      const alvo = alvoDoDrop(e.target);
      if (!alvo) return;
      const { input } = alvo;
      const lista = Array.from(e.dataTransfer.files || []);
      if (!lista.length) return;
      const arquivos = input.multiple ? lista : lista.slice(0, 1);
      const recusados = arquivos.filter(f => !aceita(f, input.accept));
      if (recusados.length === arquivos.length) {
        toast.error(`Formato não aceito aqui${input.accept ? ` (${input.accept.replace(/,/g, ', ')})` : ''}.`);
        return;
      }
      const dt = new DataTransfer();
      arquivos.filter(f => aceita(f, input.accept)).forEach(f => dt.items.add(f));
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (recusados.length) toast.warning(`${recusados.length} arquivo(s) ignorado(s) por formato não aceito.`);
    };
    const onEnd = () => limpar();

    // Fase de bolha: os onDrop das próprias telas (React) rodam antes e podem marcar defaultPrevented.
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragend', onEnd);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragend', onEnd);
    };
  }, []);
  return null;
}
