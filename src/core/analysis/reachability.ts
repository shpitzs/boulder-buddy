import { ClimberProfile, ReachConfig, DifficultyLevel } from '../../models/types';
import { DIFFICULTY_REACH_FACTOR } from '../../models/constants';

/**
 * Estimate arm span from height.
 * For kids, arm span ~= height. For adults, ~= height * 1.03.
 */
function estimateArmSpan(heightCm: number): number {
  if (heightCm < 150) return heightCm; // kid proportions
  return heightCm * 1.03;
}

/**
 * Calculate max reach in normalized image coordinates.
 *
 * We use a rough heuristic: at 640x480 resolution showing a typical
 * ~4m tall bouldering wall, 1 pixel ≈ 0.8cm. This gives us
 * pixelsPerCm ≈ 1.25 at processing resolution.
 *
 * In normalized coords (0-1), we divide by image dimensions.
 */
export function calculateReach(
  profile: ClimberProfile,
  difficulty: DifficultyLevel,
  imageWidth = 640,
  imageHeight = 480
): ReachConfig {
  const armSpan = estimateArmSpan(profile.heightCm);
  const factor = DIFFICULTY_REACH_FACTOR[difficulty];

  // Approximate wall mapping:
  // A 4m wall captured in 480px height → ~0.83cm/px
  // We use normalized coords, so convert to fraction of image
  const pixelsPerCm = imageHeight / 400; // ~400cm wall height
  const verticalReachCm = (profile.heightCm * 0.7 + armSpan * 0.5) * factor;
  const lateralReachCm = armSpan * 0.65 * factor;

  return {
    verticalPx: (verticalReachCm * pixelsPerCm) / imageHeight, // normalized
    lateralPx: (lateralReachCm * pixelsPerCm) / imageWidth,    // normalized
  };
}
