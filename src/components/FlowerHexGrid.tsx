import React, { useMemo, useState } from 'react';
import {
  FlowerTile,
  FlowerHexCoord,
  getHexDistance,
  areAxialAdjacent,
  getAxialNeighbors,
} from '../utils/level3Engine';
import { KeyRound, ShieldAlert, Sparkles, Skull, Eye, Footprints, Lock, Unlock, Swords, Tent } from 'lucide-react';

interface FlowerHexGridProps {
  tiles: Map<string, FlowerTile>;
  playerCoord: FlowerHexCoord;
  outerDoorsUnlocked: boolean;
  innerDoorsUnlocked: boolean;
  energy: number;
  onStepIn: (target: FlowerTile) => void;
  onPeek: (target: FlowerTile) => void;
  onSelectTile?: (tile: FlowerTile) => void;
}

interface BoundaryEdge {
  id: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  isDoor: boolean;
  doorType?: 'outer_door' | 'inner_door';
  isUnlocked: boolean;
}

export const FlowerHexGrid: React.FC<FlowerHexGridProps> = ({
  tiles,
  playerCoord,
  outerDoorsUnlocked,
  innerDoorsUnlocked,
  energy,
  onStepIn,
  onPeek,
  onSelectTile,
}) => {
  const [selectedCoord, setSelectedCoord] = useState<FlowerHexCoord | null>(null);

  // SVG Geometry parameters
  const hexSize = 44;
  const svgWidth = 420;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Pointy-topped axial to pixel coords
  const hexToPixel = (q: number, r: number) => {
    const x = hexSize * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = hexSize * ((3 / 2) * r);
    return { x: centerX + x, y: centerY + y };
  };

  const getHexPoints = (cx: number, cy: number, size: number) => {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
    }
    return points.join(' ');
  };

  const selectedTile = selectedCoord ? tiles.get(`${selectedCoord.q},${selectedCoord.r}`) : null;
  const isSelectedAdjacent = selectedCoord ? areAxialAdjacent(playerCoord, selectedCoord) : false;

  const playerPixel = hexToPixel(playerCoord.q, playerCoord.r);

  // Compute all visible walls and doors along shared edges between rings (Outer <-> Middle, Middle <-> Center)
  const boundaryEdges = useMemo(() => {
    const edges: BoundaryEdge[] = [];
    const processedPairs = new Set<string>();

    for (const h1 of tiles.values()) {
      const d1 = getHexDistance(h1.q, h1.r);
      const neighbors = getAxialNeighbors(h1.q, h1.r);

      for (const nCoord of neighbors) {
        const h2 = tiles.get(`${nCoord.q},${nCoord.r}`);
        if (!h2) continue;
        const d2 = getHexDistance(h2.q, h2.r);

        // Check if this pair crosses a ring boundary (2 <-> 1 or 1 <-> 0)
        const isOuterToMiddle = (d1 === 2 && d2 === 1) || (d1 === 1 && d2 === 2);
        const isMiddleToCenter = (d1 === 1 && d2 === 0) || (d1 === 0 && d2 === 1);

        if (!isOuterToMiddle && !isMiddleToCenter) continue;

        const pairKey = [h1.id, h2.id].sort().join('--');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // The outer hex of the boundary pair
        const outerHex = d1 > d2 ? h1 : h2;
        const isDoor = outerHex.type === 'outer_door' || outerHex.type === 'inner_door';
        const doorType = isDoor ? (outerHex.type as 'outer_door' | 'inner_door') : undefined;
        const isUnlocked = isDoor
          ? doorType === 'outer_door'
            ? outerDoorsUnlocked || outerHex.doorPassed || false
            : innerDoorsUnlocked || outerHex.doorPassed || false
          : false;

        // Calculate exact shared edge endpoints
        const pix1 = hexToPixel(h1.q, h1.r);
        const pix2 = hexToPixel(h2.q, h2.r);
        const dx = pix2.x - pix1.x;
        const dy = pix2.y - pix1.y;
        const dist = Math.hypot(dx, dy);
        const mx = (pix1.x + pix2.x) / 2;
        const my = (pix1.y + pix2.y) / 2;
        const tx = -dy / dist;
        const ty = dx / dist;
        const halfEdge = (hexSize - 2) / 2;

        edges.push({
          id: pairKey,
          p1: { x: mx + tx * halfEdge, y: my + ty * halfEdge },
          p2: { x: mx - tx * halfEdge, y: my - ty * halfEdge },
          isDoor,
          doorType,
          isUnlocked,
        });
      }
    }

    return edges;
  }, [tiles, hexSize, outerDoorsUnlocked, innerDoorsUnlocked]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2 select-none font-mono">
      {/* 19-Hex SVG Canvas */}
      <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full max-h-[380px] drop-shadow-md"
        >
          <defs>
            {/* Concentric Ring Track Gradients */}
            <radialGradient id="ring-track-outer" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#2b261f" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2b261f" stopOpacity="0.25" />
            </radialGradient>
            <radialGradient id="ring-track-inner" cx="50%" cy="50%" r="50%">
              <stop offset="30%" stopColor="#b45309" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.3" />
            </radialGradient>
            {/* Torch aura */}
            <radialGradient id="player-torch-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Concentric Orbital Rings */}
          <circle
            cx={centerX}
            cy={centerY}
            r={hexSize * Math.sqrt(3) * 2}
            fill="none"
            stroke="#ca8a04"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.25"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={hexSize * Math.sqrt(3)}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.35"
          />

          {/* Render All 19 Hex Tiles with Ring Colors (Yellow outer, Orange middle, Red inner) */}
          {Array.from(tiles.values()).map((tile) => {
            const { x, y } = hexToPixel(tile.q, tile.r);
            const dist = getHexDistance(tile.q, tile.r);
            const isSelected = selectedCoord?.q === tile.q && selectedCoord?.r === tile.r;
            const isAdj = areAxialAdjacent(playerCoord, { q: tile.q, r: tile.r });

            // Crossing constraints
            const fromDist = getHexDistance(playerCoord.q, playerCoord.r);
            const toDist = getHexDistance(tile.q, tile.r);
            const isGateBlocked =
              (fromDist === 2 && toDist === 1 && !outerDoorsUnlocked) ||
              (fromDist === 1 && toDist === 0 && !innerDoorsUnlocked);

            // Ring-Specific Color Palettes (Yellow outer, Orange middle, Red inner/center)
            let fillColor = '#fef3c7';
            let strokeColor = '#b45309';
            let strokeWidth = '1.8';

            if (!tile.revealed) {
              if (dist === 2) {
                // Outer ring unrevealed: dark bronze yellow stone
                fillColor = '#3f3524';
                strokeColor = '#6b542c';
              } else if (dist === 1) {
                // Middle ring unrevealed: dark terracotta orange stone
                fillColor = '#422413';
                strokeColor = '#8c3514';
              } else {
                // Inner ring / boss unrevealed: dark crimson stone
                fillColor = '#450a0a';
                strokeColor = '#991b1b';
              }
            } else if (dist === 0) {
              // Inner Ring / Boss: Red shades
              fillColor = '#fee2e2';
              strokeColor = '#991b1b';
              strokeWidth = '3';
            } else if (dist === 1) {
              // Middle Ring: Orange shades
              if (tile.type === 'inner_door') {
                // Single door colour for door hex!
                if (tile.doorTested && !tile.doorPassed) {
                  fillColor = '#fee2e2'; // sealed locked
                  strokeColor = '#991b1b';
                } else {
                  fillColor = tile.doorPassed || innerDoorsUnlocked ? '#dcfce7' : '#fed7aa';
                  strokeColor = tile.doorPassed || innerDoorsUnlocked ? '#16a34a' : '#ea580c';
                }
                strokeWidth = '2.5';
              } else if (tile.type === 'trap') {
                fillColor = tile.disarmed ? '#f3f4f6' : '#fed7aa';
                strokeColor = tile.disarmed ? '#9ca3af' : '#c2410c';
              } else if (tile.type === 'monster') {
                const cleared = tile.monsterBypassed || tile.monsterDefeated;
                fillColor = cleared ? '#f3f4f6' : '#ffedd5';
                strokeColor = cleared ? '#9ca3af' : '#ea580c';
              } else if (tile.type === 'treasure') {
                fillColor = tile.looted ? '#fff7ed' : '#ffedd5';
                strokeColor = '#ea580c';
              } else {
                fillColor = '#ffedd5';
                strokeColor = '#ea580c';
              }
            } else {
              // Outer Ring: Yellow shades
              if (tile.type === 'safe') {
                // Safe Entry Zone!
                fillColor = '#dcfce7';
                strokeColor = '#16a34a';
                strokeWidth = '2.5';
              } else if (tile.type === 'outer_door') {
                // Single door colour for door hex!
                if (tile.doorTested && !tile.doorPassed) {
                  fillColor = '#fee2e2'; // sealed locked
                  strokeColor = '#991b1b';
                } else {
                  fillColor = tile.doorPassed || outerDoorsUnlocked ? '#dcfce7' : '#fde68a';
                  strokeColor = tile.doorPassed || outerDoorsUnlocked ? '#16a34a' : '#d97706';
                }
                strokeWidth = '2.5';
              } else if (tile.type === 'trap') {
                fillColor = tile.disarmed ? '#f3f4f6' : '#fef08a';
                strokeColor = tile.disarmed ? '#9ca3af' : '#b45309';
              } else if (tile.type === 'monster') {
                const cleared = tile.monsterBypassed || tile.monsterDefeated;
                fillColor = cleared ? '#f3f4f6' : '#fef9c3';
                strokeColor = cleared ? '#9ca3af' : '#ca8a04';
              } else if (tile.type === 'treasure') {
                fillColor = tile.looted ? '#fefce8' : '#fef9c3';
                strokeColor = '#ca8a04';
              } else {
                fillColor = '#fef3c7';
                strokeColor = '#ca8a04';
              }
            }

            if (isSelected) {
              strokeColor = '#2563eb';
              strokeWidth = '3.5';
            } else if (isAdj && !isGateBlocked) {
              strokeColor = '#16a34a';
              strokeWidth = '2.5';
            }

            return (
              <g
                key={tile.id}
                onClick={() => {
                  setSelectedCoord({ q: tile.q, r: tile.r });
                  onSelectTile?.(tile);
                }}
                className="cursor-pointer transition-transform duration-150 hover:opacity-90"
              >
                {/* Hexagon Shape */}
                <polygon
                  points={getHexPoints(x, y, hexSize - 2)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  className="transition-colors duration-200"
                />

                {/* Inner Hex Content */}
                {!tile.revealed ? (
                  // Face-down runic mystery slab
                  <g pointerEvents="none">
                    <text
                      x={x}
                      y={y + 5}
                      textAnchor="middle"
                      fill={dist === 2 ? '#d4af37' : dist === 1 ? '#fb923c' : '#f87171'}
                      fontSize="14"
                      fontWeight="bold"
                    >
                      ?
                    </text>
                  </g>
                ) : (
                  // Face-up Revealed Tile Content
                  <g pointerEvents="none" className="select-none">
                    {tile.type === 'center_boss' && (
                      <g transform={`translate(${x - 9}, ${y - 12})`}>
                        <Skull className="w-4.5 h-4.5 text-red-800" />
                        <text x={9} y={23} textAnchor="middle" fill="#991b1b" fontSize="8" fontWeight="900">
                          BOSS
                        </text>
                      </g>
                    )}
                    {tile.type === 'outer_door' && (
                      <g transform={`translate(${x - 8}, ${y - 12})`}>
                        {outerDoorsUnlocked || tile.doorPassed ? (
                          <Unlock className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-800" />
                        )}
                        <text x={8} y={22} textAnchor="middle" fill="#92400e" fontSize="7" fontWeight="bold">
                          DOOR
                        </text>
                      </g>
                    )}
                    {tile.type === 'inner_door' && (
                      <g transform={`translate(${x - 8}, ${y - 12})`}>
                        {innerDoorsUnlocked || tile.doorPassed ? (
                          <Unlock className="w-4 h-4 text-emerald-800" />
                        ) : (
                          <KeyRound className="w-4 h-4 text-amber-900" />
                        )}
                        <text x={8} y={22} textAnchor="middle" fill="#78350f" fontSize="7" fontWeight="bold">
                          GATE
                        </text>
                      </g>
                    )}
                    {tile.type === 'trap' && (
                      <g transform={`translate(${x - 8}, ${y - 12})`}>
                        <ShieldAlert className={`w-4 h-4 ${tile.disarmed ? 'text-gray-500' : 'text-red-700'}`} />
                        <text x={8} y={22} textAnchor="middle" fill={tile.disarmed ? '#6b7280' : '#b91c1c'} fontSize="7" fontWeight="bold">
                          {tile.disarmed ? 'SAFE' : 'TRAP'}
                        </text>
                      </g>
                    )}
                    {tile.type === 'treasure' && (
                      <g transform={`translate(${x - 8}, ${y - 12})`}>
                        <Sparkles className={`w-4 h-4 ${tile.looted ? 'text-gray-400' : 'text-amber-600'}`} />
                        <text x={8} y={22} textAnchor="middle" fill={tile.looted ? '#9ca3af' : '#b45309'} fontSize="7" fontWeight="bold">
                          {tile.looted ? 'EMPTY' : 'MANA'}
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Peeked Badge indicator */}
                {tile.revealed && !tile.visited && (
                  <g pointerEvents="none" transform={`translate(${x - 12}, ${y - 20})`}>
                    <rect width="24" height="8" rx="2" fill="#2563eb" />
                    <text x="12" y="6.5" fill="#fff" fontSize="6" fontWeight="bold" textAnchor="middle">
                      PEEKED
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ============================================================== */}
          {/* VISIBLE WALLS & SINGLE-COLOUR DOORS BETWEEN RINGS              */}
          {/* ============================================================== */}
          <g id="ring-boundary-walls" pointerEvents="none">
            {boundaryEdges.map((edge) => {
              if (edge.isDoor) {
                // Single door colour instead of wall!
                const doorColor = edge.isUnlocked
                  ? '#10b981' // glowing emerald when open
                  : edge.doorType === 'inner_door'
                  ? '#ea580c' // rich fiery orange door color
                  : '#f59e0b'; // rich brass yellow door color

                return (
                  <g key={`door-edge-${edge.id}`}>
                    {/* Subtle outer glow */}
                    <line
                      x1={edge.p1.x}
                      y1={edge.p1.y}
                      x2={edge.p2.x}
                      y2={edge.p2.y}
                      stroke={doorColor}
                      strokeWidth="8"
                      opacity="0.35"
                      strokeLinecap="round"
                    />
                    {/* Single Door Colour Line */}
                    <line
                      x1={edge.p1.x}
                      y1={edge.p1.y}
                      x2={edge.p2.x}
                      y2={edge.p2.y}
                      stroke={doorColor}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    {/* Door Portal Pip */}
                    <circle
                      cx={(edge.p1.x + edge.p2.x) / 2}
                      cy={(edge.p1.y + edge.p2.y) / 2}
                      r="4.5"
                      fill={doorColor}
                      stroke="#1c1917"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              }

              // Heavy stone fortress wall along edge between rings
              return (
                <g key={`wall-edge-${edge.id}`}>
                  {/* Shadow base */}
                  <line
                    x1={edge.p1.x}
                    y1={edge.p1.y}
                    x2={edge.p2.x}
                    y2={edge.p2.y}
                    stroke="#000000"
                    strokeWidth="7"
                    opacity="0.5"
                    strokeLinecap="round"
                  />
                  {/* Heavy Dark Stone Wall */}
                  <line
                    x1={edge.p1.x}
                    y1={edge.p1.y}
                    x2={edge.p2.x}
                    y2={edge.p2.y}
                    stroke="#1c1917"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                  {/* Masonry highlight */}
                  <line
                    x1={edge.p1.x}
                    y1={edge.p1.y}
                    x2={edge.p2.x}
                    y2={edge.p2.y}
                    stroke="#78716c"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Player Adventurer Token with Torchlight Aura */}
          <g transform={`translate(${playerPixel.x}, ${playerPixel.y})`} pointerEvents="none">
            <circle cx="0" cy="0" r="24" fill="url(#player-torch-glow)" />
            <circle cx="0" cy="0" r="10" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black">
              ▲
            </text>
          </g>
        </svg>
      </div>

      {/* Selected Tile Action Bar / Quick Commands */}
      <div className="w-full bg-[#fdfbf7] border-2 border-[#2b261f] rounded-lg p-2.5 shadow-md flex flex-col gap-2">
        {selectedTile ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-[#2b261f] truncate">
                {selectedTile.revealed ? selectedTile.title : `Unrevealed Hex [${selectedTile.q}, ${selectedTile.r}]`}
              </span>
              <span className="text-[10px] uppercase font-bold text-[#786e5e] bg-[#e8deca] px-1.5 py-0.5 rounded">
                {selectedTile.ring} Ring
              </span>
            </div>

            {/* Interaction Options */}
            {selectedTile.q === playerCoord.q && selectedTile.r === playerCoord.r ? (
              <span className="text-[11px] text-[#5c5346] italic">
                Current adventurer position.
              </span>
            ) : isSelectedAdjacent ? (
              <div className="flex items-center gap-2">
                {/* Step In Option */}
                <button
                  onClick={() => onStepIn(selectedTile)}
                  disabled={energy <= 0}
                  className="flex-1 py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-md font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-50"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Step In (-1⚡)</span>
                </button>

                {/* Peek Option (Only if unrevealed) */}
                {!selectedTile.revealed && (
                  <button
                    onClick={() => onPeek(selectedTile)}
                    disabled={energy <= 0}
                    className="flex-1 py-2 bg-[#b45309] hover:bg-[#92400e] text-white rounded-md font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-50"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Peek (-1⚡)</span>
                  </button>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-[#786e5e]">
                Select an adjacent hex to step into or peek.
              </span>
            )}
          </div>
        ) : (
          <div className="text-center text-xs text-[#786e5e] py-1">
            Tap an adjacent hex to Step In (-1⚡) or Peek (-1⚡).
          </div>
        )}
      </div>
    </div>
  );
};
