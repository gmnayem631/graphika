// Generates the SYNTHETIC sample datasets in public/samples/.
// Deterministic (seeded) so re-running gives identical files.
// Run: node scripts/generate-samples.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../public/samples/", import.meta.url);
mkdirSync(OUT, { recursive: true });

// Small seeded PRNG (mulberry32).
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(42);
const iso = (d) => d.toISOString().slice(0, 10);

// --- Daily rainfall (mm) at two stations, 2023–2024, monsoon-like seasonality,
//     with a few missing days (empty cells) to exercise missing-value handling.
{
  const rows = ["date,north_station_mm,south_station_mm"];
  for (let d = new Date(Date.UTC(2023, 0, 1)); d < new Date(Date.UTC(2025, 0, 1)); d.setUTCDate(d.getUTCDate() + 1)) {
    const doy = (d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5;
    const season = Math.max(0, Math.sin(((doy - 120) / 365) * 2 * Math.PI)); // wet Jun–Sep
    const day = (scale) => {
      if (rand() > 0.15 + 0.7 * season) return 0;
      return Math.round(-Math.log(1 - rand()) * scale * (0.3 + season) * 10) / 10;
    };
    const n = rand() < 0.01 ? "" : day(18);
    const s = rand() < 0.01 ? "" : day(24);
    rows.push(`${iso(d)},${n},${s}`);
  }
  writeFileSync(new URL("daily_rainfall.csv", OUT), rows.join("\n") + "\n");
}

console.log("Samples written to public/samples/");
