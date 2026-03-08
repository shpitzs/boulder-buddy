import { HsvRange, WallColor } from '../../models/types';
import { rgbToHsv } from '../image/colorConversion';
import { WALL_SAT_MARGIN } from '../../models/constants';

/**
 * Check if an HSV pixel is within the given range.
 */
function isInRange(h: number, s: number, v: number, range: HsvRange): boolean {
  const sMatch = s >= range.sMin && s <= range.sMax;
  const vMatch = v >= range.vMin && v <= range.vMax;
  if (!sMatch || !vMatch) return false;

  // Primary hue range
  if (h >= range.hMin && h <= range.hMax) return true;

  // Secondary hue range (for red which wraps around 0/360)
  if (range.hMin2 !== undefined && range.hMax2 !== undefined) {
    if (h >= range.hMin2 && h <= range.hMax2) return true;
  }

  return false;
}

/**
 * Create a binary mask from RGBA pixel data based on color range.
 * Optionally excludes pixels that match the wall background color.
 * Returns Uint8Array where 1 = matches target color, 0 = does not.
 */
export function createColorMask(
  pixels: Uint8Array,
  width: number,
  height: number,
  colorRange: HsvRange,
  wallColor?: WallColor
): Uint8Array {
  const totalPixels = width * height;
  const mask = new Uint8Array(totalPixels);
  const isSaturatedTarget = colorRange.sMin >= 0.25;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4; // RGBA
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];

    const [h, s, v] = rgbToHsv(r, g, b);

    // Standard HSV range check
    if (!isInRange(h, s, v, colorRange)) {
      mask[i] = 0;
      continue;
    }

    // Wall background exclusion
    if (wallColor) {
      // Check if pixel is too close to wall color in HSV space
      const hueDist = Math.min(
        Math.abs(h - wallColor.h),
        360 - Math.abs(h - wallColor.h)
      );
      if (
        hueDist < 15 &&
        Math.abs(s - wallColor.s) < 0.12 &&
        Math.abs(v - wallColor.v) < 0.15
      ) {
        mask[i] = 0;
        continue;
      }

      // For saturated target colors, require saturation well above wall
      if (isSaturatedTarget && s < wallColor.s + WALL_SAT_MARGIN) {
        mask[i] = 0;
        continue;
      }
    }

    mask[i] = 1;
  }

  return mask;
}

/**
 * Build an HSV range from a sampled pixel color with tolerance.
 * Tighter defaults than before; optionally raises sMin floor above
 * the wall's saturation so we don't capture wall pixels.
 */
export function buildRangeFromSample(
  r: number,
  g: number,
  b: number,
  hTolerance = 15,
  sTolerance = 0.18,
  vTolerance = 0.20,
  wallColor?: WallColor
): HsvRange {
  const [h, s, v] = rgbToHsv(r, g, b);

  const hMin = h - hTolerance;
  const hMax = h + hTolerance;

  let sMin = Math.max(0, s - sTolerance);
  const sMax = Math.min(1, s + sTolerance);

  // If wall is known and sampled color is saturated, raise sMin floor
  if (wallColor && s > 0.25) {
    sMin = Math.max(sMin, wallColor.s + 0.10);
  }

  const range: HsvRange = {
    hMin: Math.max(0, hMin),
    hMax: Math.min(360, hMax),
    sMin,
    sMax,
    vMin: Math.max(0, v - vTolerance),
    vMax: Math.min(1, v + vTolerance),
  };

  // Handle hue wrapping for colors near red (0/360)
  if (hMin < 0) {
    range.hMin = 0;
    range.hMin2 = 360 + hMin;
    range.hMax2 = 360;
  }
  if (hMax > 360) {
    range.hMax = 360;
    range.hMin2 = 0;
    range.hMax2 = hMax - 360;
  }

  return range;
}

/**
 * Morphological erosion on a binary mask.
 */
export function erode(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const result = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let allSet = true;
      for (let dy = -radius; dy <= radius && allSet; dy++) {
        for (let dx = -radius; dx <= radius && allSet; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= h || nx < 0 || nx >= w || mask[ny * w + nx] === 0) {
            allSet = false;
          }
        }
      }
      result[y * w + x] = allSet ? 1 : 0;
    }
  }
  return result;
}

/**
 * Morphological dilation on a binary mask.
 */
export function dilate(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const result = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let anySet = false;
      for (let dy = -radius; dy <= radius && !anySet; dy++) {
        for (let dx = -radius; dx <= radius && !anySet; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && mask[ny * w + nx] === 1) {
            anySet = true;
          }
        }
      }
      result[y * w + x] = anySet ? 1 : 0;
    }
  }
  return result;
}

/**
 * Morphological opening (erode then dilate) to remove small noise.
 */
export function morphologicalOpen(
  mask: Uint8Array,
  w: number,
  h: number,
  radius = 2
): Uint8Array {
  return dilate(erode(mask, w, h, radius), w, h, radius);
}
