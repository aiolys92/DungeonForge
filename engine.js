'use strict';

// ============================================================
// DUNGEONFORGE v2 — Generation Engine
// ============================================================

// --- Seeded RNG (Mulberry32) ---
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function rndR(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pickR(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// Tile types
const T = {
  WALL: 0, FLOOR: 1, CORRIDOR: 2,
  DOOR: 3, DOOR_LOCKED: 4, DOOR_SECRET: 5,
  WATER: 6, LAVA: 7, STAIRS_DOWN: 8, STAIRS_UP: 9,
  PILLAR: 10, CHEST: 11, ALTAR: 12, TRAP: 13
};

// ============================================================
// ALGORITHM 1 — BSP (Binary Space Partitioning)
// ============================================================
function generateBSP(W, H, rng, opts = {}) {
  const {
    minRoomSize = 4, maxRoomSize = 12,
    minSplit = 8, extraCorridors = 0.3,
    doorChance = 0.7, pillarChance = 0.15
  } = opts;

  const grid = Array.from({ length: H }, () => Array(W).fill(T.WALL));
  const rooms = [];

  // BSP tree node
  class Node {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.left = null; this.right = null;
      this.room = null;
    }
    split() {
      if (this.left || this.right) return false;
      const splitH = rng() > 0.5;
      let maxSplit = (splitH ? this.h : this.w) - minSplit;
      if (maxSplit < minSplit) return false;
      const at = rndR(rng, minSplit, maxSplit);
      if (splitH) {
        this.left  = new Node(this.x, this.y, this.w, at);
        this.right = new Node(this.x, this.y + at, this.w, this.h - at);
      } else {
        this.left  = new Node(this.x, this.y, at, this.h);
        this.right = new Node(this.x + at, this.y, this.w - at, this.h);
      }
      return true;
    }
    getRoom() {
      if (this.room) return this.room;
      if (this.left && this.right) {
        const l = this.left.getRoom(), r = this.right.getRoom();
        return rng() > 0.5 ? l : r;
      }
      return this.left ? this.left.getRoom() : this.right ? this.right.getRoom() : null;
    }
  }

  const root = new Node(1, 1, W - 2, H - 2);
  const nodes = [root];
  for (let i = 0; i < 8; i++) {
    nodes.forEach(n => { if (n.split()) { nodes.push(n.left, n.right); } });
  }

  // Place rooms in leaf nodes
  let roomId = 1;
  nodes.filter(n => !n.left && !n.right).forEach(n => {
    const rw = rndR(rng, minRoomSize, Math.min(maxRoomSize, n.w - 2));
    const rh = rndR(rng, minRoomSize, Math.min(maxRoomSize, n.h - 2));
    const rx = n.x + rndR(rng, 1, n.w - rw - 1);
    const ry = n.y + rndR(rng, 1, n.h - rh - 1);
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++)
        grid[y][x] = T.FLOOR;
    const room = {
      id: roomId++, x: rx, y: ry, w: rw, h: rh,
      cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2),
      type: 'normal', connections: []
    };
    rooms.push(room);
    n.room = room;
    // Pillars in large rooms
    if (pillarChance > rng() && rw >= 6 && rh >= 6) {
      const px = [rx + 2, rx + rw - 3];
      const py = [ry + 2, ry + rh - 3];
      px.forEach(x => py.forEach(y => { grid[y][x] = T.PILLAR; }));
    }
  });

  // Connect siblings via corridors
  function connectNodes(node) {
    if (!node.left || !node.right) return;
    connectNodes(node.left);
    connectNodes(node.right);
    const a = node.left.getRoom(), b = node.right.getRoom();
    if (a && b) carveCorridor(grid, a.cx, a.cy, b.cx, b.cy, rng, doorChance);
  }
  connectNodes(root);

  // Extra corridors for loops
  if (extraCorridors > 0) {
    const extra = Math.floor(rooms.length * extraCorridors);
    for (let i = 0; i < extra; i++) {
      const a = pickR(rng, rooms), b = pickR(rng, rooms);
      if (a !== b) carveCorridor(grid, a.cx, a.cy, b.cx, b.cy, rng, 0.3);
    }
  }

  assignRoomTypes(rooms, rng);
  return { grid, rooms, W, H, algo: 'bsp' };
}

// ============================================================
// ALGORITHM 2 — Drunk Walk / Digger
// ============================================================
function generateDrunkWalk(W, H, rng, opts = {}) {
  const {
    fillTarget = 0.38, diggers = 3,
    roomCount = 8, doorChance = 0.4
  } = opts;

  const grid = Array.from({ length: H }, () => Array(W).fill(T.WALL));
  const total = W * H;
  let carved = 0;

  const DIRS = [[0,-1],[0,1],[-1,0],[1,0]];

  // Multiple diggers for more interesting shapes
  for (let d = 0; d < diggers; d++) {
    let x = rndR(rng, 5, W - 6), y = rndR(rng, 5, H - 6);
    let steps = Math.floor(total * fillTarget / diggers);
    let lastDir = null;
    while (steps-- > 0) {
      if (grid[y][x] === T.WALL) { grid[y][x] = T.FLOOR; carved++; }
      // Biased random walk (prefer straight lines)
      let dir;
      if (lastDir && rng() > 0.35) {
        dir = lastDir;
      } else {
        dir = pickR(rng, DIRS);
      }
      const nx = x + dir[0], ny = y + dir[1];
      if (nx > 1 && nx < W-2 && ny > 1 && ny < H-2) { x = nx; y = ny; }
      lastDir = dir;
    }
  }

  // Detect open areas as "rooms"
  const rooms = detectRooms(grid, W, H, roomCount, rng);
  assignRoomTypes(rooms, rng);

  // Add doors at bottlenecks
  addNaturalDoors(grid, W, H, rng, doorChance);

  return { grid, rooms, W, H, algo: 'drunk' };
}

// ============================================================
// ALGORITHM 3 — Cellular Automata (cave-like)
// ============================================================
function generateCellular(W, H, rng, opts = {}) {
  const {
    fillProb = 0.48, iterations = 5,
    birthLimit = 4, deathLimit = 3,
    roomCount = 6
  } = opts;

  let grid = Array.from({ length: H }, () =>
    Array.from({ length: W }, (_, x) =>
      x === 0 || x === W-1 || y === 0 ? T.WALL :
      (rng() < fillProb ? T.WALL : T.FLOOR)
    )
  );

  // Fix: proper CA generation
  grid = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      if (x === 0 || x === W-1 || y === 0 || y === H-1) return T.WALL;
      return rng() < fillProb ? T.WALL : T.FLOOR;
    })
  );

  // Smooth iterations
  for (let iter = 0; iter < iterations; iter++) {
    const next = grid.map(row => [...row]);
    for (let y = 1; y < H-1; y++) {
      for (let x = 1; x < W-1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (grid[y+dy][x+dx] === T.WALL) walls++;
        if (grid[y][x] === T.WALL)
          next[y][x] = walls >= deathLimit ? T.WALL : T.FLOOR;
        else
          next[y][x] = walls > birthLimit ? T.WALL : T.FLOOR;
      }
    }
    grid = next;
  }

  // Flood fill to keep largest connected region
  grid = keepLargestRegion(grid, W, H);

  const rooms = detectRooms(grid, W, H, roomCount, rng);
  assignRoomTypes(rooms, rng);
  addNaturalDoors(grid, W, H, rng, 0.2);

  return { grid, rooms, W, H, algo: 'cellular' };
}

// ============================================================
// ALGORITHM 4 — Rooms & Mazes
// ============================================================
function generateRoomsAndMazes(W, H, rng, opts = {}) {
  const {
    roomCount = 10, minRoom = 3, maxRoom = 9,
    extraCorridors = 0.05, doorChance = 0.8
  } = opts;

  // Force odd dimensions
  const GW = W % 2 === 0 ? W - 1 : W;
  const GH = H % 2 === 0 ? H - 1 : H;
  const grid = Array.from({ length: GH }, () => Array(GW).fill(T.WALL));
  const rooms = [];

  // Place rooms (odd positions only for maze compatibility)
  let attempts = 0, roomId = 1;
  while (rooms.length < roomCount && attempts++ < 500) {
    let rw = rndR(rng, minRoom, maxRoom); if (rw % 2 === 0) rw++;
    let rh = rndR(rng, minRoom, maxRoom); if (rh % 2 === 0) rh++;
    let rx = rndR(rng, 1, GW - rw - 2); if (rx % 2 === 0) rx++;
    let ry = rndR(rng, 1, GH - rh - 2); if (ry % 2 === 0) ry++;
    let ok = true;
    for (const r of rooms)
      if (rx < r.x+r.w+2 && rx+rw+2 > r.x && ry < r.y+r.h+2 && ry+rh+2 > r.y) { ok = false; break; }
    if (ok) {
      for (let y = ry; y < ry+rh; y++) for (let x = rx; x < rx+rw; x++) grid[y][x] = T.FLOOR;
      rooms.push({ id: roomId++, x:rx, y:ry, w:rw, h:rh, cx:rx+Math.floor(rw/2), cy:ry+Math.floor(rh/2), type:'normal', connections:[] });
    }
  }

  // Recursive backtracker maze in remaining space
  const visited = Array.from({ length: GH }, () => Array(GW).fill(false));
  function carveMaze(x, y) {
    visited[y][x] = true;
    grid[y][x] = T.CORRIDOR;
    const dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(() => rng() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x+dx, ny = y+dy;
      if (nx > 0 && nx < GW-1 && ny > 0 && ny < GH-1 && !visited[ny][nx] && grid[ny][nx] === T.WALL) {
        grid[y+dy/2][x+dx/2] = T.CORRIDOR;
        carveMaze(nx, ny);
      }
    }
  }
  for (let y = 1; y < GH-1; y += 2)
    for (let x = 1; x < GW-1; x += 2)
      if (!visited[y][x] && grid[y][x] === T.WALL) carveMaze(x, y);

  // Connect rooms to maze
  for (const r of rooms) {
    const exits = [];
    for (let x = r.x; x < r.x+r.w; x++) {
      if (r.y > 1 && grid[r.y-1][x] === T.CORRIDOR) exits.push([x, r.y-1]);
      if (r.y+r.h < GH-1 && grid[r.y+r.h][x] === T.CORRIDOR) exits.push([x, r.y+r.h]);
    }
    for (let y = r.y; y < r.y+r.h; y++) {
      if (r.x > 1 && grid[y][r.x-1] === T.CORRIDOR) exits.push([r.x-1, y]);
      if (r.x+r.w < GW-1 && grid[y][r.x+r.w] === T.CORRIDOR) exits.push([r.x+r.w, y]);
    }
    if (exits.length) {
      const [ex, ey] = pickR(rng, exits);
      grid[ey][ex] = doorChance > rng() ? T.DOOR : T.CORRIDOR;
    }
  }

  // Remove dead ends (optional — makes it less maze-like)
  if (extraCorridors < 0.1) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let y = 1; y < GH-1; y++) for (let x = 1; x < GW-1; x++) {
        if (grid[y][x] !== T.CORRIDOR) continue;
        let nb = 0;
        [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy]) => { if (grid[y+dy][x+dx] !== T.WALL) nb++; });
        if (nb === 1) { grid[y][x] = T.WALL; changed = true; }
      }
    }
  }

  assignRoomTypes(rooms, rng);
  return { grid:grid, rooms, W:GW, H:GH, algo: 'maze' };
}

// ============================================================
// SHARED UTILITIES
// ============================================================

function carveCorridor(grid, x1, y1, x2, y2, rng, doorChance = 0.5) {
  const H = grid.length, W = grid[0].length;
  const set = (x, y, type) => { if (x>0&&x<W-1&&y>0&&y<H-1&&grid[y][x]===T.WALL) grid[y][x]=type; };
  const setC = (x, y) => { if (x>0&&x<W-1&&y>0&&y<H-1&&grid[y][x]!==T.FLOOR) grid[y][x]=T.CORRIDOR; };

  let x = x1, y = y1;
  if (rng() > 0.5) {
    while (x !== x2) { setC(x, y); x += x < x2 ? 1 : -1; }
    while (y !== y2) { setC(x, y); y += y < y2 ? 1 : -1; }
  } else {
    while (y !== y2) { setC(x, y); y += y < y2 ? 1 : -1; }
    while (x !== x2) { setC(x, y); x += x < x2 ? 1 : -1; }
  }

  // Place door at junction
  if (doorChance > rng()) {
    const mx = Math.floor((x1+x2)/2), my = Math.floor((y1+y2)/2);
    if (grid[my][mx] === T.CORRIDOR) {
      const r = rng();
      grid[my][mx] = r < 0.1 ? T.DOOR_LOCKED : r < 0.2 ? T.DOOR_SECRET : T.DOOR;
    }
  }
}

function keepLargestRegion(grid, W, H) {
  const visited = Array.from({length:H}, ()=>Array(W).fill(false));
  const regions = [];
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (!visited[y][x] && grid[y][x]===T.FLOOR) {
      const region = [];
      const q = [[x,y]];
      visited[y][x] = true;
      while (q.length) {
        const [cx,cy] = q.shift();
        region.push([cx,cy]);
        for (const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
          const nx=cx+dx,ny=cy+dy;
          if (nx>=0&&nx<W&&ny>=0&&ny<H&&!visited[ny][nx]&&grid[ny][nx]===T.FLOOR) {
            visited[ny][nx]=true; q.push([nx,ny]);
          }
        }
      }
      regions.push(region);
    }
  }
  if (!regions.length) return grid;
  const largest = regions.sort((a,b)=>b.length-a.length)[0];
  const largeSet = new Set(largest.map(([x,y])=>y*W+x));
  return grid.map((row,y)=>row.map((c,x)=>c===T.FLOOR&&!largeSet.has(y*W+x)?T.WALL:c));
}

function detectRooms(grid, W, H, maxRooms, rng) {
  const visited = Array.from({length:H},()=>Array(W).fill(false));
  const regions = [];
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
    if (!visited[y][x]&&grid[y][x]===T.FLOOR) {
      const cells=[];
      const q=[[x,y]]; visited[y][x]=true;
      while(q.length){
        const[cx,cy]=q.shift(); cells.push([cx,cy]);
        for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0]]){
          const nx=cx+dx,ny=cy+dy;
          if(nx>0&&nx<W-1&&ny>0&&ny<H-1&&!visited[ny][nx]&&grid[ny][nx]===T.FLOOR){
            visited[ny][nx]=true;q.push([nx,ny]);
          }
        }
      }
      if(cells.length>=4) regions.push(cells);
    }
  }
  regions.sort((a,b)=>b.length-a.length);
  const rooms=[];
  for(let i=0;i<Math.min(maxRooms,regions.length);i++){
    const cells=regions[i];
    const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    rooms.push({
      id:i+1, x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,
      cx:Math.floor((minX+maxX)/2),cy:Math.floor((minY+maxY)/2),
      type:'normal',connections:[],cells
    });
  }
  return rooms;
}

function addNaturalDoors(grid, W, H, rng, chance) {
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++) {
    if(grid[y][x]!==T.FLOOR) continue;
    const hWall = grid[y][x-1]===T.WALL && grid[y][x+1]===T.WALL && grid[y-1][x]===T.FLOOR && grid[y+1][x]===T.FLOOR;
    const vWall = grid[y-1][x]===T.WALL && grid[y+1][x]===T.WALL && grid[y][x-1]===T.FLOOR && grid[y][x+1]===T.FLOOR;
    if((hWall||vWall) && rng()<chance) grid[y][x] = rng()<0.15?T.DOOR_LOCKED:T.DOOR;
  }
}

function assignRoomTypes(rooms, rng) {
  if (!rooms.length) return;
  rooms[0].type = 'entry';
  // Find furthest room for boss
  let maxDist = 0, bossIdx = rooms.length - 1;
  for (let i = 1; i < rooms.length; i++) {
    const d = Math.abs(rooms[i].cx - rooms[0].cx) + Math.abs(rooms[i].cy - rooms[0].cy);
    if (d > maxDist) { maxDist = d; bossIdx = i; }
  }
  rooms[bossIdx].type = 'boss';
  // Assign other types
  for (let i = 1; i < rooms.length; i++) {
    if (i === bossIdx) continue;
    const r = rng();
    if (r < 0.08) rooms[i].type = 'secret';
    else if (r < 0.18) rooms[i].type = 'trap';
    else if (r < 0.26) rooms[i].type = 'special';
    else rooms[i].type = 'normal';
  }
}

// ============================================================
// MASTER GENERATOR
// ============================================================
function generateDungeon(config) {
  const {
    algo = 'bsp', W = 60, H = 60,
    seed, themeKey = 'dungeon', difficulty = 'medium',
    corrDensity = 0.5, trapChance = 0.3,
    pillarChance = 0.15, waterRooms = false
  } = config;

  const rng = makeRng(seed);
  const numRooms = config.numRooms || 10;

  const algoOpts = {
    minRoomSize: 4, maxRoomSize: Math.max(6, Math.floor(W/6)),
    minSplit: Math.max(7, Math.floor(W/8)),
    extraCorridors: corrDensity * 0.5,
    doorChance: 0.65, pillarChance,
    roomCount: numRooms, fillTarget: 0.35 + corrDensity * 0.15,
    diggers: Math.max(2, Math.floor(numRooms / 4))
  };

  let result;
  switch (algo) {
    case 'drunk':    result = generateDrunkWalk(W, H, rng, algoOpts); break;
    case 'cellular': result = generateCellular(W, H, rng, algoOpts); break;
    case 'maze':     result = generateRoomsAndMazes(W, H, rng, algoOpts); break;
    default:         result = generateBSP(W, H, rng, algoOpts);
  }

  const theme = DUNGEON_THEMES[themeKey];
  const usedNames = new Set();

  result.rooms.forEach(r => {
    const available = theme.rooms.filter(n => !usedNames.has(n));
    const name = pickR(rng, available.length ? available : theme.rooms);
    usedNames.add(name);
    r.name = name;
    r.notes = '';
    r.monsters = r.type === 'entry' ? [] : rng() > 0.25 ? [pickR(rng, theme.monsters[difficulty])] : [];
    r.traps = (r.type === 'trap' || rng() < trapChance * 0.35) ? [pickR(rng, theme.traps)] : [];
    r.secrets = (r.type === 'secret' || rng() < 0.1) ? [pickR(rng, theme.secrets)] : [];
    r.treasure = (r.type === 'boss' || r.type === 'special' || rng() < 0.18) ? [pickR(rng, theme.treasures)] : [];

    // Water rooms
    if (waterRooms && r.type === 'normal' && rng() < 0.12) {
      r.hasWater = true;
    }
  });

  // Add special tiles
  addSpecialTiles(result.grid, result.rooms, rng, trapChance);

  return { ...result, themeKey, difficulty, seed, config, timestamp: Date.now() };
}

function addSpecialTiles(grid, rooms, rng, trapChance) {
  const H = grid.length, W = grid[0].length;
  rooms.forEach(r => {
    // Stairs in entry/boss rooms
    if (r.type === 'entry') {
      grid[r.cy][r.cx] = T.STAIRS_UP;
    }
    if (r.type === 'boss') {
      grid[r.cy][r.cx] = T.STAIRS_DOWN;
      // Altar near boss
      if (r.w > 5 && r.h > 5) grid[r.cy-1][r.cx] = T.ALTAR;
    }
    // Chests in special rooms
    if (r.type === 'special' || r.type === 'secret') {
      const cx = r.x + Math.floor(r.w * 0.75);
      const cy = r.y + Math.floor(r.h * 0.75);
      if (grid[cy] && grid[cy][cx] === T.FLOOR) grid[cy][cx] = T.CHEST;
    }
    // Traps
    if (r.type === 'trap' || rng() < trapChance * 0.2) {
      const tx = r.x + rndR(rng, 1, r.w - 2);
      const ty = r.y + rndR(rng, 1, r.h - 2);
      if (grid[ty] && grid[ty][tx] === T.FLOOR) grid[ty][tx] = T.TRAP;
    }
  });
}

// ============================================================
// THEME DATA
// ============================================================
const DUNGEON_THEMES = {
  dungeon: {
    name: "Donjon Classique", icon: "🏰",
    palette: { bg:'#06040a', wall:'#0e0c14', floor:'#1e1c2e', corridor:'#16142a', accent:'#6060a0' },
    rooms: ["Salle des gardes","Cachot","Salle d'armes","Chambre du seigneur","Salle du conseil","Salle des tortures","Armurerie","Réserves","Antichambre","Salle des trophées","Chapelle profane","Oubliettes","Salle de banquet","Tour de guet","Grande salle","Bibliothèque","Cave à vin","Cellier"],
    monsters: {
      easy:[{name:"Squelettes",cr:"1/4",hp:13,ac:13,type:"Mort-vivant"},{name:"Gobelins",cr:"1/4",hp:7,ac:15,type:"Humanoïde"},{name:"Zombies",cr:"1/4",hp:22,ac:8,type:"Mort-vivant"},{name:"Kobolds",cr:"1/8",hp:5,ac:12,type:"Humanoïde"}],
      medium:[{name:"Orques",cr:"1/2",hp:15,ac:13,type:"Humanoïde"},{name:"Hobgobelins",cr:"1/2",hp:11,ac:18,type:"Humanoïde"},{name:"Spectres",cr:1,hp:22,ac:12,type:"Mort-vivant"},{name:"Trolls",cr:5,hp:84,ac:15,type:"Géant"}],
      hard:[{name:"Vampire spawn",cr:5,hp:82,ac:15,type:"Mort-vivant"},{name:"Nécromancien",cr:9,hp:66,ac:12,type:"Humanoïde"},{name:"Démon mineur",cr:6,hp:104,ac:15,type:"Fiélon"}],
      deadly:[{name:"Liche",cr:21,hp:135,ac:17,type:"Mort-vivant"},{name:"Balor",cr:19,hp:262,ac:19,type:"Fiélon"},{name:"Pit Fiend",cr:20,hp:300,ac:19,type:"Fiélon"}]
    },
    traps:["Dalle à bascule","Fléchettes empoisonnées","Mur à piques","Fosse dissimulée","Gaz soporifique","Boule de feu runique","Hache pendulaire","Plafond descendant"],
    secrets:["Passage derrière la bibliothèque","Alcôve avec armure ancienne","Tunnel vers les égouts","Chambre forte sous le sol","Miroir-portail","Mécanisme dans la cheminée"],
    treasures:["500 po en pièces","Épée +1 naine","Grimoire du nécromancien","Amulette +1","Parchemin niv.3","Armure elfique","Couronne déchue","Anneau de protection"]
  },
  crypt: {
    name: "Crypte Maudite", icon: "⚰️",
    palette: { bg:'#04060a', wall:'#0a0c10', floor:'#141820', corridor:'#0e1218', accent:'#405080' },
    rooms: ["Antichambre funèbre","Salle des sarcophages","Chambre des reliques","Ossuaire","Chambre maudite","Salle des offrandes","Couloir des âmes","Sanctuaire ténébreux","Chambre du patriarche","Galerie des ancêtres","Salle des larmes","Tombeau scellé","Caveau des gardiens","Salle des écrins"],
    monsters: {
      easy:[{name:"Zombies",cr:"1/4",hp:22,ac:8,type:"Mort-vivant"},{name:"Squelettes",cr:"1/4",hp:13,ac:13,type:"Mort-vivant"},{name:"Ombres",cr:"1/2",hp:16,ac:12,type:"Mort-vivant"},{name:"Goules",cr:1,hp:22,ac:12,type:"Mort-vivant"}],
      medium:[{name:"Banshee",cr:4,hp:58,ac:12,type:"Mort-vivant"},{name:"Revenant",cr:5,hp:136,ac:13,type:"Mort-vivant"},{name:"Momies",cr:3,hp:58,ac:11,type:"Mort-vivant"}],
      hard:[{name:"Wraith seigneur",cr:9,hp:67,ac:13,type:"Mort-vivant"},{name:"Mummy Lord",cr:15,hp:97,ac:17,type:"Mort-vivant"}],
      deadly:[{name:"Liche ancienne",cr:21,hp:135,ac:17,type:"Mort-vivant"},{name:"Dracoliche",cr:17,hp:202,ac:19,type:"Mort-vivant"}]
    },
    traps:["Malédiction runique","Spores mortelles","Lame spectrale","Cercle piégé","Sarcophage animé","Jet de sang maudit"],
    secrets:["Tombe d'un héros","Relique sous la dalle","Journal du fondateur","Portail éthéré","Phylactère caché"],
    treasures:["800 po en offrandes","Anneau nécrotique","Sceptre du patriarche","Cape funéraire","Dague des âmes","Couronne d'argent"]
  },
  cave: {
    name: "Caverne Naturelle", icon: "🕳️",
    palette: { bg:'#04050a', wall:'#0c0e08', floor:'#181e10', corridor:'#121808', accent:'#507030' },
    rooms: ["Grande salle","Grotte souterraine","Lac souterrain","Salle de cristaux","Repaire de créatures","Tunnel étroit","Chambre géologique","Grotte aux peintures","Crevasse profonde","Salle des champignons","Bassin magique","Nœud de galeries","Galerie effondrée"],
    monsters: {
      easy:[{name:"Araignées géantes",cr:1,hp:26,ac:14,type:"Bête"},{name:"Kobolds",cr:"1/8",hp:5,ac:12,type:"Humanoïde"},{name:"Myconides",cr:"1/2",hp:22,ac:8,type:"Plante"}],
      medium:[{name:"Ours des cavernes",cr:2,hp:42,ac:13,type:"Bête"},{name:"Trolls",cr:5,hp:84,ac:15,type:"Géant"},{name:"Derro",cr:"1/4",hp:13,ac:13,type:"Humanoïde"}],
      hard:[{name:"Dragon vert jeune",cr:8,hp:136,ac:18,type:"Dragon"},{name:"Illithid",cr:7,hp:71,ac:12,type:"Aberration"}],
      deadly:[{name:"Aboleth",cr:10,hp:135,ac:17,type:"Aberration"},{name:"Elder Brain",cr:14,hp:210,ac:10,type:"Aberration"}]
    },
    traps:["Stalactites instables","Gaz volcanique","Courant souterrain","Piège de pierre","Éboulement","Champignons explosifs"],
    secrets:["Veine de mithral","Œuf de dragon","Porte naine oubliée","Source magique","Sanctuaire drow"],
    treasures:["600 po en gemmes","Cristal magique","Armure draconique","Potion aquatique","Hache naine +2"]
  },
  fortress: {
    name: "Forteresse Naine", icon: "⚒️",
    palette: { bg:'#06050a', wall:'#100e08', floor:'#201c10', corridor:'#181408', accent:'#806030' },
    rooms: ["Grande halle","Forge sacrée","Salle du trône","Armurerie royale","Salle des ancêtres","Chambre des mécanismes","Trésorerie","Quartiers des gardiens","Bibliothèque runique","Salle des réunions","Entrepôt","Bains thermaux","Salle des engrenages","Puits de forge"],
    monsters: {
      easy:[{name:"Derro",cr:"1/4",hp:13,ac:13,type:"Humanoïde"},{name:"Gobelins des profondeurs",cr:"1/4",hp:7,ac:15,type:"Humanoïde"}],
      medium:[{name:"Duergar",cr:1,hp:26,ac:16,type:"Humanoïde"},{name:"Élémentaire de terre",cr:5,hp:126,ac:17,type:"Élémentaire"}],
      hard:[{name:"Géant du feu",cr:9,hp:162,ac:18,type:"Géant"},{name:"Golem d'acier",cr:9,hp:178,ac:18,type:"Artificiel"}],
      deadly:[{name:"Titan forgé",cr:17,hp:243,ac:22,type:"Artificiel"},{name:"Dragon de fer",cr:22,hp:297,ac:22,type:"Dragon"}]
    },
    traps:["Engrenages broyeurs","Canon à vapeur","Porte de fer tombante","Hache rotative","Décharge runique"],
    secrets:["Trésor ancestral","Plan de la forteresse","Arme légendaire","Golem endormi","Accès aux mines"],
    treasures:["1200 po en mithral","Hache +3 runique","Armure naine +2","Anneau anti-feu","Bouclier du roi"]
  },
  temple: {
    name: "Temple Oublié", icon: "🕍",
    palette: { bg:'#060408', wall:'#100810', floor:'#1c1020', corridor:'#140c18', accent:'#705090' },
    rooms: ["Vestibule sacré","Salle de prière","Sanctuaire intérieur","Salle des rituels","Chambre des prêtres","Bibliothèque sacrée","Salle des offrandes","Chambre de pénitence","Adyton","Crypte des fondateurs","Salle des visions","Jardin maudit","Salle des oracles","Sanctum"],
    monsters: {
      easy:[{name:"Cultistes",cr:"1/8",hp:9,ac:12,type:"Humanoïde"},{name:"Statues animées",cr:"1/2",hp:33,ac:11,type:"Artificiel"}],
      medium:[{name:"Fanatiques",cr:2,hp:33,ac:13,type:"Humanoïde"},{name:"Yuan-ti malisons",cr:3,hp:66,ac:12,type:"Humanoïde"}],
      hard:[{name:"Avatar corrompu",cr:8,hp:97,ac:14,type:"Céleste"},{name:"Archidémon",cr:10,hp:143,ac:16,type:"Fiélon"}],
      deadly:[{name:"Demi-dieu corrompu",cr:18,hp:225,ac:21,type:"Céleste"},{name:"Archdevil",cr:21,hp:262,ac:22,type:"Fiélon"}]
    },
    traps:["Autel maudit","Statue projectile","Sol de feu sacré","Porte maudite","Pluie acide bénite"],
    secrets:["Texte sacré interdit","Artefact divin","Salle de téléportation","Journal du grand-prêtre","Idole corrompue"],
    treasures:["700 po en offrandes","Symbole sacré +3","Bâton guérisseur","Tome divin","Calice de résurrection"]
  }
};

const DIFF_LABELS = {
  easy:   { label:'Novice',      level:'niv. 1–4',  color:'#5a8a3a' },
  medium: { label:'Aventurier',  level:'niv. 5–10', color:'#d4a040' },
  hard:   { label:'Héroïque',    level:'niv. 11–16',color:'#c07030' },
  deadly: { label:'Légendaire',  level:'niv. 17+',  color:'#c04040' },
};

// ============================================================
// PERSISTENCE
// ============================================================
function saveDungeon(dungeon) {
  try {
    const history = loadHistory();
    const entry = {
      seed: dungeon.seed, theme: dungeon.themeKey, difficulty: dungeon.difficulty,
      rooms: dungeon.rooms.length, size: dungeon.W, algo: dungeon.algo,
      date: new Date().toISOString(), rooms_data: dungeon.rooms
    };
    history.unshift(entry);
    if (history.length > 15) history.length = 15;
    localStorage.setItem('dfv2_history', JSON.stringify(history));
    localStorage.setItem('dfv2_current', JSON.stringify(dungeon));
  } catch(e) { console.warn('Save failed', e); }
}
function loadCurrent() {
  try { return JSON.parse(localStorage.getItem('dfv2_current')); } catch { return null; }
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('dfv2_history')) || []; } catch { return []; }
}
function showToast(msg, duration=2500) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}
function newSeed() { return Math.floor(Math.random() * 999999) + 10000; }
