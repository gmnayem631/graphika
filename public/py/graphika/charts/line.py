"""Time-series line chart."""
import matplotlib.dates as mdates
import pandas as pd

from ..errors import ChartError


def plot(ax, df: pd.DataFrame, opts: dict) -> None:
    """Draw one line per y column against x.

    opts:
      x       name of the x column (usually a date)
      y       list of numeric column names, one line each
      title, xLabel, yLabel   optional text
    Missing values leave a visible gap in the line rather than being bridged.
    """
    x = opts["x"]
    ys = opts.get("y") or []
    if not ys:
        raise ChartError("Choose at least one column for the Y axis.")
    missing = [c for c in [x, *ys] if c not in df.columns]
    if missing:
        raise ChartError(f"Column not found: {', '.join(missing)}")

    data = df.dropna(subset=[x]).sort_values(x)
    for y in ys:
        ax.plot(data[x], data[y], label=y)

    if pd.api.types.is_datetime64_any_dtype(data[x]):
        # Compact, unambiguous date ticks (e.g. "Jan", "2024").
        locator = mdates.AutoDateLocator()
        ax.xaxis.set_major_locator(locator)
        ax.xaxis.set_major_formatter(mdates.ConciseDateFormatter(locator))

    ax.set_xlabel(opts.get("xLabel", x))
    ax.set_ylabel(opts.get("yLabel", ys[0] if len(ys) == 1 else ""))
    if opts.get("title"):
        ax.set_title(opts["title"])
    if len(ys) > 1:
        ax.legend(loc="best")
