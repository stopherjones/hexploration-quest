import React from 'react';
import { HexCoord, DirectionIndex } from '../types';
import { TunnelTile } from '../utils/tunnelEngine';
import {
  hexToPixel,
  getHexPolygonPoints,
  getOrganicNeighbor,
} from '../utils/hexMath';

export const HEX_RADIUS = 23;

interface TunnelGridProps {
  tiles: Map<string, TunnelTile>;
  playerCoord: HexCoord;
  onTileClick: (coord: HexCoord) => void;
  interactiveExits: HexCoord[];
  energy: number;
  moveCost?: number;
  isReExploring?: boolean;
}

// Computes the 6 corner vertices of a pointy-topped hex for corner pillars/buttresses
function getHexVertices(cx: number, cy: number, radius: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = ((60 * i - 30) * Math.PI) / 180;
    pts.push({
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad),
    });
  }
  return pts;
}

export const TunnelGrid: React.FC<TunnelGridProps> = ({
  tiles,
  playerCoord,
  onTileClick,
  interactiveExits,
  moveCost = 1,
  isReExploring = false,
}) => {
  // Set of interactive exit keys for fast lookup
  const exitKeySet = React.useMemo(() => {
    return new Set(interactiveExits.map((c) => `${c.col},${c.row}`));
  }, [interactiveExits]);

  // Unexplored exits list and overlapping exit count
  const { unexploredList, overlappingCount } = React.useMemo(() => {
    const list: TunnelTile[] = [];
    let overlap = 0;
    for (const t of tiles.values()) {
      if (t.status === 'lit' && !t.isHallway && !t.visited && !t.isDeadEnd && !t.isStart) {
        list.push(t);
        if (t.connections.length > 1) {
          overlap++;
        }
      }
    }
    return { unexploredList: list, overlappingCount: overlap };
  }, [tiles]);

  // Dynamic ViewBox: frames all revealed chambers and corridors organically
  const viewBox = React.useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const tile of tiles.values()) {
      const p = hexToPixel(tile.col, tile.row, HEX_RADIUS);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    if (!isFinite(minX)) {
      minX = 0;
      maxX = 0;
      minY = 0;
      maxY = 0;
    }

    // Generous padding around the hexes so whole chambers and exit badges remain comfortably visible
    const pad = HEX_RADIUS * 3.0;
    let bMinX = minX - pad;
    let bMaxX = maxX + pad;
    let bMinY = minY - pad;
    let bMaxY = maxY + pad;

    let bWidth = bMaxX - bMinX;
    let bHeight = bMaxY - bMinY;

    // Minimum viewport size so single hex doesn't appear giant on screen
    const MIN_VIEW_WIDTH = 340;
    const MIN_VIEW_HEIGHT = 380;

    if (bWidth < MIN_VIEW_WIDTH) {
      const diff = MIN_VIEW_WIDTH - bWidth;
      bMinX -= diff / 2;
      bWidth = MIN_VIEW_WIDTH;
    }
    if (bHeight < MIN_VIEW_HEIGHT) {
      const diff = MIN_VIEW_HEIGHT - bHeight;
      bMinY -= diff / 2;
      bHeight = MIN_VIEW_HEIGHT;
    }

    return `${bMinX.toFixed(1)} ${bMinY.toFixed(1)} ${bWidth.toFixed(1)} ${bHeight.toFixed(1)}`;
  }, [tiles]);

  // Player pixel
  const playerPixel = hexToPixel(playerCoord.col, playerCoord.row, HEX_RADIUS);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#ded4bf] select-none cursor-default flex items-center justify-center">
      {/* Paper texture overlay & subtle vintage grid marks matching Level 1 */}
      <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(#8f8370_1px,transparent_1px)] [background-size:18px_18px]" />

      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full block touch-manipulation drop-shadow-md transition-all duration-500 ease-out"
      >
        <defs>
          {/* Torchlight radial glow around player */}
          <radialGradient id="torch-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#b45309" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Explored Chamber Torchlight Radial Glow */}
          <radialGradient id="chamber-torch-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#b45309" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Unexplored Live Exit Radial Pulse (Emerald / Cyan) */}
          <radialGradient id="unexplored-exit-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.38" />
            <stop offset="65%" stopColor="#047857" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.05" />
          </radialGradient>

          {/* Overlapping Convergent Exit Radial Pulse (Radiant Amber / Violet / Emerald) */}
          <radialGradient id="overlapping-exit-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="75%" stopColor="#9333ea" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Explored Subterranean Flagstone texture pattern */}
          <pattern id="explored-flagstones" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill="#38312a" />
            <path d="M 0 8 L 16 8 M 8 0 L 8 16" stroke="#231e19" strokeWidth="1.2" />
            <rect x="1" y="1" width="6" height="6" fill="#443c34" />
            <rect x="9" y="9" width="6" height="6" fill="#483f36" />
            <circle cx="4" cy="4" r="0.8" fill="#5c5247" />
            <circle cx="12" cy="12" r="0.8" fill="#5c5247" />
          </pattern>

          {/* Corridor Stone Paver Pattern */}
          <pattern id="corridor-pavers" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#2d2721" />
            <line x1="0" y1="5" x2="10" y2="5" stroke="#1d1915" strokeWidth="1" />
            <line x1="5" y1="0" x2="5" y2="10" stroke="#1d1915" strokeWidth="1" />
          </pattern>

          {/* Dead End Rubble texture pattern */}
          <pattern id="rubble-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#241b1b" />
            <path d="M 0 5 L 5 0 M 5 10 L 10 5" stroke="#450a0a" strokeWidth="1.2" />
            <circle cx="3" cy="7" r="1" fill="#78716c" />
            <circle cx="8" cy="2" r="1.2" fill="#57534e" />
          </pattern>

          {/* Exit Glow Filter */}
          <filter id="exit-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* =========================================================================
            LAYER 1: CARVED CORRIDOR TUNNEL PASSAGEWAYS (Bedrock + Masonry + Flagstone Path)
            Connects chambers across intermediate hallway nodes
            ========================================================================= */}
        <g strokeLinecap="round">
          {Array.from(tiles.values()).map((tile) => {
            if (tile.status !== 'lit' || tile.connections.length === 0) return null;
            const p1 = hexToPixel(tile.col, tile.row, HEX_RADIUS);

            return tile.connections.map((dir) => {
              const neighbor = getOrganicNeighbor({ col: tile.col, row: tile.row }, dir);
              const nKey = `${neighbor.col},${neighbor.row}`;
              // Render each corridor connection line once
              if (tile.id > nKey) return null;

              const nTile = tiles.get(nKey);
              if (!nTile || nTile.status !== 'lit') return null;

              const p2 = hexToPixel(neighbor.col, neighbor.row, HEX_RADIUS);
              return (
                <g key={`corridor-tunnel-${tile.id}-${nKey}`}>
                  {/* Outer excavated bedrock shadow */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#191512"
                    strokeWidth="16"
                    opacity="0.8"
                  />
                  {/* Rough dressed stone tunnel wall lining */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#2e2721"
                    strokeWidth="13"
                  />
                  {/* Flagstone corridor path */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#483f36"
                    strokeWidth="8"
                  />
                  {/* Center torchlight dashed track */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    opacity="0.85"
                  />
                </g>
              );
            });
          })}
        </g>

        {/* =========================================================================
            LAYER 2: CORRIDOR HALLWAY WAYPOINTS (Narrow Passageway & Timber Arch Props)
            These are intermediate corridor tiles (tile.isHallway = true).
            Visually styled distinctly as narrow tunnels rather than full-sized rooms!
            ========================================================================= */}
        {Array.from(tiles.values()).map((tile) => {
          if (tile.status !== 'lit' || !tile.isHallway) return null;

          const { x, y } = hexToPixel(tile.col, tile.row, HEX_RADIUS);
          const points = getHexPolygonPoints(x, y, HEX_RADIUS * 0.58);
          const isPlayerHere = playerCoord.col === tile.col && playerCoord.row === tile.row;

          return (
            <g
              key={`hallway-${tile.id}`}
              onClick={() => onTileClick({ col: tile.col, row: tile.row })}
              className="cursor-pointer group"
            >
              {/* Narrow tunnel polygon */}
              <polygon
                points={points}
                fill="#2b241e"
                stroke="#1f1a15"
                strokeWidth="2"
              />
              <polygon
                points={points}
                fill="url(#corridor-pavers)"
                opacity="0.9"
              />

              {/* Timber Dungeon Tunnel Arch Support (Wooden Crossbeam & Posts) */}
              <g transform={`translate(${x}, ${y})`}>
                {/* Horizontal timber lintel beam */}
                <rect
                  x="-8.5"
                  y="-8.5"
                  width="17"
                  height="3.2"
                  rx="0.6"
                  fill="#54331a"
                  stroke="#29180c"
                  strokeWidth="0.8"
                />
                {/* Left timber upright post */}
                <rect
                  x="-8.5"
                  y="-8.5"
                  width="3"
                  height="16"
                  rx="0.6"
                  fill="#54331a"
                  stroke="#29180c"
                  strokeWidth="0.8"
                />
                {/* Right timber upright post */}
                <rect
                  x="5.5"
                  y="-8.5"
                  width="3"
                  height="16"
                  rx="0.6"
                  fill="#54331a"
                  stroke="#29180c"
                  strokeWidth="0.8"
                />
                {/* Iron corner bracket plates & rivets */}
                <rect x="-8.5" y="-8.5" width="4.5" height="4.5" fill="#3e3935" stroke="#1c1917" strokeWidth="0.5" />
                <rect x="4" y="-8.5" width="4.5" height="4.5" fill="#3e3935" stroke="#1c1917" strokeWidth="0.5" />
                <circle cx="-6.5" cy="-6.5" r="0.8" fill="#d6d3d1" />
                <circle cx="6.5" cy="-6.5" r="0.8" fill="#d6d3d1" />

                {/* Hanging iron lantern in the tunnel arch */}
                <line x1="0" y1="-5.5" x2="0" y2="-2.5" stroke="#1c1917" strokeWidth="0.8" />
                <circle cx="0" cy="-0.5" r="2.2" fill="#f59e0b" opacity="0.9" />
                <circle cx="0" cy="-0.5" r="1.1" fill="#fef08a" />
              </g>

              {/* If adventurer is standing in this corridor */}
              {isPlayerHere && (
                <circle
                  cx={x}
                  cy={y}
                  r={HEX_RADIUS * 0.58 + 2}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.8"
                />
              )}
            </g>
          );
        })}

        {/* =========================================================================
            LAYER 3: CHAMBERS (The Real Rooms!)
            Fortified stone walls, corner buttress pillars, circular flagstone daises,
            and distinct architectural features!
            ========================================================================= */}
        {Array.from(tiles.values()).map((tile) => {
          if (tile.status !== 'lit' || tile.isHallway) return null;

          const { x, y } = hexToPixel(tile.col, tile.row, HEX_RADIUS);
          const points = getHexPolygonPoints(x, y, HEX_RADIUS);
          const key = `${tile.col},${tile.row}`;
          const isPlayerHere = playerCoord.col === tile.col && playerCoord.row === tile.row;
          const isExit = exitKeySet.has(key);
          const isExplored = tile.visited || tile.isStart;
          const isDeadEnd = Boolean(tile.isDeadEnd);
          const isUnexploredExit = !isExplored && !isDeadEnd;

          // =====================================================================
          // 3A. DEAD END CHAMBER (Collapsed Rockfall & Heavy Cave-In)
          // =====================================================================
          if (isDeadEnd) {
            return (
              <g
                key={tile.id}
                onClick={() => onTileClick({ col: tile.col, row: tile.row })}
                className={isExit ? 'cursor-pointer' : undefined}
              >
                {/* Heavy shattered masonry room boundary */}
                <polygon
                  points={points}
                  fill="url(#rubble-hatch)"
                  stroke="#ef4444"
                  strokeWidth="2.4"
                  strokeDasharray="5 2.5"
                />

                {/* Corner cracked stone pillars */}
                {getHexVertices(x, y, HEX_RADIUS).map((v, idx) => (
                  <g key={`deadend-pillar-${tile.id}-${idx}`}>
                    <circle cx={v.x} cy={v.y} r="3" fill="#3b1515" stroke="#7f1d1d" strokeWidth="1" />
                  </g>
                ))}

                {/* Massive collapsed boulder graphics */}
                <g transform={`translate(${x}, ${y})`}>
                  <ellipse cx="0" cy="5" rx="11" ry="4.5" fill="#450a0a" opacity="0.6" />
                  <polygon
                    points="-9,4 -4,-7 4,-4 8,5 0,7"
                    fill="#78716c"
                    stroke="#292524"
                    strokeWidth="1"
                  />
                  <polygon
                    points="2,-6 9,-2 11,5 4,6"
                    fill="#57534e"
                    stroke="#1c1917"
                    strokeWidth="1"
                  />
                  <polygon
                    points="-11,-1 -6,-8 -2,-3 -7,2"
                    fill="#44403c"
                    stroke="#1c1917"
                    strokeWidth="0.8"
                  />
                  <line x1="-8" y1="-2" x2="0" y2="4" stroke="#a8a29e" strokeWidth="0.8" opacity="0.6" />
                  <line x1="1" y1="-3" x2="7" y2="2" stroke="#a8a29e" strokeWidth="0.8" opacity="0.6" />
                </g>

                {/* Danger Hazard Badge */}
                <g transform={`translate(${x}, ${y + 11})`}>
                  <rect
                    x="-18"
                    y="-5.5"
                    width="36"
                    height="11"
                    rx="3"
                    fill="#991b1b"
                    stroke="#fca5a5"
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    className="text-[6.5px] font-mono font-black fill-rose-100 uppercase tracking-tight"
                  >
                    ✕ CAVE-IN
                  </text>
                </g>

                {/* Player standing here */}
                {isPlayerHere && (
                  <circle
                    cx={x}
                    cy={y}
                    r={HEX_RADIUS - 2}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                )}
              </g>
            );
          }

          // =====================================================================
          // 3B. UNEXPLORED LIVE EXIT CHAMBER (Grand Vaulted Room with Portal Runes)
          // Tracking single vs. overlapping exits (converging corridors)
          // =====================================================================
          if (isUnexploredExit) {
            const incomingCount = tile.connections.length;
            const isOverlapping = incomingCount > 1;

            return (
              <g
                key={tile.id}
                onClick={() => onTileClick({ col: tile.col, row: tile.row })}
                className="cursor-pointer group"
              >
                {/* Radial Glow underneath */}
                <circle
                  cx={x}
                  cy={y}
                  r={HEX_RADIUS * (isOverlapping ? 1.4 : 1.2)}
                  fill={isOverlapping ? 'url(#overlapping-exit-glow)' : 'url(#unexplored-exit-glow)'}
                />

                {/* Stone chamber foundation matching paper cartography */}
                <polygon
                  points={points}
                  fill={isOverlapping ? '#35281e' : '#2c2621'}
                  stroke={isOverlapping ? '#f59e0b' : '#2d6a4f'}
                  strokeWidth={isExit ? (isOverlapping ? 3.0 : 2.5) : (isOverlapping ? 2.2 : 1.6)}
                />

                {/* Corridor pavers fill */}
                <polygon
                  points={points}
                  fill="url(#corridor-pavers)"
                  opacity="0.6"
                />

                {/* Corner chamber reinforced buttresses */}
                {getHexVertices(x, y, HEX_RADIUS).map((v, idx) => (
                  <circle
                    key={`exit-pillar-${tile.id}-${idx}`}
                    cx={v.x}
                    cy={v.y}
                    r="2.8"
                    fill={isOverlapping ? '#78350f' : '#1b4332'}
                    stroke={isOverlapping ? '#f59e0b' : '#2d6a4f'}
                    strokeWidth="0.8"
                  />
                ))}

                {/* Chamber Circular Dais */}
                {isOverlapping ? (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="13.5"
                      fill="#451a03"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="#78350f"
                      stroke="#fde68a"
                      strokeWidth="1.2"
                    />
                    <text
                      x={x}
                      y={y + 3}
                      textAnchor="middle"
                      className="text-[8.5px] font-mono font-black fill-amber-300"
                    >
                      ✦{incomingCount}
                    </text>
                  </>
                ) : (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="13"
                      fill="#1b4332"
                      stroke="#2d6a4f"
                      strokeWidth="1.2"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="7.5"
                      fill="#2d6a4f"
                      stroke="#52b788"
                      strokeWidth="1"
                    />
                    <circle cx={x} cy={y} r="2.5" fill="#d8f3dc" />
                  </>
                )}

                {/* Carved stone portal lintels pointing toward incoming connections */}
                {tile.connections.map((dir) => {
                  const angle = ((dir - 1) * 60 - 30) * (Math.PI / 180);
                  const px = x + Math.cos(angle) * (HEX_RADIUS - 3);
                  const py = y + Math.sin(angle) * (HEX_RADIUS - 3);
                  return (
                    <circle
                      key={`portal-${tile.id}-${dir}`}
                      cx={px}
                      cy={py}
                      r={isOverlapping ? 2.5 : 2.2}
                      fill={isOverlapping ? '#fbbf24' : '#52b788'}
                    />
                  );
                })}

                {/* Badges: Overlapping vs Single Exit, and Interactive Move vs Map Beacon */}
                {isExit ? (
                  isOverlapping ? (
                    <g transform={`translate(${x}, ${y - 12})`}>
                      <rect
                        x="-19"
                        y="-6.5"
                        width="38"
                        height="13"
                        rx="3"
                        fill="#b45309"
                        stroke="#fef08a"
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        className="text-[7px] font-mono font-black fill-amber-100 tracking-tight"
                      >
                        -{moveCost}⚡ ✦{incomingCount}
                      </text>
                    </g>
                  ) : (
                    <g transform={`translate(${x}, ${y - 12})`}>
                      <rect
                        x="-13"
                        y="-6"
                        width="26"
                        height="12"
                        rx="3"
                        fill="#2d6a4f"
                        stroke="#2b261f"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        className="text-[7.5px] font-mono font-black fill-white tracking-wide"
                      >
                        -{moveCost}⚡
                      </text>
                    </g>
                  )
                ) : isOverlapping ? (
                  <g transform={`translate(${x}, ${y - 12})`}>
                    <rect
                      x="-21"
                      y="-6"
                      width="42"
                      height="12"
                      rx="3"
                      fill="#78350f"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="2.5"
                      textAnchor="middle"
                      className="text-[6.2px] font-mono font-black fill-amber-200 uppercase tracking-tight"
                    >
                      OVERLAP ({incomingCount})
                    </text>
                  </g>
                ) : (
                  <g transform={`translate(${x}, ${y - 12})`}>
                    <rect
                      x="-15"
                      y="-5.5"
                      width="30"
                      height="11"
                      rx="2.5"
                      fill="#1b4332"
                      stroke="#52b788"
                      strokeWidth="0.8"
                      opacity="0.9"
                    />
                    <text
                      x="0"
                      y="2.5"
                      textAnchor="middle"
                      className="text-[6px] font-mono font-bold fill-emerald-200 uppercase tracking-tight"
                    >
                      UNEXPLORED
                    </text>
                  </g>
                )}
              </g>
            );
          }

          // =====================================================================
          // 3C. EXPLORED CHAMBER (Fortified Flagstone Room with Pillars & Medallion)
          // =====================================================================
          return (
            <g
              key={tile.id}
              onClick={() => onTileClick({ col: tile.col, row: tile.row })}
              className={isExit ? 'cursor-pointer' : undefined}
            >
              {/* Outer dressed ashlar masonry chamber wall */}
              <polygon
                points={points}
                fill="#2c2621"
                stroke="#171412"
                strokeWidth="3.2"
              />
              {/* Inlaid flagstone floor */}
              <polygon
                points={points}
                fill="url(#explored-flagstones)"
                opacity="0.95"
              />
              {/* Torchlight atmosphere fill */}
              <polygon
                points={points}
                fill="url(#chamber-torch-glow)"
              />

              {/* Inner decorative masonry chamber trim */}
              <polygon
                points={getHexPolygonPoints(x, y, HEX_RADIUS - 2.8)}
                fill="none"
                stroke="#63574a"
                strokeWidth="0.9"
                opacity="0.75"
              />

              {/* 6 Carved Stone Corner Pillars / Buttresses */}
              {getHexVertices(x, y, HEX_RADIUS).map((v, idx) => (
                <g key={`chamber-pillar-${tile.id}-${idx}`}>
                  <circle cx={v.x} cy={v.y} r="3.2" fill="#241f1c" stroke="#574c41" strokeWidth="1" />
                  <circle cx={v.x} cy={v.y} r="1.2" fill="#8c7e6f" />
                </g>
              ))}

              {/* Central Raised Circular Dais / Room Floor Medallion */}
              <circle
                cx={x}
                cy={y}
                r="14"
                fill="#362f28"
                stroke="#4c4238"
                strokeWidth="1.2"
              />
              <circle
                cx={x}
                cy={y}
                r="9.5"
                fill="none"
                stroke="#695c4f"
                strokeWidth="0.9"
                strokeDasharray="2.5 2"
              />
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill="#27211b"
                stroke="#3e352d"
                strokeWidth="0.8"
              />

              {/* Carved stone doorways / portal lintels at each corridor exit */}
              {tile.connections.map((dir) => {
                const angle = ((dir - 1) * 60 - 30) * (Math.PI / 180);
                const px = x + Math.cos(angle) * (HEX_RADIUS - 3.5);
                const py = y + Math.sin(angle) * (HEX_RADIUS - 3.5);
                return (
                  <g key={`doorway-${tile.id}-${dir}`}>
                    <circle cx={px} cy={py} r="2.2" fill="#fbbf24" opacity="0.85" />
                    <circle cx={px} cy={py} r="1" fill="#fef08a" />
                  </g>
                );
              })}

              {/* =======================================================
                  CHAMBER SPECIAL TYPOLOGY OVERLAYS
                  ======================================================= */}

              {/* Starting Ladder Vault */}
              {tile.isStart && (
                <g transform={`translate(${x}, ${y})`}>
                  <circle r="12" fill="#854d0e" stroke="#facc15" strokeWidth="1.6" />
                  <line x1="-5" y1="-8" x2="-5" y2="8" stroke="#fde047" strokeWidth="1.4" />
                  <line x1="5" y1="-8" x2="5" y2="8" stroke="#fde047" strokeWidth="1.4" />
                  <line x1="-5" y1="-6" x2="5" y2="-6" stroke="#fde047" strokeWidth="1.4" />
                  <line x1="-5" y1="-3" x2="5" y2="-3" stroke="#fde047" strokeWidth="1.4" />
                  <line x1="-5" y1="0" x2="5" y2="0" stroke="#fde047" strokeWidth="1.4" />
                  <line x1="-5" y1="3" x2="5" y2="3" stroke="#fde047" strokeWidth="1.4" />
                  <text
                    y="17"
                    textAnchor="middle"
                    className="text-[7.5px] font-mono font-black fill-[#fef08a]"
                  >
                    ENTRY
                  </text>
                </g>
              )}

              {/* Ace / Target Grand Exit Archway */}
              {tile.isTarget && (
                <g transform={`translate(${x}, ${y})`}>
                  <circle r="15" fill="#f59e0b" opacity="0.3" />
                  <circle r="12" fill="#ffd166" stroke="#78350f" strokeWidth="1.8" />
                  <path
                    d="M -6,5 L -6,-1 A 6,6 0 0,1 6,-1 L 6,5 Z"
                    fill="#451a03"
                    stroke="#b45309"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="0,-6 1.8,-1.8 6,0 1.8,1.8 0,6 -1.8,1.8 -6,0 -1.8,-1.8"
                    fill="#f59e0b"
                  />
                  <text
                    y="17"
                    textAnchor="middle"
                    className="text-[7.5px] font-mono font-black fill-[#f59e0b]"
                  >
                    EXIT A♥
                  </text>
                </g>
              )}

              {/* Trap Chamber (Jack) */}
              {tile.isTrap && (
                <g transform={`translate(${x}, ${y})`}>
                  <circle r="11" fill="#881337" stroke="#fb7185" strokeWidth="1.4" />
                  <polygon points="0,-5 2,-1 5,0 2,1 0,5 -2,1 -5,0 -2,-1" fill="#fda4af" />
                  <text
                    y="17"
                    textAnchor="middle"
                    className="text-[7px] font-mono font-black fill-rose-300"
                  >
                    TRAP J♥
                  </text>
                </g>
              )}

              {/* Treasure Vault Chamber (Queen / King) */}
              {tile.isTreasure && (
                <g transform={`translate(${x}, ${y})`}>
                  <circle r="11" fill="#78350f" stroke="#fbbf24" strokeWidth="1.4" />
                  <rect x="-4" y="-3" width="8" height="6" fill="#f59e0b" stroke="#451a03" strokeWidth="0.8" />
                  <line x1="-4" y1="-1" x2="4" y2="-1" stroke="#451a03" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="0.8" fill="#451a03" />
                  <text
                    y="17"
                    textAnchor="middle"
                    className="text-[7px] font-mono font-black fill-amber-300"
                  >
                    VAULT {tile.card?.rank}♥
                  </text>
                </g>
              )}

              {/* Retrace / Available Move Badge if accessible */}
              {isExit && !isPlayerHere && (
                <g transform={`translate(${x}, ${y - 12})`}>
                  <rect
                    x="-13"
                    y="-6"
                    width="26"
                    height="12"
                    rx="3"
                    fill={isReExploring ? '#b45309' : '#2d6a4f'}
                    stroke={isReExploring ? '#fef08a' : '#2b261f'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    className="text-[7.5px] font-mono font-black fill-white"
                  >
                    -{moveCost}⚡
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* =========================================================================
            LAYER 4: TORCHLIGHT AURA AROUND PLAYER
            ========================================================================= */}
        <circle
          cx={playerPixel.x}
          cy={playerPixel.y}
          r={HEX_RADIUS * 2.5}
          fill="url(#torch-aura)"
          pointerEvents="none"
        />

        {/* =========================================================================
            LAYER 5: PLAYER ADVENTURER PAWN TOKEN
            ========================================================================= */}
        <g
          transform={`translate(${playerPixel.x}, ${playerPixel.y})`}
          pointerEvents="none"
          className="transition-transform duration-300 ease-out"
        >
          <circle r="13" fill="#f59e0b" opacity="0.3" />
          <circle r="11" fill="#2d6a4f" stroke="#fef08a" strokeWidth="2" />
          <circle cx="0" cy="-3" r="3.5" fill="#fde047" />
          <path d="M -4.5,6 C -4.5,2 4.5,2 4.5,6 Z" fill="#f4edd9" />

          {/* Torch in hand */}
          <line x1="6" y1="4" x2="9" y2="-4" stroke="#78350f" strokeWidth="1.6" />
          <circle cx="9" cy="-5" r="2.2" fill="#ef4444" />
          <circle cx="9" cy="-5" r="1.2" fill="#fde047" />
        </g>
      </svg>

      {/* =========================================================================
          LAYER 6: UNEXPLORED EXITS & RE-EXPLORATION HUD TRACKER
          ========================================================================= */}
      <div className="absolute top-2 left-2 pointer-events-none z-10 flex flex-col gap-1 text-[11px] font-mono select-none">
        <div className="bg-[#241e18]/85 backdrop-blur-xs text-[#f4edd9] px-2.5 py-1 rounded-md border border-[#4a3f33] shadow-md flex items-center gap-1.5 pointer-events-auto">
          <span className="text-emerald-400 font-bold">🔍</span>
          <span className="font-bold">
            {unexploredList.length} Unexplored Exit{unexploredList.length !== 1 ? 's' : ''}
          </span>
          {overlappingCount > 0 && (
            <span
              className="px-1.5 py-0.2 rounded bg-amber-900/90 text-amber-300 border border-amber-600 font-black text-[9.5px] flex items-center gap-0.5"
              title={`${overlappingCount} chamber${overlappingCount !== 1 ? 's have' : ' has'} multiple converging corridors (overlapping exits)`}
            >
              <span>✦</span>
              <span>{overlappingCount} Overlap{overlappingCount !== 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        {isReExploring && (
          <div className="bg-amber-950/90 backdrop-blur-xs text-amber-200 px-2.5 py-0.5 rounded-md border border-amber-500/80 shadow-md text-[10px] font-black flex items-center gap-1.5">
            <span className="animate-spin-slow">🔁</span>
            <span>Re-Exploration Active • Move: -{moveCost}⚡</span>
          </div>
        )}
      </div>
    </div>
  );
};
