import { HoldBlob, HoldSize } from '../../models/types';

/**
 * Classify a detected hold blob into a hold type based on size and shape.
 */
export function classifyHold(blob: HoldBlob): HoldSize {
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
