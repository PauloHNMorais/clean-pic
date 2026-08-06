import type { NextConfig } from "next";

// Static (no-nonce) CSP: the app has no per-request dynamic rendering need,
// so nonces would only cost static optimization for no real gain here.
// script-src/style-src need 'unsafe-inline' because Next's own hydration
// bootstrap scripts and React's inline `style={{...}}` (e.g. the upload
// progress bar) aren't nonce-tagged without dynamic rendering — this matches
// Next's documented "without nonces" CSP baseline. img-src needs blob: for
// the client-side image previews (URL.createObjectURL).
const isDev = process.env.NODE_ENV === "development";

// Two dev-only relaxations, neither shipped to production:
// - 'unsafe-eval': React uses eval() in dev to reconstruct server-side error
//   stacks in the browser console.
// - connect-src ws:: Next's HMR client connects over a WebSocket to a
//   different port than the page itself, which CSP treats as a different
//   origin — without this, default-src 'self' silently kills Fast Refresh.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob:;
  font-src 'self';
  connect-src 'self'${isDev ? " ws:" : ""};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  serverExternalPackages: ["potrace", "jimp"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
