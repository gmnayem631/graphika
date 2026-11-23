// Generates the SYNTHETIC sample datasets in public/samples/.
// Deterministic (seeded) so re-running gives identical files.
// Run: node scripts/generate-samples.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

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

// --- Flood events by district and year (long format), fictional districts.
const DISTRICTS = ["North Riverside", "Delta East", "Hill Valley", "Coastal Plain", "Lake Basin", "Upper Floodplain"];
const floodRows = [];
for (const [i, district] of DISTRICTS.entries()) {
  for (let year = 2015; year <= 2024; year++) {
    const base = [6, 9, 2, 5, 4, 11][i];
    const trend = (year - 2015) * [0.2, 0.35, 0.05, 0.3, 0.1, 0.4][i];
    const events = Math.max(0, Math.round(base + trend + (rand() - 0.5) * 4));
    const affected = Math.round(events * (800 + rand() * 2500));
    floodRows.push([district, year, events, affected]);
  }
}
writeFileSync(
  new URL("flood_events_by_district.csv", OUT),
  ["district,year,flood_events,people_affected", ...floodRows.map((r) => r.join(","))].join("\n") + "\n",
);

// --- Mean growing-season temperature vs. crop yield at 120 sites (scatter / trendline / box plot).
{
  const regions = ["Lowland", "Upland", "Coastal"];
  const rows = ["site_id,region,mean_temp_c,yield_t_ha,irrigated"];
  for (let i = 1; i <= 120; i++) {
    const region = regions[i % 3];
    const temp = 22 + rand() * 9 + (region === "Upland" ? -3 : region === "Coastal" ? 1 : 0);
    const irrigated = rand() < 0.4;
    const yieldT = Math.max(0.5, 7.5 - 0.32 * (temp - 22) + (irrigated ? 0.8 : 0) + (rand() - 0.5) * 1.6);
    const y = rand() < 0.03 ? "NA" : yieldT.toFixed(2);
    rows.push(`S${String(i).padStart(3, "0")},${region},${temp.toFixed(1)},${y},${irrigated ? "yes" : "no"}`);
  }
  writeFileSync(new URL("temperature_crop_yield.csv", OUT), rows.join("\n") + "\n");
}

// --- European-style river gauge export: ";" separator, decimal comma, DD.MM.YYYY dates,
//     metadata lines above the table, "NA" markers, Windows-1252 (Latin-1) encoding.
{
  const lines = [
    "Messstelle: Pegel Sonnfeld (synthetisch / synthetic data)",
    "Einheit Wasserstand: cm; Abfluss: m³/s",
    "",
    "Datum;Wasserstand_cm;Abfluss_m3s;Wassertemperatur_°C",
  ];
  let level = 180;
  for (let d = new Date(Date.UTC(2024, 0, 1)); d < new Date(Date.UTC(2025, 0, 1)); d.setUTCDate(d.getUTCDate() + 1)) {
    const doy = (d - Date.UTC(2024, 0, 1)) / 864e5;
    level += (rand() - 0.48) * 12 + (doy > 150 && doy < 160 ? 40 : 0) - (level - 180) * 0.08;
    const flow = 12 + Math.pow(Math.max(level, 60) / 100, 2.2) * 25;
    const temp = 11 + 8 * Math.sin(((doy - 110) / 366) * 2 * Math.PI) + (rand() - 0.5);
    const dmy = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
    const fmt = (x, n) => x.toFixed(n).replace(".", ",");
    lines.push([dmy, rand() < 0.01 ? "NA" : fmt(level, 1), fmt(flow, 2), rand() < 0.02 ? "" : fmt(temp, 1)].join(";"));
  }
  writeFileSync(new URL("river_gauge_europe.csv", OUT), Buffer.from(lines.join("\r\n") + "\r\n", "latin1"));
}

// --- Excel workbook: a title row above the flood table, plus a sheet of real Excel date cells.
{
  const wb = XLSX.utils.book_new();
  const events = XLSX.utils.aoa_to_sheet([
    ["Flood events by district, 2015–2024 (SYNTHETIC sample data)"],
    [],
    ["district", "year", "flood_events", "people_affected"],
    ...floodRows,
  ]);
  XLSX.utils.book_append_sheet(wb, events, "Flood events");

  // Dates as Excel serial numbers with a date format (computed in UTC, so no time-zone drift).
  const serial = (y, m, d) => (Date.UTC(y, m, d) - Date.UTC(1899, 11, 30)) / 864e5;
  const rain = XLSX.utils.aoa_to_sheet([["date", "rainfall_mm"]]);
  for (let i = 0; i < 90; i++) {
    XLSX.utils.sheet_add_aoa(rain, [[{ t: "n", v: serial(2024, 5, 1 + i), z: "dd/mm/yyyy" }, Math.round(rand() * 400) / 10]], { origin: -1 });
  }
  XLSX.utils.book_append_sheet(wb, rain, "Daily rainfall");
  writeFileSync(new URL("flood_and_rainfall.xlsx", OUT), XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

console.log("Samples written to public/samples/");
