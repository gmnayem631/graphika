"""Helpers shared by the chart modules."""
import matplotlib.dates as mdates
import pandas as pd

from ..errors import ChartError


def require(df: pd.DataFrame, *names) -> None:
    """Raise a friendly error if a column the chart needs is missing."""
    missing = [n for n in names if n and n not in df.columns]
    if missing:
        raise ChartError(f"Column not found: {', '.join(missing)}")


def non_empty(data: pd.DataFrame) -> pd.DataFrame:
    """Raise a friendly error when nothing is left to plot."""
    if data.empty:
        raise ChartError("There is no data to plot: every row has a missing value in the chosen columns.")
    return data


def category_order(series: pd.Series) -> list:
    """Categories in order of first appearance (the order the user's file has)."""
    return list(pd.unique(series.dropna()))


def format_date_axis(axis) -> None:
    """Compact, unambiguous date ticks (e.g. "Jan", "2024")."""
    locator = mdates.AutoDateLocator()
    axis.set_major_locator(locator)
    axis.set_major_formatter(mdates.ConciseDateFormatter(locator))


def is_datetime(series: pd.Series) -> bool:
    return pd.api.types.is_datetime64_any_dtype(series)


def set_labels(ax, opts: dict, x_default: str = "", y_default: str = "") -> None:
    """Axis labels and title; an empty user label falls back to the default."""
    ax.set_xlabel(opts.get("xLabel") or x_default)
    ax.set_ylabel(opts.get("yLabel") or y_default)
    if opts.get("title"):
        ax.set_title(opts["title"])


def rotate_category_labels(ax, labels: list) -> None:
    """Tilt crowded category labels so they don't overlap."""
    if len(labels) > 4 and max((len(str(l)) for l in labels), default=0) > 6:
        ax.tick_params(axis="x", labelrotation=40)
        for label in ax.get_xticklabels():
            label.set_horizontalalignment("right")
            label.set_rotation_mode("anchor")
