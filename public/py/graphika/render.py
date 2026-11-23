"""Entry point called from the web worker.

TypeScript sends one JSON request::

    {"chart": "line",
     "columns": [{"name": ..., "type": "numeric"|"categorical"|"datetime", "values": [...]}],
     "options": {...chart-specific...},
     "figure": {"widthMm", "heightMm", "dpi", "format", "fontFamily", "fontSizePt"}}

and gets back the encoded figure as bytes.
"""
import io
import json

import matplotlib
import pandas as pd
from matplotlib.figure import Figure

from . import style
from .charts import CHARTS
from .errors import ChartError

MM_PER_INCH = 25.4

# matplotlib savefig format names for our export formats.
SAVE_FORMATS = {"png": "png", "jpg": "jpeg", "tiff": "tiff", "svg": "svg", "pdf": "pdf"}
RASTER_FORMATS = {"png", "jpeg", "tiff"}


def setup(font_dir: str) -> None:
    """One-time initialisation: fonts, then a tiny render to warm caches."""
    matplotlib.use("Agg")
    style.register_fonts(font_dir)
    fig = Figure(figsize=(1, 1))
    fig.add_subplot().plot([0, 1], [0, 1])
    fig.savefig(io.BytesIO(), format="png")


def build_dataframe(columns: list[dict]) -> pd.DataFrame:
    """Columnar JSON -> DataFrame with proper dtypes. null becomes NaN/NaT."""
    data = {}
    for col in columns:
        values = col["values"]
        kind = col["type"]
        if kind == "numeric":
            data[col["name"]] = pd.to_numeric(pd.Series(values, dtype="object"), errors="coerce")
        elif kind == "datetime":
            data[col["name"]] = pd.to_datetime(pd.Series(values, dtype="object"), errors="coerce")
        else:
            data[col["name"]] = pd.Series(values, dtype="object")
    return pd.DataFrame(data)


def render(request: dict) -> bytes:
    """Draw the requested chart at its exact physical size and encode it."""
    chart = CHARTS.get(request["chart"])
    if chart is None:
        raise ChartError(f"Unknown chart type: {request['chart']!r}")

    figure = request["figure"]
    fmt = SAVE_FORMATS[figure["format"]]
    dpi = float(figure["dpi"])
    df = build_dataframe(request["columns"])

    width_in = figure["widthMm"] / MM_PER_INCH
    height_in = figure["heightMm"] / MM_PER_INCH
    if fmt in RASTER_FORMATS:
        # matplotlib truncates to whole pixels; snap so e.g. 180 mm @ 300 dpi
        # gives 2126 px (rounded) rather than 2125 px (truncated).
        width_in = round(width_in * dpi) / dpi
        height_in = round(height_in * dpi) / dpi

    with matplotlib.rc_context(style.rc_params(figure)):
        # Exact size in inches; "constrained" layout fits labels *inside* this
        # size (unlike bbox_inches="tight", which would change it).
        fig = Figure(figsize=(width_in, height_in), dpi=dpi, layout="constrained")
        ax = fig.add_subplot()
        chart(ax, df, request["options"])

        save_kwargs: dict = {"format": fmt, "dpi": dpi}
        if fmt == "pdf":
            save_kwargs["metadata"] = {"Creator": "Graphika"}
        elif fmt == "jpeg":
            save_kwargs["pil_kwargs"] = {"quality": 95}
        elif fmt == "tiff":
            save_kwargs["pil_kwargs"] = {"compression": "tiff_lzw"}

        buf = io.BytesIO()
        fig.savefig(buf, **save_kwargs)
    return buf.getvalue()


def render_json(request_json: str) -> bytes:
    """JSON-string wrapper so the JS side only passes a plain string."""
    return render(json.loads(request_json))
