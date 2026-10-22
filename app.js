import { firebaseConfig } from './firebase-config.js';

/* ===================== Grundwerte ===================== */

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* Fixed round for the cooking on 27.10.: the existing votes live under this key,
   so every visit counts towards it regardless of the day the link is opened. */
const STANDARD_RAUM = '2026-09-12';
const params = new URLSearchParams(location.search);
const RAUM = (params.get('raum') || STANDARD_RAUM).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || STANDARD_RAUM;

const AB = {
  name:   localStorage.getItem('koch.name') || '',
  wer:    localStorage.getItem('koch.wer') || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)),
  picks:  new Set(),
  favorit: null,
  personen: Number(localStorage.getItem('koch.personen') || 5),
  filter: 'alle'
};
localStorage.setItem('koch.wer', AB.wer);

let REZEPTE = [];
let ALLE_STIMMEN = {};   // { werId: {name, picks:[], favorit} }
let speicher = null;

/* ===================== Speicher: Firebase oder lokal ===================== */

const istEchtKonfiguriert = !String(firebaseConfig.apiKey || '').startsWith('HIER_');

async function speicherAufbauen() {
  if (istEchtKonfiguriert) {
    try {
      const [{ initializeApp }, { getDatabase, ref, onValue, set }] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js')
      ]);
      const app = initializeApp(firebaseConfig);
      const db  = getDatabase(app);
      const raumRef = ref(db, `abstimmungen/${RAUM}`);
      return {
        modus: 'live',
        abonnieren(cb) { onValue(raumRef, (snap) => cb(snap.val() || {})); },
        schreiben(stimme) { return set(ref(db, `abstimmungen/${RAUM}/${AB.wer}`), stimme); }
      };
    } catch (fehler) {
      console.warn('Firebase nicht erreichbar, Einzelmodus wird verwendet:', fehler);
    }
  }
  const schluessel = `koch.lokal.${RAUM}`;
  let horcher = null;
  return {
    modus: 'lokal',
    abonnieren(cb) { horcher = cb; cb(JSON.parse(localStorage.getItem(schluessel) || '{}')); },
    schreiben(stimme) {
      const alle = JSON.parse(localStorage.getItem(schluessel) || '{}');
      alle[AB.wer] = stimme;
      localStorage.setItem(schluessel, JSON.stringify(alle));
      if (horcher) horcher(alle);
    }
  };
}

/* Erst schreiben, wenn der gespeicherte Stand vom Server da ist. Sonst
   ueberschreibt die beim Laden noch leere Auswahl die bereits abgegebene
   Stimme -- und zwar fuer alle, weil alle denselben Datensatz sehen. */
let ersterStandDa = false;
let sendenAusstehend = false;
let offeneSchreibvorgaenge = 0;

function stimmeSenden() {
  if (!AB.name || !speicher) return;
  if (!ersterStandDa) { sendenAusstehend = true; return; }
  offeneSchreibvorgaenge++;
  Promise.resolve(speicher.schreiben({
    name: AB.name,
    picks: Array.from(AB.picks),
    favorit: AB.favorit,
    zeit: Date.now()
  }))
    .catch((fehler) => console.warn('Stimme konnte nicht gespeichert werden:', fehler))
    .finally(() => { offeneSchreibvorgaenge--; });
}

/* ===================== Mengen & Zutaten ===================== */

const BRUECHE = [[0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.666, '⅔'], [0.75, '¾']];

function mengeText(menge, faktor) {
  if (!menge) return '';
  const wert = menge * faktor;
  if (wert < 1) {
    let beste = null, abstand = Infinity;
    for (const [zahl, zeichen] of BRUECHE) {
      const d = Math.abs(zahl - wert);
      if (d < abstand) { abstand = d; beste = zeichen; }
    }
    if (abstand < 0.05) return beste;
    return (Math.round(wert * 100) / 100).toLocaleString('de-DE');
  }
  if (wert < 10)  return (Math.round(wert * 4) / 4).toLocaleString('de-DE');
  if (wert < 200) return String(Math.round(wert));
  return String(Math.round(wert / 10) * 10);
}

function zutatenFuer(rezept, personen) {
  const faktor = personen / (rezept.portionen || 4);
  return rezept.zutaten.map((z) => ({
    menge: mengeText(z.menge, faktor),
    einheit: z.einheit || '',
    name: z.name
  }));
}

/* ===================== Aufbau der Karten ===================== */

function zeitText(minuten) {
  if (!minuten) return '–';
  if (minuten < 60) return `${minuten} Min`;
  const std = Math.floor(minuten / 60), rest = minuten % 60;
  return rest ? `${std} Std ${rest} Min` : `${std} Std`;
}

function karteBauen(rezept, position) {
  const el = document.createElement('article');
  el.className = 'karte';
  el.dataset.id = rezept.id;
  el.dataset.kueche = rezept.kueche;
  el.innerHTML = `
    <div class="karte-bild">
      <img src="${rezept.bild}" alt="${rezept.titel}" decoding="async"
           loading="${position < 4 ? 'eager' : 'lazy'}" referrerpolicy="no-referrer">
      <div class="karte-marken">
        <span class="karte-kueche">${rezept.kueche}</span>
        ${rezept.neu ? '<span class="karte-neu">Neu</span>' : ''}
      </div>
      <span class="karte-punkte" data-punkte hidden>0</span>
    </div>
    <div class="karte-body">
      <h3 class="karte-titel">${rezept.titel}</h3>
      <div class="karte-fakten">
        <span>★ <b>${rezept.bewertung.toLocaleString('de-DE')}</b> (${rezept.stimmen})</span>
        <span>⏱ <b>${zeitText(rezept.zeitGesamt)}</b></span>
      </div>
      ${rezept.hinweis ? `<p class="karte-hinweis">${rezept.hinweis}</p>` : ''}
      <button class="zutaten-schalter" type="button" data-auf>Zutaten für <span data-pz>${AB.personen}</span> Personen anzeigen</button>
      <div class="zutaten" data-zutaten hidden></div>
      <div class="karte-aktionen">
        <button class="btn btn-waehlen" type="button" data-waehlen>Schmeckt mir</button>
        <button class="btn btn-fav" type="button" data-fav title="Als Favorit setzen (zählt doppelt)" aria-label="Als Favorit setzen">★</button>
      </div>
    </div>`;

  el.querySelector('[data-waehlen]').addEventListener('click', () => waehlen(rezept.id));
  el.querySelector('[data-fav]').addEventListener('click', () => favoritSetzen(rezept.id));
  el.querySelector('[data-auf]').addEventListener('click', (e) => {
    const box = el.querySelector('[data-zutaten]');
    const offen = !box.hidden;
    box.hidden = offen;
    if (!offen) zutatenRendern(el, rezept);
    e.currentTarget.firstChild.textContent = offen ? 'Zutaten für ' : 'Zutaten ausblenden – für ';
  });
  return el;
}

function zutatenRendern(el, rezept) {
  const liste = zutatenFuer(rezept, AB.personen);
  el.querySelector('[data-zutaten]').innerHTML = `
    <ul>${liste.map((z) => `<li><span class="menge">${z.menge} ${z.einheit}</span><span>${z.name}</span></li>`).join('')}</ul>
    <a class="quelle" href="${rezept.quelle}" target="_blank" rel="noopener">Zubereitung bei Chefkoch öffnen →</a>`;
}

/* ===================== Abstimmen ===================== */

function nameNoetig() {
  if (AB.name) return false;
  $('#panelName').hidden = false;
  $('#eingabeName').focus();
  $('#panelName').scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

function waehlen(id) {
  if (nameNoetig()) return;
  if (AB.picks.has(id)) {
    AB.picks.delete(id);
    if (AB.favorit === id) AB.favorit = null;
  } else {
    AB.picks.add(id);
  }
  stimmeSenden();
  kartenAktualisieren();
}

function favoritSetzen(id) {
  if (nameNoetig()) return;
  AB.favorit = (AB.favorit === id) ? null : id;
  if (AB.favorit) AB.picks.add(id);
  stimmeSenden();
  kartenAktualisieren();
}

/* ===================== Anzeige ===================== */

function punkteBerechnen() {
  const punkte = new Map(REZEPTE.map((r) => [r.id, 0]));
  let waehler = [];
  for (const [wer, s] of Object.entries(ALLE_STIMMEN)) {
    if (!s) continue;
    waehler.push(s.name || 'Jemand');
    for (const id of (s.picks || [])) punkte.set(id, (punkte.get(id) || 0) + 1);
    if (s.favorit) punkte.set(s.favorit, (punkte.get(s.favorit) || 0) + 1);
  }
  return { punkte, waehler };
}

function kartenAktualisieren() {
  const { punkte } = punkteBerechnen();
  for (const el of $$('.karte')) {
    const id = el.dataset.id;
    el.classList.toggle('gewaehlt', AB.picks.has(id));
    el.classList.toggle('favorit', AB.favorit === id);
    el.querySelector('[data-waehlen]').textContent = AB.picks.has(id) ? 'Ausgewählt ✓' : 'Schmeckt mir';
    const p = punkte.get(id) || 0;
    const chip = el.querySelector('[data-punkte]');
    chip.hidden = p === 0;
    chip.textContent = p === 1 ? '1 Punkt' : `${p} Punkte`;
    el.hidden = AB.filter !== 'alle' && el.dataset.kueche !== AB.filter;
  }
  const n = AB.picks.size;
  $('#fussStatus').textContent = n === 0 ? 'Noch nichts ausgewählt'
    : `${n} ausgewählt${AB.favorit ? ' · 1 Favorit' : ''}`;
  $('#fussleiste').hidden = !AB.name;
}

function ergebnisAktualisieren() {
  const { punkte, waehler } = punkteBerechnen();
  const sortiert = REZEPTE.map((r) => ({ r, p: punkte.get(r.id) || 0 }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.r.titel.localeCompare(b.r.titel, 'de'));
  const max = sortiert.length ? sortiert[0].p : 1;

  $('#balken').innerHTML = sortiert.map(({ r, p }) => `
    <li>
      <span class="bt">${r.titel}</span>
      <span class="bp">${p}</span>
      <span class="spur"><span class="fuellung" style="width:${Math.round((p / max) * 100)}%"></span></span>
    </li>`).join('');

  const anzahl = waehler.length;
  $('#ergebnisMeta').textContent = anzahl === 0
    ? 'Noch keine Stimmen abgegeben.'
    : `${anzahl} von ${AB.personen} haben abgestimmt: ${waehler.join(', ')}`;

  const gewinner = sortiert[0];
  $('#gewinner').hidden = !gewinner;
  if (gewinner) {
    $('#gewinnerName').textContent = gewinner.r.titel;
    $('#btnEinkauf').dataset.id = gewinner.r.id;
  }
  $('#einkaufPersonen').textContent = AB.personen;
}

/* ===================== Einkaufsliste ===================== */

function einkaufslisteKopieren() {
  const id = $('#btnEinkauf').dataset.id;
  const rezept = REZEPTE.find((r) => r.id === id);
  if (!rezept) return;
  const zeilen = zutatenFuer(rezept, AB.personen)
    .map((z) => `- ${[z.menge, z.einheit, z.name].filter(Boolean).join(' ')}`);
  const text = [
    `Einkaufsliste: ${rezept.titel}`,
    `Für ${AB.personen} Personen (Original: ${rezept.portionen})`,
    '',
    ...zeilen,
    '',
    `Zubereitung: ${rezept.quelle}`
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    const h = $('#kopiertHinweis');
    h.hidden = false;
    setTimeout(() => { h.hidden = true; }, 2200);
  }).catch(() => {
    prompt('Kopieren nicht erlaubt – hier zum Markieren:', text);
  });
}

/* ===================== Filter ===================== */

function filterBauen() {
  const kuechen = ['alle', ...Array.from(new Set(REZEPTE.map((r) => r.kueche))).sort((a, b) => a.localeCompare(b, 'de'))];
  $('#filterChips').innerHTML = kuechen
    .map((k) => `<button class="chip" type="button" data-k="${k}" aria-pressed="${k === 'alle'}">${k === 'alle' ? 'Alle' : k}</button>`)
    .join('');
  $('#filterChips').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    AB.filter = btn.dataset.k;
    $$('#filterChips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === btn)));
    kartenAktualisieren();
  });
}

/* ===================== Personenzahl ===================== */

function personenSetzen(wert) {
  AB.personen = Math.min(20, Math.max(1, wert));
  localStorage.setItem('koch.personen', String(AB.personen));
  $('#personenZahl').textContent = AB.personen;
  $$('[data-pz]').forEach((s) => { s.textContent = AB.personen; });
  for (const el of $$('.karte')) {
    if (!el.querySelector('[data-zutaten]').hidden) {
      zutatenRendern(el, REZEPTE.find((r) => r.id === el.dataset.id));
    }
  }
  ergebnisAktualisieren();
}

/* ===================== Start ===================== */

async function start() {
  $('#kopfDatum').textContent = new Date(2026, 9, 27).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#raumAnzeige').textContent = `Runde ${RAUM}`;

  REZEPTE = await fetch('rezepte.json').then((r) => r.json());
  REZEPTE.forEach((r) => { r.id = String(r.id); });

  const frag = document.createDocumentFragment();
  REZEPTE.forEach((r, i) => frag.appendChild(karteBauen(r, i)));
  $('#karten').appendChild(frag);
  filterBauen();

  speicher = await speicherAufbauen();
  const live = speicher.modus === 'live';
  $('#modusChip').textContent = live ? '● Live – alle sehen dasselbe' : '● Einzelmodus';
  $('#modusChip').className = `modus ${live ? 'live' : 'lokal'}`;
  $('#hinweisLokal').hidden = live;

  speicher.abonnieren((daten) => {
    ALLE_STIMMEN = daten || {};
    const meine = ALLE_STIMMEN[AB.wer];
    if (!ersterStandDa) {
      // Erster Stand vom Server: eigene Stimme uebernehmen, dann ist Schreiben erlaubt.
      ersterStandDa = true;
      if (meine) {
        AB.picks = new Set(meine.picks || []);
        AB.favorit = meine.favorit || null;
      }
      if (sendenAusstehend) { sendenAusstehend = false; stimmeSenden(); }
    } else if (offeneSchreibvorgaenge === 0 && meine) {
      // Spaetere Aenderungen nur uebernehmen, wenn gerade nichts von uns unterwegs ist.
      AB.picks = new Set(meine.picks || []);
      AB.favorit = meine.favorit || null;
    }
    kartenAktualisieren();
    ergebnisAktualisieren();
  });

  // Gemerkten Namen nur wiederherstellen, nicht speichern.
  if (AB.name) nameUebernehmen(AB.name, false);
  personenSetzen(AB.personen);
  kartenAktualisieren();
  ergebnisAktualisieren();
}

function nameUebernehmen(name, senden = true) {
  AB.name = name.trim().slice(0, 24);
  localStorage.setItem('koch.name', AB.name);
  $('#anzeigeName').textContent = AB.name;
  $('#panelName').hidden = true;
  $('#leiste').hidden = false;
  if (senden) stimmeSenden();
  kartenAktualisieren();
}

$('#btnName').addEventListener('click', () => {
  const wert = $('#eingabeName').value.trim();
  if (wert) nameUebernehmen(wert);
  else $('#eingabeName').focus();
});
$('#eingabeName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnName').click(); });
$('#btnNameWechseln').addEventListener('click', () => {
  $('#panelName').hidden = false;
  $('#eingabeName').value = AB.name;
  $('#eingabeName').focus();
});
$('#personenPlus').addEventListener('click', () => personenSetzen(AB.personen + 1));
$('#personenMinus').addEventListener('click', () => personenSetzen(AB.personen - 1));
$('#btnEinkauf').addEventListener('click', einkaufslisteKopieren);
$('#btnZuErgebnis').addEventListener('click', () => $('#ergebnisBlock').scrollIntoView({ behavior: 'smooth' }));
$('#btnLink').addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}?raum=${RAUM}`;
  navigator.clipboard.writeText(url)
    .then(() => { $('#btnLink').textContent = 'Link kopiert ✓'; setTimeout(() => { $('#btnLink').textContent = 'Link teilen'; }, 2000); })
    .catch(() => prompt('Diesen Link teilen:', url));
});

start();
