import { Achievement, DifficultyLevel, HsvRange } from './types';

// ---- Color Presets for common gym hold colors ----
// Tuned for indoor gym conditions: tighter S/V ranges to separate holds from walls
export const COLOR_PRESETS: Record<string, HsvRange> = {
  red:    { hMin: 0,   hMax: 12,  sMin: 0.45, sMax: 1.0, vMin: 0.30, vMax: 1.0, hMin2: 345, hMax2: 360 },
  orange: { hMin: 12,  hMax: 30,  sMin: 0.55, sMax: 1.0, vMin: 0.45, vMax: 1.0 },
  yellow: { hMin: 28,  hMax: 50,  sMin: 0.50, sMax: 1.0, vMin: 0.55, vMax: 1.0 },
  green:  { hMin: 70,  hMax: 155, sMin: 0.35, sMax: 1.0, vMin: 0.25, vMax: 1.0 },
  blue:   { hMin: 195, hMax: 250, sMin: 0.40, sMax: 1.0, vMin: 0.25, vMax: 1.0 },
  purple: { hMin: 265, hMax: 310, sMin: 0.30, sMax: 1.0, vMin: 0.20, vMax: 1.0 },
  pink:   { hMin: 310, hMax: 345, sMin: 0.30, sMax: 1.0, vMin: 0.40, vMax: 1.0 },
  white:  { hMin: 0,   hMax: 360, sMin: 0.0,  sMax: 0.12, vMin: 0.75, vMax: 1.0 },
  black:  { hMin: 0,   hMax: 360, sMin: 0.0,  sMax: 0.25, vMin: 0.0,  vMax: 0.15 },
};

// Display colors for UI swatches
export const COLOR_DISPLAY: Record<string, string> = {
  red: '#E53935',
  orange: '#FB8C00',
  yellow: '#FDD835',
  green: '#43A047',
  blue: '#1E88E5',
  purple: '#8E24AA',
  pink: '#D81B60',
  white: '#F5F5F5',
  black: '#212121',
};

// ---- XP System ----
export const XP_PER_ROUTE: Record<DifficultyLevel, number> = {
  beginner: 50,
  easy: 100,
  medium: 200,
  hard: 400,
};

export const XP_BONUS_FIRST_ROUTE = 200;

export const xpStreakBonus = (days: number) => Math.min(days * 25, 250);

export const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000,
];

export const LEVEL_NAMES = [
  'Gecko',        // 0
  'Spider',       // 1
  'Monkey',       // 2
  'Mountain Goat',// 3
  'Eagle',        // 4
  'Snow Leopard', // 5
  'Dragon',       // 6
  'Phoenix',      // 7
  'Thunderbird',  // 8
  'Titan',        // 9
  'Legend',        // 10
  'Champion',     // 11
];

export const LEVEL_EMOJIS = [
  '🦎', '🕷️', '🐒', '🐐', '🦅', '🐆', '🐉', '🦅', '⚡', '💪', '🌟', '🏆',
];

// ---- Achievements ----
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Complete your first route!',
    icon: '👣',
    category: 'milestone',
    requirement: { type: 'first_route', value: 1 },
    unlockedAt: null,
    reward: { xp: 200 },
  },
  {
    id: 'color_hunter',
    title: 'Color Hunter',
    description: 'Complete routes of 3 different colors',
    icon: '🌈',
    category: 'fun',
    requirement: { type: 'colors_completed', value: 3 },
    unlockedAt: null,
    reward: { xp: 150 },
  },
  {
    id: 'streak_star',
    title: 'Streak Star',
    description: 'Climb 3 days in a row!',
    icon: '⭐',
    category: 'streak',
    requirement: { type: 'streak_days', value: 3 },
    unlockedAt: null,
    reward: { xp: 100, gear: 'star_helmet' },
  },
  {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Climb 7 days in a row!',
    icon: '🛡️',
    category: 'streak',
    requirement: { type: 'streak_days', value: 7 },
    unlockedAt: null,
    reward: { xp: 300, gear: 'warrior_cape' },
  },
  {
    id: 'ten_timer',
    title: 'Ten-Timer',
    description: 'Complete 10 routes',
    icon: '🏅',
    category: 'milestone',
    requirement: { type: 'routes_completed', value: 10 },
    unlockedAt: null,
    reward: { xp: 250 },
  },
  {
    id: 'easy_peasy',
    title: 'Easy Peasy',
    description: 'Complete 5 beginner routes',
    icon: '🟢',
    category: 'difficulty',
    requirement: { type: 'routes_completed', value: 5 },
    unlockedAt: null,
    reward: { xp: 100 },
  },
  {
    id: 'getting_tough',
    title: 'Getting Tough',
    description: 'Complete a medium route',
    icon: '🟠',
    category: 'difficulty',
    requirement: { type: 'difficulty_level', value: 2 },
    unlockedAt: null,
    reward: { xp: 200, gear: 'orange_shoes' },
  },
  {
    id: 'rock_star',
    title: 'Rock Star',
    description: 'Complete a hard route',
    icon: '🎸',
    category: 'difficulty',
    requirement: { type: 'difficulty_level', value: 3 },
    unlockedAt: null,
    reward: { xp: 400, gear: 'rock_guitar' },
  },
  {
    id: 'height_master',
    title: 'Height Master',
    description: 'Complete 25 routes',
    icon: '🏔️',
    category: 'milestone',
    requirement: { type: 'routes_completed', value: 25 },
    unlockedAt: null,
    reward: { xp: 500, gear: 'gold_helmet' },
  },
  {
    id: 'move_maker',
    title: 'Move Maker',
    description: 'Make 100 total moves',
    icon: '🤸',
    category: 'milestone',
    requirement: { type: 'total_moves', value: 100 },
    unlockedAt: null,
    reward: { xp: 200, gear: 'magic_chalk' },
  },
];

// ---- Difficulty reach multipliers ----
export const DIFFICULTY_REACH_FACTOR: Record<DifficultyLevel, number> = {
  beginner: 0.6,
  easy: 0.75,
  medium: 0.9,
  hard: 1.0,
};

// ---- Encouraging messages ----
export const ENCOURAGEMENTS = [
  "You're climbing like a pro! 🧗",
  "Wow, amazing moves! 💪",
  "Your hands are like sticky gecko feet! 🦎",
  "You just crushed it! High five! ✋",
  "Spider-climber, spider-climber! 🕷️",
  "Look at you go! Unstoppable! 🚀",
  "That wall doesn't stand a chance! 🏆",
  "Keep reaching for the top! ⬆️",
  "You're getting stronger every climb! 💫",
  "Wow, a natural born climber! 🌟",
];

export const getRandomEncouragement = () =>
  ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

// ---- Image Processing ----
export const PROCESSING_WIDTH = 640;
export const PROCESSING_HEIGHT = 480;
export const MIN_HOLD_AREA = 100; // minimum blob pixels at 640x480 (filters bolt holes)
export const MAX_HOLD_AREA = 15000;
export const MORPHOLOGICAL_RADIUS = 2; // kept for backward compat
export const ERODE_RADIUS = 1;         // smaller erosion preserves small holds
export const DILATE_RADIUS = 2;        // larger dilation reconnects fragments
export const WALL_SAT_MARGIN = 0.15;   // min saturation above wall for chromatic holds
export const SAMPLE_RADIUS = 12;       // tap-to-sample pixel radius
