import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractImagesFromZip } from "@/lib/image/zipInput";

async function makeZipFile(
  entries: Record<string, string>,
  name = "archive.zip",
): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(entries)) {
    zip.file(path, content);
  }
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], name, { type: "application/zip" });
}

describe("extractImagesFromZip", () => {
  it("extracts images from nested directories recursively", async () => {
    const zipFile = await makeZipFile({
      "logo.png": "root",
      "icons/social/twitter.png": "nested",
      "icons/social/deep/insta.svg": "deeper",
    });

    const { files, skippedCount } = await extractImagesFromZip(zipFile);

    expect(files.map((f) => f.name).sort()).toEqual(
      [
        "icons/social/deep/insta.svg",
        "icons/social/twitter.png",
        "logo.png",
      ].sort(),
    );
    expect(skippedCount).toBe(0);
  });

  it("assigns the correct MIME type based on extension", async () => {
    const zipFile = await makeZipFile({ "a.png": "x", "b.svg": "y" });
    const { files } = await extractImagesFromZip(zipFile);

    const byName = Object.fromEntries(files.map((f) => [f.name, f.type]));
    expect(byName["a.png"]).toBe("image/png");
    expect(byName["b.svg"]).toBe("image/svg+xml");
  });

  it("skips non-image entries without erroring", async () => {
    const zipFile = await makeZipFile({
      "logo.png": "x",
      "readme.txt": "docs",
      "notes/info.md": "docs",
    });

    const { files, skippedCount } = await extractImagesFromZip(zipFile);

    expect(files.map((f) => f.name)).toEqual(["logo.png"]);
    expect(skippedCount).toBe(2);
  });

  it("skips macOS packaging junk", async () => {
    const zipFile = await makeZipFile({
      "logo.png": "x",
      "__MACOSX/logo.png": "junk",
      ".DS_Store": "junk",
    });

    const { files, skippedCount } = await extractImagesFromZip(zipFile);

    expect(files.map((f) => f.name)).toEqual(["logo.png"]);
    expect(skippedCount).toBe(0);
  });

  it("sanitizes traversal attempts in entry names", async () => {
    const zip = new JSZip();
    zip.file("../../etc/evil.png", "x");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const zipFile = new File([buffer], "archive.zip", {
      type: "application/zip",
    });

    const { files } = await extractImagesFromZip(zipFile);

    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("etc/evil.png");
  });
});
