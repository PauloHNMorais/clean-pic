import sharp from "sharp";

// SVG has no fixed pixel size — rendering it "as-is" would use whatever
// width/viewBox the document declares, which for a typical 24x24 icon means
// a tiny, blocky raster, and for a maliciously huge declared viewBox means
// an unbounded one (a decompression-bomb-style DoS). Rasterizing at a
// density solved for a fixed target dimension sidesteps both: output size
// is always ~TARGET_MAX_DIMENSION regardless of what the document claims.
const TARGET_MAX_DIMENSION = 1024;

// The density (DPI) at which 1 SVG user-unit renders as 1 output pixel —
// empirically 72 for sharp/libvips' SVG loader (verified against actual
// output dimensions, not assumed). Used as the baseline to solve for
// whatever density hits TARGET_MAX_DIMENSION.
const SVG_BASE_DENSITY = 72;

// Untrusted XML is its own attack surface (XXE via external entities,
// SSRF via remote references, script execution via <script>/event handlers
// once rendered outside an <img> sandbox). Rather than relying solely on
// libvips' SVG parser to be safe, strip/reject the known-dangerous
// constructs before it ever sees the document.
const DOCTYPE_OR_ENTITY = /<!(?:DOCTYPE|ENTITY)[\s\S]*?>/i;
const SCRIPT_TAG = /<script[^>]*>[\s\S]*?<\/script\s*>|<script\b[^>]*\/>/gi;
const FOREIGN_OBJECT_TAG = /<foreignObject[^>]*>[\s\S]*?<\/foreignObject\s*>/gi;
const EVENT_HANDLER_ATTR = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi;
const XML_STYLESHEET_PI = /<\?xml-stylesheet[\s\S]*?\?>/gi;
// Matches href/xlink:href attributes pointing at a remote or local-file
// scheme (http(s):, protocol-relative //, file:) — leaves fragment
// references (#id, used by <use>) and inline data: URIs untouched.
const REMOTE_REFERENCE_ATTR =
  /\s+(?:xlink:href|href)\s*=\s*("(?:https?:|\/\/|file:)[^"]*"|'(?:https?:|\/\/|file:)[^']*')/gi;

export function sanitizeSvgInput(input: Buffer): Buffer {
  const text = input.toString("utf-8");

  if (DOCTYPE_OR_ENTITY.test(text)) {
    throw new Error("SVG com DOCTYPE/ENTITY não é aceito (risco de XXE)");
  }

  const sanitized = text
    .replace(SCRIPT_TAG, "")
    .replace(FOREIGN_OBJECT_TAG, "")
    .replace(EVENT_HANDLER_ATTR, "")
    .replace(XML_STYLESHEET_PI, "")
    .replace(REMOTE_REFERENCE_ATTR, "");

  return Buffer.from(sanitized, "utf-8");
}

function parseIntrinsicSize(
  svgText: string
): { width: number; height: number } | null {
  const tagMatch = svgText.match(/<svg\b[^>]*>/i);
  if (!tagMatch) return null;
  const tag = tagMatch[0];

  const widthMatch = tag.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i);
  const heightMatch = tag.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i);
  if (widthMatch && heightMatch) {
    return {
      width: parseFloat(widthMatch[1]),
      height: parseFloat(heightMatch[1]),
    };
  }

  const viewBoxMatch = tag.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: parts[2], height: parts[3] };
    }
  }

  return null;
}

// sharp itself rejects density outside [1, 100000]. Rather than clamping
// into range (which would break the "output is always ~TARGET_MAX_DIMENSION"
// invariant — clamping a too-low density for a huge declared viewBox would
// still rasterize at that huge size, exactly the DoS this is meant to
// prevent), reject documents whose declared size would fall outside it.
const MIN_SHARP_DENSITY = 1;
const MAX_SHARP_DENSITY = 100000;

export async function rasterizeSvgInput(input: Buffer): Promise<Buffer> {
  const sanitized = sanitizeSvgInput(input);
  const size = parseIntrinsicSize(sanitized.toString("utf-8"));
  const largestDimension =
    size && size.width > 0 && size.height > 0
      ? Math.max(size.width, size.height)
      : TARGET_MAX_DIMENSION;

  const density = (SVG_BASE_DENSITY * TARGET_MAX_DIMENSION) / largestDimension;
  if (
    !Number.isFinite(density) ||
    density < MIN_SHARP_DENSITY ||
    density > MAX_SHARP_DENSITY
  ) {
    throw new Error("SVG com dimensões declaradas inválidas");
  }

  return sharp(sanitized, { density }).png().toBuffer();
}
