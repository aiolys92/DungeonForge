// ══════════════════════════════════════════════════════════
// DUNGEONFORGE v3 — engine + renderer + UI
// ══════════════════════════════════════════════════════════

// ── TILE TYPES ──
const T = {
  WALL:0, FLOOR:1, CORRIDOR:2,
  DOOR:3, DOOR_LOCKED:4, DOOR_SECRET:5,
  WATER:6, PILLAR:7,
  STAIRS_DOWN:8, STAIRS_UP:9,
  CHEST:10, ALTAR:11, TRAP:12,
  LAVA:13, CHASM:14
};

// ── SEEDED RNG ──
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
function ri(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function rp(rng, arr)      { return arr[Math.floor(rng() * arr.length)]; }

// ── ROOM NAMES (generic, no theme) ──
const ROOM_NAMES = [
  "Grande salle","Antichambre","Couloir central","Salle des gardes",
  "Chambre secrète","Oubliettes","Armurerie","Réserves","Salle du trône",
  "Bibliothèque","Chapelle","Salle des trophées","Cave","Chambre maudite",
  "Salle des rituels","Ossuaire","Sanctuaire","Forge","Crypte","Salle d'eau",
  "Tour de guet","Cachot","Salle des ancêtres","Vestibule","Chambre profonde",
  "Salle effondrée","Nœud de galeries","Repaire","Chambre des mécanismes","Adyton"
];
const TRAP_NAMES = [
  "Dalle à bascule","Fléchettes empoisonnées","Mur à piques","Fosse dissimulée",
  "Gaz soporifique","Boule de feu runique","Hache pendulaire","Plafond descendant",
  "Jet d'acide","Filets de lames","Éboulement déclenché","Cercle de téléportation piégé"
];
const SECRET_NAMES = [
  "Passage derrière la bibliothèque","Alcôve avec armure ancienne",
  "Tunnel vers les égouts","Chambre forte sous le sol","Miroir-portail",
  "Mécanisme dans la cheminée","Escalier dérobé derrière la tapisserie",
  "Fausse pierre dans le mur","Trappe sous le tapis","Passage dans la cheminée"
];
const TREASURE_NAMES = [
  "Coffre de pièces d'or","Armure enchantée","Grimoire ancien",
  "Amulette de protection","Parchemin de sort","Épée légendaire",
  "Couronne déchue","Anneau de pouvoir","Orbe de divination","Relique sacrée"
];

// ══════════════════════════════════════════════════════════
// ALGORITHMS
// ══════════════════════════════════════════════════════════

// ── BSP ──
function genBSP(W, H, rng, opts) {
  const { minR=4, maxR, minSplit=8, extCorr=0.3, pillarP=0.15 } = opts;
  const g = Array.from({length:H}, () => Array(W).fill(T.WALL));
  const rooms = [];

  class Node {
    constructor(x,y,w,h){this.x=x;this.y=y;this.w=w;this.h=h;this.l=null;this.r=null;this.room=null;}
    split(){
      if(this.l||this.r) return false;
      const sh = rng() > .5;
      const mx = (sh ? this.h : this.w) - minSplit;
      if(mx < minSplit) return false;
      const at = ri(rng, minSplit, mx);
      if(sh){ this.l=new Node(this.x,this.y,this.w,at); this.r=new Node(this.x,this.y+at,this.w,this.h-at); }
      else  { this.l=new Node(this.x,this.y,at,this.h); this.r=new Node(this.x+at,this.y,this.w-at,this.h); }
      return true;
    }
    getRoom(){ if(this.room)return this.room; if(this.l&&this.r)return rng()>.5?this.l.getRoom():this.r.getRoom(); return this.l?this.l.getRoom():this.r?this.r.getRoom():null; }
  }

  const root = new Node(1,1,W-2,H-2);
  const ns = [root];
  for(let i=0;i<8;i++) ns.forEach(n => { if(n.split()){ns.push(n.l,n.r);} });

  let id = 1;
  ns.filter(n=>!n.l&&!n.r).forEach(n => {
    const rw = ri(rng, minR, Math.min(maxR, n.w-2));
    const rh = ri(rng, minR, Math.min(maxR, n.h-2));
    if(rw<3||rh<3) return;
    const rx = n.x + ri(rng, 1, Math.max(1, n.w-rw-1));
    const ry = n.y + ri(rng, 1, Math.max(1, n.h-rh-1));
    for(let y=ry;y<ry+rh;y++) for(let x=rx;x<rx+rw;x++) g[y][x]=T.FLOOR;
    if(pillarP>rng()&&rw>=6&&rh>=6)
      [[rx+2,ry+2],[rx+rw-3,ry+2],[rx+2,ry+rh-3],[rx+rw-3,ry+rh-3]]
        .forEach(([px,py])=>{ if(g[py]&&g[py][px]===T.FLOOR) g[py][px]=T.PILLAR; });
    const room = {id:id++,x:rx,y:ry,w:rw,h:rh,cx:rx+Math.floor(rw/2),cy:ry+Math.floor(rh/2),type:'normal',notes:''};
    rooms.push(room); n.room=room;
  });

  function conn(node) {
    if(!node.l||!node.r) return; conn(node.l); conn(node.r);
    const a=node.l.getRoom(), b=node.r.getRoom();
    if(a&&b) carveCorr(g,a.cx,a.cy,b.cx,b.cy,rng,opts,W,H);
  }
  conn(root);
  const extra = Math.floor(rooms.length * extCorr);
  for(let i=0;i<extra;i++) { const a=rp(rng,rooms),b=rp(rng,rooms); if(a!==b) carveCorr(g,a.cx,a.cy,b.cx,b.cy,rng,{...opts,doorP:.2,secretDoorP:.1},W,H); }
  return {g,rooms};
}

// ── DRUNK WALK ──
function genDrunk(W, H, rng, opts) {
  const { fillT=0.38, diggers=3 } = opts;
  const g = Array.from({length:H}, () => Array(W).fill(T.WALL));
  const DIRS = [[0,-1],[0,1],[-1,0],[1,0]];
  for(let d=0;d<diggers;d++){
    let x=ri(rng,5,W-6), y=ri(rng,5,H-6), last=null;
    let steps = Math.floor(W*H*fillT/diggers);
    while(steps-->0){
      if(g[y][x]===T.WALL) g[y][x]=T.FLOOR;
      const dir = last&&rng()>.35 ? last : rp(rng,DIRS);
      const nx=x+dir[0], ny=y+dir[1];
      if(nx>1&&nx<W-2&&ny>1&&ny<H-2){x=nx;y=ny;}
      last=dir;
    }
  }
  const rooms = detectRooms(g,W,H,rng);
  addDoors(g,W,H,rng,opts);
  return {g,rooms};
}

// ── CELLULAR AUTOMATA ──
function genCellular(W, H, rng, opts) {
  const { fillP=0.47, iters=5 } = opts;
  let g = Array.from({length:H}, (_,y) =>
    Array.from({length:W}, (_,x) => x===0||x===W-1||y===0||y===H-1 ? T.WALL : rng()<fillP ? T.WALL : T.FLOOR)
  );
  for(let it=0;it<iters;it++){
    const n = g.map(r=>[...r]);
    for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
      let w=0;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(g[y+dy][x+dx]===T.WALL) w++;
      n[y][x] = g[y][x]===T.WALL ? (w>=3?T.WALL:T.FLOOR) : (w>4?T.WALL:T.FLOOR);
    }
    g=n;
  }
  g = keepLargest(g,W,H);
  const rooms = detectRooms(g,W,H,rng);
  addDoors(g,W,H,rng,opts);
  return {g,rooms};
}

// ── ROOMS & MAZE ──
function genMaze(W, H, rng, opts) {
  const { minR=3, maxR=9 } = opts;
  const GW=W%2===0?W-1:W, GH=H%2===0?H-1:H;
  const g = Array.from({length:GH}, () => Array(GW).fill(T.WALL));
  const rooms=[]; let id=1,att=0;
  while(rooms.length<opts.roomCount&&att++<600){
    let rw=ri(rng,minR,maxR); if(rw%2===0)rw++;
    let rh=ri(rng,minR,maxR); if(rh%2===0)rh++;
    let rx=ri(rng,1,GW-rw-2); if(rx%2===0)rx++;
    let ry=ri(rng,1,GH-rh-2); if(ry%2===0)ry++;
    let ok=true;
    for(const r of rooms) if(rx<r.x+r.w+2&&rx+rw+2>r.x&&ry<r.y+r.h+2&&ry+rh+2>r.y){ok=false;break;}
    if(ok){
      for(let y=ry;y<ry+rh;y++) for(let x=rx;x<rx+rw;x++) g[y][x]=T.FLOOR;
      rooms.push({id:id++,x:rx,y:ry,w:rw,h:rh,cx:rx+Math.floor(rw/2),cy:ry+Math.floor(rh/2),type:'normal',notes:''});
    }
  }
  const vis = Array.from({length:GH}, () => Array(GW).fill(false));
  function carveMaze(x,y){
    vis[y][x]=true; g[y][x]=T.CORRIDOR;
    const dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(()=>rng()-.5);
    for(const[dx,dy] of dirs){
      const nx=x+dx,ny=y+dy;
      if(nx>0&&nx<GW-1&&ny>0&&ny<GH-1&&!vis[ny][nx]&&g[ny][nx]===T.WALL){
        g[y+dy/2][x+dx/2]=T.CORRIDOR; carveMaze(nx,ny);
      }
    }
  }
  for(let y=1;y<GH-1;y+=2) for(let x=1;x<GW-1;x+=2) if(!vis[y][x]&&g[y][x]===T.WALL) carveMaze(x,y);
  for(const r of rooms){
    const exits=[];
    for(let x=r.x;x<r.x+r.w;x++){
      if(r.y>1&&g[r.y-1][x]===T.CORRIDOR) exits.push([x,r.y-1]);
      if(r.y+r.h<GH-1&&g[r.y+r.h][x]===T.CORRIDOR) exits.push([x,r.y+r.h]);
    }
    for(let y=r.y;y<r.y+r.h;y++){
      if(r.x>1&&g[y][r.x-1]===T.CORRIDOR) exits.push([r.x-1,y]);
      if(r.x+r.w<GW-1&&g[y][r.x+r.w]===T.CORRIDOR) exits.push([r.x+r.w,y]);
    }
    if(exits.length){ const[ex,ey]=rp(rng,exits); g[ey][ex]=opts.doorP>rng()?T.DOOR:T.CORRIDOR; }
  }
  return {g,rooms,W:GW,H:GH};
}

// ── SHARED HELPERS ──
function carveCorr(g, x1,y1,x2,y2, rng, opts, W, H){
  const sc=(x,y)=>{ if(x>0&&x<W-1&&y>0&&y<H-1&&g[y][x]!==T.FLOOR) g[y][x]=T.CORRIDOR; };
  let x=x1,y=y1;
  if(rng()>.5){ while(x!==x2){sc(x,y);x+=x<x2?1:-1;} while(y!==y2){sc(x,y);y+=y<y2?1:-1;} }
  else         { while(y!==y2){sc(x,y);y+=y<y2?1:-1;} while(x!==x2){sc(x,y);x+=x<x2?1:-1;} }

  // Place door near midpoint of corridor
  if(opts.doorP > 0){
    const mx=Math.floor((x1+x2)/2), my=Math.floor((y1+y2)/2);
    if(g[my]&&g[my][mx]===T.CORRIDOR){
      const r = rng();
      if(r < opts.secretDoorP)       g[my][mx] = T.DOOR_SECRET;
      else if(r < opts.secretDoorP + opts.lockedDoorP) g[my][mx] = T.DOOR_LOCKED;
      else if(r < opts.doorP)        g[my][mx] = T.DOOR;
    }
  }
}

function keepLargest(g, W, H){
  const vis = Array.from({length:H}, () => Array(W).fill(false));
  const regs = [];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(!vis[y][x]&&g[y][x]===T.FLOOR){
      const reg=[],q=[[x,y]]; vis[y][x]=true;
      while(q.length){ const[cx,cy]=q.shift(); reg.push([cx,cy]); for(const[dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){ const nx=cx+dx,ny=cy+dy; if(nx>=0&&nx<W&&ny>=0&&ny<H&&!vis[ny][nx]&&g[ny][nx]===T.FLOOR){vis[ny][nx]=true;q.push([nx,ny]);} } }
      regs.push(reg);
    }
  }
  if(!regs.length) return g;
  const ls = new Set(regs.sort((a,b)=>b.length-a.length)[0].map(([x,y])=>y*W+x));
  return g.map((row,y) => row.map((c,x) => c===T.FLOOR&&!ls.has(y*W+x)?T.WALL:c));
}

function detectRooms(g, W, H, rng){
  const vis = Array.from({length:H}, () => Array(W).fill(false));
  const regs = [];
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
    if(!vis[y][x]&&g[y][x]===T.FLOOR){
      const cells=[],q=[[x,y]]; vis[y][x]=true;
      while(q.length){ const[cx,cy]=q.shift(); cells.push([cx,cy]); for(const[dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){ const nx=cx+dx,ny=cy+dy; if(nx>0&&nx<W-1&&ny>0&&ny<H-1&&!vis[ny][nx]&&g[ny][nx]===T.FLOOR){vis[ny][nx]=true;q.push([nx,ny]);} } }
      if(cells.length>=4) regs.push(cells);
    }
  }
  regs.sort((a,b)=>b.length-a.length);
  let id=1;
  return regs.map(cells=>{
    const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
    const mx=Math.min(...xs),Mx=Math.max(...xs),my=Math.min(...ys),My=Math.max(...ys);
    return {id:id++,x:mx,y:my,w:Mx-mx+1,h:My-my+1,cx:Math.floor((mx+Mx)/2),cy:Math.floor((my+My)/2),type:'normal',notes:'',cells};
  });
}

function addDoors(g, W, H, rng, opts){
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
    if(g[y][x]!==T.FLOOR) continue;
    const hGate = g[y][x-1]===T.WALL&&g[y][x+1]===T.WALL&&g[y-1][x]===T.FLOOR&&g[y+1][x]===T.FLOOR;
    const vGate = g[y-1][x]===T.WALL&&g[y+1][x]===T.WALL&&g[y][x-1]===T.FLOOR&&g[y][x+1]===T.FLOOR;
    if(hGate||vGate){
      const r = rng();
      if(r < opts.secretDoorP)                        g[y][x] = T.DOOR_SECRET;
      else if(r < opts.secretDoorP+opts.lockedDoorP)  g[y][x] = T.DOOR_LOCKED;
      else if(r < opts.doorP)                         g[y][x] = T.DOOR;
    }
  }
}

function assignTypes(rooms, rng, opts){
  if(!rooms.length) return;
  rooms[0].type = 'entry';
  // Boss = furthest room from entry
  let maxD=0, bossIdx=rooms.length-1;
  for(let i=1;i<rooms.length;i++){
    const d=Math.abs(rooms[i].cx-rooms[0].cx)+Math.abs(rooms[i].cy-rooms[0].cy);
    if(d>maxD){maxD=d;bossIdx=i;}
  }
  rooms[bossIdx].type = 'boss';
  for(let i=1;i<rooms.length;i++){
    if(i===bossIdx) continue;
    const r = rng();
    if(r < opts.secretRoomP)              rooms[i].type = 'secret';
    else if(r < opts.secretRoomP+opts.trapRoomP) rooms[i].type = 'trap';
    else if(r < opts.secretRoomP+opts.trapRoomP+0.15) rooms[i].type = 'special';
  }
}

function addSpecialTiles(g, rooms, rng, opts){
  const H=g.length, W=g[0].length;
  rooms.forEach(r=>{
    // Stairs
    if(r.type==='entry'&&g[r.cy]?.[r.cx]===T.FLOOR)  g[r.cy][r.cx]=T.STAIRS_UP;
    if(r.type==='boss') {
      if(g[r.cy]?.[r.cx]===T.FLOOR)            g[r.cy][r.cx]=T.STAIRS_DOWN;
      if(r.h>4&&g[r.cy-1]?.[r.cx]===T.FLOOR)   g[r.cy-1][r.cx]=T.ALTAR;
    }
    // Chests
    if((r.type==='special'||r.type==='secret')&&r.w>3&&r.h>3){
      const cx=r.x+Math.floor(r.w*.7), cy=r.y+Math.floor(r.h*.7);
      if(g[cy]?.[cx]===T.FLOOR) g[cy][cx]=T.CHEST;
    }
    // Traps
    if(r.type==='trap'||rng()<opts.trapRoomP*.15){
      const tx=r.x+Math.floor(r.w*.4), ty=r.y+Math.floor(r.h*.4);
      if(g[ty]?.[tx]===T.FLOOR) g[ty][tx]=T.TRAP;
    }
    // Water in some normal rooms
    if(opts.waterRooms&&r.type==='normal'&&rng()<.12){
      r.hasWater=true;
      const wx=r.cx, wy=r.cy;
      if(g[wy]?.[wx]===T.FLOOR) g[wy][wx]=T.WATER;
    }
    // Lava
    if(opts.lavaRooms&&(r.type==='boss'||r.type==='special')&&rng()<.3){
      const lx=r.x+Math.floor(r.w*.25), ly=r.y+Math.floor(r.h*.25);
      if(g[ly]?.[lx]===T.FLOOR) g[ly][lx]=T.LAVA;
    }
  });
}

function populateRooms(rooms, rng, opts){
  const usedN = new Set();
  rooms.forEach(r=>{
    const avail = ROOM_NAMES.filter(n=>!usedN.has(n));
    r.name = rp(rng, avail.length?avail:ROOM_NAMES); usedN.add(r.name);
    r.notes = r.notes||'';
    r.traps    = r.type==='trap'||rng()<opts.trapRoomP*.3 ? [rp(rng,TRAP_NAMES)] : [];
    r.secrets  = r.type==='secret'||rng()<opts.secretRoomP*.4 ? [rp(rng,SECRET_NAMES)] : [];
    r.treasure = r.type==='boss'||r.type==='special'||rng()<.18 ? [rp(rng,TREASURE_NAMES)] : [];
  });
}

// ══════════════════════════════════════════════════════════
// MASTER GENERATE
// ══════════════════════════════════════════════════════════
function generateDungeon(cfg){
  const {
    algo='bsp', W=60, seed,
    corrDensity=.5, doorP=.6, lockedDoorP=.1, secretDoorP=.08,
    trapRoomP=.12, secretRoomP=.08, pillarP=.15,
    waterRooms=false, lavaRooms=false,
    symmetry=0, roomSizeMin=4, roomSizeMax=0
  } = cfg;
  const H = W;
  const rng = makeRng(seed);

  // Auto room size max based on grid
  const maxR = roomSizeMax || Math.max(6, Math.floor(W/5));
  // Auto room count — fills based on grid area and density
  const roomCount = Math.max(4, Math.floor((W*W) / (maxR*maxR*2.5) * (0.5+corrDensity*.5)));

  const opts = {
    minR:roomSizeMin, maxR,
    minSplit:Math.max(7,Math.floor(W/9)),
    extCorr:corrDensity*.55,
    doorP, lockedDoorP, secretDoorP,
    pillarP, fillT:.3+corrDensity*.15,
    diggers:Math.max(2,Math.floor(roomCount/3)),
    roomCount, trapRoomP, secretRoomP,
    waterRooms, lavaRooms
  };

  let res;
  if(algo==='drunk')    res = genDrunk(W,H,rng,opts);
  else if(algo==='cellular') res = genCellular(W,H,rng,opts);
  else if(algo==='maze')     res = genMaze(W,H,rng,opts);
  else                       res = genBSP(W,H,rng,opts);

  let {g, rooms} = res;
  const finalW = res.W||W, finalH = res.H||H;

  // Symmetry pass (0=none, 1=horizontal mirror, 2=vertical, 3=quad)
  if(symmetry>0) applySymmetry(g,finalW,finalH,symmetry);

  assignTypes(rooms, rng, opts);
  addSpecialTiles(g, rooms, rng, opts);
  populateRooms(rooms, rng, opts);

  return {grid:g, rooms, W:finalW, H:finalH, algo, seed, config:cfg, ts:Date.now()};
}

function applySymmetry(g, W, H, mode){
  if(mode===1||mode===3){ // horizontal
    for(let y=0;y<H;y++) for(let x=0;x<Math.floor(W/2);x++) g[y][W-1-x]=g[y][x];
  }
  if(mode===2||mode===3){ // vertical
    for(let y=0;y<Math.floor(H/2);y++) for(let x=0;x<W;x++) g[H-1-y][x]=g[y][x];
  }
}

// ══════════════════════════════════════════════════════════
// RENDERER — Classic JDR cartography style
// ══════════════════════════════════════════════════════════
const PALETTE = {
  bg:      '#c8c0a8',  // outer hatched rock
  wall:    '#bab2a0',  // wall fill (hatching drawn over)
  floor:   '#f4f0e4',  // room floor cream
  corr:    '#ece8dc',  // corridor floor
  outline: '#1a1614',  // thick black outlines
  hatch:   'rgba(38,28,18,.3)',
  grid:    'rgba(0,0,0,.065)',
  water:   '#c4dce8',
  lava:    '#e8b080',
};

// Build a reusable diagonal-hatch OffscreenCanvas pattern
let _hatchPattern = null;
function getHatchPattern(ctx){
  if(_hatchPattern) return _hatchPattern;
  const sz = 8;
  const off = document.createElement('canvas');
  off.width = sz; off.height = sz;
  const c = off.getContext('2d');
  c.strokeStyle = PALETTE.hatch;
  c.lineWidth = 1;
  // Two diagonal directions for cross-hatch
  c.beginPath(); c.moveTo(0,sz); c.lineTo(sz,0); c.stroke();
  c.beginPath(); c.moveTo(-1,1); c.lineTo(1,-1); c.stroke();
  c.beginPath(); c.moveTo(sz-1,sz+1); c.lineTo(sz+1,sz-1); c.stroke();
  _hatchPattern = ctx.createPattern(off, 'repeat');
  return _hatchPattern;
}

function renderDungeon(ctx, dungeon, cs, selId, showGrid, showNums, showSecrets){
  const {grid:g, rooms, W, H} = dungeon;
  const cw = W*cs, ch = H*cs;

  // ── 1. Fill everything as hatched wall ──
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = getHatchPattern(ctx);
  ctx.fillRect(0, 0, cw, ch);

  // ── 2. Paint floor tiles (erase wall with floor color) ──
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const t = g[y][x];
    if(t === T.WALL) continue;
    if(t === T.WATER){ ctx.fillStyle=PALETTE.water; ctx.fillRect(x*cs,y*cs,cs,cs); continue; }
    if(t === T.LAVA) { ctx.fillStyle=PALETTE.lava;  ctx.fillRect(x*cs,y*cs,cs,cs); continue; }
    ctx.fillStyle = (t===T.CORRIDOR) ? PALETTE.corr : PALETTE.floor;
    ctx.fillRect(x*cs, y*cs, cs, cs);
  }

  // ── 3. Floor grid lines (always on) ──
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = .5;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const t=g[y][x]; if(t===T.WALL||t===T.WATER||t===T.LAVA) continue;
    ctx.strokeRect(x*cs+.5, y*cs+.5, cs-1, cs-1);
  }

  // ── 4. Thick black outlines around floor/wall borders ──
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth   = Math.max(1.5, cs * .12);
  ctx.lineCap     = 'square';
  const lw = ctx.lineWidth;
  const DIRS = [[0,-1,'top'],[0,1,'bot'],[-1,0,'lft'],[1,0,'rgt']];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const t = g[y][x]; if(t===T.WALL) continue;
    for(const [dx,dy,side] of DIRS){
      const nx=x+dx, ny=y+dy;
      const nb = (nx<0||ny<0||nx>=W||ny>=H) ? T.WALL : g[ny][nx];
      if(nb !== T.WALL) continue;
      ctx.beginPath();
      const px=x*cs, py=y*cs;
      if(side==='top')  { ctx.moveTo(px,       py+lw/2); ctx.lineTo(px+cs,    py+lw/2); }
      if(side==='bot')  { ctx.moveTo(px,       py+cs-lw/2); ctx.lineTo(px+cs, py+cs-lw/2); }
      if(side==='lft')  { ctx.moveTo(px+lw/2,  py);      ctx.lineTo(px+lw/2,  py+cs); }
      if(side==='rgt')  { ctx.moveTo(px+cs-lw/2,py);     ctx.lineTo(px+cs-lw/2,py+cs); }
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

  // ── 5. Special tiles (doors, pillars, stairs…) ──
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const t=g[y][x];
    if(t===T.WALL||t===T.FLOOR||t===T.CORRIDOR||t===T.WATER||t===T.LAVA) continue;
    const px=x*cs, py=y*cs, cx2=px+cs/2, cy2=py+cs/2;
    const fs=Math.max(7,Math.min(cs*.65,14));
    drawTile(ctx,t,px,py,cx2,cy2,cs,fs,showSecrets,g,x,y);
  }

  // ── 6. Water wave lines ──
  if(cs >= 8){
    ctx.strokeStyle='rgba(50,100,160,.5)'; ctx.lineWidth=.8;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      if(g[y][x]!==T.WATER) continue;
      const px=x*cs,py=y*cs;
      for(let i=0;i<3;i++){
        const wy=py+cs*(0.3+i*0.2);
        ctx.beginPath(); ctx.moveTo(px+cs*.1,wy);
        ctx.bezierCurveTo(px+cs*.35,wy-cs*.06,px+cs*.65,wy+cs*.06,px+cs*.9,wy);
        ctx.stroke();
      }
    }
  }

  // ── 7. Lava stipple ──
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(g[y][x]!==T.LAVA) continue;
    ctx.fillStyle='rgba(180,60,10,.35)';
    for(let i=0;i<5;i++){
      const sx=x*cs+cs*(0.15+Math.sin(x*7+y*3+i)*0.35+0.35);
      const sy=y*cs+cs*(0.15+Math.cos(x*5+y*7+i)*0.35+0.35);
      const r=Math.max(1,cs*.06);
      ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2); ctx.fill();
    }
  }

  // ── 8. Room type tint + selection + labels ──
  const TINTS = {
    entry:  'rgba(200,160,20,.12)',
    boss:   'rgba(180,20,20,.14)',
    special:'rgba(20,120,20,.1)',
    secret: 'rgba(100,20,180,.12)',
    trap:   'rgba(180,60,10,.12)',
    normal: null
  };
  const SEL_COLORS = {
    entry:'#c09020', boss:'#c02020', special:'#208020',
    secret:'#8020c0', trap:'#c04010', normal:'#404080'
  };

  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const r of rooms){
    // Tint
    const tint = TINTS[r.type];
    if(tint){ ctx.fillStyle=tint; ctx.fillRect(r.x*cs,r.y*cs,r.w*cs,r.h*cs); }

    // Selection highlight
    if(selId===r.id){
      ctx.strokeStyle='rgba(220,160,0,.85)'; ctx.lineWidth=Math.max(2,cs*.15);
      ctx.setLineDash([Math.max(3,cs*.25),Math.max(2,cs*.15)]);
      ctx.strokeRect(r.x*cs+ctx.lineWidth/2+1,r.y*cs+ctx.lineWidth/2+1,r.w*cs-ctx.lineWidth-2,r.h*cs-ctx.lineWidth-2);
      ctx.setLineDash([]);
    }

    if(r.w*cs < 16 || r.h*cs < 16) continue;
    const rcx = r.cx*cs+cs/2, rcy = r.cy*cs+cs/2;
    const col = SEL_COLORS[r.type]||'#303060';

    // Room number
    if(showNums){
      const nfs = Math.max(7, Math.min(cs*.7, 12));
      ctx.font = `bold ${nfs}px Cinzel,serif`;
      // White knockout
      ctx.fillStyle='rgba(255,255,255,.7)';
      ctx.fillText(r.id, rcx+.5, rcy+.5);
      ctx.fillStyle = col;
      ctx.fillText(r.id, rcx, rcy);
    }
  }

  // ── 9. Manual grid overlay toggle ──
  if(showGrid){
    ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=.5;
    for(let i=0;i<=W;i++){ctx.beginPath();ctx.moveTo(i*cs,0);ctx.lineTo(i*cs,ch);ctx.stroke();}
    for(let i=0;i<=H;i++){ctx.beginPath();ctx.moveTo(0,i*cs);ctx.lineTo(cw,i*cs);ctx.stroke();}
  }
}

// ── Door orientation helper ──
function doorOri(grid, gx, gy){
  if(!grid) return 'h';
  const H=grid.length, W=grid[0].length;
  const L = gx>0   ? grid[gy][gx-1] : T.WALL;
  const R = gx<W-1 ? grid[gy][gx+1] : T.WALL;
  return (L!==T.WALL && R!==T.WALL) ? 'h' : 'v';
}

function drawTile(ctx, t, px, py, cx, cy, cs, fs, showSecrets, grid, gx, gy){
  switch(t){

    // ── Normal door — classic cartographic symbol ──
    // Two short wall stubs + a filled rectangle bridging the gap
    case T.DOOR: {
      const ori = doorOri(grid,gx,gy);
      const bw  = Math.max(2, cs*.55);   // bridge width  (along corridor)
      const bh  = Math.max(2, cs*.18);   // bridge height (across corridor)
      const sw  = Math.max(1, cs*.14);   // stub width
      // Floor under
      ctx.fillStyle = PALETTE.floor;
      ctx.fillRect(px,py,cs,cs);
      if(ori==='h'){
        // wall stubs top and bottom, bridge across middle
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(cx-bw/2, py,       bw, sw);        // top stub
        ctx.fillRect(cx-bw/2, py+cs-sw, bw, sw);        // bottom stub
        // bridge rect
        ctx.fillStyle = '#7a3a08';
        ctx.fillRect(cx-bw/2, py+sw, bw, cs-sw*2);
        // highlight on bridge
        ctx.fillStyle = '#a05010';
        ctx.fillRect(cx-bw/2+1, py+sw+1, bw-2, cs-sw*2-2);
        // outline bridge
        ctx.strokeStyle = PALETTE.outline; ctx.lineWidth = Math.max(.8, cs*.06);
        ctx.strokeRect(cx-bw/2, py+sw, bw, cs-sw*2);
      } else {
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(px,       cy-bw/2, sw, bw);
        ctx.fillRect(px+cs-sw, cy-bw/2, sw, bw);
        ctx.fillStyle = '#7a3a08';
        ctx.fillRect(px+sw, cy-bw/2, cs-sw*2, bw);
        ctx.fillStyle = '#a05010';
        ctx.fillRect(px+sw+1, cy-bw/2+1, cs-sw*2-2, bw-2);
        ctx.strokeStyle = PALETTE.outline; ctx.lineWidth = Math.max(.8, cs*.06);
        ctx.strokeRect(px+sw, cy-bw/2, cs-sw*2, bw);
      }
      break;
    }

    // ── Locked door — same symbol but iron-grey + portcullis lines ──
    case T.DOOR_LOCKED: {
      const ori = doorOri(grid,gx,gy);
      const bw = Math.max(2, cs*.55);
      const bh = Math.max(2, cs*.18);
      const sw = Math.max(1, cs*.14);
      ctx.fillStyle = PALETTE.floor; ctx.fillRect(px,py,cs,cs);
      if(ori==='h'){
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(cx-bw/2,py,bw,sw); ctx.fillRect(cx-bw/2,py+cs-sw,bw,sw);
        ctx.fillStyle='#2a2020';
        ctx.fillRect(cx-bw/2,py+sw,bw,cs-sw*2);
        // portcullis bars
        if(cs>=10){
          ctx.strokeStyle='rgba(140,110,80,.7)'; ctx.lineWidth=Math.max(1,cs*.06);
          const bars=Math.max(2,Math.floor(bw/(cs*.14)));
          for(let i=1;i<bars;i++){
            const bx=cx-bw/2+(bw/bars)*i;
            ctx.beginPath();ctx.moveTo(bx,py+sw);ctx.lineTo(bx,py+cs-sw);ctx.stroke();
          }
        }
        ctx.strokeStyle=PALETTE.outline; ctx.lineWidth=Math.max(.8,cs*.06);
        ctx.strokeRect(cx-bw/2,py+sw,bw,cs-sw*2);
      } else {
        ctx.fillStyle=PALETTE.outline;
        ctx.fillRect(px,cy-bw/2,sw,bw); ctx.fillRect(px+cs-sw,cy-bw/2,sw,bw);
        ctx.fillStyle='#2a2020';
        ctx.fillRect(px+sw,cy-bw/2,cs-sw*2,bw);
        if(cs>=10){
          ctx.strokeStyle='rgba(140,110,80,.7)'; ctx.lineWidth=Math.max(1,cs*.06);
          const bars=Math.max(2,Math.floor(bw/(cs*.14)));
          for(let i=1;i<bars;i++){
            const by=cy-bw/2+(bw/bars)*i;
            ctx.beginPath();ctx.moveTo(px+sw,by);ctx.lineTo(px+cs-sw,by);ctx.stroke();
          }
        }
        ctx.strokeStyle=PALETTE.outline; ctx.lineWidth=Math.max(.8,cs*.06);
        ctx.strokeRect(px+sw,cy-bw/2,cs-sw*2,bw);
      }
      break;
    }

    // ── Secret door — looks like wall, tiny marks in MJ mode ──
    case T.DOOR_SECRET: {
      // Draw as wall (hatch)
      ctx.fillStyle = PALETTE.wall; ctx.fillRect(px,py,cs,cs);
      ctx.fillStyle = getHatchPattern(ctx); ctx.fillRect(px,py,cs,cs);
      // Wall outlines so it blends perfectly
      ctx.strokeStyle=PALETTE.outline; ctx.lineWidth=Math.max(1.5,cs*.12);
      // MJ hint: small dotted arc on the wall face
      if(showSecrets){
        const ori=doorOri(grid,gx,gy);
        ctx.strokeStyle='rgba(140,60,200,.75)';
        ctx.lineWidth=Math.max(1,cs*.07);
        ctx.setLineDash([Math.max(1,cs*.1),Math.max(1,cs*.08)]);
        if(ori==='h'){
          ctx.beginPath();ctx.moveTo(cx,py+cs*.15);ctx.lineTo(cx,py+cs*.85);ctx.stroke();
        } else {
          ctx.beginPath();ctx.moveTo(px+cs*.15,cy);ctx.lineTo(px+cs*.85,cy);ctx.stroke();
        }
        ctx.setLineDash([]);
        if(cs>=12){
          ctx.font=`bold ${Math.max(6,cs*.3)}px Cinzel,serif`;
          ctx.fillStyle='rgba(150,60,220,.8)';
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText('S',cx,cy);
        }
      }
      break;
    }

    // ── Pillar — solid circle with outline ──
    case T.PILLAR: {
      const r = Math.max(2, cs*.36);
      ctx.fillStyle = PALETTE.outline;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#888070';
      ctx.beginPath(); ctx.arc(cx,cy,r*.68,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#a89880';
      ctx.beginPath(); ctx.arc(cx-r*.22,cy-r*.22,r*.28,0,Math.PI*2); ctx.fill();
      break;
    }

    // ── Stairs — parallel horizontal lines (classic view from above) ──
    case T.STAIRS_DOWN:
    case T.STAIRS_UP: {
      const lines = Math.max(3, Math.floor(cs/4));
      const margin = cs*.15;
      const up = (t===T.STAIRS_UP);
      ctx.strokeStyle = PALETTE.outline;
      ctx.lineWidth   = Math.max(.8, cs*.06);
      for(let i=0;i<lines;i++){
        const frac = margin + (cs-margin*2)*(i/(lines-1));
        ctx.beginPath();
        ctx.moveTo(px+margin, py+frac);
        ctx.lineTo(px+cs-margin, py+frac);
        ctx.stroke();
      }
      // Arrow indicator
      ctx.fillStyle = up ? '#207040' : '#204080';
      ctx.font=`bold ${Math.max(6,cs*.4)}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(up?'↑':'↓', cx, cy);
      break;
    }

    // ── Chest ──
    case T.CHEST: {
      const w=cs*.52, h=cs*.36;
      ctx.fillStyle='#6a4010';
      ctx.fillRect(cx-w/2, cy-h/2, w, h);
      ctx.fillStyle='#9a6018';
      ctx.fillRect(cx-w/2+1, cy-h/2+1, w-2, h/2-1);
      ctx.fillStyle='#d4a020';
      ctx.fillRect(cx-cs*.06, cy-cs*.06, cs*.12, cs*.12);
      ctx.strokeStyle=PALETTE.outline; ctx.lineWidth=Math.max(.8,cs*.06);
      ctx.strokeRect(cx-w/2,cy-h/2,w,h);
      break;
    }

    // ── Altar ──
    case T.ALTAR: {
      const w=cs*.6, h=cs*.4, pedH=cs*.14;
      ctx.fillStyle='#888070';
      ctx.fillRect(cx-w/2,cy+h/2-pedH,w,pedH);
      ctx.fillStyle='#a89880';
      ctx.fillRect(cx-w*0.38,cy-h/2,w*.76,h-pedH);
      ctx.strokeStyle=PALETTE.outline; ctx.lineWidth=Math.max(.8,cs*.06);
      ctx.strokeRect(cx-w*0.38,cy-h/2,w*.76,h-pedH);
      // Cross symbol
      ctx.lineWidth=Math.max(1,cs*.08);
      ctx.beginPath(); ctx.moveTo(cx,cy-h*.3); ctx.lineTo(cx,cy+h*.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-w*.15,cy-h*.08); ctx.lineTo(cx+w*.15,cy-h*.08); ctx.stroke();
      break;
    }

    // ── Trap ──
    case T.TRAP: {
      const r=Math.max(2,cs*.32);
      ctx.strokeStyle='rgba(180,40,20,.7)'; ctx.lineWidth=Math.max(1,cs*.08);
      // X mark
      ctx.beginPath(); ctx.moveTo(cx-r,cy-r); ctx.lineTo(cx+r,cy+r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+r,cy-r); ctx.lineTo(cx-r,cy+r); ctx.stroke();
      // Circle
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
      break;
    }
  }
}

function renderMinimap(ctx, dungeon, vpX, vpY, vpW, vpH, size){
  if(!dungeon) return;
  const {grid:g, rooms, W, H} = dungeon;
  const sx=size/W, sy=size/H;
  ctx.clearRect(0,0,size,size);
  // Hatched bg
  ctx.fillStyle=PALETTE.wall; ctx.fillRect(0,0,size,size);
  // Floor tiles
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const t=g[y][x]; if(t===T.WALL) continue;
    ctx.fillStyle = t===T.WATER?PALETTE.water:t===T.LAVA?PALETTE.lava:t===T.CORRIDOR?PALETTE.corr:PALETTE.floor;
    ctx.fillRect(x*sx,y*sy,Math.max(1,sx),Math.max(1,sy));
  }
  // Room tints
  const MM={entry:'rgba(200,160,20,.4)',boss:'rgba(180,20,20,.4)',special:'rgba(20,120,20,.3)',secret:'rgba(100,20,180,.35)',trap:'rgba(180,60,10,.35)',normal:null};
  for(const r of rooms){ if(MM[r.type]){ctx.fillStyle=MM[r.type];ctx.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);} }
  // Viewport rect
  ctx.strokeStyle='rgba(0,0,200,.55)'; ctx.lineWidth=1;
  ctx.strokeRect(Math.max(0,vpX*sx),Math.max(0,vpY*sy),Math.min(size,vpW*sx),Math.min(size,vpH*sy));
}

// ══════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════
let dungeon=null, selId=null;
let showGrid=false, showNums=true, showSecrets=true;
let zoom=1, panX=0, panY=0;
let isPanning=false, lastPX=0, lastPY=0;
let cs=12;
let currentAlgo='bsp';
let currentSeed=newSeed();
let autoGenTimer=null;

function newSeed(){ return Math.floor(Math.random()*999999)+10000; }

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updSeedDisp();
  // Restore saved dungeon
  const saved = loadCurrent();
  if(saved){ dungeon=saved; showMapUI(); updStats(); renderAll(); }
  updHist();
  // Auto-generate after small delay on first load if no dungeon
  if(!dungeon) setTimeout(generate, 300);
  // All range/select inputs trigger auto-regen
  document.querySelectorAll('input[type=range], select').forEach(el => {
    el.addEventListener('input', scheduleAutoGen);
    el.addEventListener('change', scheduleAutoGen);
  });
});

function scheduleAutoGen(){
  clearTimeout(autoGenTimer);
  autoGenTimer = setTimeout(generate, 420);
}

// ══════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════
function updSeedDisp(){ document.getElementById('seed-disp').textContent='#'+currentSeed; }

function rerollSeed(){
  currentSeed=newSeed(); updSeedDisp(); generate();
}

document.getElementById('seed-disp').addEventListener('click', ()=>{
  navigator.clipboard?.writeText(String(currentSeed));
  toast('Seed copié !');
});

function setAlgo(el){
  document.querySelectorAll('.algo-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  currentAlgo=el.dataset.algo;
  generate();
}

function getConfig(){
  const W = parseInt(document.getElementById('sz').value);
  return {
    algo: currentAlgo,
    W,
    seed: currentSeed,
    corrDensity:    parseFloat(document.getElementById('corr').value)/100,
    doorP:          parseFloat(document.getElementById('door-p').value)/100,
    lockedDoorP:    parseFloat(document.getElementById('locked-p').value)/100,
    secretDoorP:    parseFloat(document.getElementById('secret-p').value)/100,
    trapRoomP:      parseFloat(document.getElementById('trap-p').value)/100,
    secretRoomP:    parseFloat(document.getElementById('secretroom-p').value)/100,
    pillarP:        parseFloat(document.getElementById('pillar-p').value)/100,
    roomSizeMin:    parseInt(document.getElementById('room-min').value),
    roomSizeMax:    parseInt(document.getElementById('room-max').value),
    symmetry:       parseInt(document.getElementById('symmetry').value),
    waterRooms:     document.getElementById('water').checked,
    lavaRooms:      document.getElementById('lava').checked,
  };
}

// Live label updates — called oninput in HTML
function updLabel(id, val, suffix){ document.getElementById(id).textContent = val+(suffix||''); }

// ══════════════════════════════════════════════════════════
// GENERATE
// ══════════════════════════════════════════════════════════
function generate(){
  _hatchPattern = null; // reset pattern cache for new canvas context
  const cfg = getConfig();
  dungeon = generateDungeon(cfg);
  saveDungeon(dungeon);
  selId=null; zoom=1; panX=0; panY=0;
  showMapUI(); updStats(); renderAll(); updHist();
  document.getElementById('rpanel').innerHTML='<div class="r-empty">Clique sur une salle</div>';
  const autoCount = Math.max(4, Math.floor((cfg.W*cfg.W) / (Math.max(6,Math.floor(cfg.W/5))**2*2.5) * (0.5+cfg.corrDensity*.5)));
  toast(`⚒ ${dungeon.rooms.length} salles · seed #${dungeon.seed}`);
}

function showMapUI(){
  document.getElementById('ph').style.display='none';
  document.getElementById('mm-wrap').style.display='block';
}

function updStats(){
  if(!dungeon) return;
  const rs=dungeon.rooms;
  document.getElementById('st-r').textContent  = rs.length;
  document.getElementById('st-b').textContent  = rs.filter(r=>r.type==='boss').length;
  document.getElementById('st-s').textContent  = rs.filter(r=>r.type==='special').length;
  document.getElementById('st-t').textContent  = rs.filter(r=>r.traps?.length).length;
  document.getElementById('st-sc').textContent = rs.filter(r=>r.secrets?.length).length;
  document.getElementById('st-tr').textContent = rs.filter(r=>r.treasure?.length).length;
  document.getElementById('st-al').textContent = (dungeon.algo||'bsp').toUpperCase();
}

// ══════════════════════════════════════════════════════════
// RENDER LOOP
// ══════════════════════════════════════════════════════════
function renderAll(){
  if(!dungeon) return;
  const wrap=document.getElementById('map-wrap');
  const canvas=document.getElementById('mc');
  const ctx=canvas.getContext('2d');
  const {W,H}=dungeon;
  cs = Math.max(8, Math.floor(Math.min(wrap.clientWidth*.92,(wrap.clientHeight-30)*.96)/Math.max(W,H)));
  canvas.width=cs*W; canvas.height=cs*H;
  canvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
  renderDungeon(ctx,dungeon,cs,selId,showGrid,showNums,showSecrets);
  updMinimap();
  document.getElementById('zoom-lbl').textContent=Math.round(zoom*100)+'%';
}

function updMinimap(){
  if(!dungeon) return;
  const wrap=document.getElementById('map-wrap');
  const mmc=document.getElementById('mm');
  const vpW=wrap.clientWidth/(cs*zoom), vpH=(wrap.clientHeight-30)/(cs*zoom);
  const vpX=-panX/(cs*zoom), vpY=-panY/(cs*zoom);
  renderMinimap(mmc.getContext('2d'),dungeon,vpX,vpY,vpW,vpH,110);
}

// ══════════════════════════════════════════════════════════
// PAN & ZOOM
// ══════════════════════════════════════════════════════════
const mapWrap=document.getElementById('map-wrap');
mapWrap.addEventListener('mousedown',e=>{if(e.target.tagName==='BUTTON')return;isPanning=true;lastPX=e.clientX;lastPY=e.clientY;});
window.addEventListener('mousemove',e=>{if(!isPanning)return;panX+=e.clientX-lastPX;panY+=e.clientY-lastPY;lastPX=e.clientX;lastPY=e.clientY;clampPan();applyT();});
window.addEventListener('mouseup',()=>isPanning=false);
mapWrap.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.2,Math.min(10,zoom*(e.deltaY>0?.88:1.14)));clampPan();applyT();},{passive:false});

function applyT(){
  document.getElementById('mc').style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
  document.getElementById('zoom-lbl').textContent=Math.round(zoom*100)+'%';
  updMinimap();
}
function clampPan(){
  const c=document.getElementById('mc'),w=document.getElementById('map-wrap'),m=80;
  panX=Math.max(-(c.width*zoom-w.clientWidth)-m,Math.min(m,panX));
  panY=Math.max(-(c.height*zoom-w.clientHeight)-m,Math.min(m,panY));
}
function zoomIn(){  zoom=Math.min(10,zoom*1.25); clampPan(); applyT(); }
function zoomOut(){ zoom=Math.max(.2,zoom/1.25);  clampPan(); applyT(); }
function resetView(){ zoom=1; panX=0; panY=0; applyT(); renderAll(); }

// ══════════════════════════════════════════════════════════
// ROOM CLICK & PANEL
// ══════════════════════════════════════════════════════════
mapWrap.addEventListener('click',e=>{
  if(!dungeon||Math.abs(e.movementX)+Math.abs(e.movementY)>4||e.target.tagName==='BUTTON') return;
  const rect=mapWrap.getBoundingClientRect();
  const mx=(e.clientX-rect.left-panX)/zoom, my=(e.clientY-rect.top-panY)/zoom;
  const gx=Math.floor(mx/cs), gy=Math.floor(my/cs);
  for(const r of dungeon.rooms){
    if(gx>=r.x&&gx<r.x+r.w&&gy>=r.y&&gy<r.y+r.h){
      selId=r.id; showRoomPanel(r); renderAll(); return;
    }
  }
  selId=null;
  document.getElementById('rpanel').innerHTML='<div class="r-empty">Clique sur une salle</div>';
  renderAll();
});

function showRoomPanel(r){
  const TL={entry:'Entrée',boss:'Boss / Trésor',special:'Spéciale',secret:'Secret',trap:'Piège',normal:'Normale'};
  const TB={entry:'b-gold',boss:'b-red',special:'b-green',secret:'b-purple',trap:'b-ember',normal:'b-grey'};
  const IC={entry:'🚪',boss:'💀',special:'⭐',secret:'🔮',trap:'⚠️',normal:'·'};
  let h=`<div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
    <div class="r-num">${String(r.id).padStart(2,'0')}</div>
    <div style="flex:1">
      <input class="r-name-inp" value="${r.name}" onchange="renameRoom(${r.id},this.value)">
      <span class="r-badge ${TB[r.type]||'b-grey'}">${IC[r.type]||''} ${TL[r.type]||r.type}</span>
    </div>
  </div>`;
  if(r.traps?.length)   h+=row('⚠ Pièges',r.traps.join(', '));
  if(r.secrets?.length) h+=row('◆ Secrets',r.secrets.join(', '));
  if(r.treasure?.length)h+=row('💰 Trésor',r.treasure.join(', '));
  const sz=r.cells?`${r.cells.length} cases`:`${r.w}×${r.h} = ${r.w*r.h} cases`;
  h+=row('📐 Taille',sz);
  h+=`<div class="r-row"><span class="r-lbl">📝 Notes</span><span class="r-val"><textarea class="r-note" onchange="saveNote(${r.id},this.value)" placeholder="Notes MJ...">${r.notes||''}</textarea></span></div>`;
  h+=`<div class="btn-row" style="margin-top:7px">
    <button class="btn" onclick="rerollRoom(${r.id})">🎲 Re-roll</button>
    <button class="btn" onclick="cycleType(${r.id})">↻ Type</button>
  </div>`;
  document.getElementById('rpanel').innerHTML=h;
}
function row(lbl,val){ return `<div class="r-row"><span class="r-lbl">${lbl}</span><span class="r-val">${val}</span></div>`; }

function renameRoom(id,v){ const r=dungeon?.rooms.find(r=>r.id===id); if(r){r.name=v;saveDungeon(dungeon);} }
function saveNote(id,v)  { const r=dungeon?.rooms.find(r=>r.id===id); if(r){r.notes=v;saveDungeon(dungeon);} }
function rerollRoom(id){
  const r=dungeon?.rooms.find(r=>r.id===id);
  if(!r||r.type==='entry'){toast('Impossible sur l\'entrée');return;}
  const rng=()=>Math.random();
  r.traps    = rng()<.3?[rp(rng,TRAP_NAMES)]:[];
  r.secrets  = rng()<.2?[rp(rng,SECRET_NAMES)]:[];
  r.treasure = rng()<.25?[rp(rng,TREASURE_NAMES)]:[];
  saveDungeon(dungeon); showRoomPanel(r); toast('Salle re-randomisée');
}
function cycleType(id){
  const r=dungeon?.rooms.find(r=>r.id===id);
  if(!r||r.type==='entry'||r.type==='boss') return;
  const types=['normal','special','trap','secret'];
  r.type=types[(types.indexOf(r.type)+1)%types.length];
  saveDungeon(dungeon); showRoomPanel(r); renderAll(); toast('Type → '+r.type);
}

// ══════════════════════════════════════════════════════════
// TOGGLES
// ══════════════════════════════════════════════════════════
function toggleGrid(){
  showGrid=!showGrid;
  document.getElementById('btn-grid').classList.toggle('active',showGrid);
  renderAll();
}
function toggleNums(){
  showNums=!showNums;
  document.getElementById('btn-num').classList.toggle('active',showNums);
  renderAll();
}
document.getElementById('mj-mode').addEventListener('change',function(){
  showSecrets=this.checked; renderAll();
  toast(showSecrets?'Mode MJ — secrets visibles':'Mode joueur');
});

// ══════════════════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════════════════
function updHist(){
  const h=loadHistory(), c=document.getElementById('hist');
  if(!h.length){c.innerHTML='<div style="font-family:\'Crimson Pro\',serif;font-size:.82rem;color:var(--textm);text-align:center;padding:.5rem 0">Aucun donjon</div>';return;}
  const icons={bsp:'⬜',drunk:'🌀',cellular:'🫧',maze:'🌿'};
  c.innerHTML=h.slice(0,7).map(e=>{
    const d=new Date(e.date);
    return `<div class="hi" onclick="loadHist(${e.seed})">
      <div><div class="hi-seed">${icons[e.algo]||'⚒'} #${e.seed}</div><div class="hi-meta">${e.rooms} salles · ${(e.algo||'bsp').toUpperCase()}</div></div>
      <div class="hi-meta">${d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</div>
    </div>`;
  }).join('');
}

function loadHist(seed){
  try{
    const raw=localStorage.getItem('dfv3_'+seed);
    if(raw){ dungeon=JSON.parse(raw); currentSeed=seed; updSeedDisp(); showMapUI(); updStats(); zoom=1;panX=0;panY=0; renderAll(); toast('Donjon #'+seed+' rechargé'); return; }
  }catch{}
  currentSeed=seed; updSeedDisp(); generate();
}

// ══════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════
function exportPNG(res){
  if(!dungeon){toast('Aucun donjon');return;}
  const pcs=16*res, off=document.createElement('canvas');
  off.width=pcs*dungeon.W; off.height=pcs*dungeon.H;
  renderDungeon(off.getContext('2d'),dungeon,pcs,null,false,true,false);
  const a=document.createElement('a');
  a.download=`dungeon_${dungeon.seed}_${res}x.png`;
  a.href=off.toDataURL('image/png'); a.click();
  toast(`PNG ×${res} exporté ✓`);
}

function exportTXT(){
  if(!dungeon){toast('Aucun donjon');return;}
  let t=`╔═══════════════════════════════════════════════╗\n║  DUNGEONFORGE — Fiche MJ                       ║\n╚═══════════════════════════════════════════════╝\n\n`;
  t+=`Seed    : #${dungeon.seed}\nAlgo    : ${(dungeon.algo||'bsp').toUpperCase()}\nTaille  : ${dungeon.W}×${dungeon.H}\nSalles  : ${dungeon.rooms.length}\n\n${'─'.repeat(49)}\n\n`;
  for(const r of dungeon.rooms){
    const TL={entry:'ENTRÉE',boss:'BOSS/TRÉSOR',special:'SPÉCIALE',secret:'SECRÈTE',trap:'PIÉGÉE',normal:'Normale'};
    t+=`┌─ [${String(r.id).padStart(2,'0')}] ${r.name.toUpperCase()} — ${TL[r.type]||''}\n`;
    if(r.traps?.length)   t+=`│  ⚠  ${r.traps.join(', ')}\n`;
    if(r.secrets?.length) t+=`│  ◆  ${r.secrets.join(', ')}\n`;
    if(r.treasure?.length)t+=`│  💰 ${r.treasure.join(', ')}\n`;
    if(r.notes)           t+=`│  📝 ${r.notes}\n`;
    t+=`└${'─'.repeat(48)}\n\n`;
  }
  const b=new Blob([t],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(b);
  a.download=`fiche_mj_${dungeon.seed}.txt`; a.click(); URL.revokeObjectURL(a.href);
  toast('Fiche MJ exportée ✓');
}

function exportJSON(){
  if(!dungeon){toast('Aucun donjon');return;}
  const b=new Blob([JSON.stringify(dungeon,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(b);
  a.download=`dungeon_${dungeon.seed}.json`; a.click(); URL.revokeObjectURL(a.href);
  toast('JSON exporté ✓');
}

function copyDiscord(){
  if(!dungeon){toast('Aucun donjon');return;}
  let t=`**DungeonForge** — \`#${dungeon.seed}\` · ${(dungeon.algo||'bsp').toUpperCase()} · ${dungeon.rooms.length} salles\n\n`;
  const IC={entry:'🚪',boss:'💀',special:'⭐',secret:'🔮',trap:'⚠️',normal:'·'};
  dungeon.rooms.forEach(r=>{ t+=`${IC[r.type]||'·'} **[${r.id}] ${r.name}**\n`; });
  navigator.clipboard?.writeText(t).then(()=>toast('Copié Discord ✓'));
}

// ══════════════════════════════════════════════════════════
// PERSISTENCE
// ══════════════════════════════════════════════════════════
function saveDungeon(d){
  try{
    const h=loadHistory();
    h.unshift({seed:d.seed,algo:d.algo,rooms:d.rooms.length,size:d.W,date:new Date().toISOString()});
    if(h.length>12)h.length=12;
    localStorage.setItem('dfv3_history',JSON.stringify(h));
    localStorage.setItem('dfv3_current',JSON.stringify(d));
    localStorage.setItem('dfv3_'+d.seed,JSON.stringify(d));
  }catch(e){}
}
function loadCurrent(){ try{return JSON.parse(localStorage.getItem('dfv3_current'));}catch{return null;} }
function loadHistory(){ try{return JSON.parse(localStorage.getItem('dfv3_history'))||[];}catch{return [];} }

// ══════════════════════════════════════════════════════════
// TOAST & KEYBOARD
// ══════════════════════════════════════════════════════════
function toast(msg,dur=2400){
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),dur);
}

document.addEventListener('keydown',e=>{
  const tg=document.activeElement.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA') return;
  if(e.code==='Space'){e.preventDefault();rerollSeed();}
  if(e.code==='Equal'||e.code==='NumpadAdd')zoomIn();
  if(e.code==='Minus'||e.code==='NumpadSubtract')zoomOut();
  if(e.code==='KeyR')resetView();
  if(e.code==='KeyG')toggleGrid();
});

window.addEventListener('resize',()=>{if(dungeon)renderAll();});
