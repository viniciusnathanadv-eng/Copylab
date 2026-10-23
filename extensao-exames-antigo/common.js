// CopyLab © 2026 Vinícius Nathan – MED UVV. Uso livre com atribuição, sem fins comerciais; veja o arquivo LICENSE.
// Proibido remover este aviso e os créditos da interface, vender ou publicar versões modificadas sem autorização por escrito.
// ============ Crédito (troque pelo seu nome) ============
const CREDITO = 'Criado por Vinícius Nathan – MED UVV';

// ============ Dicionário padrão ============
// Formato: ABREVIAÇÃO = nome1 | nome2 | ...
// O mesmo nome serve para o título do exame ("GLICOSE - JEJUM") e para rótulos
// dentro de exames com vários resultados (hemograma, perfil lipídico).
// "@multi" lista os exames com vários resultados, lidos linha a linha.
const DEFAULT_DICT = `@multi = Hemograma | Perfil Lipídico | Bilirrubinas | Gasometria | Coagulograma
@urina = Urina Rotina | Urina Tipo 1 | Urina Tipo I | EAS | Sumário de Urina
@urocultura = Urocultura
@parasito = Parasitológico | Parasitológico de Fezes | EPF
Hm = Hemácias
Hb = Hemoglobina
Ht = Hematócrito
VCM = VCM | M.C.V
HCM = HCM | M.C.H
CHCM = CHCM | M.C.H.C
RDW = RDW
Leuco = Leucócitos - Global | Leucócitos Totais | Leucócitos
Bast = Neutrófilos Bastonetes | Bastonetes
Seg = Neutrófilos Segmentados | Segmentados
Linf = Linfócitos
Mono = Monócitos
Eos = Eosinófilos
Baso = Basófilos
Plaq = Plaquetas | Contagem de Plaquetas
Blast = Blastos
Prom = Promielócitos
Mielo = Mielócitos
Meta = Metamielócitos
Glic = Glicose | Glicemia
HbA1c = Hemoglobina Glicada
GME = Glicemia Média Estimada
Ur = Ureia | Uréia
Cr = Creatinina
TFG = Ritmo de Filtração Glomerular | Taxa de Filtração Glomerular
AcUr = Ácido Úrico
Na = Sódio
K = Potássio
Cl = Cloro
Mg = Magnésio
Ca = Cálcio
P = Fósforo
TGO = Transaminase Oxalacética | TGO | AST
TGP = Transaminase Pirúvica | TGP | ALT
GGT = Gama GT | GGT | Gama Glutamil Transferase
FA = Fosfatase Alcalina
BT = Bilirrubina Total
BD = Bilirrubina Direta
BI = Bilirrubina Indireta
Alb = Albumina
PCR = Proteína C Reativa | PCR
VHS = VHS
CPK = CPK | Creatina Fosfoquinase | Creatina Quinase | Creatinofosfoquinase
CKMB = Creatina Quinase - CKMB | CK-MB | CKMB
bHCG = Beta H.C.G | Beta HCG | HCG
Amil = Amilase
Lip = Lipase
CT = Colesterol Total
HDL = Colesterol HDL
VLDL = Colesterol VLDL
LDL = Colesterol LDL
nHDL = Colesterol Não-HDL
TG = Triglicerídeos | Triglicérides
TSH = TSH
T4T = T4 Total
T4L = T4 Livre
Ferr = Ferritina
Fe = Ferro Sérico | Ferro
Ins = Insulina Basal | Insulina
Testo = Testosterona Total
TestoL = Testosterona Livre
FSH = Hormônio Folículo Estimulante | FSH
LH = Hormônio Luteinizante | LH
PRL = Prolactina
E2 = Estradiol
Prog = Progesterona
Cort = Cortisol
PTH = Paratormônio | PTH
T3 = T3 Total
T3L = T3 Livre
B12 = Vitamina B12
VitD = 25-Hidroxivitamina D | Vitamina D
VitC = Vitamina C
VitA = Vitamina A
SOF = Sangue Oculto
CaI = Cálcio Iônico
Lac = Lactato
pH = pH
PCO2 = pCO2
PO2 = pO2
CO2T = CO2 Total
HCO3 = HCO3 | Bicarbonato
SatO2 = Saturação de O2
BE = Base Excess
TAP = Tempo de Protrombina - TAP | Tempo de Protrombina
AP = Resultado da atividade
INR = Razão Normalizada Internacional - RNI | RNI | INR
TTPA = Tempo de Tromboplastina - TTPA | Tempo de Tromboplastina | TTPA`;

const DEFAULT_SEP = ' | ';

function parseDict(text) {
  const entries = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const abbr = line.slice(0, i).trim();
    const names = line.slice(i + 1).split('|').map(s => s.trim()).filter(Boolean);
    if (abbr && names.length) entries.push({ abbr, names });
  }
  return entries;
}

// ============ Leitura do PDF ============
async function extractLines(buf) {
  const pdf = await pdfjsLib.getDocument({ data: buf, isEvalSupported: false }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const rows = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      if (Math.abs(it.transform[1]) > 0.1) continue; // ignora texto girado (margem lateral)
      const x = it.transform[4], y = it.transform[5];
      let row = rows.find(r => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, items: [] }; rows.push(row); }
      row.items.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      lines.push(r.items.map(i => i.s).join(' ').replace(/\s+/g, ' ').trim());
    }
  }
  return lines;
}

// ============ Interpretação ============
// "Esqueleto" do texto: só letras/números minúsculos. Dois modos, para tolerar
// acento removido OU caractere de acento corrompido no PDF.
function skel(s, mode) {
  let sk = '';
  const idx = [];
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (mode === 'strip') c = c.normalize('NFD')[0];
    c = c.toLowerCase();
    if (/[a-z0-9]/.test(c)) { sk += c; idx.push(i); }
  }
  return { sk, idx };
}

function buildAliases(entries) {
  const list = [];
  for (const e of entries) for (const n of e.names) {
    const strip = skel(n, 'strip').sk, drop = skel(n, 'drop').sk;
    if (strip) list.push({ abbr: e.abbr, strip, drop });
  }
  return list.sort((a, b) => b.strip.length - a.strip.length); // nomes mais longos primeiro
}

// Procura um nome do dicionário no INÍCIO do texto
function findAlias(text, aliases) {
  const S = skel(text, 'strip'), D = skel(text, 'drop');
  for (const a of aliases) {
    for (const [sk, key] of [[S, 'strip'], [D, 'drop']]) {
      const al = a[key];
      if (al && sk.sk.startsWith(al)) {
        const end = sk.idx[al.length - 1] + 1;
        if (!/[\p{L}\p{N}]/u.test(text.charAt(end) || ' ')) return { abbr: a.abbr, end };
      }
    }
  }
  return null;
}

const NUM = String.raw`(?<![A-Za-z\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(\s*%)?`;
function numbersIn(text) {
  const re = new RegExp(NUM, 'g'), out = [];
  let m;
  while ((m = re.exec(text))) {
    const neg = text[m.index - 1] === '-' && (m.index < 2 || /[\s.…:]/.test(text[m.index - 2]));
    out.push({ raw: m[1], pct: !!m[2], neg, index: m.index, len: m[0].length });
  }
  return out;
}

function cleanNumber(tok) {
  // vírgula = decimal: "8,5" -> "8.5"; "1.234,5" -> "1234.5". Só pontos ("7.200") ficam como no laudo.
  return tok.includes(',') ? tok.replace(/\./g, '').replace(',', '.') : tok;
}

function resultValue(rest) {
  const nums = numbersIn(rest);
  let n = null;
  for (let k = 0; k < nums.length; k++) {
    const x = nums[k];
    const before = rest.slice(0, x.index), after = rest.slice(x.index + x.len);
    if (/(^|\s)(ate|até)\s*$/i.test(before)) continue;                       // "até 5,0" = referência
    if (/^\s*(a|à|-|–)\s*[<>]?\s*\d/i.test(after)) { k++; continue; }        // "10,0 a 50,0" = faixa de referência
    n = x; break;
  }
  if (n) {
    const before = rest.slice(0, n.index);
    let pre = '';
    const m1 = before.match(/([<>]=?)\s*$/);
    if (m1) pre = m1[1];
    else if (/(superior a|maior que|acima de|maior ou igual a)\s*$/i.test(before)) pre = '>';
    else if (/(inferior a|menor que|abaixo de)\s*$/i.test(before)) pre = '<';
    return pre + (n.neg ? '-' : '') + cleanNumber(n.raw);
  }
  const m = rest.trim().match(/^(n[aã]o\s+reagente|n[aã]o\s+detectad[oa]|reagente|detectad[oa]|negativo|positivo|ausente|presente)/i);
  return m ? m[1].toLowerCase() : null;
}

const DIFF = new Set(['Bast', 'Seg', 'Linf', 'Mono', 'Eos', 'Baso', 'Blast', 'Prom', 'Mielo', 'Meta']);
const IMMATURE = new Set(['Blast', 'Prom', 'Mielo', 'Meta']); // omitidos quando zerados
const KEEPPCT = new Set(['AP', 'SatO2']); // mantêm o símbolo %

function parseMulti(lines, aliases, push, colonOptional = false) {
  let prev = false; // dentro da seção "Resultado anterior" (não é o resultado atual)
  function handleSeg(seg, src) {
    seg = seg.replace(/^\s*resultado\s*:\s*/i, '').replace(/^[\s\-–]+/, '');
    let a = findAlias(seg, aliases);
    const tempo = seg.match(/^\s*tempo(?=\s*[.…]{2,})/i); // coagulograma: "Tempo........ 15,40" = TAP
    if (!a && tempo) a = { abbr: 'TAP', end: tempo[0].length };
    if (!a) return;
    // Colunas: "rótulo : valor" | "rótulo valor" | "rótulo........ valor"
    const m = seg.slice(a.end).match(colonOptional ? /^(-?[\s:.…]*)(?=[<>]?-?\s*\d)(.*)$/ : /^(\s*:\s*)(.*)$/);
    if (!m) return;
    if (prev && !/\.\./.test(m[1])) return; // em "Resultado anterior" só vale linha com pontilhado (ex.: contagem de plaquetas)
    const parts = m[2].split(/\s-\s/); // lipídico: dois resultados na mesma linha
    let valStr = parts[0];
    const cut = valStr.search(/[✂|]/);
    if (cut >= 0) valStr = valStr.slice(0, cut);
    valStr = valStr.replace(/(^|\s)(ate|até)(\s|$).*$/i, '$1');
    const vals = [];
    for (const n of numbersIn(valStr)) {
      if (/^\s+(a|à|ate|até)\s/i.test(valStr.slice(n.index + n.len))) break; // início da faixa de referência
      vals.push(n);
    }
    if (vals.length) {
      const nums = vals.slice(0, 2);
      const v = nums.map(n => (n.neg ? '-' : '') + cleanNumber(n.raw));
      const zero = nums.every(n => parseFloat(cleanNumber(n.raw)) === 0);
      if (!(IMMATURE.has(a.abbr) && zero)) {
        const one = (KEEPPCT.has(a.abbr) && vals[0].pct) ? v[0] + '%' : v[0];
        push(a.abbr, (vals.length >= 2 && (vals[0].pct || DIFF.has(a.abbr))) ? `${v[0]}% (${v[1]})` : one, src);
      }
    }
    if (parts.length > 1) handleSeg(parts.slice(1).join(' - '), src);
  }
  for (const line of lines) {
    if (/^\s*resultado\s+anterior/i.test(line)) prev = true;
    handleSeg(line, line);
  }
}

// ============ Exames sem número único: urina rotina, urocultura, parasitológico ============
const URINE_ITEMS = [
  ['DENS', ['Densidade']], ['PH', ['Reação (PH)', 'Reação', 'PH']], ['COR', ['Cor']], ['ASP', ['Aspecto']],
  ['GLIC', ['Glicose']], ['BIL', ['Bilirrubina']], ['CET', ['Corpos Cetônicos', 'Cetona', 'Cetonas']], ['HB', ['Hemoglobina']],
  ['PTN', ['Proteína', 'Proteínas']], ['UROB', ['Urobilinogênio']], ['NIT', ['Nitrito']], ['LE', ['Leucócito Esterase', 'Esterase Leucocitária']],
  ['PIÓC', ['Piócitos']], ['LEUC', ['Leucócitos']], ['CEL EPIT', ['Células Epiteliais']],
  ['EPIT ALTAS', ['Epitélios Vias Altas']], ['EPIT BAIXAS', ['Epitélios Vias Baixas']],
  ['HEM', ['Hemácias']], ['MUCO', ['Muco', 'Filamento de Muco']], ['CIL HIAL', ['Cilindros Hialinos']],
  ['CIL PAT', ['Cilindros Patológicos']], ['CIL', ['Cilindros']], ['CRISTAIS', ['Cristais']], ['FLORA', ['Flora Bacteriana']],
];
const URINE_ALIASES = buildAliases(URINE_ITEMS.map(([abbr, names]) => ({ abbr, names })));
const NORMAL_WORDS = /^(negativos?|ausentes?|ausencia|normal|claro|limpido|amarel[oa]|amareloclaro|citrino|raras?|naoforamobservadosnestaamostra)$/;
const REF_WORDS = /\s+(amarelo|l[ií]mpido|normal|ausentes?|negativo|rara\(s\))\s*$/i;

function numOf(raw) { // "0,06" -> 0.06 ; "25.000" -> 25000
  if (raw.includes(',')) return parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  return /^\d{1,3}(\.\d{3})+$/.test(raw) ? parseFloat(raw.replace(/\./g, '')) : parseFloat(raw);
}

// Urina rotina: DENS e PH sempre; os demais itens só quando alterados (fora do normal / acima do limite do laudo)
function parseUrina(lines, push) {
  const items = [];
  for (const line of lines) {
    const parts = line.split(/[✂|]/);
    let ref = parts.slice(1).join(' ');
    const a = findAlias(parts[0], URINE_ALIASES);
    if (!a) continue;
    const rest = parts[0].slice(a.end).replace(/^\s*\)/, ''); // "REAÇÃO (PH)": o nome termina antes do ")"
    const sep = rest.match(/^[\s.:…]*/)[0];
    if (!/[:.…]/.test(sep)) continue; // exige ":" ou pontilhado depois do nome do item
    let val = rest.slice(sep.length).trim();
    if (!val) continue;
    const mAte = val.match(/(^|\s)(até|ate)\s.*$/i); // referência na mesma linha: "Até 7.000/ml"
    if (mAte) { ref += ' ' + mAte[0]; val = val.slice(0, val.length - mAte[0].length).trim(); }

    if (/^[<>]?\s*-?\d/.test(val)) { // ---- valor numérico
      if (/^</.test(val)) continue; // "< 1,0" = dentro do normal
      const v = resultValue(val);
      if (v === null) continue;
      if (a.abbr === 'DENS') { items.push('DENS ' + v); continue; }
      if (a.abbr === 'PH') { items.push('PH ' + v); continue; }
      const n = numOf(numbersIn(val)[0].raw);
      const lim = ref.match(/(?:<|até|ate|menor que)[^\d]*?(\d[\d.,]*)/i);
      const limit = lim ? numOf(lim[1]) : 0;
      if (n > limit) items.push(a.abbr + ' ' + (/por\s*campo/i.test(val) ? v + '/C' : v));
      continue;
    }
    // ---- valor em texto
    val = val.replace(/\s+(ml|\/ml)\s*$/i, '').trim();
    const stripped = val.replace(REF_WORDS, '').trim();
    if (stripped) val = stripped; // tira a referência que veio colada na mesma linha
    if (NORMAL_WORDS.test(skel(val, 'strip').sk)) continue;
    if (/n[aã]o\s+se\s+aplica/i.test(ref)) continue;
    items.push(a.abbr + ' ' + val.toUpperCase());
  }
  if (items.length) push('EAS', '(' + items.join(', ') + ')', lines.find(l => /densidade/i.test(l)) || '');
}

// Nomes de antibióticos conhecidos (para corrigir fontes de PDF com letras deslocadas)
const ANTIBIOTICS = ['Amicacina', 'Amoxicilina', 'Amoxicilina/Clavulanato', 'Amox/Clavulan-Urina', 'Ampicilina', 'Ampicilina/Sulbactam',
  'Azitromicina', 'Aztreonam', 'Cefalexina', 'Cefalotina', 'Cefazolina', 'Cefepima', 'Cefotaxima', 'Cefoxitina', 'Ceftazidima',
  'Ceftriaxona', 'Cefuroxima', 'Cefuroxima Acetil', 'Ciprofloxacina', 'Claritromicina', 'Clindamicina', 'Colistina', 'Ertapenem',
  'Fosfomicina', 'Gentamicina', 'Imipenem', 'Levofloxacina', 'Linezolida', 'Meropenem', 'Moxifloxacina', 'Nitrofurantoina',
  'Norfloxacina', 'Ofloxacina', 'Oxacilina', 'Penicilina', 'Piperac/Tazobactam', 'Polimixina B', 'Sulfa-Trimetoprim',
  'Sulfametoxazol/Trimetoprima', 'Tetraciclina', 'Tigeciclina', 'Tobramicina', 'Trimetoprima', 'Vancomicina'];
const ATB_MAP = new Map(ANTIBIOTICS.map(n => [skel(n, 'strip').sk, n]));
function fixDrug(name) {
  const k = skel(name, 'strip').sk;
  if (ATB_MAP.has(k)) return ATB_MAP.get(k);
  const shifted = name.replace(/[b-z]/g, c => String.fromCharCode(c.charCodeAt(0) - 1)); // letras minúsculas deslocadas em +1
  const k2 = skel(shifted, 'strip').sk;
  return ATB_MAP.has(k2) ? ATB_MAP.get(k2) : name;
}

// Urocultura: germe + contagem + antibiograma resumido (R / I / demais S)
function parseUrocultura(lines, push) {
  const isolates = [], abMap = {};
  let abIdx = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mi = line.match(/isolado\s*(\d+)\s*:\s*(.+?)\s*[-–]\s*(acima de|mais de|>)?\s*([\d.]+)\s*UFC/i);
    if (mi) { isolates.push({ n: mi[1], name: mi[2].trim(), count: (mi[3] ? '>' : '') + mi[4], src: line }); continue; }
    const mm = line.match(/microrganismo\s*(\d+)\s*:\s*(.+?)\s*$/i); // "Microrganismo 1: Escherichia coli" + "UFC/ML: 100.000"
    if (mm && !/aus[eê]ncia/i.test(mm[2])) {
      let count = '';
      for (let k = i; k < Math.min(lines.length, i + 3); k++) {
        const mc = lines[k].match(/ufc\s*\/\s*ml\s*:?\s*([<>]?\s*\d[\d.]*)/i);
        if (mc) { count = mc[1].replace(/\s+/g, ''); break; }
      }
      isolates.push({ n: mm[1], name: mm[2].replace(/\s*ufc.*$/i, '').trim(), count, src: line });
      continue;
    }
    const ma = line.match(/^\s*antibiograma\s*(\d+)/i);
    if (ma) { abIdx = ma[1]; abMap[abIdx] = []; continue; }
    if (abIdx) {
      const mr = line.match(/^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\/\- ]*?)\s+([SIR])\s+[<>=≤≥]+\s*[\d.,]+/);
      if (mr) abMap[abIdx].push({ drug: fixDrug(mr[1].trim()), cat: mr[2] });
    }
  }
  if (!isolates.length) {
    const neg = lines.find(l => /^\s*resultado\b/i.test(l) && /crescimento|negativ/i.test(l));
    if (neg) push('UROC', 'sem crescimento', neg);
    return;
  }
  const texts = isolates.map(iso => {
    const rows = abMap[iso.n] || [];
    let extra = '';
    if (rows.length) {
      const R_ = rows.filter(r => r.cat === 'R').map(r => r.drug.toLowerCase());
      const I_ = rows.filter(r => r.cat === 'I').map(r => r.drug.toLowerCase());
      const parts = [];
      if (R_.length) parts.push('R: ' + R_.join(', '));
      if (I_.length) parts.push('I: ' + I_.join(', '));
      parts.push(R_.length || I_.length ? 'demais S' : 'todos S');
      extra = ' (' + parts.join('; ') + ')';
    }
    return `${iso.name}${iso.count ? ' ' + iso.count + ' UFC/mL' : ''}${extra}`;
  });
  push('UROC', texts.join(' + '), isolates[0].src);
}

// Parasitológico de fezes: negativo ou o texto do achado
function parseParasito(lines, push) {
  const i = lines.findIndex(l => /^\s*resultado\b(?!\s+(conferido|anterior))/i.test(l));
  if (i < 0) return;
  const buf = [];
  for (let k = i; k < lines.length && k < i + 6; k++) {
    if (/^\s*(valor|valores)\s+de\s+refer|este\s+laudo/i.test(lines[k])) break;
    buf.push(lines[k]);
  }
  const text = buf.join(' ').replace(/^\s*resultado\s*:?\s*/i, '').replace(/\s+/g, ' ').trim();
  if (!text) return;
  if (/n[aã]o\s+foram\s+encontrad/i.test(text)) push('EPF', 'negativo', buf[0]);
  else push('EPF', text.length > 110 ? text.slice(0, 107) + '...' : text, buf[0]);
}

function parseResults(lines, entries) {
  const multiTitles = buildAliases(entries.filter(e => e.abbr === '@multi'));
  const aliases = buildAliases(entries.filter(e => !e.abbr.startsWith('@')));
  const special = k => buildAliases(entries.filter(e => e.abbr === k));
  const spUrina = special('@urina'), spUro = special('@urocultura'), spPar = special('@parasito');

  // Linhas "de cabeçalho" que vêm logo depois do título de cada exame (formatos A, B e C)
  const isMeta = l => /^\s*(\[\s*data\s+da\s+coleta|material\s*(biol.{1,2}gico)?\s*:|data\s+de\s+coleta|data\s+e\s+hor.{1,2}rio\s+da\s+libera|data\s+de\s+libera)/i.test(l);
  const isMetodo = l => /^\s*m.{1,2}todo\s*:/i.test(l);

  const blocks = [];
  let cur = null, hasA = false;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i], n1 = lines[i + 1] || '', n2 = lines[i + 2] || '';
    const isA = /^\s*\[\s*data\s+da\s+coleta/i.test(n1);
    const titleOk = L.trim() && !isMeta(L) && !isMetodo(L) && (isMeta(n1) || (isMetodo(n1) && isMeta(n2)));
    if (titleOk) {
      if (isA) hasA = true;
      cur = { start: i, title: L, style: isA ? 'A' : 'B', lines: [] };
      blocks.push(cur);
      if (isA) i++;
      continue;
    }
    if (cur) cur.lines.push(L);
  }

  const out = [], seen = new Set();
  const push = (abbr, value, src = '') => { if (!seen.has(abbr)) { seen.add(abbr); out.push({ abbr, value, src }); } };
  const tasks = [];

  function runBlock(b) {
    if (findAlias(b.title, spUrina)) { parseUrina(b.lines, push); return; }
    if (findAlias(b.title, spUro)) { parseUrocultura(b.lines, push); return; }
    if (findAlias(b.title, spPar)) { parseParasito(b.lines, push); return; }
    if (findAlias(b.title, multiTitles)) { parseMulti(b.lines, aliases, push, b.style !== 'A'); return; }
    const t = findAlias(b.title, aliases);
    if (!t) return; // exame fora do dicionário
    let label = t.abbr, awaiting = false;
    for (const line of b.lines) {
      if (/^\s*resultado\b(?!\s+(conferido|anterior))/i.test(line)) {
        let rest = line.replace(/^\s*resultado\s*:?\s*/i, '').replace(/^[.\s…]+/, '');
        const v = resultValue(rest);
        if (label && v !== null) { push(label, v, line); label = null; awaiting = false; }
        else if (label) awaiting = true; // o valor pode vir na linha seguinte
      } else if (awaiting && label && /^\s*[<>]?-?\d/.test(line) && !/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) {
        const v = resultValue(line);
        if (v !== null) { push(label, v, line); label = null; }
        awaiting = false;
      } else {
        const a = findAlias(line, aliases);
        if (!a) continue;
        const rem = line.slice(a.end);
        const same = rem.match(/^\s*[-–]?\s*resultado\s*:?\s*(.*)$/i);      // "GLICEMIA MÉDIA ESTIMADA-RESULTADO: 76,7"
        const dotted = rem.match(/^\s*[.…]{2,}\s*(?=[<>]?-?\s*\d)(.*)$/);   // "Calcio Ionico.......... 1,17 mmol/L" (sem linha "Resultado")
        if (same) { const v = resultValue(same[1]); if (v !== null) push(a.abbr, v, line); }
        else if (dotted) { const v = resultValue(dotted[1]); if (v !== null) push(a.abbr, v, line); }
        else if (!/[\p{L}\p{N}]/u.test(rem)) { label = a.abbr; awaiting = false; } // sub-título; o RESULTADO vem na linha seguinte
      }
    }
  }
  blocks.forEach(b => tasks.push({ start: b.start, run: () => runBlock(b) }));

  // Hemograma sem cabeçalho de exame reconhecível (sem dois-pontos nas linhas)
  if (!hasA) {
    const blockStarts = new Set(blocks.map(b => b.start));
    const multiIdx = [];
    lines.forEach((l, i) => { if (!blockStarts.has(i) && findAlias(l, multiTitles)) multiIdx.push(i); });
    for (const m of multiIdx) {
      const end = Math.min(lines.length, ...blocks.map(b => b.start).filter(x => x > m), ...multiIdx.filter(x => x > m));
      tasks.push({ start: m, run: () => parseMulti(lines.slice(m + 1, end), aliases, push, true) });
    }
  }

  tasks.sort((a, b) => a.start - b.start).forEach(t => t.run()); // mantém a ordem do laudo
  return out;
}

// Data do exame (dd/mm/aaaa): procura, por ordem de prioridade, os rótulos usados pelos laboratórios
function extractDate(lines) {
  const D = '(\\d{2}\\/\\d{2}\\/\\d{4})';
  const pats = [
    '\\[\\s*data\\s+da\\s+coleta\\s*:\\s*' + D,          // Hermes Pardini
    'data\\s+da\\s+coleta\\s*:?\\s*' + D,                // Pretti
    'data\\/hora\\s+coleta\\s*:?\\s*' + D,               // Pretti (por exame)
    'data\\s+da\\s+entrada\\s*:?\\s*' + D,               // Prestlab (cabeçalho)
    'data\\s+de\\s+coleta[.\\s:]*' + D,                  // Prestlab (por exame)
    'data\\s+e\\s+hor.{1,2}rio\\s+da\\s+libera.{1,3}o[.\\s:]*' + D,
    'data\\s+de\\s+libera.{1,3}o[.\\s:]*' + D,
  ].map(p => new RegExp(p, 'i'));
  for (const re of pats) for (const l of lines) { const m = l.match(re); if (m) return m[1]; }
  return '';
}

const PREFIXO = 'EX. LAB';
function formatOutput(results, sep, date) {
  const body = results.map(r => r.abbr.toUpperCase() + ' ' + r.value).join(sep);
  return PREFIXO + (date ? ' ' + date : '') + ': ' + body;
}

// ============ Compatibilidade: APIs chrome.* com callback (manifest V2 / Chromium 86 não devolvem Promise) ============
function storageGet(defaults) {
  return new Promise(resolve => chrome.storage.sync.get(defaults, items => {
    if (chrome.runtime.lastError) resolve(defaults); else resolve(items);
  }));
}
function storageSet(obj) {
  return new Promise((resolve, reject) => chrome.storage.sync.set(obj, () => {
    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message)); else resolve();
  }));
}
function tabsQuery(q) {
  return new Promise((resolve, reject) => chrome.tabs.query(q, tabs => {
    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message)); else resolve(tabs);
  }));
}

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
}
