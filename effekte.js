/* =======================================================================
   Animations: what happens on "Schmeckt mir", on the favourite star and
   around the voting. Each "Schmeckt mir" picks one of eight effects at random
   (never the same twice in a row); only the bite stays on the card until
   the dish is deselected. For testing, ?effekt=<name> and ?favorit=<name>
   force one effect, e.g. ?effekt=ofen.
   ======================================================================= */

const zufall = (min, max) => min + Math.random() * (max - min);
const ganz = (min, max) => Math.floor(zufall(min, max + 1));
const wahl = (liste) => liste[Math.floor(Math.random() * liste.length)];
const erzwungen = new URLSearchParams(location.search);

function element(tag, klasse, stil = {}, html = '') {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  for (const [k, v] of Object.entries(stil)) e.style.setProperty(k, v);
  if (html) e.innerHTML = html;
  return e;
}

/* A layer on top of the photo that removes itself after `dauer` ms.
   `schneiden` clips it to the photo, `hinten` puts it behind the photo. */
function buehne(karte, art, dauer, { schneiden = true, hinten = false } = {}) {
  const b = element('div', ['effekt', `effekt-${art}`, schneiden && 'effekt-schnitt', hinten && 'effekt-hinten'].filter(Boolean).join(' '));
  b.style.setProperty('--dauer', `${dauer}ms`);
  karte.querySelector('.karte-bild').appendChild(b);
  setTimeout(() => b.remove(), dauer);
  return b;
}

export function einmalAnimieren(el, klasse) {
  if (!el) return;
  el.classList.remove(klasse);
  void el.offsetWidth;            // restart the animation if it is still running
  el.classList.add(klasse);
  el.addEventListener('animationend', function fertig(e) {
    if (e.target !== el) return;
    el.classList.remove(klasse);
    el.removeEventListener('animationend', fertig);
  });
}

/* Free-flying particle in viewport coordinates (crumbs, sparks, specks). */
function teilchen(x, y, klasse, stil, inhalt = '') {
  const t = element('span', `teilchen ${klasse}`, stil, inhalt);
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
  t.addEventListener('animationend', (e) => { if (e.target === t) t.remove(); });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function kruemel(x, y, { anzahl = 14, farben, streuung = 38, richtung = 1 } = {}) {
  const palette = farben || ['#d4a373', '#bc6c25', '#e9c46a', '#8d5524', '#74c69d', '#e07a5f'];
  for (let i = 0; i < anzahl; i++) {
    const groesse = zufall(3, 7);
    teilchen(x + zufall(-6, 6), y + zufall(-streuung, streuung), 'krume', {
      '--dx': `${richtung * zufall(-10, 70)}px`,
      '--hoch': `${zufall(-34, -8)}px`,
      '--fall': `${zufall(60, 150)}px`,
      '--dreh': `${zufall(-260, 260)}deg`,
      '--dauer': `${zufall(650, 1050)}ms`,
      '--verz': `${180 + zufall(0, 120)}ms`,
      '--farbe': palette[i % palette.length],
      '--groesse': `${groesse}px`,
      '--form': Math.random() < 0.5 ? '50%' : '2px'
    });
  }
}

/* ======================= 1. Der Biss ======================= */
/* Overlapping circles along the left or right edge of the photo. The hole is
   painted in the page colour and reaches 7px past the card to cover border and
   ring; a slightly larger copy inside the photo leaves a darker rim. Position,
   size and number of teeth vary; the bite is remembered per dish. */

const BISS_SPEICHER = 'koch.bisse';
function bisseLesen() { try { return JSON.parse(localStorage.getItem(BISS_SPEICHER) || '{}'); } catch { return {}; } }
function bisseSchreiben(b) { try { localStorage.setItem(BISS_SPEICHER, JSON.stringify(b)); } catch { /* not essential */ } }

function bissBauen(karte, p, animiert) {
  for (const alt of karte.querySelectorAll('.biss, .biss-rand')) alt.remove();
  const basis = 24 * p.groesse;
  const abstand = basis * 0.95;
  const H = Math.ceil(abstand * (p.zaehne - 1) + 2 * basis + 10);
  const W = Math.ceil(basis + 9);
  const rechts = p.seite === 'rechts';
  const cx = rechts ? W - 5 : 5;
  const kreise = Array.from({ length: p.zaehne }, (_, i) => {
    const t = p.zaehne === 1 ? 0 : i / (p.zaehne - 1) - 0.5;
    return { cy: H / 2 + t * abstand * (p.zaehne - 1), r: basis * (1 - 0.38 * (2 * t) ** 2) };
  });
  const svg = (extra) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="biss-form" style="transform-origin:${cx}px ${H / 2}px">${
    kreise.map((k) => `<circle cx="${cx}" cy="${k.cy.toFixed(1)}" r="${(k.r + extra).toFixed(1)}"/>`).join('')}</svg>`;
  const lage = { top: `calc(${p.hoehe}% - ${H / 2}px)`, [rechts ? 'right' : 'left']: '-7px', width: `${W}px`, height: `${H}px` };

  const rand = element('div', 'biss-rand', {}, `<div class="biss-lage">${svg(3)}</div>`);
  const loch = element('div', 'biss', {}, svg(0));
  Object.assign(rand.firstChild.style, lage);
  Object.assign(loch.style, lage);
  if (animiert) { rand.classList.add('neu'); loch.classList.add('neu'); }
  const bild = karte.querySelector('.karte-bild');
  bild.append(rand, loch);
  return loch;
}

function biss(karte) {
  const p = {
    seite: Math.random() < 0.5 ? 'rechts' : 'links',
    hoehe: Math.round(zufall(40, 78)),
    zaehne: ganz(3, 6),
    groesse: +zufall(0.75, 1.3).toFixed(2)
  };
  const bisse = bisseLesen();
  bisse[karte.dataset.id] = p;
  bisseSchreiben(bisse);
  const loch = bissBauen(karte, p, true);
  karte.style.setProperty('--ruck', p.seite === 'rechts' ? '4px' : '-4px');
  einmalAnimieren(karte, 'beisst');
  const r = loch.getBoundingClientRect();
  kruemel(p.seite === 'rechts' ? r.right - 9 : r.left + 9, r.top + r.height / 2, {
    streuung: r.height * 0.35, richtung: p.seite === 'rechts' ? 1 : -1
  });
}

/* Keeps the bite in sync with the vote (reload, other device, deselect). */
export function bissAbgleichen(karte, gewaehlt) {
  const id = karte.dataset.id;
  const loch = karte.querySelector('.biss');
  if (gewaehlt) {
    const p = bisseLesen()[id];
    if (p && !loch) bissBauen(karte, p, false);
    return;
  }
  const bisse = bisseLesen();
  if (bisse[id]) { delete bisse[id]; bisseSchreiben(bisse); }
  if (loch && !loch.classList.contains('heilt')) {
    for (const t of karte.querySelectorAll('.biss, .biss-rand')) t.remove();
  }
}

/* The card grows back when the dish is deselected. */
export function nichtMehrLecker(karte) {
  const teile = karte.querySelectorAll('.biss, .biss-rand');
  for (const t of teile) { t.classList.remove('neu'); t.classList.add('heilt'); }
  setTimeout(() => teile.forEach((t) => t.remove()), 520);
  const bisse = bisseLesen();
  delete bisse[karte.dataset.id];
  bisseSchreiben(bisse);
}

/* ======================= 2. Pizza belegen ======================= */

function pizza(karte) {
  const b = buehne(karte, 'pizza', 3100);
  b.appendChild(element('div', 'kaese'));
  const sorten = ['tomate', 'basilikum', 'olive', 'pilz', 'salami'];
  const n = ganz(12, 16);
  for (let i = 0; i < n; i++) {
    b.appendChild(element('span', `belag belag-${wahl(sorten)}`, {
      '--x': `${zufall(8, 92).toFixed(1)}%`,
      '--y': `${zufall(10, 90).toFixed(1)}%`,
      '--dreh': `${ganz(-180, 180)}deg`,
      '--verz': `${Math.round(i * 70 + zufall(0, 60))}ms`,
      '--g': zufall(0.8, 1.25).toFixed(2)
    }));
  }
}

/* ======================= 3. Ofen ======================= */

function ofen(karte) {
  buehne(karte, 'ofen', 3400).innerHTML = `
    <div class="ofen-fenster"><div class="ofen-glut"></div><div class="ofen-glas"></div></div>
    <div class="ofen-leiste"><i class="ofen-knopf"></i><i class="ofen-knopf"></i><span class="ofen-lampe"></span><i class="ofen-knopf"></i></div>
    <div class="ofen-griff"></div>
    <div class="ofen-dampf"><i></i><i></i><i></i><i></i></div>
    <span class="ofen-ding">Ding!</span>`;
}

/* ======================= 4. Gabel und Messer ======================= */

const SILBER = `<defs><linearGradient id="silber" x1="0" x2="1"><stop offset="0" stop-color="#f4f6f7"/><stop offset=".5" stop-color="#c3cbd0"/><stop offset="1" stop-color="#8d989f"/></linearGradient></defs>`;
const GABEL = `<svg viewBox="0 0 20 100" class="besteck besteck-gabel">${SILBER}<g fill="url(#silber)" stroke="#6c757d" stroke-width=".6">
  <rect x="2" y="0" width="2.6" height="27" rx="1.2"/><rect x="6.5" y="0" width="2.6" height="27" rx="1.2"/>
  <rect x="11" y="0" width="2.6" height="27" rx="1.2"/><rect x="15.4" y="0" width="2.6" height="27" rx="1.2"/>
  <path d="M2 24h16v5q0 11-5.5 15h-5Q2 40 2 29z"/><rect x="7" y="42" width="6" height="58" rx="3"/></g></svg>`;
const MESSER = `<svg viewBox="0 0 20 100" class="besteck besteck-messer">${SILBER}<g fill="url(#silber)" stroke="#6c757d" stroke-width=".6">
  <path d="M7 1C15 8 16 32 14 54H7z"/><rect x="6" y="52" width="8.5" height="48" rx="3.5"/></g></svg>`;

function besteck(karte) {
  buehne(karte, 'besteck', 2200, { schneiden: false }).innerHTML =
    `${GABEL}${MESSER}<span class="besteck-kling">✦</span><span class="besteck-text">kling!</span>`;
}

/* ======================= 5. Salz- oder Pfefferstreuer ======================= */

function streuer(karte) {
  const pfeffer = Math.random() < 0.5;
  const b = buehne(karte, 'streuer', 2300, { schneiden: false });
  b.innerHTML = `<svg viewBox="0 0 40 64" class="streuer ${pfeffer ? 'streuer-pfeffer' : ''}">
    <path class="streuer-koerper" d="M8 20h24l3 38q0 5-5 5H10q-5 0-5-5z"/>
    <path class="streuer-inhalt" d="M7 40h26l2 18q0 4-4 4H9q-4 0-4-4z"/>
    <path class="streuer-kappe" d="M8 20q0-16 12-16t12 16z"/>
    <g class="streuer-loecher"><circle cx="15" cy="12" r="1.3"/><circle cx="20" cy="9" r="1.3"/><circle cx="25" cy="12" r="1.3"/><circle cx="20" cy="15" r="1.3"/></g></svg>`;
  const svg = b.querySelector('svg');
  const hoehe = karte.querySelector('.karte-bild').getBoundingClientRect().height;
  const farben = pfeffer ? ['#1b1b1b', '#3d3d3d', '#5c4033'] : ['#ffffff', '#f1f3f5', '#dee2e6'];
  const start = performance.now();
  (function streuen() {
    const t = performance.now() - start;
    if (t > 1450 || !svg.isConnected) return;
    if (t > 320) {
      const m = svg.getScreenCTM();
      for (let i = 0; i < 3; i++) {
        const loch = new DOMPoint(zufall(14, 26), zufall(9, 15)).matrixTransform(m);
        teilchen(loch.x, loch.y, 'prise', {
          '--dx': `${zufall(-25, 15)}px`,
          '--fall': `${zufall(40, hoehe * 0.7)}px`,
          '--dauer': `${zufall(450, 850)}ms`,
          '--verz': '0ms',
          '--farbe': wahl(farben),
          '--groesse': `${zufall(2, 3.6)}px`
        });
      }
    }
    requestAnimationFrame(streuen);
  })();
}

/* ======================= 6. Teller dreht sich ======================= */

function teller(karte) {
  const bild = karte.querySelector('.karte-bild');
  const r = bild.getBoundingClientRect();
  const radius = 0.34 * Math.hypot(r.width, r.height) / Math.SQRT2;
  const b = buehne(karte, 'teller', 2700, { hinten: true });
  b.style.setProperty('--d', `${Math.round(2 * radius + 30)}px`);
  b.innerHTML = `<div class="teller-scheibe"></div>${GABEL.replace('besteck besteck-gabel', 'teller-gabel')}${MESSER.replace('besteck besteck-messer', 'teller-messer')}`;
  bild.classList.remove('teller-dreht');
  void bild.offsetWidth;
  bild.classList.add('teller-dreht');
  setTimeout(() => bild.classList.remove('teller-dreht'), 2700);
}

/* ======================= 7. Herzen steigen auf ======================= */

const HERZ = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.3 8.2 2.3 4 6.3 4c2.3 0 3.9 1.3 5.7 3.4C13.8 5.3 15.4 4 17.7 4c4 0 6 4.2 4.3 7.7C19.5 16.4 12 21 12 21z"/></svg>';

function herzen(karte) {
  const b = buehne(karte, 'herzen', 2900, { schneiden: false });
  const farben = ['#e63946', '#ff6b81', '#f4a261', '#c1583b', '#ff8fab'];
  for (let i = 0; i < 11; i++) {
    b.appendChild(element('span', 'herz', {
      '--x': `${zufall(25, 75).toFixed(1)}%`,
      '--sx': `${zufall(-40, 40).toFixed(0)}px`,
      '--hoch': `${zufall(-230, -140).toFixed(0)}px`,
      '--g': `${zufall(20, 44).toFixed(0)}px`,
      '--farbe': wahl(farben),
      '--verz': `${Math.round(i * 120 + zufall(0, 100))}ms`,
      '--zeit': `${Math.round(zufall(1500, 2100))}ms`
    }, HERZ));
  }
}

/* ======================= 8. Comic-Knall ======================= */

function comic(karte) {
  const b = buehne(karte, 'comic', 1900, { schneiden: false });
  const zacken = 18;
  const punkte = Array.from({ length: zacken * 2 }, (_, i) => {
    const w = (i / (zacken * 2)) * Math.PI * 2;
    const r = i % 2 ? zufall(30, 37) : 50;
    return `${(50 + Math.cos(w) * r).toFixed(1)}% ${(50 + Math.sin(w) * r).toFixed(1)}%`;
  }).join(',');
  const wort = wahl(['MMH!', 'LECKER!', 'YUM!', 'NOM NOM!', 'WOW!', 'JA!!!']);
  const links = Math.random() < 0.5, oben = Math.random() < 0.5;
  const x = links ? zufall(22, 34) : zufall(66, 78), y = oben ? zufall(28, 40) : zufall(60, 72);
  b.innerHTML = `<div class="comic-knall" style="--x:${x.toFixed(0)}%;--y:${y.toFixed(0)}%;--dreh:${links ? ganz(-16, -4) : ganz(4, 16)}deg">
    <div class="comic-stern" style="clip-path:polygon(${punkte})"></div><span class="comic-wort">${wort}</span></div>`;
}

/* ======================= Favorit: Funken, Blattgold ======================= */

function funken(karte) {
  const knopf = karte.querySelector('[data-fav]');
  einmalAnimieren(knopf, 'plopp');
  einmalAnimieren(karte, 'leuchtet');
  const r = knopf.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  teilchen(x, y, 'stern-ring', {});
  teilchen(x, y, 'stern-geist', {}, '★');
  const n = 18;
  for (let i = 0; i < n; i++) {
    const winkel = (i / n) * Math.PI * 2 + zufall(-0.15, 0.15);
    const weite = zufall(55, 110);
    teilchen(x, y, 'funke', {
      '--dx': `${Math.cos(winkel) * weite}px`,
      '--dy': `${Math.sin(winkel) * weite}px`,
      '--dreh': `${zufall(-220, 220)}deg`,
      '--farbe': i % 3 === 0 ? 'var(--gold-hell)' : (i % 3 === 1 ? 'var(--gold)' : '#f4a261'),
      '--groesse': `${zufall(16, 28)}px`
    }, i % 3 === 2 ? '•' : '✦');
  }
}

/* A band of light keeps sweeping over the favourite card until the favourite changes. */
const GLANZ_SPEICHER = 'koch.goldglanz';

function glanzAnbringen(karte) {
  if (karte.querySelector('.goldglanz')) return;
  karte.appendChild(element('div', 'goldglanz', {}, '<i></i>'));
}

function blattgold(karte) {
  einmalAnimieren(karte.querySelector('[data-fav]'), 'plopp');
  einmalAnimieren(karte, 'leuchtet');
  try { localStorage.setItem(GLANZ_SPEICHER, karte.dataset.id); } catch { /* not essential */ }
  glanzAnbringen(karte);
}

/* Keeps the glint in sync with the favourite (reload, other device, star removed). */
export function glanzAbgleichen(karte, favorit) {
  let gespeichert = null;
  try { gespeichert = localStorage.getItem(GLANZ_SPEICHER); } catch { /* not essential */ }
  const glanz = karte.querySelector('.goldglanz');
  if (favorit && gespeichert === karte.dataset.id) glanzAnbringen(karte);
  else if (glanz) glanz.remove();
}

/* ======================= Auswahl ======================= */

const SCHMECKT = { biss, pizza, ofen, besteck, streuer, teller, herzen, comic };
const FAVORIT = { funken, blattgold };
const zuletzt = { schmeckt: null, favorit: null };

function aussuchen(sammlung, art, erzwungenerName) {
  if (sammlung[erzwungenerName]) return erzwungenerName;
  const namen = Object.keys(sammlung).filter((n) => n !== zuletzt[art]);
  return (zuletzt[art] = wahl(namen));
}

export function schmecktMir(karte) {
  if (karte) SCHMECKT[aussuchen(SCHMECKT, 'schmeckt', erzwungen.get('effekt'))](karte);
}

export function favoritFeiern(karte) {
  try { localStorage.removeItem(GLANZ_SPEICHER); } catch { /* not essential */ }
  if (karte) FAVORIT[aussuchen(FAVORIT, 'favorit', erzwungen.get('favorit'))](karte);
}

/* ======================= Kleinere Effekte ======================= */

export function plusAnzeigen(chip, anzahl) {
  einmalAnimieren(chip, 'hupf');
  if (chip.hidden) return;
  const r = chip.getBoundingClientRect();
  teilchen(r.left + r.width / 2, r.top, 'plus', {}, `+${anzahl}`);
}

export function kartenServieren(karten) {
  if (!('IntersectionObserver' in window)) return;
  const beobachter = new IntersectionObserver((eintraege) => {
    let reihe = 0;
    for (const e of eintraege) {
      if (!e.isIntersecting) continue;
      e.target.style.setProperty('--verz', `${(reihe++) * 70}ms`);
      e.target.classList.add('serviert');
      beobachter.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const k of karten) {
    k.classList.add('wartet');
    beobachter.observe(k);
  }
}
