// Builds the site's i18n dictionaries from the admin translations, keeping only keys the site uses.
// Usage: npm run i18n:sync -w @continent/site   (re-run after adding t("...") calls or editing translations)
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = fileURLToPath(new URL(".", import.meta.url));
const translationsPath = pathToFileURL(join(here, "../../admin/src/i18n/translations.ts")).href;
const siteSrc = join(here, "../src");
const outDir = join(here, "../src/i18n/dictionaries");
const { translations } = await import(translationsPath);
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(f) && files.push(p); } })(siteSrc);
const exact = new Set(), prefixes = new Set();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bt\(\s*(["'])([^"'\n]+)\1/g)) exact.add(m[2]);
  for (const m of src.matchAll(/\bt\(\s*`([^`]+)`/g)) prefixes.add(m[1].split("${")[0]);
  // keys stored in data arrays, e.g. { titleKey: "gallery.x" }
  for (const m of src.matchAll(/(["'])((?:[a-z][A-Za-z0-9]*)\.(?:[A-Za-z0-9_]+\.?)+)\1/g)) if (m[2] in translations) exact.add(m[2]);
}
const keys = Object.keys(translations).filter(k => exact.has(k) || [...prefixes].some(p => p && k.startsWith(p)));
const missing = [...exact].filter(k => !(k in translations) && /^[a-z]+\.[A-Za-z]/.test(k));
mkdirSync(outDir, { recursive: true });
for (const lang of ["en", "uk"]) {
  const dict = Object.fromEntries(keys.map(k => [k, translations[k][lang] ?? translations[k].en]));
  writeFileSync(join(outDir, `${lang}.json`), JSON.stringify(dict, null, 2) + "\n");
}
console.log(`keys: ${keys.length} of ${Object.keys(translations).length}; dynamic prefixes: ${[...prefixes].join(", ")}`);
console.log(`referenced but missing: ${missing.join(", ") || "none"}`);
