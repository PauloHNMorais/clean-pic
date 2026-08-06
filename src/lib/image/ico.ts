import sharp from "sharp";

// ICO's ICONDIRENTRY encodes width/height as a single byte each (0 = 256),
// so anything larger has to be downscaled to fit before it can be packed.
const ICO_MAX_DIMENSION = 256;

export async function convertToIco(input: Buffer): Promise<Buffer> {
  const metadata = await sharp(input).metadata();
  const needsResize =
    (metadata.width ?? 0) > ICO_MAX_DIMENSION ||
    (metadata.height ?? 0) > ICO_MAX_DIMENSION;

  const pngBuffer = needsResize
    ? await sharp(input)
        .resize(ICO_MAX_DIMENSION, ICO_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer()
    : input;

  const finalMeta = await sharp(pngBuffer).metadata();
  const width = finalMeta.width ?? ICO_MAX_DIMENSION;
  const height = finalMeta.height ?? ICO_MAX_DIMENSION;

  // Modern ICO files can embed a full PNG per entry (supported since Vista)
  // instead of the legacy raw BMP + AND-mask layout — much simpler to write.
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2); // color count: 0 = no palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // image data size
  entry.writeUInt32LE(header.length + entry.length, 12); // offset to image data

  return Buffer.concat([header, entry, pngBuffer]);
}
