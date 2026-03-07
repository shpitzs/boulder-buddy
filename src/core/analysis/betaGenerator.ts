import {
  BetaMove,
  BetaSequence,
  ClimberProfile,
  DetectedHold,
  DifficultyLevel,
  HoldNode,
  RouteGraph,
} from '../../models/types';
import { calculateReach } from './reachability';
import { buildRouteGraph } from './routeGraph';
import { holdSizeLabel } from '../detection/holdClassification';

/**
 * A* path finding from start holds to top holds.
 * Returns the sequence of hold IDs in order.
 */
function findPath(graph: RouteGraph): string[] | null {
  const startNodes = graph.nodes.filter((n) => n.isStart);
  const topNodes = new Set(graph.nodes.filter((n) => n.isTop).map((n) => n.id));

  if (startNodes.length === 0 || topNodes.size === 0) return null;

  // Build adjacency list
  const adj = new Map<string, Array<{ to: string; cost: number }>>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    // Prefer upward movement
    let cost = edge.difficulty;
    if (edge.direction === 'down') cost += 5;
    if (edge.direction === 'lateral') cost += 1;
    adj.get(edge.from)!.push({ to: edge.to, cost });
  }

  // Node lookup
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // Heuristic: distance to nearest top hold (in Y)
  const minTopY = Math.min(...graph.nodes.filter((n) => n.isTop).map((n) => n.y));
  const heuristic = (id: string) => {
    const node = nodeMap.get(id)!;
    return (node.y - minTopY) * 10; // scaled
  };

  // Try from each start node, return best path
  let bestPath: string[] | null = null;
  let bestCost = Infinity;

  for (const start of startNodes) {
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, string>();
    const open = new Set<string>();

    gScore.set(start.id, 0);
    fScore.set(start.id, heuristic(start.id));
    open.add(start.id);

    while (open.size > 0) {
      // Find node with lowest fScore in open set
      let current = '';
      let minF = Infinity;
      for (const id of open) {
        const f = fScore.get(id) ?? Infinity;
        if (f < minF) {
          minF = f;
          current = id;
        }
      }

      if (topNodes.has(current)) {
        // Reconstruct path
        const path = [current];
        let node = current;
        while (cameFrom.has(node)) {
          node = cameFrom.get(node)!;
          path.unshift(node);
        }

        const totalCost = gScore.get(current) ?? Infinity;
        if (totalCost < bestCost) {
          bestCost = totalCost;
          bestPath = path;
        }
        break;
      }

      open.delete(current);

      for (const neighbor of adj.get(current) ?? []) {
        const tentativeG = (gScore.get(current) ?? Infinity) + neighbor.cost;
        if (tentativeG < (gScore.get(neighbor.to) ?? Infinity)) {
          cameFrom.set(neighbor.to, current);
          gScore.set(neighbor.to, tentativeG);
          fScore.set(neighbor.to, tentativeG + heuristic(neighbor.to));
          open.add(neighbor.to);
        }
      }
    }
  }

  return bestPath;
}

/**
 * Determine which hand to use based on position.
 */
function suggestHand(
  from: HoldNode | null,
  to: HoldNode,
  stepNumber: number
): 'left' | 'right' | 'either' {
  if (!from) return 'either'; // first move

  // If the hold is clearly to the left or right, suggest that hand
  const dx = to.x - from.x;
  if (dx < -0.05) return 'left';
  if (dx > 0.05) return 'right';

  // Alternate hands
  return stepNumber % 2 === 0 ? 'right' : 'left';
}

/**
 * Generate a kid-friendly instruction for a move.
 */
function generateInstructions(
  from: HoldNode | null,
  to: HoldNode,
  hand: 'left' | 'right' | 'either'
): { instruction: string; funInstruction: string } {
  const holdLabel = holdSizeLabel(to.size);
  const handStr = hand === 'either' ? 'either hand' : `your ${hand} hand`;
  const direction = !from
    ? 'Start on'
    : to.y < from.y
    ? 'Reach up to'
    : Math.abs(to.x - from.x) > 0.1
    ? 'Move sideways to'
    : 'Move to';

  const instruction = `${direction} the ${holdLabel.toLowerCase()} with ${handStr}`;

  // Fun versions for kids
  const funPhrases = {
    jug: ['Grab the big chunky rock!', 'Hug that big hold tight!', 'Easy grab - it\'s a big one!'],
    crimp: ['Tiny hold alert! Use your fingertips!', 'Spider fingers on the small hold!', 'Pinch it like a cookie crumb!'],
    sloper: ['Squishy hand on the round one!', 'Use your whole hand like a suction cup!', 'Gecko grip time!'],
    pinch: ['Squeeze it like a sandwich!', 'Pinch it like a crab! 🦀', 'Grab it tight with your thumb!'],
    volume: ['The giant rock! Stand on it!', 'That\'s a huge one - use your whole body!', 'Mountain time! Climb the big one!'],
  };

  const phrases = funPhrases[to.size];
  const funInstruction = phrases[Math.floor(Math.random() * phrases.length)];

  return { instruction, funInstruction };
}

/**
 * Rate overall route suitability based on move difficulties.
 */
function rateSuitability(moves: BetaMove[]): 'easy' | 'medium' | 'hard' | 'too-hard' {
  if (moves.length === 0) return 'easy';
  const avgDiff = moves.reduce((sum, m) => sum + m.difficulty, 0) / moves.length;
  if (avgDiff <= 3) return 'easy';
  if (avgDiff <= 5) return 'medium';
  if (avgDiff <= 7) return 'hard';
  return 'too-hard';
}

/**
 * Generate beta (climbing sequence) from detected holds.
 */
export function generateBeta(
  holds: DetectedHold[],
  profile: ClimberProfile,
  difficulty: DifficultyLevel
): BetaSequence {
  const reach = calculateReach(profile, difficulty);
  const graph = buildRouteGraph(holds, reach);
  const path = findPath(graph);

  if (!path || path.length === 0) {
    return {
      moves: [],
      totalDifficulty: 0,
      estimatedMoves: 0,
      suitability: 'too-hard',
    };
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(
    graph.edges.map((e) => [`${e.from}->${e.to}`, e])
  );

  const moves: BetaMove[] = [];

  for (let i = 0; i < path.length; i++) {
    const fromNode = i > 0 ? nodeMap.get(path[i - 1])! : null;
    const toNode = nodeMap.get(path[i])!;
    const hand = suggestHand(fromNode, toNode, i);
    const { instruction, funInstruction } = generateInstructions(fromNode, toNode, hand);

    const edgeKey = fromNode ? `${fromNode.id}->${toNode.id}` : null;
    const edge = edgeKey ? edgeMap.get(edgeKey) : null;

    moves.push({
      stepNumber: i + 1,
      fromHold: fromNode,
      toHold: toNode,
      hand,
      instruction,
      funInstruction,
      difficulty: edge?.difficulty ?? 1,
    });
  }

  const totalDifficulty = moves.reduce((sum, m) => sum + m.difficulty, 0);

  return {
    moves,
    totalDifficulty,
    estimatedMoves: moves.length,
    suitability: rateSuitability(moves),
  };
}
