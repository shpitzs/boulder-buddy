import { HoldBlob, HoldSize, ShapeMetrics } from '../../models/types';

/**
 * Classify a detected hold blob into a hold type using shape metrics.
 *
 * When shape metrics are available (computed from the binary mask), uses a
 * decision tree based on camera-distance-independent ratios: circularity,
 * solidity, eccentricity, and fillRatio.
 *
 * Falls back to area + aspect ratio when metrics are unavailable.
 */
export function classifyHold(blob: HoldBlob): HoldSize {
  if (blob.shape) {
    return classifyByShape(blob, blob.shape);
  }
  return classifyByAreaOnly(blob);
}

/**
 * Shape-aware decision tree.
 *
 * Key intuitions:
 *  - Volume: huge, irregular (low circularity, low fillRatio)
 *  - Jug:    solid, round-ish, medium-large (high solidity + circularity)
 *  - Crimp:  small, elongated, solid (low eccentricity, small area)
 *  - Pinch:  elongated at any size (low eccentricity, larger than crimp)
 *  - Sloper: round, smooth dome — moderate solidity (convex hull > area)
 */
function classifyByShape(blob: HoldBlob, m: ShapeMetrics): HoldSize {
  const { area } = blob;
  const { circularity, solidity, eccentricity, fillRatio } = m;

  // 1. Volume — very large and irregular
  if (area > 3000 && fillRatio < 0.55 && circularity < 0.4) {
    return 'volume';
  }

  // 2. Jug — solid, circular, not too elongated, decent size
  if (solidity > 0.85 && circularity > 0.5 && eccentricity > 0.5 && area > 500) {
    return 'jug';
  }

  // 3. Crimp — small, elongated, solid
  if (eccentricity < 0.4 && solidity > 0.75 && area < 1200) {
    return 'crimp';
  }

  // 4. Pinch — elongated at larger sizes
  if (eccentricity < 0.35 && solidity > 0.6 && area >= 500) {
    return 'pinch';
  }

  // 5. Sloper — round, moderate solidity (dome shape)
  if (circularity > 0.45 && solidity > 0.5 && solidity < 0.85 && eccentricity > 0.5) {
    return 'sloper';
  }

  // Fallback chain for edge cases
  if (area > 3000) return 'volume';
  if (area < 400) return 'crimp';
  if (eccentricity < 0.4) return 'pinch';
  if (solidity > 0.85) return 'jug';
  return 'sloper';
}

/**
 * Legacy area-only classifier (fallback when shape metrics unavailable).
 */
function classifyByAreaOnly(blob: HoldBlob): HoldSize {
  const aspectRatio = blob.boundingBox.w / Math.max(blob.boundingBox.h, 1);

  if (blob.area > 5000) return 'volume';
  if (blob.area > 2000 && aspectRatio > 1.3) return 'jug';
  if (blob.area < 400) return 'crimp';
  if (aspectRatio > 2.0 || aspectRatio < 0.5) return 'pinch';
  return 'sloper';
}

/**
 * Get a kid-friendly name for the hold type.
 */
export function holdSizeLabel(size: HoldSize): string {
  switch (size) {
    case 'jug': return 'Big hold';
    case 'crimp': return 'Tiny hold';
    case 'sloper': return 'Round hold';
    case 'pinch': return 'Narrow hold';
    case 'volume': return 'Huge hold';
  }
}
