# Sample datasets (SYNTHETIC)

All values in these files are made up for testing Graphika. District and station
names are fictional. Regenerate with `node scripts/generate-samples.mjs`.

| File | What it exercises |
|---|---|
| `daily_rainfall.csv` | Daily time series, two stations, a few missing days |
| `flood_events_by_district.csv` | Categories × years (bar / grouped bar / box) |
| `temperature_crop_yield.csv` | Two numeric columns + categories (scatter + trendline, box), `NA` markers |
| `river_gauge_europe.csv` | `;` separator, decimal comma, `DD.MM.YYYY` dates, metadata lines on top, Windows-1252 encoding |
| `flood_and_rainfall.xlsx` | Two sheets, a title row above the table, real Excel date cells |
