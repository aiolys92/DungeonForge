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
// RENDERER
// ══════════════════════════════════════════════════════════
const PALETTE = {
  bg:'#040208', wall:'#0d0b14', floor:'#1c1a2c', corr:'#14122a',
  water:'#0e2030', lava:'#300e04'
};

function renderDungeon(ctx, dungeon, cs, selId, showGrid, showNums, showSecrets){
  const {grid:g, rooms, W, H} = dungeon;
  const cw=W*cs, ch=H*cs;

  ctx.fillStyle=PALETTE.bg; ctx.fillRect(0,0,cw,ch);

  // Base tiles
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const t=g[y][x]; if(t===T.WALL) continue;
    const c = t===T.CORRIDOR?PALETTE.corr : t===T.WATER?PALETTE.water : t===T.LAVA?PALETTE.lava : PALETTE.floor;
    ctx.fillStyle=c; ctx.fillRect(x*cs,y*cs,cs,cs);
    if(cs>6&&(t===T.FLOOR||t===T.CORRIDOR)){ctx.fillStyle='rgba(255,255,255,.022)';ctx.fillRect(x*cs+1,y*cs+1,cs-2,cs-2);}
  }

  // Wall face shading
  for(let y=0;y<H-1;y++) for(let x=0;x<W;x++){
    if(g[y][x]!==T.WALL&&g[y+1]?.[x]===T.WALL){ctx.fillStyle='rgba(0,0,0,.32)';ctx.fillRect(x*cs,(y+1)*cs,cs,Math.min(3,cs*.25));}
  }

  // Special tiles
  if(cs>=8){
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const t=g[y][x]; if(t===T.WALL||t===T.FLOOR||t===T.CORRIDOR) continue;
      const cx=x*cs+cs/2, cy=y*cs+cs/2, fs=Math.max(7,Math.min(cs*.65,14));
      drawTile(ctx,t,x*cs,y*cs,cx,cy,cs,fs,showSecrets);
    }
  }

  // Room overlays
  const RC={
    entry:  {f:'rgba(150,105,10,.17)', b:'rgba(225,175,75,.65)',  ic:'🚪'},
    boss:   {f:'rgba(135,10,10,.2)',   b:'rgba(205,48,48,.65)',   ic:'💀'},
    special:{f:'rgba(10,85,10,.17)',   b:'rgba(55,155,55,.55)',   ic:'⭐'},
    secret: {f:'rgba(65,10,125,.19)',  b:'rgba(130,55,205,.55)',  ic:'🔮'},
    trap:   {f:'rgba(125,28,8,.19)',   b:'rgba(185,55,28,.55)',   ic:'⚠️'},
    normal: {f:'rgba(45,42,85,.1)',    b:'rgba(72,65,125,.3)',    ic:null}
  };
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const r of rooms){
    const tc=RC[r.type]||RC.normal;
    ctx.fillStyle=tc.f; ctx.fillRect(r.x*cs,r.y*cs,r.w*cs,r.h*cs);
    if(selId===r.id){
      ctx.fillStyle='rgba(255,205,65,.1)'; ctx.fillRect(r.x*cs,r.y*cs,r.w*cs,r.h*cs);
      ctx.strokeStyle='rgba(255,205,65,.78)'; ctx.lineWidth=2.5;
      ctx.strokeRect(r.x*cs+1,r.y*cs+1,r.w*cs-2,r.h*cs-2);
    } else {
      ctx.strokeStyle=tc.b; ctx.lineWidth=1;
      ctx.strokeRect(r.x*cs+.5,r.y*cs+.5,r.w*cs-1,r.h*cs-1);
    }
    if(r.w*cs<14||r.h*cs<14) continue;
    const cx=r.cx*cs+cs/2, cy=r.cy*cs+cs/2;
    const fs=Math.max(8,Math.min(cs*.75,13));
    const hasIco=tc.ic&&r.w*cs>24&&r.h*cs>24;
    if(hasIco){ctx.font=`${fs*1.1}px serif`;ctx.fillText(tc.ic,cx,cy-(showNums?fs*.5:0));}
    if(showNums){ctx.font=`bold ${fs}px Cinzel,serif`;ctx.fillStyle='rgba(210,190,155,.9)';ctx.fillText(r.id,cx,cy+(hasIco?fs*.5:0));}
  }

  if(showGrid){
    ctx.strokeStyle='rgba(255,255,255,.038)'; ctx.lineWidth=.5;
    for(let i=0;i<=W;i++){ctx.beginPath();ctx.moveTo(i*cs,0);ctx.lineTo(i*cs,ch);ctx.stroke();}
    for(let i=0;i<=H;i++){ctx.beginPath();ctx.moveTo(0,i*cs);ctx.lineTo(cw,i*cs);ctx.stroke();}
  }
}

function drawTile(ctx, t, px, py, cx, cy, cs, fs, showSecrets){
  switch(t){
    case T.DOOR:
      // Door frame + panel
      ctx.fillStyle='rgba(100,55,15,.95)';
      ctx.fillRect(px+cs*.12,py+cs*.08,cs*.76,cs*.84);
      ctx.fillStyle='rgba(160,90,28,.9)';
      ctx.fillRect(px+cs*.22,py+cs*.14,cs*.56,cs*.72);
      // handle
      ctx.fillStyle='rgba(230,180,70,.85)';
      ctx.beginPath(); ctx.arc(px+cs*.65,cy,cs*.07,0,Math.PI*2); ctx.fill();
      // frame highlight
      ctx.strokeStyle='rgba(200,130,40,.6)'; ctx.lineWidth=.8;
      ctx.strokeRect(px+cs*.12,py+cs*.08,cs*.76,cs*.84);
      break;

    case T.DOOR_LOCKED:
      ctx.fillStyle='rgba(80,18,18,.95)';
      ctx.fillRect(px+cs*.12,py+cs*.08,cs*.76,cs*.84);
      ctx.fillStyle='rgba(130,30,30,.9)';
      ctx.fillRect(px+cs*.22,py+cs*.14,cs*.56,cs*.72);
      ctx.strokeStyle='rgba(180,50,50,.6)'; ctx.lineWidth=.8;
      ctx.strokeRect(px+cs*.12,py+cs*.08,cs*.76,cs*.84);
      if(cs>=10){
        // Lock icon
        ctx.fillStyle='rgba(220,140,140,.9)';
        ctx.beginPath(); ctx.arc(cx,cy-cs*.08,cs*.12,0,Math.PI*2); ctx.stroke();
        ctx.fillRect(cx-cs*.1,cy,cs*.2,cs*.18);
      }
      break;

    case T.DOOR_SECRET:
      if(showSecrets){
        // Dashed outline — visible only in MJ mode
        ctx.setLineDash([2,2]);
        ctx.strokeStyle='rgba(150,70,210,.65)'; ctx.lineWidth=1.2;
        ctx.strokeRect(px+2,py+2,cs-4,cs-4);
        ctx.setLineDash([]);
        if(cs>=11){ctx.font=`${fs*.75}px serif`;ctx.fillStyle='rgba(170,90,230,.75)';ctx.fillText('?',cx,cy);}
      }
      break;

    case T.STAIRS_DOWN:
      ctx.font=`${fs}px serif`; ctx.fillStyle='rgba(75,115,235,.92)'; ctx.fillText('▼',cx,cy); break;
    case T.STAIRS_UP:
      ctx.font=`${fs}px serif`; ctx.fillStyle='rgba(75,195,115,.92)'; ctx.fillText('▲',cx,cy); break;
    case T.CHEST:
      ctx.font=`${fs}px serif`; ctx.fillStyle='rgba(205,165,28,.92)'; ctx.fillText('◈',cx,cy); break;
    case T.ALTAR:
      ctx.font=`${fs}px serif`; ctx.fillStyle='rgba(165,85,205,.92)'; ctx.fillText('✦',cx,cy); break;
    case T.TRAP:
      ctx.font=`${fs}px serif`; ctx.fillStyle='rgba(195,65,38,.88)'; ctx.fillText('✕',cx,cy); break;
    case T.PILLAR:
      ctx.fillStyle='rgba(85,75,105,.75)'; ctx.beginPath(); ctx.arc(cx,cy,cs*.38,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(135,125,165,.55)'; ctx.lineWidth=1; ctx.stroke();
      break;
    case T.WATER:
      ctx.fillStyle='rgba(18,88,155,.45)'; ctx.fillRect(px,py,cs,cs);
      if(cs>=12){ctx.font=`${cs*.5}px serif`;ctx.fillStyle='rgba(55,145,205,.45)';ctx.fillText('≈',cx,cy);}
      break;
    case T.LAVA:
      ctx.fillStyle='rgba(160,40,10,.55)'; ctx.fillRect(px,py,cs,cs);
      if(cs>=12){ctx.font=`${cs*.5}px serif`;ctx.fillStyle='rgba(230,100,30,.6)';ctx.fillText('~',cx,cy);}
      break;
  }
}

function renderMinimap(ctx, dungeon, vpX, vpY, vpW, vpH, size){
  if(!dungeon) return;
  const {grid:g, rooms, W, H} = dungeon;
  const sx=size/W, sy=size/H;
  ctx.clearRect(0,0,size,size);
  ctx.fillStyle=PALETTE.bg; ctx.fillRect(0,0,size,size);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const t=g[y][x]; if(t===T.WALL) continue;
    ctx.fillStyle = t===T.CORRIDOR?PALETTE.corr:PALETTE.floor;
    ctx.fillRect(x*sx,y*sy,Math.max(1,sx),Math.max(1,sy));
  }
  const RC={entry:'#d4a040',boss:'#c04040',special:'#3a6a3a',secret:'#503a8a',trap:'#7a3030',normal:'rgba(65,58,115,.65)'};
  for(const r of rooms){ ctx.fillStyle=RC[r.type]||RC.normal; ctx.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy); }
  ctx.strokeStyle='rgba(240,195,60,.65)'; ctx.lineWidth=1;
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
