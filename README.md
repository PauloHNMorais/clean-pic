*[Leia em português](README.pt-BR.md)*

# CleanPic

**Live app:** [clean-pic.vercel.app](https://clean-pic.vercel.app)

A web tool for batch-adjusting images: upload JPEG, PNG, WebP, GIF, or AVIF, then trim empty space, resize, recolor, remove the background, and export as PNG, SVG, or ICO — with global or per-image overrides — then download everything as a `.zip`.

Full requirements and business rules in [APP.md](APP.md). Technical decisions and project conventions in [CLAUDE.md](CLAUDE.md).

## Stack

- [Next.js](https://nextjs.org) (App Router) — front-end and back-end in the same app
- [sharp](https://sharp.pixelplumbing.com) — decoding, trim, resize, recoloring, and background removal
- [potrace](https://github.com/tooolbox/node-potrace) — vectorization to SVG
- [archiver](https://github.com/archiverjs/node-archiver) — `.zip` generation
- [react-dropzone](https://react-dropzone.js.org) — drag-and-drop upload
- Tailwind CSS

## Structure

```
src/
  app/
    page.tsx              main screen
    layout.tsx
    api/process/route.ts  receives images + configs, processes them, returns the .zip
  components/
    ImageUploader.tsx      upload, preview grid, global/per-image adjustments, download
    AdjustmentControls.tsx adjustment form (output format, trim, resize, color, background removal)
  lib/
    image/
      config.ts            config types and validation
      validation.ts         upload validation (format, count, size)
      trim.ts / resize.ts / recolor.ts / svg.ts / ico.ts / removeBackground.ts   image operations (sharp/potrace)
      process.ts            orchestrates the operations above per image
    uploadWithProgress.ts   XHR-based upload with real progress
```

Each image operation is a pure, isolated function under `lib/image/`, with no UI logic mixed in.

## Running locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
npx tsc --noEmit  # type check
```

## Current limits

- 1 to 50 images per batch
- Accepted input formats: JPEG, PNG, WebP, GIF, AVIF
- 1 MB per file, 4 MB total per batch (kept under Vercel's free-tier request body limit)
- SVG conversion assumes single-color, outline-style icons — not suited for photos or images with gradients/multiple colors
- Background removal is color-based (chroma key), not AI segmentation — works well on solid/near-solid backgrounds, not on complex photo backgrounds
- ICO output caps at 256×256 (a limit of the format itself) — larger results are downscaled automatically, keeping aspect ratio

Details and rationale for each limit are in [APP.md](APP.md).
