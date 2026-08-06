*[Leia em português](README.pt-BR.md)*

# PNG Any

A web tool for batch-adjusting PNGs: convert to SVG, trim empty space, resize, and recolor the output — with global or per-image overrides — then download everything as a `.zip`.

Full requirements and business rules in [APP.md](APP.md). Technical decisions and project conventions in [CLAUDE.md](CLAUDE.md).

## Stack

- [Next.js](https://nextjs.org) (App Router) — front-end and back-end in the same app
- [sharp](https://sharp.pixelplumbing.com) — PNG trim, resize, and recoloring
- [potrace](https://github.com/tooolbox/node-potrace) — PNG → SVG vectorization
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
    AdjustmentControls.tsx adjustment form (SVG, trim, resize, output color)
  lib/
    image/
      config.ts            config types and validation
      validation.ts         upload validation (type, count, size)
      trim.ts / resize.ts / recolor.ts / svg.ts   image operations (sharp/potrace)
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
- 1 MB per file, 4 MB total per batch (kept under Vercel's free-tier request body limit)
- SVG conversion assumes single-color, outline-style icons — not suited for photos or images with gradients/multiple colors

Details and rationale for each limit are in [APP.md](APP.md).
