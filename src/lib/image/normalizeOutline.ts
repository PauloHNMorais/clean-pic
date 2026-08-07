import sharp from "sharp";

const ALPHA_THRESHOLD = 128;

function getBit(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  if (x < 0 || x >= width || y < 0 || y >= height) return 0;
  return mask[y * width + x];
}

// One Zhang-Suen sub-iteration: marks boundary pixels that satisfy the
// thinning criteria (2-6 black neighbors, exactly one 0->1 transition around
// them, plus the step-specific corner conditions) and removes them all at
// once — removing them one by one instead would let earlier removals in the
// same pass affect later neighbor checks.
function subIteration(
  img: Uint8Array,
  width: number,
  height: number,
  step: 1 | 2
): boolean {
  const toRemove: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (img[idx] !== 1) continue;

      const p2 = getBit(img, width, height, x, y - 1);
      const p3 = getBit(img, width, height, x + 1, y - 1);
      const p4 = getBit(img, width, height, x + 1, y);
      const p5 = getBit(img, width, height, x + 1, y + 1);
      const p6 = getBit(img, width, height, x, y + 1);
      const p7 = getBit(img, width, height, x - 1, y + 1);
      const p8 = getBit(img, width, height, x - 1, y);
      const p9 = getBit(img, width, height, x - 1, y - 1);
      const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9];

      const blackNeighbors = neighbors.reduce((sum, n) => sum + n, 0);
      if (blackNeighbors < 2 || blackNeighbors > 6) continue;

      let transitions = 0;
      for (let i = 0; i < neighbors.length; i++) {
        const current = neighbors[i];
        const next = neighbors[(i + 1) % neighbors.length];
        if (current === 0 && next === 1) transitions++;
      }
      if (transitions !== 1) continue;

      if (step === 1) {
        if (p2 * p4 * p6 !== 0) continue;
        if (p4 * p6 * p8 !== 0) continue;
      } else {
        if (p2 * p4 * p8 !== 0) continue;
        if (p2 * p6 * p8 !== 0) continue;
      }

      toRemove.push(idx);
    }
  }

  for (const idx of toRemove) img[idx] = 0;
  return toRemove.length > 0;
}

// Zhang-Suen thinning: erodes a filled blob down to its medial axis (a
// 1px-wide skeleton), regardless of how thick the original blob was. That
// width-independence is exactly what lets us redraw every shape at a single,
// consistent stroke width afterwards.
function thin(mask: Uint8Array, width: number, height: number): Uint8Array {
  const img = Uint8Array.from(mask);
  let changed = true;
  while (changed) {
    const removedFirstPass = subIteration(img, width, height, 1);
    const removedSecondPass = subIteration(img, width, height, 2);
    changed = removedFirstPass || removedSecondPass;
  }
  return img;
}

// Redraws the skeleton as a constant-width stroke by stamping a filled disk
// of the target radius at every skeleton pixel.
function dilate(
  skeleton: Uint8Array,
  width: number,
  height: number,
  strokeWidth: number
): Uint8Array {
  const radius = strokeWidth / 2;
  const radiusSquared = radius * radius;
  const reach = Math.ceil(radius);
  const output = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (skeleton[y * width + x] !== 1) continue;

      const minY = Math.max(0, y - reach);
      const maxY = Math.min(height - 1, y + reach);
      const minX = Math.max(0, x - reach);
      const maxX = Math.min(width - 1, x + reach);

      for (let dy = minY; dy <= maxY; dy++) {
        for (let dx = minX; dx <= maxX; dx++) {
          const distanceSquared = (dx - x) ** 2 + (dy - y) ** 2;
          if (distanceSquared <= radiusSquared) {
            output[dy * width + dx] = 1;
          }
        }
      }
    }
  }

  return output;
}

// Redraws the subject's outline at a constant stroke width: thins the alpha
// mask to its medial axis, then re-strokes that axis at `strokeWidth` px.
// Scoped like SVG conversion (see svg.ts) to single-color icons on a
// transparent background — closed/filled shapes have no meaningful "outline"
// under this model and will just shrink to their own medial axis.
export async function normalizeOutline(
  input: Buffer,
  strokeWidth: number
): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const mask = new Uint8Array(width * height);
  let fillColor: { r: number; g: number; b: number } | null = null;

  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    const alpha = data[offset + 3];
    if (alpha >= ALPHA_THRESHOLD) {
      mask[i] = 1;
      if (fillColor === null) {
        fillColor = {
          r: data[offset],
          g: data[offset + 1],
          b: data[offset + 2],
        };
      }
    }
  }

  if (fillColor === null) {
    // Nothing opaque to trace — same no-op philosophy as trim on a fully
    // transparent image, rather than treating it as an error.
    return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  }

  const skeleton = thin(mask, width, height);
  const stroked = dilate(skeleton, width, height, strokeWidth);

  const output = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    if (stroked[i] === 1) {
      output[offset] = fillColor.r;
      output[offset + 1] = fillColor.g;
      output[offset + 2] = fillColor.b;
      output[offset + 3] = 255;
    }
  }

  return sharp(output, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
