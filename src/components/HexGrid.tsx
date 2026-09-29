import React, { useRef } from 'react';
import { HexCoord, HexTile, DirectionIndex, DeviationState } from '../types';
import {
  GRID_COLS,
  GRID_ROWS,
  hexToPixel,
  getHexPolygonPoints,
  getAllNeighbors,
  DIRECTION_LABELS,
  tracePath,
  getCairnShortBearing,
} from '../utils/hexMath';

interface HexGridProps {
  tiles: Map<string, HexTile>;
  playerCoord: HexCoord;
  pathPreview: HexCoord[];
  knownTowers: HexCoord[];
  isMoveOne: boolean;
  candidateGoalCoords?: HexCoord[];
  deviationState: DeviationState;
  onTileClick: (coord: HexCoord) => void;
  onPathTileClick?: (coord: HexCoord, stepIndex: number) => void;
  onSelectDeviationBranch?: (dir: DirectionIndex) => void;
  onExecuteMove?: () => void;
  canExecuteMove?: boolean;
}

// Calibrated radius for 11x12 grid: board is 391px wide x 498px tall
export const HEX_RADIUS = 23;

// Precise viewBox boundaries encompassing all 11 columns (0-10) and 12 rows (0-11)
// with comfortable symmetrical margins for markers, halo rings, and banners
const VB_X = -18;
const VB_Y = -24;
const VB_WIDTH = 427;
const VB_HEIGHT = 546;

export const HexGrid: React.FC<HexGridProps> = ({
  tiles,
  playerCoord,
  pathPreview,
  knownTowers,
  isMoveOne,
  candidateGoalCoords,
  deviationState,
  onTileClick,
  onPathTileClick,
  onSelectDeviationBranch,
  onExecuteMove,
  canExecuteMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if the goal has been revealed
  const isGoalRevealed = React.useMemo(() => {
    for (const t of tiles.values()) {
      if (t.type === 'goal' && t.revealed) return true;
    }
    return false;
  }, [tiles]);

  // Set of coordinates that could be the Golden Beacon based on revealed Cairns
  const candidateKeySet = React.useMemo(() => {
    if (isGoalRevealed) {
      return new Set<string>();
    }
    if (candidateGoalCoords && candidateGoalCoords.length > 0) {
      return new Set(candidateGoalCoords.map((c) => `${c.col},${c.row}`));
    }
    return new Set<string>();
  }, [isGoalRevealed, candidateGoalCoords]);

  // Player pixel position
  const playerPixel = hexToPixel(playerCoord.col, playerCoord.row, HEX_RADIUS);

  // Neighbors of player (for Move 1 direct adjacent stepping)
  const playerNeighbors = getAllNeighbors(playerCoord);
  const playerNeighborKeys = new Set(playerNeighbors.map((n) => `${n.col},${n.row}`));

  // Fast lookup for path preview tiles and their FIRST step index (0-based)
  // We only keep the earliest step so bouncing/looping paths deviate from the first encounter
  const pathTileMap = new Map<string, number>();
  pathPreview.forEach((c, idx) => {
    const key = `${c.col},${c.row}`;
    if (!pathTileMap.has(key)) {
      pathTileMap.set(key, idx);
    }
  });

  // Calculate deviation branch preview options if deviation pivot is active
  const isDeviationPivotActive =
    deviationState.active &&
    deviationState.type === 'split_path' &&
    deviationState.pivotIndex !== null;

  // Pivot hex position (-1 indicates deviating from player's current hex)
  const pivotCoord =
    isDeviationPivotActive && deviationState.pivotIndex !== null
      ? (deviationState.pivotIndex === -1 ? playerCoord : pathPreview[deviationState.pivotIndex])
      : null;
  const pivotPixel = pivotCoord ? hexToPixel(pivotCoord.col, pivotCoord.row, HEX_RADIUS) : null;

  // Compute the candidate branch trajectories for each of the 6 directions from the pivot
  const branchDirections: DirectionIndex[] = [1, 2, 3, 4, 5, 6];
  const remainingSpaces = deviationState.step2Distance;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#ded4bf] select-none cursor-default"
    >
      {/* Paper texture overlay & subtle vintage grid marks */}
      <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(#8f8370_1px,transparent_1px)] [background-size:18px_18px]" />

      {/* Responsive Fixed SVG Hex Canvas with ViewBox - 100% Board Fit */}
      <svg
        viewBox={`${VB_X} ${VB_Y} ${VB_WIDTH} ${VB_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full block touch-manipulation"
      >
        <defs>
          <pattern id="paper-stipple" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#bfae95" opacity="0.6" />
            <circle cx="6" cy="6" r="0.8" fill="#bfae95" opacity="0.6" />
          </pattern>
          <pattern id="grass-stipple" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M2,10 L3,6 M4,10 L4,5 M6,10 L7,7" stroke="#7e9c70" strokeWidth="0.8" fill="none" opacity="0.5" />
          </pattern>
          {/* Pulsing ring filter for pawn */}
          <radialGradient id="player-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#22c55e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Base Hex Tiles */}
        {Array.from(tiles.values()).map((tile) => {
          const { x, y } = hexToPixel(tile.col, tile.row, HEX_RADIUS);
          const points = getHexPolygonPoints(x, y, HEX_RADIUS - 1.2);
          const isPlayerHex = tile.col === playerCoord.col && tile.row === playerCoord.row;
          const isNeighborOfPlayer = playerNeighborKeys.has(`${tile.col},${tile.row}`);
          const isKnownTower =
            knownTowers.some((t) => t.col === tile.col && t.row === tile.row) && !tile.revealed;
          const isMoveOneTarget = isMoveOne && isNeighborOfPlayer;

          // Goal Candidate: unrevealed tiles that match active Cairns (only before goal is revealed)
          const isPossibleGoalCandidate = Boolean(
            !isGoalRevealed &&
            candidateKeySet.has(`${tile.col},${tile.row}`) &&
            !tile.revealed
          );

          // Check if this hex is along the active movement line
          const pathStepIndex = pathTileMap.get(`${tile.col},${tile.row}`);
          const isPathHex = pathStepIndex !== undefined;
          const isPivotHex =
            isDeviationPivotActive &&
            deviationState.pivotIndex !== null &&
            (deviationState.pivotIndex === -1 ? isPlayerHex : pathStepIndex === deviationState.pivotIndex);
          const isAfterPivot =
            isDeviationPivotActive &&
            deviationState.pivotIndex !== null &&
            (deviationState.pivotIndex === -1
              ? isPathHex
              : pathStepIndex !== undefined && pathStepIndex > deviationState.pivotIndex);

          // Color & Styling determination
          let fillColor = '#e7ddc9'; // Default fog of war parchment
          let strokeColor = '#2b261f';
          let strokeWidth = 1.2;

          if (tile.revealed) {
            switch (tile.type) {
              case 'start':
                fillColor = '#fae19c';
                break;
              case 'goal':
                fillColor = '#f5b041';
                break;
              case 'tower':
                fillColor = '#dfb87c';
                break;
              case 'energy_cache':
                fillColor = '#bce3cb';
                break;
              case 'luck_shrine':
                fillColor = '#dbc5ea';
                break;
              case 'bog_hazard':
                fillColor = tile.activated ? '#dbe7d0' : '#c5b49d';
                break;
              case 'rift_hazard':
                fillColor = '#f2afaf';
                break;
              case 'clue_cairn':
                fillColor = '#d9d0c1';
                break;
              case 'blank':
              default:
                fillColor = '#dbe7d0';
                break;
            }
          }

          // Highlight path line tiles or Move 1 targets vividly
          if (isMoveOneTarget) {
            strokeColor = '#d97706';
            strokeWidth = 2.6;
            if (!tile.revealed) {
              fillColor = '#fae8c8';
            }
          } else if (isPivotHex) {
            strokeColor = '#d97706';
            strokeWidth = 3;
            fillColor = '#fef3c7';
          } else if (isPathHex) {
            strokeColor = isAfterPivot ? '#b45309' : '#15803d';
            strokeWidth = 2.4;
          } else if (isPlayerHex) {
            strokeColor = '#15803d';
            strokeWidth = 2.4;
          } else if (isPossibleGoalCandidate) {
            strokeColor = '#d97706';
            strokeWidth = 1.8;
            if (!tile.revealed) {
              fillColor = '#faf0d7';
            }
          }

          return (
            <g
              key={tile.id}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();

                // If Move 1 is active and player clicks an adjacent hex, step directly there!
                if (isMoveOneTarget) {
                  onTileClick({ col: tile.col, row: tile.row });
                  return;
                }

                // If clicking current player hex while dice move is active, deviate directly from current location!
                if (isPlayerHex && pathPreview.length > 0 && onPathTileClick) {
                  onPathTileClick({ col: tile.col, row: tile.row }, -1);
                  return;
                }

                // If clicking a tile along the path, trigger deviation pivot at this tile!
                if (isPathHex && pathStepIndex !== undefined && onPathTileClick) {
                  onPathTileClick({ col: tile.col, row: tile.row }, pathStepIndex);
                  return;
                }

                // Otherwise standard tile click (tile inspection)
                onTileClick({ col: tile.col, row: tile.row });
              }}
            >
              {/* Hex Polygon */}
              <polygon
                points={points}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={isMoveOneTarget ? '4 3' : undefined}
                className={isMoveOneTarget ? 'animate-pulse' : ''}
              />

              {/* Fog overlay pattern for unrevealed tiles */}
              {!tile.revealed && (
                <polygon
                  points={points}
                  fill="url(#paper-stipple)"
                  pointerEvents="none"
                />
              )}

              {/* Cairn Goal Candidate warm golden shimmer overlay */}
              {isPossibleGoalCandidate && !tile.revealed && (
                <polygon
                  points={points}
                  fill="#f59e0b"
                  opacity="0.22"
                  pointerEvents="none"
                />
              )}

              {/* Beacon Candidate target reticle marker */}
              {isPossibleGoalCandidate && !tile.revealed && (
                <g pointerEvents="none" transform={`translate(${x}, ${y})`}>
                  <circle
                    r="6.5"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                    opacity="0.85"
                  />
                  <circle r="2" fill="#d97706" opacity="0.9" />
                </g>
              )}

              {/* Blank wilderness grass pattern for revealed blank tiles */}
              {tile.revealed && tile.type === 'blank' && (
                <polygon
                  points={points}
                  fill="url(#grass-stipple)"
                  pointerEvents="none"
                />
              )}

              {/* Path highlight overlay fill for clarity */}
              {isPathHex && (
                <polygon
                  points={points}
                  fill={isPivotHex ? '#fde68a' : isAfterPivot ? '#fed7aa' : '#bbf7d0'}
                  opacity="0.5"
                  pointerEvents="none"
                />
              )}

              {/* Path Step Number Badge along the highlighted line (1, 2, 3...) */}
              {isPathHex && pathStepIndex !== undefined && (
                <g pointerEvents="none" transform={`translate(${x}, ${y - HEX_RADIUS * 0.48})`}>
                  <circle
                    r="6.5"
                    fill={isPivotHex ? '#d97706' : isAfterPivot ? '#ea580c' : '#16a34a'}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    dy="3"
                    className="text-[8px] font-mono font-bold fill-white"
                  >
                    {pathStepIndex + 1}
                  </text>
                </g>
              )}

              {/* Pivot Indicator icon if this is the chosen deviation turn point */}
              {isPivotHex && (
                <g pointerEvents="none" transform={`translate(${x}, ${y + (isPlayerHex ? 12 : 6)})`}>
                  <rect x="-16" y="-7" width="32" height="13" rx="3" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
                  <text textAnchor="middle" dy="2.5" className="text-[7.5px] font-mono font-black fill-white">
                    PIVOT
                  </text>
                </g>
              )}

              {/* Tile Content Rendering */}
              {tile.revealed ? (
                <g pointerEvents="none">
                  {tile.type === 'start' && (
                    <g transform={`translate(${x}, ${y})`}>
                      <circle r="10" fill="none" stroke="#2b261f" strokeWidth="1.2" strokeDasharray="2 2" />
                      <circle r="3.5" fill="#2d6a4f" stroke="#2b261f" strokeWidth="1" />
                      <text
                        y="16"
                        textAnchor="middle"
                        className="text-[8px] font-mono font-bold fill-[#2b261f]"
                      >
                        CAMP
                      </text>
                    </g>
                  )}

                  {tile.type === 'goal' && (
                    <g transform={`translate(${x}, ${y})`}>
                      <circle r="16" fill="#f59e0b" opacity="0.35" className="animate-pulse" />
                      <circle r="13" fill="#ffd166" stroke="#2b261f" strokeWidth="1.8" />
                      {/* Arched Secret Tunnel Entrance */}
                      <path
                        d="M -6,5 L -6,-1 A 6,6 0 0,1 6,-1 L 6,5 Z"
                        fill="#2b261f"
                        stroke="#78350f"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M -3.5,5 L -3.5,0 A 3.5,3.5 0 0,1 3.5,0 L 3.5,5 Z"
                        fill="#12100e"
                      />
                      {/* Stone step & mysterious lantern glow */}
                      <line x1="-3" y1="3" x2="3" y2="3" stroke="#b45309" strokeWidth="0.8" />
                      <circle cx="0" cy="-3.5" r="1.2" fill="#f59e0b" />
                      <text
                        y="16"
                        textAnchor="middle"
                        className="text-[7.5px] font-mono font-black fill-[#78350f]"
                      >
                        TUNNEL
                      </text>
                    </g>
                  )}

                  {tile.type === 'tower' && (
                    <g transform={`translate(${x}, ${y})`}>
                      <path
                        d="M -6,7 L -4,-3 L -7,-6 L -7,-8 L 7,-8 L 7,-6 L 4,-3 L 6,7 Z"
                        fill="#78644f"
                        stroke="#2b261f"
                        strokeWidth="1.2"
                      />
                      <circle cx="0" cy="-3" r="2" fill="#f59e0b" />
                      <text
                        y="16"
                        textAnchor="middle"
                        className="text-[8px] font-mono font-bold fill-[#2b261f]"
                      >
                        TOWER
                      </text>
                    </g>
                  )}

                  {tile.type === 'energy_cache' && (
                    <g transform={`translate(${x}, ${y})`}>
                      <circle r="9" fill="#2d6a4f" stroke="#2b261f" strokeWidth="1.2" />
                      <text
                        y="3"
                        textAnchor="middle"
                        className="text-[9px] font-mono font-black fill-white"
                      >
                        +{tile.value || 2}
                      </text>
                      <text
                        y="16"
                        textAnchor="middle"
                        className="text-[7.5px] font-mono font-bold fill-[#1e4634]"
                      >
                        SPRING
                      </text>
                    </g>
                  )}

                  {tile.type === 'luck_shrine' && (
                    <g transform={`translate(${x}, ${y})`}>
                      <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#7e4fa3" stroke="#2b261f" strokeWidth="1.2" />
                      <circle cx="-2.5" cy="-2.5" r="1" fill="#fff" />
                      <circle cx="2.5" cy="2.5" r="1" fill="#fff" />
                      <circle cx="0" cy="0" r="1" fill="#fff" />
                      <text
                        y="16"
                        textAnchor="middle"
                        className="text-[7.5px] font-mono font-bold fill-[#522973]"
                      >
                        SHRINE
                      </text>
                    </g>
                  )}

                  {tile.type === 'bog_hazard' && (
                    <g transform={`translate(${x}, ${y})`}>
                      <path
                        d="M -8,2 C -5,-2 0,-3 3,0 C 6,2 8,1 8,2 C 8,5 -8,5 -8,2 Z"
                        fill={tile.activated ? '#8a9c7d' : '#574737'}
                        stroke={tile.activated ? '#4f6144' : '#2b261f'}
                        strokeWidth={tile.activated ? '0.9' : '1'}
                        opacity={tile.activated ? 0.8 : 1}
                      />
                      <text
                        y="1.5"
                        textAnchor="middle"
                        className={`text-[8.5px] font-mono font-black ${
                          tile.activated ? 'fill-[#f4f8f1]' : 'fill-[#f7e6d0]'
                        }`}
                      >
                        -1
                      </text>
                      <text
                        y="16"
                        textAnchor="middle"
                        className={`text-[7.5px] font-mono font-bold ${
                          tile.activated ? 'fill-[#4f6345]' : 'fill-[#423325]'
                        }`}
                      >
                        BOG
                      </text>
                    </g>
                  )}

                  {tile.type === 'rift_hazard' && (
                    <g transform={`translate(${x}, ${y})`}>
                      <polygon points="0,-8 7,5 -7,5" fill="#b91c1c" stroke="#2b261f" strokeWidth="1.2" />
                      <text
                        y="3"
                        textAnchor="middle"
                        className="text-[8px] font-mono font-black fill-white"
                      >
                        !
                      </text>
                      <text
                        y="16"
                        textAnchor="middle"
                        className="text-[7.5px] font-mono font-bold fill-[#991b1b]"
                      >
                        RIFT
                      </text>
                    </g>
                  )}

                  {tile.type === 'clue_cairn' && (
                    <g transform={`translate(${x}, ${y})`}>
                      <polygon
                        points="-5,6 5,6 3.5,-3 0,-8 -3.5,-3"
                        fill={tile.cairnBearing ? '#44403c' : '#57534e'}
                        stroke="#2b261f"
                        strokeWidth="1.2"
                      />
                      <circle
                        cx="0"
                        cy="-1"
                        r={tile.cairnBearing ? '2.5' : '1.2'}
                        fill={tile.cairnBearing ? '#22c55e' : '#fde047'}
                        stroke="#1c1917"
                        strokeWidth="0.5"
                      />
                      <text
                        y="16"
                        textAnchor="middle"
                        className={`text-[7.5px] font-mono font-black ${
                          tile.cairnBearing ? 'fill-[#15803d]' : 'fill-[#2b261f]'
                        }`}
                      >
                        {getCairnShortBearing(tile.cairnBearing)}
                      </text>
                    </g>
                  )}

                  {/* Blank tiles have clean wilderness texture without raw coordinates */}
                </g>
              ) : (
                <g pointerEvents="none">
                  {isKnownTower ? (
                    <g transform={`translate(${x}, ${y})`}>
                      <path
                        d="M -5,5 L -3,-3 L -6,-5 L -6,-6 L 6,-6 L 6,-5 L 3,-3 L 5,5 Z"
                        fill="none"
                        stroke="#b45309"
                        strokeWidth="1.4"
                        strokeDasharray="2 1"
                      />
                      <circle cx="0" cy="-3" r="1.8" fill="#d97706" />
                      <text
                        y="15"
                        textAnchor="middle"
                        className="text-[7px] font-mono font-bold fill-[#b45309]"
                      >
                        TOWER?
                      </text>
                    </g>
                  ) : isMoveOneTarget ? (
                    <g transform={`translate(${x}, ${y})`}>
                      <circle r="7.5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.3" className="animate-pulse" />
                      <circle cx="0" cy="-0.5" r="2.2" fill="none" stroke="#d97706" strokeWidth="1.3" />
                      <circle cx="0" cy="-0.5" r="1" fill="#d97706" />
                      <text
                        y="15"
                        textAnchor="middle"
                        className="text-[7px] font-mono font-bold fill-[#92400e]"
                      >
                        STEP -1⚡
                      </text>
                    </g>
                  ) : isPossibleGoalCandidate && !tile.revealed ? (
                    <g transform={`translate(${x}, ${y})`}>
                      <circle r="3.5" fill="none" stroke="#d97706" strokeWidth="0.9" strokeDasharray="1.5 1.5" />
                      <circle r="1.3" fill="#d97706" />
                    </g>
                  ) : null}
                </g>
              )}
            </g>
          );
        })}

        {/* 2. Projected Movement Trajectory Path */}
        {pathPreview.length > 0 && (
          <g pointerEvents="none">
            {(() => {
              const fullCoords = [playerCoord, ...pathPreview];
              const pointsStr = fullCoords
                .map((c) => {
                  const p = hexToPixel(c.col, c.row, HEX_RADIUS);
                  return `${p.x},${p.y}`;
                })
                .join(' ');

              const target = pathPreview[pathPreview.length - 1];
              const targetPixel = hexToPixel(target.col, target.row, HEX_RADIUS);

              return (
                <>
                  {/* Heavy dark outline under line */}
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#1c1917"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Main active bright green dashed trajectory line */}
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Waypoint dots */}
                  {pathPreview.map((step, idx) => {
                    const sp = hexToPixel(step.col, step.row, HEX_RADIUS);
                    const isFinal = idx === pathPreview.length - 1;
                    if (isFinal) return null;
                    return (
                      <circle
                        key={`wp-${idx}`}
                        cx={sp.x}
                        cy={sp.y}
                        r="3.5"
                        fill="#ffffff"
                        stroke="#1c1917"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Target Landing Ring */}
                  <g transform={`translate(${targetPixel.x}, ${targetPixel.y})`}>
                    <circle r="13" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="3 2" />
                    <circle r="4" fill="#22c55e" stroke="#1c1917" strokeWidth="1" />
                    <line x1="-9" y1="0" x2="9" y2="0" stroke="#22c55e" strokeWidth="1.8" />
                    <line x1="0" y1="-9" x2="0" y2="9" stroke="#22c55e" strokeWidth="1.8" />
                  </g>
                </>
              );
            })()}
          </g>
        )}

        {/* 3. Deviation Branch Fan Out - If user pressed a hex along the line to pivot */}
        {isDeviationPivotActive && pivotCoord && pivotPixel && onSelectDeviationBranch && (
          <g>
            {/* Pulsing ring around the pivot hex */}
            <circle
              cx={pivotPixel.x}
              cy={pivotPixel.y}
              r={HEX_RADIUS + 4}
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              className="animate-spin origin-center"
              style={{ transformOrigin: `${pivotPixel.x}px ${pivotPixel.y}px` }}
            />

            {/* Render 6 directional branch buttons/arrows around the pivot hex */}
            {branchDirections.map((dir) => {
              const { arrow, short } = DIRECTION_LABELS[dir];
              const branchPath = tracePath(pivotCoord, dir, remainingSpaces);
              if (branchPath.length === 0) return null; // blocked by map edge

              const branchTarget = branchPath[branchPath.length - 1];
              const branchTargetPix = hexToPixel(branchTarget.col, branchTarget.row, HEX_RADIUS);
              const isSelectedBranch = deviationState.step2Direction === dir;

              // Waypoint line from pivot to branch target
              const branchLineCoords = [pivotCoord, ...branchPath];
              const branchPoints = branchLineCoords
                .map((c) => {
                  const p = hexToPixel(c.col, c.row, HEX_RADIUS);
                  return `${p.x},${p.y}`;
                })
                .join(' ');

              return (
                <g key={`branch-${dir}`} className="cursor-pointer">
                  {/* Branch preview line */}
                  <polyline
                    points={branchPoints}
                    fill="none"
                    stroke={isSelectedBranch ? '#d97706' : '#786e5e'}
                    strokeWidth={isSelectedBranch ? 3.5 : 1.8}
                    strokeDasharray={isSelectedBranch ? '5 2' : '3 3'}
                    opacity={isSelectedBranch ? 1 : 0.65}
                    pointerEvents="none"
                  />

                  {/* Interactive Branch Target selector button */}
                  <g
                    transform={`translate(${branchTargetPix.x}, ${branchTargetPix.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDeviationBranch(dir);
                    }}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <circle
                      r="12"
                      fill={isSelectedBranch ? '#d97706' : '#f5efe3'}
                      stroke="#2b261f"
                      strokeWidth={isSelectedBranch ? 2.5 : 1.5}
                      className="shadow-sm"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      className={`text-[10px] font-mono font-bold ${
                        isSelectedBranch ? 'fill-white font-black' : 'fill-[#2b261f]'
                      }`}
                    >
                      {arrow}
                    </text>
                    <rect
                      x="-14"
                      y="-21"
                      width="28"
                      height="11"
                      rx="2"
                      fill="#2b261f"
                      opacity={isSelectedBranch ? 0.95 : 0.8}
                    />
                    <text
                      textAnchor="middle"
                      y="-13"
                      className="text-[7px] font-mono font-bold fill-white"
                    >
                      {short.split(' ')[0]} ({remainingSpaces})
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}

        {/* 4. Prominent Player Adventurer Pawn Token (High-Contrast, Beacon Halo, Flag Pin) */}
        <g
          transform={`translate(${playerPixel.x}, ${playerPixel.y})`}
          className="pointer-events-none transition-transform duration-300 ease-out"
        >
          {/* Broad glowing radial halo so pawn is instantly unmissable */}
          <circle cx="0" cy="0" r="36" fill="url(#player-glow)" />

          {/* Double animated pulsing radar waves */}
          <circle
            cx="0"
            cy="0"
            r="24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-ping opacity-75"
          />
          <circle
            cx="0"
            cy="0"
            r="16"
            fill="none"
            stroke="#15803d"
            strokeWidth="1.5"
            opacity="0.8"
          />

          {/* Drop shadow */}
          <ellipse cx="2" cy="4" rx="14" ry="7" fill="#000000" opacity="0.45" />

          {/* Thick Brass Outer Compass Ring */}
          <circle cx="0" cy="0" r="14" fill="#fdfbf7" stroke="#1c1917" strokeWidth="3" />

          {/* Deep Forest Green Explorer Disc */}
          <circle cx="0" cy="0" r="10" fill="#2d6a4f" stroke="#1c1917" strokeWidth="1.5" />

          {/* Bright White Crosshairs */}
          <line x1="-7" y1="0" x2="7" y2="0" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#ffffff" strokeWidth="1.5" />

          {/* Center Golden Pip */}
          <circle cx="0" cy="0" r="3.5" fill="#f59e0b" stroke="#1c1917" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

