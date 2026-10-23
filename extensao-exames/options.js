// CopyLab © 2026 Vinícius Nathan – MED UVV. Uso livre com atribuição, sem fins comerciais; veja o arquivo LICENSE.
// Proibido remover este aviso e os créditos da interface, vender ou publicar versões modificadas sem autorização por escrito.
document.getElementById('credito').textContent = CREDITO;
const $ = id => document.getElementById(id);
storageGet({ dict: DEFAULT_DICT, sep: DEFAULT_SEP, debug: false, dictVer: 0 }).then(c => { if (c.dictVer !== DICT_VERSION) c.dict = mergeDict(c.dict, DEFAULT_DICT); $('dict').value = c.dict; $('sep').value = c.sep; $('debug').checked = c.debug; });
$('save').onclick = async () => {
  try {
    await storageSet({ dict: $('dict').value, sep: $('sep').value, debug: $('debug').checked, dictVer: DICT_VERSION });
    $('msg').textContent = 'Salvo.';
  } catch (e) { $('msg').textContent = 'Erro ao salvar: ' + e.message; }
};
$('reset').onclick = () => { $('dict').value = DEFAULT_DICT; $('sep').value = DEFAULT_SEP; $('msg').textContent = 'Padrão restaurado (clique em Salvar).'; };
