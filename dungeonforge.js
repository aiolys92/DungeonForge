// ══════════════════════════════════════════════════════════
// TILE TYPES
// ══════════════════════════════════════════════════════════
const T = { WALL:0,FLOOR:1,CORRIDOR:2,DOOR:3,DOOR_LOCKED:4,DOOR_SECRET:5,WATER:6,PILLAR:7,STAIRS_DOWN:8,STAIRS_UP:9,CHEST:10,ALTAR:11,TRAP:12 };

// ══════════════════════════════════════════════════════════
// RNG
// ══════════════════════════════════════════════════════════
function makeRng(seed){
  let s=(seed>>>0)||1;
  return ()=>{ s+=0x6D2B79F5; let t=s; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return((t^t>>>14)>>>0)/4294967296; };
}
function ri(rng,min,max){ return Math.floor(rng()*(max-min+1))+min; }
function rp(rng,arr){ return arr[Math.floor(rng()*arr.length)]; }

// ══════════════════════════════════════════════════════════
// THEMES
// ══════════════════════════════════════════════════════════
const THEMES = {
  dungeon:{ name:"Donjon Classique", pal:{bg:'#040208',wall:'#0e0c14',floor:'#1e1c2e',corr:'#16142a',acc:'#5050a0'},
    rooms:["Salle des gardes","Cachot","Salle d'armes","Chambre du seigneur","Salle du conseil","Salle des tortures","Armurerie","Réserves","Antichambre","Salle des trophées","Chapelle profane","Oubliettes","Salle de banquet","Grande salle","Bibliothèque","Cave","Cellier","Salle d'audience"],
    monsters:{easy:[{n:"Squelettes",cr:"1/4",pv:13,ca:13},{n:"Gobelins",cr:"1/4",pv:7,ca:15},{n:"Zombies",cr:"1/4",pv:22,ca:8},{n:"Kobolds",cr:"1/8",pv:5,ca:12}],medium:[{n:"Orques",cr:"1/2",pv:15,ca:13},{n:"Hobgobelins",cr:"1/2",pv:11,ca:18},{n:"Spectres",cr:"1",pv:22,ca:12},{n:"Trolls",cr:"5",pv:84,ca:15}],hard:[{n:"Vampire spawn",cr:"5",pv:82,ca:15},{n:"Nécromancien",cr:"9",pv:66,ca:12},{n:"Géant des ombres",cr:"6",pv:114,ca:12}],deadly:[{n:"Liche",cr:"21",pv:135,ca:17},{n:"Balor",cr:"19",pv:262,ca:19},{n:"Pit Fiend",cr:"20",pv:300,ca:19}]},
    traps:["Dalle à bascule","Fléchettes empoisonnées","Mur à piques","Fosse dissimulée","Gaz soporifique","Boule de feu runique","Hache pendulaire"],
    secrets:["Passage derrière la bibliothèque","Alcôve avec armure ancienne","Tunnel vers les égouts","Chambre forte sous le sol","Miroir-portail"],
    treasures:["500 po","Épée +1 naine","Grimoire","Amulette +1","Parchemin niv.3","Armure elfique","Couronne déchue"] },
  crypt:{ name:"Crypte Maudite", pal:{bg:'#03040a',wall:'#0a0c12',floor:'#14181e',corr:'#0e1016',acc:'#405070'},
    rooms:["Antichambre funèbre","Salle des sarcophages","Chambre des reliques","Ossuaire","Chambre maudite","Salle des offrandes","Couloir des âmes","Sanctuaire ténébreux","Chambre du patriarche","Galerie des ancêtres","Tombeau scellé","Caveau des gardiens","Salle des larmes"],
    monsters:{easy:[{n:"Zombies",cr:"1/4",pv:22,ca:8},{n:"Squelettes",cr:"1/4",pv:13,ca:13},{n:"Ombres",cr:"1/2",pv:16,ca:12},{n:"Goules",cr:"1",pv:22,ca:12}],medium:[{n:"Banshee",cr:"4",pv:58,ca:12},{n:"Revenant",cr:"5",pv:136,ca:13},{n:"Momies",cr:"3",pv:58,ca:11}],hard:[{n:"Wraith seigneur",cr:"9",pv:67,ca:13},{n:"Mummy Lord",cr:"15",pv:97,ca:17}],deadly:[{n:"Liche ancienne",cr:"21",pv:135,ca:17},{n:"Dracoliche",cr:"17",pv:202,ca:19}]},
    traps:["Malédiction runique","Spores mortelles","Lame spectrale","Cercle piégé","Sarcophage animé"],
    secrets:["Tombe secrète d'un héros","Relique sous la dalle","Journal du fondateur","Portail éthéré","Phylactère caché"],
    treasures:["800 po","Anneau nécrotique","Sceptre","Cape funéraire","Dague des âmes","Couronne d'argent"] },
  cave:{ name:"Caverne Naturelle", pal:{bg:'#030408',wall:'#0a0e08',floor:'#161e10',corr:'#101808',acc:'#406030'},
    rooms:["Grande salle","Grotte souterraine","Lac souterrain","Salle de cristaux","Repaire","Tunnel étroit","Chambre géologique","Grotte aux peintures","Crevasse profonde","Salle des champignons","Bassin magique","Galerie effondrée"],
    monsters:{easy:[{n:"Araignées géantes",cr:"1",pv:26,ca:14},{n:"Kobolds",cr:"1/8",pv:5,ca:12},{n:"Myconides",cr:"1/2",pv:22,ca:8}],medium:[{n:"Ours des cavernes",cr:"2",pv:42,ca:13},{n:"Trolls",cr:"5",pv:84,ca:15},{n:"Derro",cr:"1/4",pv:13,ca:13}],hard:[{n:"Dragon vert jeune",cr:"8",pv:136,ca:18},{n:"Illithid",cr:"7",pv:71,ca:12}],deadly:[{n:"Aboleth",cr:"10",pv:135,ca:17},{n:"Elder Brain",cr:"14",pv:210,ca:10}]},
    traps:["Stalactites instables","Gaz volcanique","Courant souterrain","Piège de pierre","Éboulement"],
    secrets:["Veine de mithral","Œuf de dragon","Porte naine oubliée","Source magique","Sanctuaire drow"],
    treasures:["600 po en gemmes","Cristal magique","Armure draconique","Hache naine +2","Potion aquatique"] },
  fortress:{ name:"Forteresse Naine", pal:{bg:'#060508',wall:'#100e08',floor:'#1e1a10',corr:'#181408',acc:'#806030'},
    rooms:["Grande halle","Forge sacrée","Salle du trône","Armurerie royale","Salle des ancêtres","Chambre des mécanismes","Trésorerie","Quartiers des gardiens","Bibliothèque runique","Salle des réunions","Entrepôt","Bains thermaux","Puits de forge"],
    monsters:{easy:[{n:"Derro",cr:"1/4",pv:13,ca:13},{n:"Gobelins des profondeurs",cr:"1/4",pv:7,ca:15}],medium:[{n:"Duergar",cr:"1",pv:26,ca:16},{n:"Élémentaire de terre",cr:"5",pv:126,ca:17}],hard:[{n:"Géant du feu",cr:"9",pv:162,ca:18},{n:"Golem d'acier",cr:"9",pv:178,ca:18}],deadly:[{n:"Titan forgé",cr:"17",pv:243,ca:22},{n:"Dragon de fer",cr:"22",pv:297,ca:22}]},
    traps:["Engrenages broyeurs","Canon à vapeur","Porte de fer tombante","Hache rotative","Décharge runique"],
    secrets:["Trésor ancestral","Plan de la forteresse","Arme légendaire scellée","Golem endormi","Accès aux mines"],
    treasures:["1200 po en mithral","Hache +3 runique","Armure naine +2","Anneau anti-feu","Bouclier du roi"] },
  temple:{ name:"Temple Oublié", pal:{bg:'#050408',wall:'#0e0810',floor:'#1a1020',corr:'#120c18',acc:'#604880'},
    rooms:["Vestibule sacré","Salle de prière","Sanctuaire intérieur","Salle des rituels","Chambre des prêtres","Bibliothèque sacrée","Salle des offrandes","Chambre de pénitence","Adyton","Crypte des fondateurs","Salle des visions","Jardin maudit"],
    monsters:{easy:[{n:"Cultistes",cr:"1/8",pv:9,ca:12},{n:"Statues animées",cr:"1/2",pv:33,ca:11}],medium:[{n:"Fanatiques",cr:"2",pv:33,ca:13},{n:"Yuan-ti malisons",cr:"3",pv:66,ca:12}],hard:[{n:"Avatar corrompu",cr:"8",pv:97,ca:14},{n:"Archidémon",cr:"10",pv:143,ca:16}],deadly:[{n:"Demi-dieu corrompu",cr:"18",pv:225,ca:21},{n:"Archdevil",cr:"21",pv:262,ca:22}]},
    traps:["Autel maudit","Statue projectile","Sol de feu sacré","Porte maudite","Pluie acide bénite"],
    secrets:["Texte sacré interdit","Artefact divin","Salle de téléportation","Journal du grand-prêtre","Idole corrompue"],
    treasures:["700 po en offrandes","Symbole sacré +3","Bâton guérisseur","Tome divin","Calice de résurrection"] }
};
const DIFF_COLORS = {easy:'#5a8a3a',medium:'#d4a040',hard:'#c07030',deadly:'#c04040'};

// ══════════════════════════════════════════════════════════
// ALGORITHMS
// ══════════════════════════════════════════════════════════

// ── BSP ──
function genBSP(W,H,rng,opts){
  const {minR=4,maxR=12,minSplit=8,extCorr=0.3,doorP=0.65,pillarP=0.15}=opts;
  const g=Array.from({length:H},()=>Array(W).fill(T.WALL));
  const rooms=[];
  class Node{
    constructor(x,y,w,h){this.x=x;this.y=y;this.w=w;this.h=h;this.l=null;this.r=null;this.room=null;}
    split(){
      if(this.l||this.r)return false;
      const sh=rng()>.5;
      const mx=(sh?this.h:this.w)-minSplit;
      if(mx<minSplit)return false;
      const at=ri(rng,minSplit,mx);
      if(sh){this.l=new Node(this.x,this.y,this.w,at);this.r=new Node(this.x,this.y+at,this.w,this.h-at);}
      else{this.l=new Node(this.x,this.y,at,this.h);this.r=new Node(this.x+at,this.y,this.w-at,this.h);}
      return true;
    }
    getRoom(){if(this.room)return this.room;if(this.l&&this.r)return rng()>.5?this.l.getRoom():this.r.getRoom();return this.l?this.l.getRoom():this.r?this.r.getRoom():null;}
  }
  const root=new Node(1,1,W-2,H-2);
  const ns=[root];
  for(let i=0;i<8;i++) ns.forEach(n=>{if(n.split()){ns.push(n.l,n.r);}});
  let id=1;
  ns.filter(n=>!n.l&&!n.r).forEach(n=>{
    const rw=ri(rng,minR,Math.min(maxR,n.w-2));
    const rh=ri(rng,minR,Math.min(maxR,n.h-2));
    if(rw<2||rh<2)return;
    const rx=n.x+ri(rng,1,Math.max(1,n.w-rw-1));
    const ry=n.y+ri(rng,1,Math.max(1,n.h-rh-1));
    for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++)g[y][x]=T.FLOOR;
    if(pillarP>rng()&&rw>=6&&rh>=6){
      [[rx+2,ry+2],[rx+rw-3,ry+2],[rx+2,ry+rh-3],[rx+rw-3,ry+rh-3]].forEach(([px,py])=>{if(g[py]&&g[py][px]===T.FLOOR)g[py][px]=T.PILLAR;});
    }
    const room={id:id++,x:rx,y:ry,w:rw,h:rh,cx:rx+Math.floor(rw/2),cy:ry+Math.floor(rh/2),type:'normal',notes:''};
    rooms.push(room); n.room=room;
  });
  function conn(node){
    if(!node.l||!node.r)return; conn(node.l); conn(node.r);
    const a=node.l.getRoom(),b=node.r.getRoom();
    if(a&&b)carveCorr(g,a.cx,a.cy,b.cx,b.cy,rng,doorP,W,H);
  }
  conn(root);
  const extra=Math.floor(rooms.length*extCorr);
  for(let i=0;i<extra;i++){const a=rp(rng,rooms),b=rp(rng,rooms);if(a!==b)carveCorr(g,a.cx,a.cy,b.cx,b.cy,rng,.25,W,H);}
  return {g,rooms};
}

// ── DRUNK WALK ──
function genDrunk(W,H,rng,opts){
  const {fillT=0.38,diggers=3,doorP=0.35}=opts;
  const g=Array.from({length:H},()=>Array(W).fill(T.WALL));
  const DIRS=[[0,-1],[0,1],[-1,0],[1,0]];
  const total=W*H;
  for(let d=0;d<diggers;d++){
    let x=ri(rng,5,W-6),y=ri(rng,5,H-6);
    let steps=Math.floor(total*fillT/diggers),last=null;
    while(steps-->0){
      if(g[y][x]===T.WALL)g[y][x]=T.FLOOR;
      const dir=last&&rng()>.35?last:rp(rng,DIRS);
      const nx=x+dir[0],ny=y+dir[1];
      if(nx>1&&nx<W-2&&ny>1&&ny<H-2){x=nx;y=ny;}
      last=dir;
    }
  }
  const rooms=detectRooms(g,W,H,12,rng);
  addDoors(g,W,H,rng,doorP);
  return {g,rooms};
}

// ── CELLULAR AUTOMATA ──
function genCellular(W,H,rng,opts){
  const {fillP=0.47,iters=5,birth=4,death=3}=opts;
  let g=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x===0||x===W-1||y===0||y===H-1?T.WALL:rng()<fillP?T.WALL:T.FLOOR));
  for(let it=0;it<iters;it++){
    const n=g.map(r=>[...r]);
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
      let w=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(g[y+dy][x+dx]===T.WALL)w++;
      n[y][x]=g[y][x]===T.WALL?(w>=death?T.WALL:T.FLOOR):(w>birth?T.WALL:T.FLOOR);
    }
    g=n;
  }
  g=keepLargest(g,W,H);
  const rooms=detectRooms(g,W,H,10,rng);
  addDoors(g,W,H,rng,.2);
  return {g,rooms};
}

// ── ROOMS & MAZES ──
function genMaze(W,H,rng,opts){
  const {minR=3,maxR=9,doorP=0.8}=opts;
  const GW=W%2===0?W-1:W, GH=H%2===0?H-1:H;
  const g=Array.from({length:GH},()=>Array(GW).fill(T.WALL));
  const rooms=[]; let id=1, att=0;
  while(rooms.length<opts.roomCount&&att++<600){
    let rw=ri(rng,minR,maxR); if(rw%2===0)rw++;
    let rh=ri(rng,minR,maxR); if(rh%2===0)rh++;
    let rx=ri(rng,1,GW-rw-2); if(rx%2===0)rx++;
    let ry=ri(rng,1,GH-rh-2); if(ry%2===0)ry++;
    let ok=true;
    for(const r of rooms)if(rx<r.x+r.w+2&&rx+rw+2>r.x&&ry<r.y+r.h+2&&ry+rh+2>r.y){ok=false;break;}
    if(ok){
      for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++)g[y][x]=T.FLOOR;
      rooms.push({id:id++,x:rx,y:ry,w:rw,h:rh,cx:rx+Math.floor(rw/2),cy:ry+Math.floor(rh/2),type:'normal',notes:''});
    }
  }
  const vis=Array.from({length:GH},()=>Array(GW).fill(false));
  function carveMaze(x,y){
    vis[y][x]=true; g[y][x]=T.CORRIDOR;
    const dirs=[[0,-2],[0,2],[-2,0],[2,0]].sort(()=>rng()-.5);
    for(const[dx,dy]of dirs){
      const nx=x+dx,ny=y+dy;
      if(nx>0&&nx<GW-1&&ny>0&&ny<GH-1&&!vis[ny][nx]&&g[ny][nx]===T.WALL){
        g[y+dy/2][x+dx/2]=T.CORRIDOR; carveMaze(nx,ny);
      }
    }
  }
  for(let y=1;y<GH-1;y+=2)for(let x=1;x<GW-1;x+=2)if(!vis[y][x]&&g[y][x]===T.WALL)carveMaze(x,y);
  for(const r of rooms){
    const exits=[];
    for(let x=r.x;x<r.x+r.w;x++){if(r.y>1&&g[r.y-1][x]===T.CORRIDOR)exits.push([x,r.y-1]);if(r.y+r.h<GH-1&&g[r.y+r.h][x]===T.CORRIDOR)exits.push([x,r.y+r.h]);}
    for(let y=r.y;y<r.y+r.h;y++){if(r.x>1&&g[y][r.x-1]===T.CORRIDOR)exits.push([r.x-1,y]);if(r.x+r.w<GW-1&&g[y][r.x+r.w]===T.CORRIDOR)exits.push([r.x+r.w,y]);}
    if(exits.length){const[ex,ey]=rp(rng,exits);g[ey][ex]=doorP>rng()?T.DOOR:T.CORRIDOR;}
  }
  return {g,rooms,W:GW,H:GH};
}

// ── SHARED ──
function carveCorr(g,x1,y1,x2,y2,rng,doorP,W,H){
  const sc=(x,y,t)=>{if(x>0&&x<W-1&&y>0&&y<H-1&&g[y][x]!==T.FLOOR)g[y][x]=t;};
  let x=x1,y=y1;
  if(rng()>.5){while(x!==x2){sc(x,y,T.CORRIDOR);x+=x<x2?1:-1;}while(y!==y2){sc(x,y,T.CORRIDOR);y+=y<y2?1:-1;}}
  else{while(y!==y2){sc(x,y,T.CORRIDOR);y+=y<y2?1:-1;}while(x!==x2){sc(x,y,T.CORRIDOR);x+=x<x2?1:-1;}}
  if(doorP>rng()){const mx=Math.floor((x1+x2)/2),my=Math.floor((y1+y2)/2);if(g[my]&&g[my][mx]===T.CORRIDOR)g[my][mx]=rng()<.12?T.DOOR_LOCKED:T.DOOR;}
}

function keepLargest(g,W,H){
  const vis=Array.from({length:H},()=>Array(W).fill(false));
  const regs=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(!vis[y][x]&&g[y][x]===T.FLOOR){
      const reg=[],q=[[x,y]]; vis[y][x]=true;
      while(q.length){const[cx,cy]=q.shift();reg.push([cx,cy]);for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0]]){const nx=cx+dx,ny=cy+dy;if(nx>=0&&nx<W&&ny>=0&&ny<H&&!vis[ny][nx]&&g[ny][nx]===T.FLOOR){vis[ny][nx]=true;q.push([nx,ny]);}}}
      regs.push(reg);
    }
  }
  if(!regs.length)return g;
  const largest=regs.sort((a,b)=>b.length-a.length)[0];
  const ls=new Set(largest.map(([x,y])=>y*W+x));
  return g.map((row,y)=>row.map((c,x)=>c===T.FLOOR&&!ls.has(y*W+x)?T.WALL:c));
}

function detectRooms(g,W,H,max,rng){
  const vis=Array.from({length:H},()=>Array(W).fill(false));
  const regs=[];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    if(!vis[y][x]&&g[y][x]===T.FLOOR){
      const cells=[],q=[[x,y]]; vis[y][x]=true;
      while(q.length){const[cx,cy]=q.shift();cells.push([cx,cy]);for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0]]){const nx=cx+dx,ny=cy+dy;if(nx>0&&nx<W-1&&ny>0&&ny<H-1&&!vis[ny][nx]&&g[ny][nx]===T.FLOOR){vis[ny][nx]=true;q.push([nx,ny]);}}}
      if(cells.length>=4)regs.push(cells);
    }
  }
  regs.sort((a,b)=>b.length-a.length);
  return regs.slice(0,max).map((cells,i)=>{
    const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
    const mx=Math.min(...xs),Mx=Math.max(...xs),my=Math.min(...ys),My=Math.max(...ys);
    return{id:i+1,x:mx,y:my,w:Mx-mx+1,h:My-my+1,cx:Math.floor((mx+Mx)/2),cy:Math.floor((my+My)/2),type:'normal',notes:'',cells};
  });
}

function addDoors(g,W,H,rng,p){
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    if(g[y][x]!==T.FLOOR)continue;
    const h=g[y][x-1]===T.WALL&&g[y][x+1]===T.WALL&&g[y-1][x]===T.FLOOR&&g[y+1][x]===T.FLOOR;
    const v=g[y-1][x]===T.WALL&&g[y+1][x]===T.WALL&&g[y][x-1]===T.FLOOR&&g[y][x+1]===T.FLOOR;
    if((h||v)&&rng()<p)g[y][x]=rng()<.12?T.DOOR_LOCKED:T.DOOR;
  }
}

function assignTypes(rooms,rng){
  if(!rooms.length)return;
  rooms[0].type='entry';
  let maxD=0,bossIdx=rooms.length-1;
  for(let i=1;i<rooms.length;i++){
    const d=Math.abs(rooms[i].cx-rooms[0].cx)+Math.abs(rooms[i].cy-rooms[0].cy);
    if(d>maxD){maxD=d;bossIdx=i;}
  }
  rooms[bossIdx].type='boss';
  for(let i=1;i<rooms.length;i++){
    if(i===bossIdx)continue;
    const r=rng();
    if(r<.08)rooms[i].type='secret';
    else if(r<.18)rooms[i].type='trap';
    else if(r<.26)rooms[i].type='special';
  }
}

function addSpecials(g,rooms,rng,trapP){
  const H=g.length,W=g[0].length;
  rooms.forEach(r=>{
    if(r.type==='entry'&&g[r.cy]&&g[r.cy][r.cx]===T.FLOOR)g[r.cy][r.cx]=T.STAIRS_UP;
    if(r.type==='boss'){
      if(g[r.cy]&&g[r.cy][r.cx]===T.FLOOR)g[r.cy][r.cx]=T.STAIRS_DOWN;
      if(r.h>4&&g[r.cy-1]&&g[r.cy-1][r.cx]===T.FLOOR)g[r.cy-1][r.cx]=T.ALTAR;
    }
    if((r.type==='special'||r.type==='secret')&&r.w>3&&r.h>3){
      const cx=r.x+Math.floor(r.w*.7),cy=r.y+Math.floor(r.h*.7);
      if(g[cy]&&g[cy][cx]===T.FLOOR)g[cy][cx]=T.CHEST;
    }
    if(r.type==='trap'||rng()<trapP*.2){
      const tx=r.x+Math.floor(r.w*.4),ty=r.y+Math.floor(r.h*.4);
      if(g[ty]&&g[ty][tx]===T.FLOOR)g[ty][tx]=T.TRAP;
    }
  });
}

// ── MASTER GENERATE ──
function generateDungeon(cfg){
  const{algo='bsp',W=60,numRooms=10,themeKey='dungeon',difficulty='medium',corrDensity=.5,trapChance=.3,pillarChance=.15,waterRooms=false,seed}=cfg;
  const H=W;
  const rng=makeRng(seed);
  const theme=THEMES[themeKey];
  const opts={minR:4,maxR:Math.max(5,Math.floor(W/6)),minSplit:Math.max(7,Math.floor(W/8)),extCorr:corrDensity*.5,doorP:.65,pillarP:pillarChance,fillT:.32+corrDensity*.15,diggers:Math.max(2,Math.floor(numRooms/3)),roomCount:numRooms};

  let res;
  if(algo==='drunk')res=genDrunk(W,H,rng,opts);
  else if(algo==='cellular')res=genCellular(W,H,rng,opts);
  else if(algo==='maze')res={...genMaze(W,H,rng,opts)};
  else res=genBSP(W,H,rng,opts);

  const g=res.g, rooms=res.rooms;
  const finalW=res.W||W, finalH=res.H||H;
  assignTypes(rooms,rng);

  const usedN=new Set();
  rooms.forEach(r=>{
    const avail=theme.rooms.filter(n=>!usedN.has(n));
    r.name=rp(rng,avail.length?avail:theme.rooms); usedN.add(r.name);
    r.notes=r.notes||'';
    r.monsters=r.type==='entry'?[]:rng()>.25?[rp(rng,theme.monsters[difficulty])]:[];
    r.traps=(r.type==='trap'||rng()<trapChance*.35)?[rp(rng,theme.traps)]:[];
    r.secrets=(r.type==='secret'||rng()<.1)?[rp(rng,theme.secrets)]:[];
    r.treasure=(r.type==='boss'||r.type==='special'||rng()<.18)?[rp(rng,theme.treasures)]:[];
  });

  addSpecials(g,rooms,rng,trapChance);
  return{grid:g,rooms,W:finalW,H:finalH,algo,themeKey,difficulty,seed,config:cfg,ts:Date.now()};
}

// ══════════════════════════════════════════════════════════
// RENDERER
// ══════════════════════════════════════════════════════════
function renderDungeon(ctx,dungeon,cs,selId,showGrid,showNums,mjMode){
  const{grid,rooms,W,H}=dungeon;
  const pal=THEMES[dungeon.themeKey]?.pal||THEMES.dungeon.pal;
  const cw=W*cs,ch=H*cs;

  ctx.fillStyle=pal.bg; ctx.fillRect(0,0,cw,ch);

  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const t=grid[y][x];
      if(t===T.WALL)continue;
      let c=pal.floor;
      if(t===T.CORRIDOR)c=pal.corr;
      else if(t===T.DOOR)c='#7a4818';
      else if(t===T.DOOR_LOCKED)c='#6a2010';
      else if(t===T.DOOR_SECRET)c=pal.floor;
      else if(t===T.WATER)c='#102838';
      else if(t===T.PILLAR)c=pal.wall;
      ctx.fillStyle=c; ctx.fillRect(x*cs,y*cs,cs,cs);
      if((t===T.FLOOR||t===T.CORRIDOR)&&cs>6){ctx.fillStyle='rgba(255,255,255,.02)';ctx.fillRect(x*cs+1,y*cs+1,cs-2,cs-2);}
    }
  }

  // Wall shading
  for(let y=0;y<H-1;y++)for(let x=0;x<W;x++){
    if(grid[y][x]!==T.WALL&&grid[y+1]&&grid[y+1][x]===T.WALL){ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x*cs,(y+1)*cs,cs,Math.min(3,cs*.25));}
  }

  // Special tiles
  if(cs>=9){
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const t=grid[y][x]; const cx=x*cs+cs/2,cy=y*cs+cs/2;
      const fs=Math.max(7,Math.min(cs*.65,14));
      if(t===T.DOOR){ctx.fillStyle='rgba(180,100,30,.9)';ctx.fillRect(x*cs+cs*.28,y*cs+cs*.12,cs*.44,cs*.76);ctx.fillStyle='rgba(240,180,80,.7)';ctx.beginPath();ctx.arc(x*cs+cs*.68,cy,cs*.07,0,Math.PI*2);ctx.fill();}
      else if(t===T.DOOR_LOCKED){ctx.fillStyle='rgba(160,40,30,.9)';ctx.fillRect(x*cs+cs*.28,y*cs+cs*.12,cs*.44,cs*.76);if(cs>=12){ctx.font=`${cs*.4}px serif`;ctx.fillStyle='rgba(255,140,130,.9)';ctx.fillText('🔒',cx,cy);}}
      else if(t===T.DOOR_SECRET&&mjMode){ctx.strokeStyle='rgba(160,80,220,.5)';ctx.lineWidth=1;ctx.strokeRect(x*cs+2,y*cs+2,cs-4,cs-4);}
      else if(t===T.STAIRS_DOWN){ctx.font=`${fs}px serif`;ctx.fillStyle='rgba(80,120,240,.9)';ctx.fillText('▼',cx,cy);}
      else if(t===T.STAIRS_UP){ctx.font=`${fs}px serif`;ctx.fillStyle='rgba(80,200,120,.9)';ctx.fillText('▲',cx,cy);}
      else if(t===T.CHEST){ctx.font=`${fs}px serif`;ctx.fillStyle='rgba(210,170,30,.9)';ctx.fillText('◈',cx,cy);}
      else if(t===T.ALTAR){ctx.font=`${fs}px serif`;ctx.fillStyle='rgba(170,90,210,.9)';ctx.fillText('✦',cx,cy);}
      else if(t===T.TRAP&&mjMode){ctx.font=`${fs}px serif`;ctx.fillStyle='rgba(200,70,40,.85)';ctx.fillText('✕',cx,cy);}
      else if(t===T.PILLAR){ctx.fillStyle='rgba(90,80,110,.7)';ctx.beginPath();ctx.arc(cx,cy,cs*.38,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(140,130,170,.5)';ctx.lineWidth=1;ctx.stroke();}
      else if(t===T.WATER){ctx.fillStyle='rgba(20,90,160,.4)';ctx.fillRect(x*cs,y*cs,cs,cs);if(cs>=12){ctx.font=`${cs*.5}px serif`;ctx.fillStyle='rgba(60,150,210,.45)';ctx.fillText('≈',cx,cy);}}
    }
  }

  // Room overlays
  const RC={entry:{f:'rgba(160,110,10,.16)',b:'rgba(230,180,80,.65)',ic:'🚪'},boss:{f:'rgba(140,10,10,.2)',b:'rgba(210,50,50,.65)',ic:'💀'},special:{f:'rgba(10,90,10,.16)',b:'rgba(60,160,60,.55)',ic:'⭐'},secret:{f:'rgba(70,10,130,.18)',b:'rgba(140,60,210,.55)',ic:'🔮'},trap:{f:'rgba(130,30,10,.18)',b:'rgba(190,60,30,.55)',ic:'⚠️'},normal:{f:'rgba(50,45,90,.1)',b:'rgba(80,70,130,.3)',ic:null}};
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const r of rooms){
    const tc=RC[r.type]||RC.normal;
    ctx.fillStyle=tc.f; ctx.fillRect(r.x*cs,r.y*cs,r.w*cs,r.h*cs);
    if(selId===r.id){ctx.fillStyle='rgba(255,210,70,.1)';ctx.fillRect(r.x*cs,r.y*cs,r.w*cs,r.h*cs);ctx.strokeStyle='rgba(255,210,70,.75)';ctx.lineWidth=2.5;ctx.strokeRect(r.x*cs+1,r.y*cs+1,r.w*cs-2,r.h*cs-2);}
    else{ctx.strokeStyle=tc.b;ctx.lineWidth=1;ctx.strokeRect(r.x*cs+.5,r.y*cs+.5,r.w*cs-1,r.h*cs-1);}
    if(r.w*cs<16||r.h*cs<16)continue;
    const cx=r.cx*cs+cs/2,cy=r.cy*cs+cs/2;
    const fs=Math.max(8,Math.min(cs*.75,13));
    const hasIco=tc.ic&&r.w*cs>26&&r.h*cs>26;
    if(hasIco){ctx.font=`${fs*1.1}px serif`;ctx.fillText(tc.ic,cx,cy-(showNums?fs*.5:0));}
    if(showNums){ctx.font=`bold ${fs}px Cinzel,serif`;ctx.fillStyle='rgba(215,195,160,.9)';ctx.fillText(r.id,cx,cy+(hasIco?fs*.5:0));}
  }
  if(showGrid){ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=.5;for(let i=0;i<=W;i++){ctx.beginPath();ctx.moveTo(i*cs,0);ctx.lineTo(i*cs,ch);ctx.stroke();}for(let i=0;i<=H;i++){ctx.beginPath();ctx.moveTo(0,i*cs);ctx.lineTo(cw,i*cs);ctx.stroke();}}
}

function renderMM(ctx,dungeon,vpX,vpY,vpW,vpH,size){
  if(!dungeon)return;
  const{grid,rooms,W,H}=dungeon;
  const pal=THEMES[dungeon.themeKey]?.pal||THEMES.dungeon.pal;
  const sx=size/W,sy=size/H;
  ctx.clearRect(0,0,size,size);
  ctx.fillStyle=pal.bg;ctx.fillRect(0,0,size,size);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const t=grid[y][x];if(t===T.WALL)continue;
    ctx.fillStyle=t===T.CORRIDOR?pal.corr:pal.floor;
    ctx.fillRect(x*sx,y*sy,Math.max(1,sx),Math.max(1,sy));
  }
  const RC={entry:'#d4a040',boss:'#c04040',special:'#3a6a3a',secret:'#503a8a',trap:'#7a3030',normal:'rgba(70,60,120,.6)'};
  for(const r of rooms){ctx.fillStyle=RC[r.type]||RC.normal;ctx.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);}
  ctx.strokeStyle='rgba(240,200,60,.6)';ctx.lineWidth=1;
  ctx.strokeRect(Math.max(0,vpX*sx),Math.max(0,vpY*sy),Math.min(size,vpW*sx),Math.min(size,vpH*sy));
}

// ══════════════════════════════════════════════════════════
// STATE & UI
// ══════════════════════════════════════════════════════════
let dungeon=null,selId=null,showGrid=false,showNums=true,mjMode=true;
let zoom=1,panX=0,panY=0,isPanning=false,lastPX=0,lastPY=0;
let currentAlgo='bsp',currentSeed=newSeed();
let cs=12; // cell size

function newSeed(){return Math.floor(Math.random()*999999)+10000;}

// Init
document.getElementById('seed-input')?document.getElementById('seed-input').value=currentSeed:null;
updSeedDisp();updDiff();updSz();

const saved=loadCurrent();
if(saved){dungeon=saved;showMapUI();updStats();renderAll();}
updHist();

function updSeedDisp(){document.getElementById('seed-disp').textContent='#'+currentSeed;}
function rerollSeed(){currentSeed=newSeed();updSeedDisp();toast('Seed #'+currentSeed);}
document.getElementById('seed-disp').onclick=()=>{navigator.clipboard?.writeText(String(currentSeed));toast('Seed copié !');}

function setAlgo(el){document.querySelectorAll('.algo-pill').forEach(p=>p.classList.remove('active'));el.classList.add('active');currentAlgo=el.dataset.algo;}
function updSz(){const v=document.getElementById('sz').value;document.getElementById('v-sz').textContent=v+'×'+v;}
function updDiff(){
  const d=document.getElementById('diff').value;
  const m={easy:{w:'20%',c:'#5a8a3a',l:'Novice'},medium:{w:'45%',c:'#d4a040',l:'Aventurier'},hard:{w:'72%',c:'#c07030',l:'Héroïque'},deadly:{w:'100%',c:'#c04040',l:'Légendaire'}};
  const v=m[d];document.getElementById('diff-fill').style.width=v.w;document.getElementById('diff-fill').style.background=v.c;document.getElementById('v-diff').textContent=v.l;
}

function generate(){
  const sv=parseInt(document.getElementById('sz')?.value)||60;
  currentSeed=parseInt(document.getElementById('seed-disp').textContent.replace('#',''))||newSeed();
  // allow manual seed via a simple prompt? No — just use displayed seed or roll new via 🎲
  const cfg={
    algo:currentAlgo, W:sv,
    numRooms:parseInt(document.getElementById('rooms').value),
    themeKey:document.getElementById('theme').value,
    difficulty:document.getElementById('diff').value,
    corrDensity:parseInt(document.getElementById('corr').value)/100,
    trapChance:parseInt(document.getElementById('trap').value)/100,
    pillarChance:parseInt(document.getElementById('pillar').value)/100,
    waterRooms:document.getElementById('water').checked,
    seed:currentSeed
  };
  dungeon=generateDungeon(cfg);
  saveDungeon(dungeon);
  selId=null; zoom=1; panX=0; panY=0;
  showMapUI(); updStats(); renderAll(); updHist();
  document.getElementById('rpanel').innerHTML='<div class="r-empty">Clique sur une salle</div>';
  toast(`⚒ Forgé · ${dungeon.rooms.length} salles · ${dungeon.algo.toUpperCase()}`);
}

function showMapUI(){
  document.getElementById('ph').style.display='none';
  document.getElementById('mm-wrap').style.display='block';
}

function updStats(){
  if(!dungeon)return;
  const rs=dungeon.rooms;
  document.getElementById('st-r').textContent=rs.length;
  document.getElementById('st-b').textContent=rs.filter(r=>r.type==='boss').length;
  document.getElementById('st-s').textContent=rs.filter(r=>r.type==='special').length;
  document.getElementById('st-t').textContent=rs.filter(r=>r.traps?.length).length;
  document.getElementById('st-sc').textContent=rs.filter(r=>r.secrets?.length).length;
  document.getElementById('st-tr').textContent=rs.filter(r=>r.treasure?.length).length;
  document.getElementById('st-al').textContent=(dungeon.algo||'bsp').toUpperCase();
}

function renderAll(){
  if(!dungeon)return;
  const wrap=document.getElementById('map-wrap');
  const canvas=document.getElementById('mc');
  const ctx=canvas.getContext('2d');
  const{W,H}=dungeon;
  cs=Math.max(8,Math.floor(Math.min(wrap.clientWidth*.92,wrap.clientHeight*.92)/Math.max(W,H)));
  canvas.width=cs*W; canvas.height=cs*H;
  canvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
  renderDungeon(ctx,dungeon,cs,selId,showGrid,showNums,mjMode);
  // Minimap
  const mmc=document.getElementById('mm'),mctx=mmc.getContext('2d');
  const vpW=wrap.clientWidth/(cs*zoom),vpH=(wrap.clientHeight-30)/(cs*zoom);
  const vpX=-panX/(cs*zoom),vpY=-panY/(cs*zoom);
  renderMM(mctx,dungeon,vpX,vpY,vpW,vpH,110);
  document.getElementById('zoom-lbl').textContent=Math.round(zoom*100)+'%';
}

// PAN & ZOOM
const mapWrap=document.getElementById('map-wrap');
mapWrap.addEventListener('mousedown',e=>{if(e.target.tagName==='BUTTON')return;isPanning=true;lastPX=e.clientX;lastPY=e.clientY;});
window.addEventListener('mousemove',e=>{if(!isPanning)return;panX+=e.clientX-lastPX;panY+=e.clientY-lastPY;lastPX=e.clientX;lastPY=e.clientY;clampPan();applyT();});
window.addEventListener('mouseup',()=>isPanning=false);
mapWrap.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.2,Math.min(10,zoom*(e.deltaY>0?.87:1.15)));clampPan();applyT();},{passive:false});
function applyT(){
  document.getElementById('mc').style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
  document.getElementById('zoom-lbl').textContent=Math.round(zoom*100)+'%';
  if(dungeon){const mmc=document.getElementById('mm'),mctx=mmc.getContext('2d');const wrap=document.getElementById('map-wrap');const vpW=wrap.clientWidth/(cs*zoom),vpH=(wrap.clientHeight-30)/(cs*zoom),vpX=-panX/(cs*zoom),vpY=-panY/(cs*zoom);renderMM(mctx,dungeon,vpX,vpY,vpW,vpH,110);}
}
function clampPan(){const c=document.getElementById('mc'),w=document.getElementById('map-wrap'),m=80;panX=Math.max(-(c.width*zoom-w.clientWidth)-m,Math.min(m,panX));panY=Math.max(-(c.height*zoom-w.clientHeight)-m,Math.min(m,panY));}
function zoomIn(){zoom=Math.min(10,zoom*1.25);clampPan();applyT();}
function zoomOut(){zoom=Math.max(.2,zoom/1.25);clampPan();applyT();}
function resetView(){zoom=1;panX=0;panY=0;applyT();renderAll();}

// CLICK → room select
mapWrap.addEventListener('click',e=>{
  if(!dungeon||Math.abs(e.movementX)+Math.abs(e.movementY)>4||e.target.tagName==='BUTTON')return;
  const rect=mapWrap.getBoundingClientRect();
  const mx=(e.clientX-rect.left-panX)/zoom, my=(e.clientY-rect.top-panY)/zoom;
  const gx=Math.floor(mx/cs),gy=Math.floor(my/cs);
  for(const r of dungeon.rooms){
    if(gx>=r.x&&gx<r.x+r.w&&gy>=r.y&&gy<r.y+r.h){selId=r.id;showRoomPanel(r);renderAll();return;}
  }
  selId=null;document.getElementById('rpanel').innerHTML='<div class="r-empty">Clique sur une salle</div>';renderAll();
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
  if(r.monsters?.length)h+=`<div class="r-row"><span class="r-lbl">⚔ Monstres</span><span class="r-val">${r.monsters.map(m=>typeof m==='object'?`${m.n} (CR${m.cr}, PV${m.pv}, CA${m.ca})`:m).join('<br>')}</span></div>`;
  if(r.traps?.length)h+=`<div class="r-row"><span class="r-lbl">⚠ Pièges</span><span class="r-val">${r.traps.join(', ')}</span></div>`;
  if(r.secrets?.length)h+=`<div class="r-row"><span class="r-lbl">◆ Secrets</span><span class="r-val">${r.secrets.join(', ')}</span></div>`;
  if(r.treasure?.length)h+=`<div class="r-row"><span class="r-lbl">💰 Trésor</span><span class="r-val">${r.treasure.join(', ')}</span></div>`;
  const sz=r.cells?`${r.cells.length} cases`:`${r.w}×${r.h}`;
  h+=`<div class="r-row"><span class="r-lbl">📐 Taille</span><span class="r-val">${sz}</span></div>`;
  h+=`<div class="r-row"><span class="r-lbl">📝 Notes</span><span class="r-val"><textarea class="r-note" onchange="saveNote(${r.id},this.value)" placeholder="Notes MJ...">${r.notes||''}</textarea></span></div>`;
  h+=`<div class="btn-row" style="margin-top:7px"><button class="btn" onclick="rerollRoom(${r.id})">🎲 Re-roll</button><button class="btn" onclick="cycleType(${r.id})">↻ Type</button></div>`;
  document.getElementById('rpanel').innerHTML=h;
}

function renameRoom(id,v){const r=dungeon?.rooms.find(r=>r.id===id);if(r){r.name=v;saveDungeon(dungeon);}}
function saveNote(id,v){const r=dungeon?.rooms.find(r=>r.id===id);if(r){r.notes=v;saveDungeon(dungeon);}}
function rerollRoom(id){
  const r=dungeon?.rooms.find(r=>r.id===id);if(!r||r.type==='entry'){toast('Impossible sur l\'entrée');return;}
  const th=THEMES[dungeon.themeKey],d=dungeon.difficulty;
  r.monsters=Math.random()>.3?[rp(Math.random,th.monsters[d])]:[];
  r.traps=Math.random()<.3?[rp(Math.random,th.traps)]:[];
  r.secrets=Math.random()<.15?[rp(Math.random,th.secrets)]:[];
  r.treasure=Math.random()<.2?[rp(Math.random,th.treasures)]:[];
  saveDungeon(dungeon);showRoomPanel(r);toast('Salle re-randomisée');
}
function cycleType(id){
  const r=dungeon?.rooms.find(r=>r.id===id);if(!r||r.type==='entry'||r.type==='boss')return;
  const types=['normal','special','trap','secret'];
  r.type=types[(types.indexOf(r.type)+1)%types.length];
  saveDungeon(dungeon);showRoomPanel(r);renderAll();toast('Type → '+r.type);
}

function toggleGrid(){showGrid=!showGrid;document.getElementById('btn-grid').classList.toggle('active',showGrid);renderAll();}
function toggleNums(){showNums=!showNums;document.getElementById('btn-num').classList.toggle('active',showNums);renderAll();}
document.getElementById('mj-mode').addEventListener('change',function(){mjMode=this.checked;renderAll();toast(mjMode?'Mode MJ':'Mode joueur');});

// ── HISTORY ──
function updHist(){
  const h=loadHistory(),c=document.getElementById('hist');
  const icons={dungeon:'🏰',crypt:'⚰️',cave:'🕳️',fortress:'⚒️',temple:'🕍'};
  if(!h.length){c.innerHTML='<div style="font-family:\'Crimson Pro\',serif;font-size:.82rem;color:var(--textm);text-align:center;padding:.4rem 0">Aucun donjon</div>';return;}
  c.innerHTML=h.slice(0,7).map(e=>{
    const d=new Date(e.date);
    return`<div class="hi" onclick="loadFromHist(${e.seed})"><div><div class="hi-seed">${icons[e.theme]||''} #${e.seed}</div><div class="hi-meta">${e.rooms} salles · ${(e.algo||'bsp').toUpperCase()}</div></div><div class="hi-meta">${d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</div></div>`;
  }).join('');
}
function loadFromHist(seed){
  const h=loadHistory(),e=h.find(x=>x.seed===seed);
  if(e?.rooms_data){
    dungeon={seed:e.seed,themeKey:e.theme,difficulty:e.difficulty,W:e.size,H:e.size,rooms:e.rooms_data,grid:[],algo:e.algo||'bsp',config:{}};
    try{dungeon=JSON.parse(localStorage.getItem('dfv2_'+seed))||dungeon;}catch{}
    localStorage.setItem('dfv2_current',JSON.stringify(dungeon));
    currentSeed=seed;updSeedDisp();
    showMapUI();updStats();zoom=1;panX=0;panY=0;renderAll();
    toast('Donjon #'+seed+' rechargé');
  }else{currentSeed=seed;updSeedDisp();toast('Seed #'+seed+' — appuyez Forger');}
}

// ── EXPORTS ──
function exportPNG(res=1){
  if(!dungeon){toast('Aucun donjon');return;}
  const pcs=16*res,off=document.createElement('canvas');
  off.width=pcs*dungeon.W;off.height=pcs*dungeon.H;
  renderDungeon(off.getContext('2d'),dungeon,pcs,null,false,true,false);
  const a=document.createElement('a');a.download=`dungeon_${dungeon.seed}_${res}x.png`;a.href=off.toDataURL('image/png');a.click();
  toast(`PNG ×${res} exporté ✓`);
}

function exportTXT(){
  if(!dungeon){toast('Aucun donjon');return;}
  const th=THEMES[dungeon.themeKey];
  let t=`╔═══════════════════════════════════════════════╗\n║  DUNGEONFORGE — Fiche MJ                       ║\n╚═══════════════════════════════════════════════╝\n\n`;
  t+=`Thème      : ${th.name}\nSeed       : #${dungeon.seed}\nAlgo       : ${(dungeon.algo||'bsp').toUpperCase()}\nTaille     : ${dungeon.W}×${dungeon.H}\nDifficulté : ${dungeon.difficulty}\nSalles     : ${dungeon.rooms.length}\n\n${'─'.repeat(49)}\n\n`;
  for(const r of dungeon.rooms){
    const TL={entry:'ENTRÉE',boss:'BOSS/TRÉSOR',special:'SPÉCIALE',secret:'SECRÈTE',trap:'PIÉGÉE',normal:'Normale'};
    t+=`┌─ [${String(r.id).padStart(2,'0')}] ${r.name.toUpperCase()} — ${TL[r.type]||''}\n`;
    if(r.monsters?.length)t+=`│  ⚔  ${r.monsters.map(m=>typeof m==='object'?`${m.n} CR${m.cr} PV${m.pv} CA${m.ca}`:m).join(', ')}\n`;
    if(r.traps?.length)t+=`│  ⚠  ${r.traps.join(', ')}\n`;
    if(r.secrets?.length)t+=`│  ◆  ${r.secrets.join(', ')}\n`;
    if(r.treasure?.length)t+=`│  💰 ${r.treasure.join(', ')}\n`;
    if(r.notes)t+=`│  📝 ${r.notes}\n`;
    t+=`└${'─'.repeat(48)}\n\n`;
  }
  const b=new Blob([t],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`fiche_mj_${dungeon.seed}.txt`;a.click();URL.revokeObjectURL(a.href);
  toast('Fiche MJ exportée ✓');
}

function exportJSON(){
  if(!dungeon){toast('Aucun donjon');return;}
  const b=new Blob([JSON.stringify(dungeon,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`dungeon_${dungeon.seed}.json`;a.click();URL.revokeObjectURL(a.href);
  toast('JSON exporté ✓');
}

function copyDiscord(){
  if(!dungeon){toast('Aucun donjon');return;}
  const th=THEMES[dungeon.themeKey];
  let t=`**DungeonForge** — ${th.name} \`#${dungeon.seed}\`\n`;
  t+=`Algo: ${(dungeon.algo||'bsp').toUpperCase()} · ${dungeon.rooms.length} salles · ${dungeon.difficulty}\n\n`;
  dungeon.rooms.forEach(r=>{
    const ic={entry:'🚪',boss:'💀',special:'⭐',secret:'🔮',trap:'⚠️',normal:'·'};
    t+=`${ic[r.type]||'·'} **[${r.id}] ${r.name}**`;
    if(r.monsters?.length)t+=` — ${r.monsters.map(m=>typeof m==='object'?m.n:m).join(', ')}`;
    t+='\n';
  });
  navigator.clipboard?.writeText(t).then(()=>toast('Copié Discord ✓'));
}

// ── PERSISTENCE ──
function saveDungeon(d){
  try{
    const h=loadHistory();
    h.unshift({seed:d.seed,theme:d.themeKey,difficulty:d.difficulty,rooms:d.rooms.length,size:d.W,algo:d.algo,date:new Date().toISOString(),rooms_data:d.rooms});
    if(h.length>12)h.length=12;
    localStorage.setItem('dfv2_history',JSON.stringify(h));
    localStorage.setItem('dfv2_current',JSON.stringify(d));
    localStorage.setItem('dfv2_'+d.seed,JSON.stringify(d));
  }catch(e){}
}
function loadCurrent(){try{return JSON.parse(localStorage.getItem('dfv2_current'));}catch{return null;}}
function loadHistory(){try{return JSON.parse(localStorage.getItem('dfv2_history'))||[];}catch{return [];}}

// ── TOAST ──
function toast(msg,dur=2400){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),dur);
}

// ── KEYBOARD ──
document.addEventListener('keydown',e=>{
  const tg=document.activeElement.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA')return;
  if(e.code==='Space'){e.preventDefault();generate();}
  if(e.code==='Equal'||e.code==='NumpadAdd')zoomIn();
  if(e.code==='Minus'||e.code==='NumpadSubtract')zoomOut();
  if(e.code==='KeyR')resetView();
  if(e.code==='KeyG')toggleGrid();
});

window.addEventListener('resize',()=>{if(dungeon)renderAll();});
