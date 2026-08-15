import JSZip from "jszip";
import { EXTENSION_TO_MIME_TYPE, sanitizeRelativePath } from "@/lib/image/validation";

export interface ZipExtractionResult {
  files: File[];
  skippedCount: number;
}

function extensionOf(name: string): string {
  const lastDot = name.lastIndexOf(".");
  return lastDot === -1 ? "" : name.slice(lastDot + 1).toLowerCase();
}

// __MACOSX/ and dotfiles (.DS_Store, etc.) are packaging artifacts that
// commonly ride along in zips exported from macOS Finder — not images the
// user meant to upload.
function isJunkEntry(name: string): boolean {
  const base = name.split("/").pop() ?? "";
  return name.startsWith("__MACOSX/") || base.startsWith(".");
}

// Recursively pulls every recognized image out of a .zip — including nested
// folders, since JSZip's entry names are already full relative paths, so no
// manual directory walk is needed — and turns each into a File the rest of
// the upload pipeline (validateNewFiles, ACCEPTED_MIME_TYPES) treats like
// any directly-dropped image. Non-image entries (folders, junk, unrecognized
// extensions) are silently skipped rather than rejected: a zip of icons
// commonly carries other stuff alongside them.
export async function extractImagesFromZip(
  zipFile: File,
): Promise<ZipExtractionResult> {
  const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
  const files: File[] = [];
  let skippedCount = 0;

  for (const entry of Object.values(zip.files)) {
    if (entry.dir || isJunkEntry(entry.name)) continue;

    const mimeType = EXTENSION_TO_MIME_TYPE[extensionOf(entry.name)];
    if (!mimeType) {
      skippedCount++;
      continue;
    }

    const relativePath = sanitizeRelativePath(entry.name);
    const arrayBuffer = await entry.async("arraybuffer");
    files.push(new File([arrayBuffer], relativePath, { type: mimeType }));
  }

  return { files, skippedCount };
}
