"""Entry point called from the web worker.

TypeScript sends one JSON request::

    {"chart": "line",
     "columns": [{"name": ..., "type": "numeric"|"categorical"|"datetime", "values": [...]}],
     "options": {...chart-specific...},
     "figure": {"widthMm", "heightMm", "dpi", "format", "fontFamily", "fontSizePt"},
     "style": {"title", "xLabel", "yLabel", "xUnit", "yUnit", "palette", "legend", "grid"}}  (optional)

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


TEXT_KEYS = ("title", "xLabel", "yLabel", "xUnit", "yUnit")


def place_legend(fig, ax, position: str) -> None:
    """Move the legend a chart drew to where the user wants it (or remove it).

    "outside right" and "below" use a figure legend; constrained layout then
    shrinks the plot to make room, so the figure keeps its exact size.
    """
    legend = ax.get_legend()
    if legend is None or position == "best":
        return
    handles = legend.legend_handles
    labels = [t.get_text() for t in legend.get_texts()]
    title = legend.get_title().get_text() or None
    legend.remove()
    if position == "none":
        return
    if position == "outside right":
        fig.legend(handles, labels, title=title, loc="outside right upper")
    elif position == "below":
        fig.legend(handles, labels, title=title, loc="outside lower center", ncols=min(len(labels), 4))
    else:
        ax.legend(handles, labels, title=title, loc=position)


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
        # gives 2126 px (rounded) rather than 2125 px (truncated). The extra
        # quarter pixel absorbs floating-point error (1534.9999 -> 1535).
        width_in = (round(width_in * dpi) + 0.25) / dpi
        height_in = (round(height_in * dpi) + 0.25) / dpi

    look = request.get("style") or {}
    # Text from the style panel is passed to the chart like its own options.
    options = {**request["options"], **{k: look[k] for k in TEXT_KEYS if look.get(k)}}

    with matplotlib.rc_context(style.rc_params(figure, look.get("palette", "okabe-ito"))):
        # Exact size in inches; "constrained" layout fits labels *inside* this
        # size (unlike bbox_inches="tight", which would change it).
        fig = Figure(figsize=(width_in, height_in), dpi=dpi, layout="constrained")
        ax = fig.add_subplot()
        chart(ax, df, options)
        if look.get("grid") and request["chart"] != "heatmap":
            ax.grid(True, linewidth=0.4, color="0.88")
            ax.set_axisbelow(True)
        place_legend(fig, ax, look.get("legend", "best"))

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
