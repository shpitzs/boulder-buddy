import { HoldBlob } from '../../models/types';
import { MIN_HOLD_AREA, MAX_HOLD_AREA } from '../../models/constants';

export interface ClusterResult {
  blobs: HoldBlob[];
  labelMap: Uint16Array; // pixel → blobLabel (id+1), 0 = background
}

/**
 * Find connected components in a binary mask using BFS flood-fill.
 * Returns HoldBlob objects + a label map for per-blob shape analysis.
 *
 * The label map tags each pixel with its blob's label (id + 1).
 * Background pixels remain 0. Supports up to 65534 blobs.
 */
export function findConnectedComponents(
  mask: Uint8Array,
  w: number,
  h: number,
  minArea = MIN_HOLD_AREA,
  maxArea = MAX_HOLD_AREA
): ClusterResult {
  const visited = new Uint8Array(w * h);
  const labelMap = new Uint16Array(w * h); // 0 = background
  const blobs: HoldBlob[] = [];
  let blobId = 0;

  const queue: number[] = [];

  // Temporary storage for pixels of current component
  // (needed to write final labels only for accepted blobs)
  const componentPixels: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] === 0 || visited[idx] === 1) continue;

      // BFS flood fill
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      let minX = x, maxX = x, minY = y, maxY = y;

      queue.length = 0;
      componentPixels.length = 0;
      queue.push(idx);
      visited[idx] = 1;

      while (queue.length > 0) {
        const ci = queue.pop()!;
        const cy = Math.floor(ci / w);
        const cx = ci % w;

        componentPixels.push(ci);
        sumX += cx;
        sumY += cy;
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // Check 4-connected neighbors
        const neighbors = [
          cy > 0 ? (cy - 1) * w + cx : -1,
          cy < h - 1 ? (cy + 1) * w + cx : -1,
          cx > 0 ? cy * w + (cx - 1) : -1,
          cx < w - 1 ? cy * w + (cx + 1) : -1,
        ];

        for (const ni of neighbors) {
          if (ni >= 0 && mask[ni] === 1 && visited[ni] === 0) {
            visited[ni] = 1;
            queue.push(ni);
          }
        }
      }

      // Filter by area — only label accepted blobs
      if (count >= minArea && count <= maxArea) {
        const label = blobId + 1; // label 0 = background
        for (const pi of componentPixels) {
          labelMap[pi] = label;
        }

        blobs.push({
          id: blobId++,
          pixels: count,
          centroidX: sumX / count,
          centroidY: sumY / count,
          boundingBox: {
            x: minX,
            y: minY,
            w: maxX - minX + 1,
            h: maxY - minY + 1,
          },
          area: count,
        });
      }
    }
  }

  return { blobs, labelMap };
}
