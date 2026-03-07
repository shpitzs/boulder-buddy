import { DetectedHold, HsvRange } from '../../models/types';
import { PROCESSING_WIDTH, PROCESSING_HEIGHT, MORPHOLOGICAL_RADIUS } from '../../models/constants';
import { createColorMask, morphologicalOpen } from './colorDetection';
import { findConnectedComponents } from './holdClustering';
import { classifyHold } from './holdClassification';

export interface DetectionResult {
  holds: DetectedHold[];
  processingTimeMs: number;
  imageWidth: number;
  imageHeight: number;
}

/**
 * Run the full hold detection pipeline on raw RGBA pixel data.
 *
 * @param pixels - RGBA Uint8Array from Skia readPixels()
 * @param width - image width in pixels
 * @param height - image height in pixels
 * @param colorRange - target HSV color range to detect
 * @param colorName - name of the target color (for labeling)
 */
export function detectHolds(
  pixels: Uint8Array,
  width: number,
  height: number,
  colorRange: HsvRange,
  colorName: string
): DetectionResult {
  const startTime = performance.now();

  // Step 1: Create binary mask from color filtering
  const rawMask = createColorMask(pixels, width, height, colorRange);

  // Step 2: Morphological opening to remove noise
  const cleanMask = morphologicalOpen(rawMask, width, height, MORPHOLOGICAL_RADIUS);

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
 * Samples a 10x10 area and returns the average RGB.
 */
export function sampleColorAt(
  pixels: Uint8Array,
  width: number,
  height: number,
  normX: number,
  normY: number,
  sampleRadius = 5
): { r: number; g: number; b: number } {
  const cx = Math.round(normX * width);
  const cy = Math.round(normY * height);

  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const offset = (py * width + px) * 4;
        totalR += pixels[offset];
        totalG += pixels[offset + 1];
        totalB += pixels[offset + 2];
        count++;
      }
    }
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}
