import { DetectedHold, HsvRange, WallColor } from '../../models/types';
import { PROCESSING_WIDTH, PROCESSING_HEIGHT, ERODE_RADIUS, DILATE_RADIUS, SAMPLE_RADIUS } from '../../models/constants';
import { createColorMask, erode, dilate } from './colorDetection';
import { findConnectedComponents } from './holdClustering';
import { classifyHold } from './holdClassification';
import { medianFilter3x3, estimateWallColor } from '../image/imageFilters';

export interface DetectionResult {
  holds: DetectedHold[];
  processingTimeMs: number;
  imageWidth: number;
  imageHeight: number;
}

/**
 * Run the full hold detection pipeline on raw RGBA pixel data.
 *
 * Improved pipeline:
 * 1. Median filter (smooth noise/chalk/shadows)
 * 2. Estimate wall color (or use provided)
 * 3. Wall-gated color mask
 * 4. Asymmetric morphological opening (small erode, larger dilate)
 * 5. Connected component clustering
 *
 * @param pixels - RGBA Uint8Array from Skia readPixels()
 * @param width - image width in pixels
 * @param height - image height in pixels
 * @param colorRange - target HSV color range to detect
 * @param colorName - name of the target color (for labeling)
 * @param wallColor - optional pre-computed wall color (avoids re-estimating)
 */
export function detectHolds(
  pixels: Uint8Array,
  width: number,
  height: number,
  colorRange: HsvRange,
  colorName: string,
  wallColor?: WallColor
): DetectionResult {
  const startTime = performance.now();

  // Step 0: Pre-filter with 3x3 median to smooth noise/chalk/shadows
  const filtered = medianFilter3x3(pixels, width, height);

  // Step 0.5: Estimate wall color if not provided
  const wall = wallColor ?? estimateWallColor(filtered, width, height);

  // Step 1: Create binary mask with wall background gating
  const rawMask = createColorMask(filtered, width, height, colorRange, wall);

  // Step 2: Asymmetric morphological opening
  // Small erosion (r=1) preserves small holds; larger dilation (r=2) reconnects fragments
  const eroded = erode(rawMask, width, height, ERODE_RADIUS);
  const cleanMask = dilate(eroded, width, height, DILATE_RADIUS);

  // Step 3: Find connected components (hold blobs)
  const blobs = findConnectedComponents(cleanMask, width, height);

  // Step 4: Convert blobs to DetectedHold objects with normalized coordinates
  const holds: DetectedHold[] = blobs.map((blob, idx) => ({
    id: `hold_${idx}`,
    x: blob.centroidX / width,   // normalize to 0-1
    y: blob.centroidY / height,  // normalize to 0-1
    size: classifyHold(blob),
    colorName,
    area: blob.area,
    boundingBox: {
      x: blob.boundingBox.x / width,
      y: blob.boundingBox.y / height,
      w: blob.boundingBox.w / width,
      h: blob.boundingBox.h / height,
    },
  }));

  // Sort by Y position (top to bottom in image = top of wall first)
  holds.sort((a, b) => a.y - b.y);

  const processingTimeMs = performance.now() - startTime;

  return {
    holds,
    processingTimeMs,
    imageWidth: width,
    imageHeight: height,
  };
}

/**
 * Sample color from pixel data at a given normalized position.
 * Uses MEDIAN (not mean) over a 25x25 area — robust to edge-of-hold
 * taps where hold and wall pixels are mixed.
 */
export function sampleColorAt(
  pixels: Uint8Array,
  width: number,
  height: number,
  normX: number,
  normY: number,
  sampleRadius = SAMPLE_RADIUS
): { r: number; g: number; b: number } {
  const cx = Math.round(normX * width);
  const cy = Math.round(normY * height);

  const rVals: number[] = [];
  const gVals: number[] = [];
  const bVals: number[] = [];

  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const offset = (py * width + px) * 4;
        rVals.push(pixels[offset]);
        gVals.push(pixels[offset + 1]);
        bVals.push(pixels[offset + 2]);
      }
    }
  }

  // Sort and take median — robust to bimodal hold+wall distributions
  rVals.sort((a, b) => a - b);
  gVals.sort((a, b) => a - b);
  bVals.sort((a, b) => a - b);

  const mid = Math.floor(rVals.length / 2);
  return {
    r: rVals[mid],
    g: gVals[mid],
    b: bVals[mid],
  };
}

/**
 * Estimate wall color from raw pixels. Convenience wrapper
 * that applies median filter then runs histogram estimation.
 * Call once on image load, reuse across multiple detections.
 */
export function estimateWall(
  pixels: Uint8Array,
  width: number,
  height: number
): WallColor {
  const filtered = medianFilter3x3(pixels, width, height);
  return estimateWallColor(filtered, width, height);
}
