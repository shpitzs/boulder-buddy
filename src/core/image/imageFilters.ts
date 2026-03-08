import { WallColor } from '../../models/types';
import { rgbToHsv } from './colorConversion';

/**
 * 3x3 median filter on RGBA pixel data.
 * Smooths noise (chalk dust, JPEG artifacts, micro-shadows) while
 * preserving hold edges better than a blur.
 * ~60ms at 640x480 on modern phones.
 */
export function medianFilter3x3(
  pixels: Uint8Array,
  w: number,
  h: number
): Uint8Array {
  const out = new Uint8Array(w * h * 4);

  // Preallocate arrays for sorting (9 neighbors)
  const vals = new Uint8Array(9);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const outIdx = (y * w + x) * 4;

      // Border pixels: copy directly
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        out[outIdx] = pixels[outIdx];
        out[outIdx + 1] = pixels[outIdx + 1];
        out[outIdx + 2] = pixels[outIdx + 2];
        out[outIdx + 3] = 255;
        continue;
      }

      // For each RGB channel, collect 3x3 neighborhood and take median
      for (let c = 0; c < 3; c++) {
        let i = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            vals[i++] = pixels[((y + dy) * w + (x + dx)) * 4 + c];
          }
        }
        // Insertion sort for 9 elements (optimal for small n)
        for (let a = 1; a < 9; a++) {
          const key = vals[a];
          let b = a - 1;
          while (b >= 0 && vals[b] > key) {
            vals[b + 1] = vals[b];
            b--;
          }
          vals[b + 1] = key;
        }
        out[outIdx + c] = vals[4]; // median is index 4 of 9
      }
      out[outIdx + 3] = 255; // alpha
    }
  }

  return out;
}

/**
 * Estimate the dominant wall background color using an HSV histogram.
 * Gym walls are typically one neutral color (beige, gray, sage) that
 * occupies the majority of image pixels.
 *
 * Uses quantized HSV bins (36 hue × 10 sat × 10 val = 3600 bins).
 * Samples every 4th pixel for speed (~15ms at 640x480).
 */
export function estimateWallColor(
  pixels: Uint8Array,
  w: number,
  h: number
): WallColor {
  const H_BINS = 36;
  const S_BINS = 10;
  const V_BINS = 10;
  const histogram = new Uint32Array(H_BINS * S_BINS * V_BINS);

  const totalPixels = w * h;

  // Sample every 4th pixel for speed
  for (let i = 0; i < totalPixels; i += 4) {
    const offset = i * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];

    const [hVal, sVal, vVal] = rgbToHsv(r, g, b);

    const hBin = Math.min(Math.floor(hVal / 10), H_BINS - 1);
    const sBin = Math.min(Math.floor(sVal * S_BINS), S_BINS - 1);
    const vBin = Math.min(Math.floor(vVal * V_BINS), V_BINS - 1);

    histogram[hBin * (S_BINS * V_BINS) + sBin * V_BINS + vBin]++;
  }

  // Find peak bin
  let peakIdx = 0;
  let peakCount = 0;
  for (let i = 0; i < histogram.length; i++) {
    if (histogram[i] > peakCount) {
      peakCount = histogram[i];
      peakIdx = i;
    }
  }

  // Convert bin indices back to HSV centers
  const hBin = Math.floor(peakIdx / (S_BINS * V_BINS));
  const sBin = Math.floor((peakIdx % (S_BINS * V_BINS)) / V_BINS);
  const vBin = peakIdx % V_BINS;

  return {
    h: hBin * 10 + 5,           // center of hue bin
    s: (sBin + 0.5) / S_BINS,   // center of sat bin
    v: (vBin + 0.5) / V_BINS,   // center of val bin
  };
}
