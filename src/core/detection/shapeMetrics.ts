import { HoldBlob, ShapeMetrics } from '../../models/types';

interface Point {
  x: number;
  y: number;
}

/**
 * Extract boundary pixels of a blob from the label map.
 * A boundary pixel is one whose 4-connected neighbor includes a pixel
 * that does NOT belong to the same blob.
 *
 * Scoped to the blob's bounding box for efficiency.
 */
function extractBoundary(
  labelMap: Uint16Array,
  blobLabel: number,
  bbox: { x: number; y: number; w: number; h: number },
  imgW: number,
  imgH: number
): { count: number; points: Point[] } {
  const points: Point[] = [];

  const x0 = bbox.x;
  const y0 = bbox.y;
  const x1 = bbox.x + bbox.w; // exclusive
  const y1 = bbox.y + bbox.h; // exclusive

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * imgW + x;
      if (labelMap[idx] !== blobLabel) continue;

      // Check 4-connected neighbors — is any neighbor NOT this blob?
      const isBoundary =
        x === 0 || labelMap[idx - 1] !== blobLabel ||
        x === imgW - 1 || labelMap[idx + 1] !== blobLabel ||
        y === 0 || labelMap[(y - 1) * imgW + x] !== blobLabel ||
        y === imgH - 1 || labelMap[(y + 1) * imgW + x] !== blobLabel;

      if (isBoundary) {
        points.push({ x, y });
      }
    }
  }

  return { count: points.length, points };
}

/**
 * Compute the area of the convex hull of a set of 2D points
 * using Andrew's monotone chain algorithm + shoelace formula.
 *
 * O(n log n) where n = number of points. Typically n < 500 for holds.
 */
function convexHullArea(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;

  // Sort by x, then by y
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);

  // Cross product of vectors OA and OB where O is origin
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  // Build lower hull
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  const hull = lower.concat(upper);
  if (hull.length < 3) return 0;

  // Shoelace formula for polygon area
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    area += hull[i].x * hull[j].y;
    area -= hull[j].x * hull[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * Compute shape metrics for a single blob using the label map.
 *
 * Metrics are dimensionless ratios (0-1), so they are independent
 * of camera distance / image resolution.
 *
 * ~0.5-1ms per blob at typical blob sizes (100-5000 pixels).
 */
export function computeShapeMetrics(
  labelMap: Uint16Array,
  blob: HoldBlob,
  imgW: number,
  imgH: number
): ShapeMetrics {
  const blobLabel = blob.id + 1; // label map uses id+1 (0 = background)
  const bbox = blob.boundingBox;
  const area = blob.area;

  // Eccentricity and fillRatio are cheap — compute from existing data
  const bboxW = Math.max(bbox.w, 1);
  const bboxH = Math.max(bbox.h, 1);
  const eccentricity = Math.min(bboxW, bboxH) / Math.max(bboxW, bboxH);
  const fillRatio = area / (bboxW * bboxH);

  // Extract boundary pixels
  const boundary = extractBoundary(labelMap, blobLabel, bbox, imgW, imgH);
  const perimeter = boundary.count;

  // Guard: degenerate blobs
  if (perimeter < 3) {
    return { perimeter, circularity: 1, solidity: 1, eccentricity, fillRatio };
  }

  // Circularity: 4π·area / perimeter² (1 = perfect circle)
  const circularity = Math.min(1, (4 * Math.PI * area) / (perimeter * perimeter));

  // Solidity: area / convex hull area (1 = fully convex)
  const hullArea = convexHullArea(boundary.points);
  const solidity = hullArea > 0 ? Math.min(1, area / hullArea) : 1;

  return { perimeter, circularity, solidity, eccentricity, fillRatio };
}
