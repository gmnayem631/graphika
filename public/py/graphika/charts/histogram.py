"""Histogram of one numeric column."""
import numpy as np
import pandas as pd

from ._common import category_order, non_empty, require, set_labels

MAX_BINS = 60


def plot(ax, df: pd.DataFrame, opts: dict) -> None:
    """Distribution of a numeric column.

    opts:
      x      numeric column
      group  optional categorical column: overlaid, semi-transparent histograms
      bins   number of bins, or "auto" (numpy's rule, capped at 60)
      title, xLabel, yLabel
    All groups share the same bin edges so their bars line up.
    """
    x, group = opts["x"], opts.get("group")
    require(df, x, group)
    data = non_empty(df.dropna(subset=[x] + ([group] if group else [])))
    values = data[x].to_numpy(dtype=float)

    bins = opts.get("bins", "auto")
    if bins == "auto":
        edges = np.histogram_bin_edges(values, bins="auto")
        if len(edges) - 1 > MAX_BINS:
            edges = np.histogram_bin_edges(values, bins=MAX_BINS)
    else:
        edges = np.histogram_bin_edges(values, bins=int(bins))

    if group:
        for name in category_order(data[group]):
            part = data.loc[data[group] == name, x].to_numpy(dtype=float)
            ax.hist(part, bins=edges, alpha=0.55, label=str(name))
        ax.legend(loc="best", title=group)
    else:
        ax.hist(values, bins=edges, edgecolor="white", linewidth=0.4)

    set_labels(ax, opts, x, "Count")
