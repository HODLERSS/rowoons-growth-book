// Builds the Vercel Build Output (v3) for the admin site: the Vite page as static files plus one Node function,
// /api/admin, bundled here with esbuild (it pulls the app's pure weekly-note code in through the "@" alias, so the
// deploy needs nothing outside this folder). deploy.sh then ships it with `vercel deploy --prebuilt`.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(root, ".vercel/output");
const env = Object.fromEntries(
  readFileSync(path.join(root, "../.env.local"), "utf8").split("\n").map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]),
);
const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL).origin;

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, "static"), { recursive: true });
cpSync(path.join(root, "dist"), path.join(out, "static"), { recursive: true });

const fn = path.join(out, "functions/api/admin.func");
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: [path.join(root, "server/handler.ts")],
  outfile: path.join(fn, "index.js"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  alias: { "@": path.resolve(root, "../src") },
  // the Vercel launcher calls module.exports(req, res)
  footer: { js: "module.exports = module.exports.default || module.exports;" },
  logLevel: "warning",
});
writeFileSync(path.join(fn, ".vc-config.json"), JSON.stringify({ runtime: "nodejs22.x", handler: "index.js", launcherType: "Nodejs", shouldAddHelpers: false, maxDuration: 60 }, null, 2));

const headers = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": `default-src 'self'; connect-src 'self' ${supabaseOrigin}; img-src 'self' data:; style-src 'self'; font-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'`,
};
writeFileSync(
  path.join(out, "config.json"),
  JSON.stringify({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, { handle: "filesystem" }, { src: "/(.*)", status: 404, dest: "/404.html" }] }, null, 2),
);
writeFileSync(path.join(out, "static/404.html"), "<!doctype html><meta charset=utf-8><meta name=robots content=noindex><title>Not found</title><p>Not found.</p>");
console.log("build output: .vercel/output (static + functions/api/admin.func)");
