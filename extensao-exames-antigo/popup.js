// CopyLab © 2026 Vinícius Nathan – MED UVV. Uso livre com atribuição, sem fins comerciais; veja o arquivo LICENSE.
// Proibido remover este aviso e os créditos da interface, vender ou publicar versões modificadas sem autorização por escrito.
let pdfjsLib; // carregado sob demanda (se falhar, mostramos o motivo e liberamos o modo "colar texto")

const $ = id => document.getElementById(id);
const chromiumMajor = () => { const m = navigator.userAgent.match(/Chrome\/(\d+)/); return m ? +m[1] : 0; };
const browserInfo = () => 'Chromium ' + (chromiumMajor() || '?');
const setStatus = (t, cls) => { $('status').textContent = t; $('status').className = cls || ''; };
const getCfg = () => storageGet({ dict: DEFAULT_DICT, sep: DEFAULT_SEP, debug: false });

$('credito').textContent = CREDITO;
$('opts').onclick = e => { e.preventDefault(); chrome.runtime.openOptionsPage(); };
$('copy').onclick = async () => { await copyText($('out').value); setStatus('Copiado!', 'ok'); };
$('pastelink').onclick = e => { e.preventDefault(); showPaste(); };

function showPaste() { $('pastebox').hidden = false; $('paste').focus(); }

// Lê as linhas (de um PDF ou do texto colado), interpreta, mostra e copia o resultado
async function showResults(lines, cfg) {
  if (cfg.debug) { $('raw').textContent = lines.join('\n'); $('rawbox').hidden = false; } // oculto por padrão (contém dados do paciente)
  if (!lines.length) throw new Error('Nenhum texto encontrado (PDF escaneado/imagem?).');
  const results = parseResults(lines, parseDict(cfg.dict));
  if (!results.length) throw new Error('Nenhum exame reconhecido neste texto.');
  $('src').textContent = results.map(r => r.abbr.toUpperCase() + ' ' + r.value + '   <-  ' + (r.src || '').slice(0, 110)).join('\n');
  const text = formatOutput(results, cfg.sep, extractDate(lines));
  $('out').value = text;
  await copyText(text);
  setStatus('Copiado: ' + results.length + ' resultados. Confira antes de colar.', 'ok');
}

// Modo alternativo: texto copiado do PDF (Ctrl+A, Ctrl+C) e colado aqui — funciona em qualquer navegador
async function fromPaste() {
  try {
    const lines = $('paste').value.split(/\r?\n/).map(l => l.replace(/[\u00a0\t]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    await showResults(lines, await getCfg());
  } catch (e) {
    setStatus(e && e.message ? e.message : String(e), 'err');
  }
}
$('paste').addEventListener('paste', () => setTimeout(fromPaste, 50));
$('convert').onclick = fromPaste;

(async function main() {
  try {
    setStatus('Carregando leitor de PDF…');
    try {
      pdfjsLib = await import('./lib/pdf.min.mjs');
      window.pdfjsLib = pdfjsLib; // usado por common.js
    } catch (e) {
      throw new Error('O leitor de PDF não carregou neste navegador (' + browserInfo() + '). Use a alternativa abaixo.'
        + ' Detalhe: ' + (e && e.message ? e.message : e));
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.mjs';
    setStatus('Lendo o exame…');
    const [tab] = await tabsQuery({ active: true, currentWindow: true });
    if (!tab || !tab.url) throw new Error('Não consegui identificar a aba atual.');

    const proto = tab.url.split(':')[0].toLowerCase();
    if (!['http', 'https', 'file'].includes(proto))
      throw new Error('O navegador abriu este PDF em um visualizador próprio (endereço do tipo "' + proto + ':"). Use a alternativa abaixo.');
    let resp;
    try {
      resp = await fetch(tab.url, { credentials: 'include' });
    } catch (e) {
      throw new Error(proto === 'file'
        ? 'Não consegui abrir o arquivo local. Em Extensões > CopyLab > Detalhes, ative "Permitir acesso a URLs de arquivo" e recarregue a aba — ou use a alternativa abaixo.'
        : 'Não consegui baixar o PDF desta aba (' + (e && e.message ? e.message : 'erro de rede') + '). Use a alternativa abaixo.');
    }
    if (!resp.ok) throw new Error('Não consegui baixar o PDF (HTTP ' + resp.status + '). Use a alternativa abaixo.');
    const buf = await resp.arrayBuffer();
    if (new TextDecoder().decode(buf.slice(0, 5)) !== '%PDF-')
      throw new Error('A aba atual não é um PDF direto. Abra o laudo em uma aba própria ou use a alternativa abaixo.');

    await showResults(await extractLines(buf), await getCfg());
  } catch (e) {
    setStatus(e && e.message ? e.message : String(e), 'err');
    showPaste(); // sempre que algo falhar, oferece o modo "colar texto"
  }
})();

window.addEventListener('unhandledrejection', ev => { setStatus('Erro: ' + (ev.reason && ev.reason.message ? ev.reason.message : ev.reason) + ' (' + browserInfo() + ')', 'err'); showPaste(); });
window.addEventListener('error', ev => { setStatus('Erro: ' + ev.message + ' (' + browserInfo() + ')', 'err'); showPaste(); });
