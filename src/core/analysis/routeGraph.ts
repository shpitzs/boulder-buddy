import { DetectedHold, HoldNode, ReachConfig, ReachEdge, RouteGraph } from '../../models/types';

/**
 * Convert detected holds into graph nodes, identifying start and top holds.
 */
function holdsToNodes(holds: DetectedHold[]): HoldNode[] {
  if (holds.length === 0) return [];

  // Sort by Y to determine start/top positions
  const sorted = [...holds].sort((a, b) => a.y - b.y);
  const minY = sorted[0].y;
  const maxY = sorted[sorted.length - 1].y;
  const range = maxY - minY;

  // Bottom 20% of the route = start holds, top 20% = top holds
  const startThreshold = maxY - range * 0.2;
  const topThreshold = minY + range * 0.2;

  return holds.map((hold) => ({
    id: hold.id,
    x: hold.x,
    y: hold.y,
    size: hold.size,
    isStart: hold.y >= startThreshold,
    isTop: hold.y <= topThreshold,
  }));
}

/**
 * Calculate distance between two holds in normalized image space.
 */
function distance(a: HoldNode, b: HoldNode): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Determine edge direction based on relative positions.
 */
function getDirection(from: HoldNode, to: HoldNode): 'up' | 'lateral' | 'down' {
  const dy = from.y - to.y; // positive = moving up (lower y = higher on wall)
  const dx = Math.abs(from.x - to.x);

  if (dy > dx * 0.5) return 'up';
  if (dy < -dx * 0.5) return 'down';
  return 'lateral';
}

/**
 * Calculate edge difficulty based on distance, direction, and hold sizes.
 */
function edgeDifficulty(
  from: HoldNode,
  to: HoldNode,
  dist: number,
  reach: ReachConfig
): number {
  const maxReach = Math.max(reach.verticalPx, reach.lateralPx);
  const reachRatio = dist / maxReach; // 0-1, how much of reach is used

  let diff = reachRatio * 5; // base: 0-5 based on distance

  // Lateral moves are harder for kids
  const direction = getDirection(from, to);
  if (direction === 'lateral') diff += 1;
  if (direction === 'down') diff += 2; // downclimbing is harder

  // Small holds are harder
  const targetSizePenalty = { jug: 0, volume: 0, sloper: 1, pinch: 2, crimp: 3 };
  diff += targetSizePenalty[to.size];

  return Math.min(10, Math.max(1, Math.round(diff)));
}

/**
 * Build a route graph from detected holds and reachability config.
 */
export function buildRouteGraph(
  holds: DetectedHold[],
  reach: ReachConfig
): RouteGraph {
  const nodes = holdsToNodes(holds);
  const edges: ReachEdge[] = [];

  // For each pair of holds, check if reachable
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;

      const from = nodes[i];
      const to = nodes[j];

      // Check if within reach envelope (elliptical)
      const dx = Math.abs(from.x - to.x);
      const dy = Math.abs(from.y - to.y);

      // Elliptical reach check
      const normalized = (dx / reach.lateralPx) ** 2 + (dy / reach.verticalPx) ** 2;
      if (normalized <= 1) {
        const dist = distance(from, to);
        edges.push({
          from: from.id,
          to: to.id,
          distance: dist,
          direction: getDirection(from, to),
          difficulty: edgeDifficulty(from, to, dist, reach),
        });
      }
    }
  }

  return { nodes, edges };
}
