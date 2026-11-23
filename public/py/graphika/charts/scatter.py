"""Scatter plot with optional linear trendline."""
import numpy as np
import pandas as pd

from ._common import category_order, non_empty, require, set_labels


def plot(ax, df: pd.DataFrame, opts: dict) -> None:
    """Points for two numeric columns.

    opts:
      x, y       numeric columns
      group      optional categorical column: one colour per category
      trendline  draw a least-squares straight line through all points, with R²
      title, xLabel, yLabel
    """
    x, y, group = opts["x"], opts["y"], opts.get("group")
    require(df, x, y, group)
    data = non_empty(df.dropna(subset=[x, y]))

    point_style = {"s": 12, "alpha": 0.85, "linewidths": 0}
    if group:
        for name in category_order(data[group]):
            part = data[data[group] == name]
            ax.scatter(part[x], part[y], label=str(name), **point_style)
    else:
        ax.scatter(data[x], data[y], **point_style)

    if opts.get("trendline") and len(data) >= 3 and data[x].nunique() > 1:
        xs = data[x].to_numpy(dtype=float)
        ys = data[y].to_numpy(dtype=float)
        slope, intercept = np.polyfit(xs, ys, 1)
        r2 = np.corrcoef(xs, ys)[0, 1] ** 2
        line_x = np.array([xs.min(), xs.max()])
        ax.plot(line_x, slope * line_x + intercept, color="black", linewidth=1,
                label=f"Linear fit (R² = {r2:.2f})")

    set_labels(ax, opts, x, y)
    if group or opts.get("trendline"):
        ax.legend(loc="best", title=group)
