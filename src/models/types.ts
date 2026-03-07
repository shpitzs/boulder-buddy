// ---- Profiles ----
export interface ClimberProfile {
  id: string;
  name: string;
  heightCm: number;
  avatarId: string;
  avatarGear: string[];
  createdAt: number;
}

// ---- Holds & Detection ----
export interface DetectedHold {
  id: string;
  x: number; // normalized 0-1 position in image
  y: number;
  size: HoldSize;
  colorName: string;
  area: number; // pixel count
  boundingBox: { x: number; y: number; w: number; h: number };
}

export type HoldSize = 'jug' | 'crimp' | 'sloper' | 'pinch' | 'volume';

export interface HsvRange {
  hMin: number;
  hMax: number;
  sMin: number;
  sMax: number;
  vMin: number;
  vMax: number;
  // For colors that wrap around (red)
  hMin2?: number;
  hMax2?: number;
}

export interface HoldBlob {
  id: number;
  pixels: number; // count
  centroidX: number;
  centroidY: number;
  boundingBox: { x: number; y: number; w: number; h: number };
  area: number;
}

// ---- Analysis ----
export interface HoldNode {
  id: string;
  x: number;
  y: number;
  size: HoldSize;
  isStart: boolean;
  isTop: boolean;
}

export interface ReachEdge {
  from: string;
  to: string;
  distance: number;
  direction: 'up' | 'lateral' | 'down';
  difficulty: number; // 1-10
}

export interface RouteGraph {
  nodes: HoldNode[];
  edges: ReachEdge[];
}

export interface BetaMove {
  stepNumber: number;
  fromHold: HoldNode | null;
  toHold: HoldNode;
  hand: 'left' | 'right' | 'either';
  instruction: string;
  funInstruction: string;
  difficulty: number;
}

export interface BetaSequence {
  moves: BetaMove[];
  totalDifficulty: number;
  estimatedMoves: number;
  suitability: 'easy' | 'medium' | 'hard' | 'too-hard';
}

export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard';

// ---- Gamification ----
export interface ProgressState {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalRoutes: number;
  totalMoves: number;
  lastClimbDate: string | null; // ISO date string
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'milestone' | 'streak' | 'difficulty' | 'fun';
  requirement: AchievementRequirement;
  unlockedAt: number | null;
  reward: { xp: number; gear?: string };
}

export interface AchievementRequirement {
  type: 'routes_completed' | 'streak_days' | 'difficulty_level' | 'total_moves' | 'first_route' | 'colors_completed';
  value: number;
}

// ---- Routes ----
export interface SavedRoute {
  id: string;
  photoUri: string;
  holds: DetectedHold[];
  beta: BetaSequence;
  targetColor: string;
  difficulty: DifficultyLevel;
  completedAt: number;
  xpEarned: number;
  profileId: string;
}

// ---- Wall Calibration ----
export interface WallCalibration {
  pixelsPerCm: number;
}

export interface ReachConfig {
  verticalPx: number;
  lateralPx: number;
}
