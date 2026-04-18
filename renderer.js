'use strict';

// ============================================================
// DUNGEONFORGE v2 — Renderer
// ============================================================

const RENDER = {
  // Tile colors per theme palette key
  tileColor(tile, palette, revealed, lit) {
    if (!revealed) return '#000000';
    const dim = !lit ? 0.45 : 1.0;

    const alpha = (hex, a) => {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return `rgba(${Math.floor(r*a)},${Math.floor(g*a)},${Math.floor(b*a)},1)`;
    };

    switch(tile) {
      case T.WALL:        return alpha(palette.wall, dim);
      case T.FLOOR:       return alpha(palette.floor, dim);
      case T.CORRIDOR:    return alpha(palette.corridor, dim);
      case T.DOOR:        return alpha('#c97a30', dim);
      case T.DOOR_LOCKED: return alpha('#c84040', dim);
      case T.DOOR_SECRET: return alpha(palette.floor, dim); // looks like floor until revealed
      case T.WATER:       return alpha('#204860', dim);
      case T.LAVA:        return alpha('#602010', dim);
      case T.PILLAR:      return alpha(palette.wall, dim);
      case T.STAIRS_DOWN: return alpha('#4060c0', dim);
      case T.STAIRS_UP:   return alpha('#40a060', dim);
      case T.CHEST:       return alpha('#c0a020', dim);
      case T.ALTAR:       return alpha('#8040a0', dim);
      case T.TRAP:        return alpha('#803020', dim);
      default:            return alpha(palette.floor, dim);
    }
  },

  // Draw the full dungeon
  draw(ctx, dungeon, opts = {}) {
    if (!dungeon) return;
    const {
      cellSize = 12, panX = 0, panY = 0, zoom = 1,
      showGrid = false, showNumbers = true,
      showFog = false, revealedCells = null,
      litCells = null, selectedRoomId = null,
      showDoors = true, showSpecialTiles = true,
      mjMode = true
    } = opts;

    const { grid, rooms, W, H } = dungeon;
    const palette = DUNGEON_THEMES[dungeon.themeKey]?.palette || DUNGEON_THEMES.dungeon.palette;
    const cs = cellSize;

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const cw = W * cs, ch = H * cs;

    // Background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Draw tiles
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = grid[y][x];
        if (tile === T.WALL) continue;

        const revealed = !showFog || (revealedCells && revealedCells[y*W+x]);
        const lit = !showFog || !litCells || (litCells && litCells[y*W+x]);
        const color = this.tileColor(tile, palette, revealed || !showFog, lit);

        ctx.fillStyle = color;
        ctx.fillRect(x*cs, y*cs, cs, cs);

        // Tile inner detail (subtle)
        if (tile === T.FLOOR || tile === T.CORRIDOR) {
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fillRect(x*cs+1, y*cs+1, cs-2, cs-2);
        }

        // Special tile icons
        if (showSpecialTiles && cs >= 10) {
          this.drawTileIcon(ctx, tile, x*cs, y*cs, cs, mjMode);
        }
      }
    }

    // Wall shading — draw wall faces
    this.drawWallFaces(ctx, grid, W, H, cs, palette);

    // Room overlays
    for (const r of rooms) {
      this.drawRoom(ctx, r, cs, selectedRoomId, showNumbers, palette);
    }

    // Grid overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= W; i++) {
        ctx.beginPath(); ctx.moveTo(i*cs, 0); ctx.lineTo(i*cs, ch); ctx.stroke();
      }
      for (let i = 0; i <= H; i++) {
        ctx.beginPath(); ctx.moveTo(0, i*cs); ctx.lineTo(cw, i*cs); ctx.stroke();
      }
    }

    // Fog of war overlay
    if (showFog && revealedCells) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!revealedCells[y*W+x]) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(x*cs, y*cs, cs, cs);
          }
        }
      }
    }

    ctx.restore();
  },

  drawWallFaces(ctx, grid, W, H, cs, palette) {
    for (let y = 0; y < H-1; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y][x] !== T.WALL && grid[y+1][x] === T.WALL) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x*cs, (y+1)*cs, cs, Math.min(4, cs*0.3));
        }
        if (grid[y][x] === T.WALL && grid[y+1] && grid[y+1][x] !== T.WALL) {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(x*cs, y*cs+cs-2, cs, 2);
        }
      }
    }
  },

  drawTileIcon(ctx, tile, px, py, cs, mjMode) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = px + cs/2, cy = py + cs/2;
    const fs = Math.max(8, Math.min(cs * 0.7, 16));

    switch(tile) {
      case T.DOOR:
        ctx.fillStyle = 'rgba(200,120,40,0.9)';
        ctx.fillRect(px+cs*0.3, py+cs*0.15, cs*0.4, cs*0.7);
        ctx.fillStyle = 'rgba(255,200,100,0.8)';
        ctx.beginPath();
        ctx.arc(px+cs*0.65, cy, cs*0.07, 0, Math.PI*2);
        ctx.fill();
        break;
      case T.DOOR_LOCKED:
        ctx.fillStyle = 'rgba(200,60,60,0.9)';
        ctx.fillRect(px+cs*0.3, py+cs*0.15, cs*0.4, cs*0.7);
        if (cs >= 12) {
          ctx.font = `${Math.max(6, cs*0.4)}px serif`;
          ctx.fillStyle = 'rgba(255,160,160,0.9)';
          ctx.fillText('🔒', cx, cy);
        }
        break;
      case T.DOOR_SECRET:
        if (mjMode) {
          ctx.strokeStyle = 'rgba(180,100,220,0.6)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px+2, py+2, cs-4, cs-4);
        }
        break;
      case T.STAIRS_DOWN:
        ctx.fillStyle = 'rgba(100,140,255,0.85)';
        ctx.font = `${fs}px serif`;
        ctx.fillText('▼', cx, cy);
        break;
      case T.STAIRS_UP:
        ctx.fillStyle = 'rgba(100,220,140,0.85)';
        ctx.font = `${fs}px serif`;
        ctx.fillText('▲', cx, cy);
        break;
      case T.CHEST:
        ctx.fillStyle = 'rgba(220,180,40,0.9)';
        ctx.font = `${fs}px serif`;
        ctx.fillText('◈', cx, cy);
        break;
      case T.ALTAR:
        ctx.fillStyle = 'rgba(180,100,220,0.9)';
        ctx.font = `${fs}px serif`;
        ctx.fillText('✦', cx, cy);
        break;
      case T.TRAP:
        if (mjMode) {
          ctx.fillStyle = 'rgba(200,80,40,0.85)';
          ctx.font = `${fs}px serif`;
          ctx.fillText('✕', cx, cy);
        }
        break;
      case T.PILLAR:
        ctx.fillStyle = 'rgba(100,90,120,0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy, cs*0.38, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,140,180,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      case T.WATER:
        ctx.fillStyle = 'rgba(40,120,180,0.3)';
        ctx.fillRect(px, py, cs, cs);
        if (cs >= 14) {
          ctx.fillStyle = 'rgba(80,160,220,0.4)';
          ctx.font = `${cs*0.5}px serif`;
          ctx.fillText('≈', cx, cy);
        }
        break;
    }
  },

  drawRoom(ctx, r, cs, selectedRoomId, showNumbers, palette) {
    const typeColors = {
      entry:   { fill:'rgba(180,130,20,0.18)',  border:'rgba(240,192,96,0.7)',  icon:'🚪' },
      boss:    { fill:'rgba(160,20,20,0.22)',    border:'rgba(220,60,60,0.7)',   icon:'💀' },
      special: { fill:'rgba(20,100,20,0.18)',    border:'rgba(80,180,80,0.6)',   icon:'⭐' },
      secret:  { fill:'rgba(80,20,140,0.2)',     border:'rgba(160,80,220,0.6)',  icon:'🔮' },
      trap:    { fill:'rgba(140,40,20,0.2)',     border:'rgba(200,80,40,0.6)',   icon:'⚠️' },
      normal:  { fill:'rgba(60,55,100,0.12)',    border:'rgba(100,90,160,0.35)', icon:null },
    };
    const tc = typeColors[r.type] || typeColors.normal;

    // Room fill
    ctx.fillStyle = tc.fill;
    ctx.fillRect(r.x*cs, r.y*cs, r.w*cs, r.h*cs);

    // Selected highlight
    if (selectedRoomId === r.id) {
      ctx.fillStyle = 'rgba(255,220,80,0.1)';
      ctx.fillRect(r.x*cs, r.y*cs, r.w*cs, r.h*cs);
      ctx.strokeStyle = 'rgba(255,220,80,0.8)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(r.x*cs+1, r.y*cs+1, r.w*cs-2, r.h*cs-2);
    } else {
      ctx.strokeStyle = tc.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x*cs+0.5, r.y*cs+0.5, r.w*cs-1, r.h*cs-1);
    }

    // Icon + number
    const cx = r.cx*cs + cs/2, cy = r.cy*cs + cs/2;
    const rw = r.w*cs, rh = r.h*cs;
    if (rw < 20 || rh < 20) return;

    const fs = Math.max(8, Math.min(cs * 0.8, 14));
    if (tc.icon && rw > 28 && rh > 28) {
      ctx.font = `${fs * 1.1}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tc.icon, cx, cy - (showNumbers ? fs * 0.55 : 0));
    }
    if (showNumbers) {
      ctx.font = `bold ${fs}px "Cinzel", serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(220,200,170,0.9)';
      ctx.fillText(r.id, cx, cy + (tc.icon && rw > 28 && rh > 28 ? fs * 0.55 : 0));
    }
  },

  // Minimap render
  drawMinimap(ctx, dungeon, vpX, vpY, vpW, vpH, size = 120) {
    if (!dungeon) return;
    const { grid, rooms, W, H } = dungeon;
    const palette = DUNGEON_THEMES[dungeon.themeKey]?.palette || DUNGEON_THEMES.dungeon.palette;
    const sx = size / W, sy = size / H;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = grid[y][x];
        if (tile === T.WALL) continue;
        ctx.fillStyle = tile === T.CORRIDOR ? palette.corridor : palette.floor;
        ctx.fillRect(x*sx, y*sy, Math.max(1, sx), Math.max(1, sy));
      }
    }

    const roomColors = { entry:'#e8b84b', boss:'#c94040', special:'#3d6b3d', secret:'#5a3a8a', trap:'#8a3a3a', normal:'rgba(80,70,140,0.6)' };
    for (const r of rooms) {
      ctx.fillStyle = roomColors[r.type] || roomColors.normal;
      ctx.fillRect(r.x*sx, r.y*sy, r.w*sx, r.h*sy);
    }

    // Viewport rect
    ctx.strokeStyle = 'rgba(255,220,80,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vpX*sx, vpY*sy, vpW*sx, vpH*sy);
  }
};
