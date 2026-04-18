// DungeonForge — Shared Data & Utilities
'use strict';

const THEMES = {
  dungeon: {
    name: "Donjon Classique",
    rooms: ["Salle des gardes","Cachot","Salle d'armes","Chambre du seigneur","Salle du conseil","Salle des tortures","Armurerie","Réserves","Antichambre","Salle des trophées","Chapelle profane","Oubliettes","Salle de banquet","Tour de guet","Passage souterrain"],
    monsters: {
      easy: [
        {name:"Squelettes",cr:"1/4",type:"Mort-vivant",hp:"13",ac:"13"},
        {name:"Gobelins",cr:"1/4",type:"Humanoïde",hp:"7",ac:"15"},
        {name:"Rats géants",cr:"1/8",type:"Bête",hp:"7",ac:"12"},
        {name:"Zombies",cr:"1/4",type:"Mort-vivant",hp:"22",ac:"8"},
        {name:"Kobolds",cr:"1/8",type:"Humanoïde",hp:"5",ac:"12"},
      ],
      medium: [
        {name:"Orques",cr:"1/2",type:"Humanoïde",hp:"15",ac:"13"},
        {name:"Hobgobelins",cr:"1/2",type:"Humanoïde",hp:"11",ac:"18"},
        {name:"Spectres",cr:"1",type:"Mort-vivant",hp:"22",ac:"12"},
        {name:"Trolls",cr:"5",type:"Géant",hp:"84",ac:"15"},
        {name:"Ogres",cr:"2",type:"Géant",hp:"59",ac:"11"},
      ],
      hard: [
        {name:"Vampire spawn",cr:"5",type:"Mort-vivant",hp:"82",ac:"15"},
        {name:"Géant des ombres",cr:"6",type:"Géant",hp:"114",ac:"12"},
        {name:"Nécromancien",cr:"9",type:"Humanoïde",hp:"66",ac:"12"},
        {name:"Démon mineur (Vrock)",cr:"6",type:"Fiélon",hp:"104",ac:"15"},
      ],
      deadly: [
        {name:"Liche",cr:"21",type:"Mort-vivant",hp:"135",ac:"17"},
        {name:"Dragon squelettique",cr:"17",type:"Mort-vivant",hp:"202",ac:"19"},
        {name:"Balor",cr:"19",type:"Fiélon",hp:"262",ac:"19"},
        {name:"Pit Fiend",cr:"20",type:"Fiélon",hp:"300",ac:"19"},
      ]
    },
    traps: ["Dalle à bascule → fosse","Jet de fléchettes empoisonnées","Mur à piques rétractables","Fosse dissimulée (3m)","Gaz soporifique","Boule de feu runique","Hache pendulaire","Salle inondable","Plafond descendant"],
    secrets: ["Passage secret derrière la bibliothèque","Alcôve cachée contenant une armure ancienne","Tunnel menant aux égouts","Chambre forte dissimulée sous le sol","Miroir-portail vers une salle distante","Mécanisme dans la cheminée","Escalier dérobé dans la tapisserie"],
    treasures: ["Coffre de pièces d'or (500 po)","Épée +1 forgée par les nains","Grimoire du nécromancien","Amulette de protection +1","Parchemin de sort niveau 3","Armure de plates elfique","Couronne du seigneur déchu","Anneau de protection"]
  },
  crypt: {
    name: "Crypte Maudite",
    rooms: ["Antichambre funèbre","Salle des sarcophages","Chambre des reliques","Ossuaire","Chambre maudite","Salle des offrandes","Couloir des âmes","Sanctuaire ténébreux","Chambre du patriarche","Galerie des ancêtres","Salle des larmes","Tombeau scellé"],
    monsters: {
      easy: [
        {name:"Zombies",cr:"1/4",type:"Mort-vivant",hp:"22",ac:"8"},
        {name:"Squelettes",cr:"1/4",type:"Mort-vivant",hp:"13",ac:"13"},
        {name:"Ombres",cr:"1/2",type:"Mort-vivant",hp:"16",ac:"12"},
        {name:"Goules",cr:"1",type:"Mort-vivant",hp:"22",ac:"12"},
      ],
      medium: [
        {name:"Banshee",cr:"4",type:"Mort-vivant",hp:"58",ac:"12"},
        {name:"Revenant",cr:"5",type:"Mort-vivant",hp:"136",ac:"13"},
        {name:"Spectres",cr:"1",type:"Mort-vivant",hp:"22",ac:"12"},
        {name:"Momies",cr:"3",type:"Mort-vivant",hp:"58",ac:"11"},
      ],
      hard: [
        {name:"Wraith seigneur",cr:"9",type:"Mort-vivant",hp:"67",ac:"13"},
        {name:"Mummy Lord",cr:"15",type:"Mort-vivant",hp:"97",ac:"17"},
        {name:"Vampire spawn",cr:"5",type:"Mort-vivant",hp:"82",ac:"15"},
      ],
      deadly: [
        {name:"Liche ancienne",cr:"21",type:"Mort-vivant",hp:"135",ac:"17"},
        {name:"Dracoliche",cr:"17",type:"Mort-vivant",hp:"202",ac:"19"},
        {name:"Seigneur des morts",cr:"23",type:"Mort-vivant",hp:"285",ac:"20"},
      ]
    },
    traps: ["Malédiction runique gravée","Nuage de spores mortelles","Lame spectrale invoquée","Cercle de téléportation piégé","Sarcophage animé gardien","Jet de sang maudit","Enchantement de terreur"],
    secrets: ["Tombe secrète d'un héros légendaire","Relique sacrée sous la dalle centrale","Journal du fondateur de la crypte","Portail éthéré dissimulé","Coffre de l'archiviste","Porte runique vers les catacombes","Alcôve contenant une phylactère"],
    treasures: ["Ossuaire d'or massif (800 po)","Anneau de résistance nécrotique","Sceptre du patriarche","Cape de protection des morts","Dague de retour des âmes","Couronne funéraire d'argent","Orbe de divination"]
  },
  cave: {
    name: "Caverne Naturelle",
    rooms: ["Grande salle","Grotte souterraine","Lac souterrain","Salle de cristaux","Repaire de créatures","Tunnel étroit","Chambre géologique","Grotte aux peintures","Crevasse profonde","Salle des champignons","Bassin magique","Terrier géant"],
    monsters: {
      easy: [
        {name:"Araignées géantes",cr:"1",type:"Bête",hp:"26",ac:"14"},
        {name:"Chauves-souris géantes",cr:"1/4",type:"Bête",hp:"22",ac:"13"},
        {name:"Kobolds",cr:"1/8",type:"Humanoïde",hp:"5",ac:"12"},
        {name:"Myconides",cr:"1/2",type:"Plante",hp:"22",ac:"8"},
      ],
      medium: [
        {name:"Ours des cavernes",cr:"2",type:"Bête",hp:"42",ac:"13"},
        {name:"Trolls",cr:"5",type:"Géant",hp:"84",ac:"15"},
        {name:"Derro",cr:"1/4",type:"Humanoïde",hp:"13",ac:"13"},
        {name:"Chuul",cr:"4",type:"Aberration",hp:"93",ac:"16"},
      ],
      hard: [
        {name:"Dragon vert (jeune)",cr:"8",type:"Dragon",hp:"136",ac:"18"},
        {name:"Illithid",cr:"7",type:"Aberration",hp:"71",ac:"12"},
        {name:"Géant des pierres",cr:"7",type:"Géant",hp:"126",ac:"17"},
      ],
      deadly: [
        {name:"Aboleth ancien",cr:"10",type:"Aberration",hp:"135",ac:"17"},
        {name:"Elder Brain",cr:"14",type:"Aberration",hp:"210",ac:"10"},
        {name:"Dragon noir (adulte)",cr:"14",type:"Dragon",hp:"195",ac:"19"},
      ]
    },
    traps: ["Stalactites instables (chute)","Gaz volcanique toxique","Courant souterrain rapide","Piège à mâchoires de pierre","Éboulement déclenché","Sables mouvants souterrains","Champignons explosifs"],
    secrets: ["Veine de mithral dissimulée","Œuf de dragon fossilisé","Porte naine oubliée","Source magique guérisseuse","Sanctuaire drow caché","Cristal de vision lointaine","Passage vers la surface"],
    treasures: ["Pépites de gemmes (600 po)","Cristal de focalisation magique","Armure de cuir draconique","Potion de respiration aquatique","Hache naine +2","Boules de cristal communication","Gants de fouisseur"]
  },
  fortress: {
    name: "Forteresse Naine",
    rooms: ["Grande halle","Forge sacrée","Salle du trône","Armurerie royale","Salle des ancêtres","Chambre des mécanismes","Trésorerie","Quartiers des gardiens","Bibliothèque runique","Salle des réunions","Entrepôt d'armes","Bains thermaux"],
    monsters: {
      easy: [
        {name:"Derro",cr:"1/4",type:"Humanoïde",hp:"13",ac:"13"},
        {name:"Gobelins des profondeurs",cr:"1/4",type:"Humanoïde",hp:"7",ac:"15"},
        {name:"Constructs mineurs",cr:"1/2",type:"Artificiel",hp:"20",ac:"14"},
      ],
      medium: [
        {name:"Duergar",cr:"1",type:"Humanoïde",hp:"26",ac:"16"},
        {name:"Golems d'acier",cr:"9",type:"Artificiel",hp:"178",ac:"18"},
        {name:"Élémentaire de terre",cr:"5",type:"Élémentaire",hp:"126",ac:"17"},
        {name:"Champion duergar",cr:"2",type:"Humanoïde",hp:"39",ac:"16"},
      ],
      hard: [
        {name:"Géant du feu",cr:"9",type:"Géant",hp:"162",ac:"18"},
        {name:"Dragon de bronze (jeune)",cr:"9",type:"Dragon",hp:"152",ac:"18"},
        {name:"Maître forgeron duergar",cr:"6",type:"Humanoïde",hp:"75",ac:"17"},
      ],
      deadly: [
        {name:"Titan forgé",cr:"17",type:"Artificiel",hp:"243",ac:"22"},
        {name:"Dragon ancestral de fer",cr:"22",type:"Dragon",hp:"297",ac:"22"},
        {name:"Primordial de la terre",cr:"20",type:"Élémentaire",hp:"314",ac:"17"},
      ]
    },
    traps: ["Mécanisme à engrenages broyeurs","Canon à vapeur","Porte de fer tombante","Hache mécanique rotative","Décharge runique électrique","Piston hydraulique","Salle pressurisée"],
    secrets: ["Salle du trésor ancestral","Plan original de la forteresse","Arme légendaire scellée dans la forge","Golem gardien endormi","Accès aux mines profondes","Chambre du roi nain oublié","Cache d'artefacts de guerre"],
    treasures: ["Lingots de mithral (1200 po)","Hache de guerre +3 runique","Armure de plaques naine +2","Anneau de résistance au feu","Heaume de pensées télépathiques","Bouclier du roi nain","Enclume de forge magique"]
  },
  temple: {
    name: "Temple Oublié",
    rooms: ["Vestibule sacré","Salle de prière","Sanctuaire intérieur","Salle des rituels","Chambre des prêtres","Bibliothèque sacrée","Salle des offrandes","Chambre de pénitence","Adyton","Crypte des fondateurs","Salle des visions","Jardin intérieur maudit"],
    monsters: {
      easy: [
        {name:"Cultistes",cr:"1/8",type:"Humanoïde",hp:"9",ac:"12"},
        {name:"Ombres sacrées",cr:"1/2",type:"Mort-vivant",hp:"16",ac:"12"},
        {name:"Statues animées",cr:"1/2",type:"Artificiel",hp:"33",ac:"11"},
      ],
      medium: [
        {name:"Fanatiques",cr:"2",type:"Humanoïde",hp:"33",ac:"13"},
        {name:"Spectres sacrés",cr:"1",type:"Mort-vivant",hp:"22",ac:"12"},
        {name:"Yuan-ti malisons",cr:"3",type:"Humanoïde",hp:"66",ac:"12"},
        {name:"Sorcier cultiste",cr:"4",type:"Humanoïde",hp:"49",ac:"12"},
      ],
      hard: [
        {name:"Avatar corrompu",cr:"8",type:"Céleste",hp:"97",ac:"14"},
        {name:"Succube grand-prêtre",cr:"4",type:"Fiélon",hp:"66",ac:"13"},
        {name:"Archidémon",cr:"10",type:"Fiélon",hp:"143",ac:"16"},
      ],
      deadly: [
        {name:"Demi-dieu corrompu",cr:"18",type:"Céleste",hp:"225",ac:"21"},
        {name:"Ancient Empyrean",cr:"23",type:"Céleste",hp:"313",ac:"22"},
        {name:"Archdevil manifesté",cr:"21",type:"Fiélon",hp:"262",ac:"22"},
      ]
    },
    traps: ["Autel maudit (malédiction)","Statue projectile","Sol de feu sacré","Porte scellée par malédiction","Pluie acide bénite","Cercle d'invocation piégé","Illusion mortelle"],
    secrets: ["Texte sacré interdit","Artefact divin dissimulé","Salle de téléportation sacrée","Journal du grand-prêtre fondateur","Idole corrompue sous l'autel","Passage vers le plan divin","Chambre des vœux anciens"],
    treasures: ["Offrandes en or pur (700 po)","Symbole sacré +3","Bâton de guérison divine","Tome de magie divine","Robe de prêtre céleste","Calice de résurrection","Orbe du dieu oublié"]
  }
};

const DIFF_LABELS = {
  easy: {label:'Novice', level:'niv. 1–4', color:'#5a8a3a'},
  medium: {label:'Aventurier', level:'niv. 5–10', color:'#d4a040'},
  hard: {label:'Héroïque', level:'niv. 11–16', color:'#c07030'},
  deadly: {label:'Légendaire', level:'niv. 17+', color:'#c04040'},
};

// Random utilities
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Seed-based RNG (Mulberry32)
function createRng(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function rndSeed(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pickSeed(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// Generate dungeon from config
function generateDungeon(config) {
  const { size, numRooms, themeKey, difficulty, corrDensity, trapChance, seed } = config;
  const rng = createRng(seed);
  const theme = THEMES[themeKey];
  const W = size;

  const grid = Array.from({length: W}, () => Array(W).fill(0));
  const rooms = [];
  let usedNames = [];

  // Place rooms
  let attempts = 0;
  while (rooms.length < numRooms && attempts < 800) {
    attempts++;
    const minS = Math.max(3, Math.floor(W / 10));
    const maxS = Math.max(5, Math.floor(W / 4));
    const rw = rndSeed(rng, minS, maxS);
    const rh = rndSeed(rng, minS, maxS);
    const rx = rndSeed(rng, 1, W - rw - 2);
    const ry = rndSeed(rng, 1, W - rh - 2);

    let overlap = false;
    for (const r of rooms) {
      if (rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y) {
        overlap = true; break;
      }
    }
    if (!overlap) {
      const cx = rx + Math.floor(rw / 2);
      const cy = ry + Math.floor(rh / 2);

      let type = 'normal';
      if (rooms.length === 0) type = 'entry';
      else if (rooms.length === numRooms - 1) type = 'boss';
      else {
        const roll = rng();
        if (roll < trapChance * 0.4) type = 'trap';
        else if (roll < trapChance * 0.7) type = 'secret';
        else if (roll < trapChance * 0.7 + 0.15) type = 'special';
      }

      // Unique room name
      let availNames = theme.rooms.filter(n => !usedNames.includes(n));
      if (!availNames.length) availNames = theme.rooms;
      const name = pickSeed(rng, availNames);
      usedNames.push(name);

      const monsters = (type === 'entry') ? [] :
        (rng() > 0.25 ? [pickSeed(rng, theme.monsters[difficulty])] : []);
      const traps = (type === 'trap' || rng() < trapChance * 0.3) ? [pickSeed(rng, theme.traps)] : [];
      const secrets = (type === 'secret' || rng() < 0.12) ? [pickSeed(rng, theme.secrets)] : [];
      const treasure = (type === 'boss' || type === 'special' || rng() < 0.2) ? [pickSeed(rng, theme.treasures)] : [];

      rooms.push({ x:rx, y:ry, w:rw, h:rh, cx, cy, type, name, monsters, traps, secrets, treasure, id: rooms.length + 1, notes: '' });
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) grid[y][x] = 1;
    }
  }

  // Connect rooms (spanning tree)
  const connected = new Set([0]);
  const pending = Array.from({length: rooms.length - 1}, (_, i) => i + 1);
  const corridors = [];

  while (pending.length) {
    let best = { dist: Infinity, from: -1, to: -1 };
    for (const f of connected) {
      for (const t of pending) {
        const d = Math.abs(rooms[f].cx - rooms[t].cx) + Math.abs(rooms[f].cy - rooms[t].cy);
        if (d < best.dist) best = { dist: d, from: f, to: t };
      }
    }
    if (best.from < 0) break;
    carveCorr(grid, rooms, corridors, best.from, best.to, rng);
    connected.add(best.to);
    pending.splice(pending.indexOf(best.to), 1);
  }

  // Extra corridors
  const extra = Math.floor(corrDensity * rooms.length * 0.5);
  for (let i = 0; i < extra; i++) {
    const a = rndSeed(rng, 0, rooms.length - 1);
    const b = rndSeed(rng, 0, rooms.length - 1);
    if (a !== b) carveCorr(grid, rooms, corridors, a, b, rng);
  }

  return { grid, rooms, corridors, W, themeKey, difficulty, seed, config };
}

function carveCorr(grid, rooms, corridors, ai, bi, rng) {
  const a = rooms[ai], b = rooms[bi];
  const W = grid.length;
  let x = a.cx, y = a.cy;
  const horiz = rng() > 0.5;
  if (horiz) {
    while (x !== b.cx) { if (x >= 0 && x < W && y >= 0 && y < W && grid[y][x] !== 1) grid[y][x] = 2; x += x < b.cx ? 1 : -1; }
    while (y !== b.cy) { if (x >= 0 && x < W && y >= 0 && y < W && grid[y][x] !== 1) grid[y][x] = 2; y += y < b.cy ? 1 : -1; }
  } else {
    while (y !== b.cy) { if (x >= 0 && x < W && y >= 0 && y < W && grid[y][x] !== 1) grid[y][x] = 2; y += y < b.cy ? 1 : -1; }
    while (x !== b.cx) { if (x >= 0 && x < W && y >= 0 && y < W && grid[y][x] !== 1) grid[y][x] = 2; x += x < b.cx ? 1 : -1; }
  }
  corridors.push({ from: ai, to: bi });
}

// Save/load dungeon to localStorage
function saveDungeon(dungeon) {
  const key = `df_dungeon_${dungeon.seed}`;
  const history = loadHistory();
  const entry = {
    seed: dungeon.seed,
    theme: dungeon.themeKey,
    difficulty: dungeon.difficulty,
    rooms: dungeon.rooms.length,
    size: dungeon.W,
    date: new Date().toISOString(),
    rooms_data: dungeon.rooms,
  };
  history.unshift(entry);
  if (history.length > 10) history.length = 10;
  localStorage.setItem('df_history', JSON.stringify(history));
  localStorage.setItem('df_current', JSON.stringify(dungeon));
  return key;
}

function loadCurrent() {
  try { return JSON.parse(localStorage.getItem('df_current')); } catch { return null; }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('df_history')) || []; } catch { return []; }
}

function showToast(msg, duration = 2500) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// Generate a random seed
function newSeed() { return Math.floor(Math.random() * 99999) + 10000; }
