// e-Ticket RDC · logique commune du site (aucune dépendance, aucun build).
import { motifKuba, zoneQR, phaseA, signeDuMoment, fnv1a, PHASE_MS, CELL } from './kuba.js';

export const TAUX = 2850; // CDF pour 1 USD, indicatif
export const MAX_BILLETS = 4;

/* ---------- Icônes (traits 24 × 24) ---------- */
export const IC = {
  cal: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12 M18 6L6 18',
  minus: 'M5 12h14',
  plus: 'M12 5v14 M5 12h14',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.5v.5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M12 8v5 M12 16v.5',
  shieldOk: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  wallet: 'M3 7h18v13H3z M3 7l13-4v4 M16 13h2',
  chat: 'M4 20l1.3-3.9A8 8 0 1 1 8 19z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  wifiOff: 'M2 8.5a15 15 0 0 1 4-2.4 M22 8.5A15 15 0 0 0 10.5 5 M5 12.5a10 10 0 0 1 3.5-2 M19 12.5a10 10 0 0 0-2.7-1.7 M8.5 16a5 5 0 0 1 7 0 M12 20h0 M3 3l18 18',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  music: 'M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  ball: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7l4 3-1.5 4.5h-5L8 10z',
  tent: 'M3 20L12 4l9 16z M12 4v16 M9 20l3-6 3 6',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z M5 11a7 7 0 0 0 14 0 M12 18v3',
  mask: 'M4 5h16v6a8 8 0 0 1-16 0z M8.5 10h1 M14.5 10h1 M9 14a4 4 0 0 0 6 0',
  fire: 'M12 3l3 6-3 3-3-3z M6 21h12',
};

export function icone(nom, taille = 20, epaisseur = 2) {
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${epaisseur}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[nom]}"/></svg>`;
}

/* ---------- Données de démonstration ---------- */
export const CATEGORIES = [
  { id: 'concert', nom: 'Concerts', icone: 'music', bg: '#C8102E', fg: '#FBF5E6' },
  { id: 'football', nom: 'Football', icone: 'ball', bg: '#1E8FFF', fg: '#14120E' },
  { id: 'festival', nom: 'Festivals', icone: 'tent', bg: '#FFD21F', fg: '#14120E' },
  { id: 'conference', nom: 'Conférences', icone: 'mic', bg: '#14120E', fg: '#FFD21F' },
  { id: 'spectacle', nom: 'Spectacles', icone: 'mask', bg: '#F1E6CC', fg: '#14120E' },
];

export const EVENEMENTS = [
  { id: 'EVT-RUMBA-1411', titre: 'Nuit de la Rumba', artiste: 'Kin Malebo Orchestra et invités', cat: 'concert', genre: 'Rumba congolaise', ville: 'Kinshasa', lieu: 'Stade des Martyrs', jour: '14', mois: 'nov.', quand: 'Sam. 14 nov. · 20:00', des: 25000, alerte: '' },
  { id: 'EVT-AFRO-1311', titre: 'Afrobeat Session', artiste: 'DJ Mama Kasa, Mbote Sound', cat: 'concert', genre: 'Afrobeat', ville: 'Kinshasa', lieu: 'Halle de la Gombe', jour: '13', mois: 'nov.', quand: 'Ven. 13 nov. · 21:00', des: 30000, alerte: 'Plus que 40 places' },
  { id: 'EVT-GALA-1511', titre: 'Match de gala : Légendes vs Kin Sélection', artiste: 'Football', cat: 'football', genre: 'Match amical', ville: 'Kinshasa', lieu: 'Stade Tata Raphaël', jour: '15', mois: 'nov.', quand: 'Dim. 15 nov. · 15:30', des: 5000, alerte: '' },
  { id: 'EVT-FORUM-1711', titre: 'Kinshasa Digital Forum', artiste: 'Conférences et ateliers', cat: 'conference', genre: 'Tech', ville: 'Kinshasa', lieu: 'Centre Wallonie-Bruxelles', jour: '17', mois: 'nov.', quand: 'Mar. 17 nov. · 09:00', des: 0, alerte: '' },
  { id: 'EVT-THEA-1911', titre: 'Mokili ya sika', artiste: 'Théâtre', cat: 'spectacle', genre: 'Théâtre', ville: 'Kinshasa', lieu: 'Espace Tarmac des Auteurs', jour: '19', mois: 'nov.', quand: 'Jeu. 19 nov. · 19:00', des: 8000, alerte: '' },
  { id: 'EVT-LUSHI-2011', titre: 'Katanga Afro Night', artiste: 'Afrobeat et ndombolo', cat: 'concert', genre: 'Afrobeat', ville: 'Lubumbashi', lieu: 'Halle de l’Étoile', jour: '20', mois: 'nov.', quand: 'Ven. 20 nov. · 21:00', des: 20000, alerte: '' },
  { id: 'EVT-DERBY-2211', titre: 'Derby du Katanga', artiste: 'Football', cat: 'football', genre: 'Championnat', ville: 'Lubumbashi', lieu: 'Stade Frédéric Kibassa Maliba', jour: '22', mois: 'nov.', quand: 'Dim. 22 nov. · 15:00', des: 3000, alerte: 'Presque complet' },
  { id: 'EVT-LACS-2811', titre: 'Festival des Grands Lacs', artiste: 'Musique, danse, slam', cat: 'festival', genre: 'Festival', ville: 'Goma', lieu: 'Esplanade du lac Kivu', jour: '28', mois: 'nov.', quand: 'Sam. 28 nov. · 14:00', des: 10000, alerte: '' },
  { id: 'EVT-FLEUVE-2111', titre: 'Festival Fleuve Congo', artiste: 'Trois scènes, vingt artistes', cat: 'festival', genre: 'Festival', ville: 'Kinshasa', lieu: 'Esplanade du Palais du Peuple', jour: '21', mois: 'nov.', quand: 'Sam. 21 nov. · 14:00', des: 10000, alerte: '' },
];

export const BILLETS_EVT = [
  { k: 'vip', nom: 'VIP', desc: 'Devant la scène, boisson offerte', prix: 150000, reste: 12 },
  { k: 'early', nom: 'Early Bird', desc: 'Tarif de lancement', prix: 25000, reste: 0 },
  { k: 'std', nom: 'Standard', desc: 'Pelouse, debout', prix: 50000, reste: 860 },
  { k: 'grad', nom: 'Gradins', desc: 'Tribune latérale, assis', prix: 15000, reste: 1450 },
];

export const OPERATEURS = [
  { k: 'airtel', nom: 'Airtel Money', prefixes: ['97', '98', '99'], bg: '#E40000', fg: '#FFFFFF', ussd: '*501#' },
  { k: 'mpesa', nom: 'M-Pesa', prefixes: ['81', '82', '83'], bg: '#007A3D', fg: '#FFFFFF', ussd: '' },
  { k: 'orange', nom: 'Orange Money', prefixes: ['84', '85', '89', '80'], bg: '#FF7900', fg: '#14120E', ussd: '' },
  { k: 'afrimoney', nom: 'Afrimoney', prefixes: ['90', '91'], bg: '#5A2D82', fg: '#FFFFFF', ussd: '' },
];
// Préfixes à confirmer auprès des opérateurs avant la mise en production.
export function operateurDuNumero(chiffres) {
  const p = chiffres.replace(/\D/g, '').slice(0, 2);
  return OPERATEURS.find((o) => o.prefixes.includes(p)) || null;
}

/* ---------- Formats ---------- */
export const cdf = (n) => (n === 0 ? 'Gratuit' : n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' CDF');
export const usd = (n) => (n === 0 ? 'sur inscription' : '≈ ' + Math.max(1, Math.round(n / TAUX)).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' USD');
export function formaterTel(chiffres) {
  const d = chiffres.replace(/\D/g, '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

/* ---------- Motifs ---------- */
export function motifSVGInline(id, { cols = 11, rows = 11, trou = false, phase = 0, souffle = false, qr = false, label = '' } = {}) {
  const m = motifKuba(id, { cols, rows, trou, phase });
  const w = cols * CELL, h = rows * CELL;
  const couches = m.chemins.map((d, i) => d
    ? `<path d="${d}" fill="${m.couleurs[i]}" fill-rule="evenodd"${souffle ? ` class="souffle" style="animation-delay:${-3 * i}s"` : ''}/>`
    : '').join('');
  let centre = '';
  if (qr && trou) {
    const z = zoneQR(cols);
    centre = `<rect x="${z.x}" y="${z.y}" width="${z.taille}" height="${z.taille}" fill="#FFFFFF"/><path d="${cheminQR(id, z.taille, z.x)}" fill="#000000"/>`;
  }
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" ${aria}><rect width="${w}" height="${h}" fill="${m.fond}"/>${couches}${centre}</svg>`;
}

// QR de démonstration : l'application réelle encode la charge utile signée avec une vraie librairie QR.
function cheminQR(id, taille, decalage) {
  const n = 25, m = taille / 33, o = decalage + 4 * m;
  const g = Array.from({ length: n }, () => new Array(n).fill(false));
  const reserve = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9) || x === 6 || y === 6 || (x >= 16 && x <= 20 && y >= 16 && y <= 20);
  let s = fnv1a('qr:' + id);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (reserve(x, y)) continue;
    s = Math.imul(s ^ (s >>> 13), 0x5bd1e995) >>> 0;
    g[y][x] = (s & 3) < 2;
  }
  const oeil = (fx, fy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) g[fy + y][fx + x] = x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
  };
  oeil(0, 0); oeil(n - 7, 0); oeil(0, n - 7);
  for (let i = 8; i < n - 8; i++) { g[6][i] = i % 2 === 0; g[i][6] = i % 2 === 0; }
  for (let y = 16; y <= 20; y++) for (let x = 16; x <= 20; x++) g[y][x] = x === 16 || x === 20 || y === 16 || y === 20 || (x === 18 && y === 18);
  const r = (v) => Math.round(v * 100) / 100;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (g[y][x]) d += `M${r(o + x * m)} ${r(o + y * m)}h${r(m + 0.05)}v${r(m + 0.05)}h-${r(m + 0.05)}Z`;
  return d;
}

/* ---------- Billet vivant ---------- */
export function monterBillet(el, billet, { arrive = false } = {}) {
  const evt = EVENEMENTS.find((e) => e.id === billet.evt) || EVENEMENTS[0];
  el.innerHTML = `
    <article class="billet${arrive ? ' arrive' : ''}" aria-label="Billet ${evt.titre}, ${billet.categorie}">
      <div class="tete">
        <div class="rangee entre"><span class="affiche" style="font-size:20px">e-Ticket</span><span class="badge" style="background:#FFD21F;color:#14120E">${billet.categorie} · 1 personne</span></div>
        <div class="affiche">${evt.titre}</div>
        <div style="font-weight:700">${evt.artiste}</div>
        <div style="font-size:14px">${evt.quand}<br>${evt.lieu}, ${evt.ville}</div>
      </div>
      <div class="decoupe"><i></i></div>
      <div class="motif" data-motif></div>
      <div class="phase">
        <div class="jauge" role="progressbar" aria-label="Temps avant le prochain motif" aria-valuemin="0" aria-valuemax="30"><i data-jauge></i></div>
        <div class="rangee entre"><span class="doux">Motif vivant · change dans <b data-reste style="color:var(--encre)">30 s</b></span><span class="signe" data-signe></span></div>
      </div>
      <div class="details">
        <div><span class="doux">Titulaire</span><b>${billet.titulaire}</b></div>
        <div><span class="doux">Entrée</span><b>${billet.entree}</b></div>
        <div><span class="doux">Billet n°</span><b>${billet.id}</b></div>
        <div><span class="doux">Prix payé</span><b>${cdf(billet.prix)}</b></div>
      </div>
      <div class="note note-info horsligne">${icone('download', 20, 2.2)}Enregistré sur ce téléphone · marche sans internet</div>
    </article>`;
  const zoneMotif = el.querySelector('[data-motif]');
  const jauge = el.querySelector('[data-jauge]');
  const reste = el.querySelector('[data-reste]');
  const signeEl = el.querySelector('[data-signe]');
  let phaseAffichee = null;
  const tic = () => {
    const now = Date.now() + (billet.decalageMs || 0);
    const phase = phaseA(now);
    const ecoule = Math.floor(now / 1000) % 30;
    jauge.style.width = Math.round(((ecoule + 1) / 30) * 100) + '%';
    jauge.parentElement.setAttribute('aria-valuenow', String(ecoule));
    reste.textContent = (30 - ecoule) + ' s';
    if (phase !== phaseAffichee) {
      phaseAffichee = phase;
      zoneMotif.innerHTML = motifSVGInline(billet.id, { trou: true, qr: true, phase, souffle: true, label: `QR code du billet ${billet.id} entouré de son motif vivant` });
      const s = signeDuMoment(evt.id, phase);
      signeEl.innerHTML = `<i style="background:${s.couleur};transform:rotate(${s.forme === 'losange' ? 45 : 0}deg)"></i>${s.nom}`;
    }
  };
  tic();
  const minuterie = setInterval(tic, 1000);
  return () => clearInterval(minuterie);
}

/* ---------- Stockage (toujours protégé : navigation privée, stockage bloqué) ---------- */
export function lire(cle, defaut) {
  try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch { return defaut; }
}
export function ecrire(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* sans stockage, le site marche quand même */ }
}

/* ---------- Thème et langue (en-tête commun) ---------- */
const TEXTES = {
  fr: { evenements: 'Événements', billets: 'Mes billets', orga: 'Organisateurs', connexion: 'Se connecter' },
  ln: { evenements: 'Makambo', billets: 'Batike na ngai', orga: 'Babongisi', connexion: 'Kota' },
  sw: { evenements: 'Matukio', billets: 'Tiketi zangu', orga: 'Waandaaji', connexion: 'Ingia' },
};

export function initEntete() {
  const racine = document.documentElement;
  const theme = lire('et-theme', null);
  if (theme) racine.dataset.theme = theme;
  const bouton = document.querySelector('[data-theme-toggle]');
  const sombreActif = () => racine.dataset.theme === 'dark' || (!racine.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const majBouton = () => {
    if (!bouton) return;
    const sombre = sombreActif();
    bouton.innerHTML = icone(sombre ? 'sun' : 'moon', 22);
    bouton.setAttribute('aria-label', sombre ? 'Passer en mode clair' : 'Passer en mode sombre');
  };
  bouton?.addEventListener('click', () => {
    racine.dataset.theme = sombreActif() ? 'light' : 'dark';
    ecrire('et-theme', racine.dataset.theme);
    majBouton();
  });
  majBouton();

  const langue = document.querySelector('[data-langue]');
  const appliquer = (l) => {
    document.querySelectorAll('[data-t]').forEach((n) => { const t = TEXTES[l]?.[n.dataset.t]; if (t) n.textContent = t; });
    racine.lang = l === 'fr' ? 'fr' : l;
  };
  if (langue) {
    langue.value = lire('et-langue', 'fr');
    appliquer(langue.value);
    langue.addEventListener('change', () => { ecrire('et-langue', langue.value); appliquer(langue.value); });
  }

  // Bandeau réseau : la connexion coupe souvent, on le dit clairement.
  const bandeau = document.querySelector('[data-reseau]');
  const majReseau = () => bandeau?.classList.toggle('cache', navigator.onLine);
  addEventListener('online', majReseau); addEventListener('offline', majReseau); majReseau();
}

export { PHASE_MS };
