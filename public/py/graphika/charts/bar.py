"""Bar chart: simple or grouped."""
import numpy as np
import pandas as pd

from ._common import axis_label, category_order, non_empty, require, rotate_category_labels

AGG_LABELS = {"mean": "Mean", "sum": "Total", "median": "Median", "count": "Count"}


def _table(df: pd.DataFrame, opts: dict) -> tuple[pd.DataFrame, str]:
    """Bar heights as a table: rows = categories of x, columns = bar series."""
    x, ys, group, agg = opts["x"], opts.get("y") or [], opts.get("group"), opts.get("agg", "mean")
    order = category_order(df[x])

    if not ys:  # count rows per category
        if group:
            table = pd.crosstab(df[x], df[group])
            table = table[[c for c in category_order(df[group]) if c in table.columns]]
        else:
            table = df[x].value_counts().to_frame("Count")
        return table.reindex(order), "Number of rows"

    if group:
        y = ys[0]
        table = df.pivot_table(index=x, columns=group, values=y, aggfunc=agg, observed=True, sort=False)
        table = table[[c for c in category_order(df[group]) if c in table.columns]]
        label = y
    else:
        table = df.groupby(x, sort=False)[ys].agg(agg)
        label = ys[0] if len(ys) == 1 else ""

    # Only mention the aggregation when rows were actually combined.
    combined = df[x].duplicated().any() if not group else df.duplicated(subset=[x, group]).any()
    if combined and label:
        label = f"{AGG_LABELS[agg]} {label}"
    return table.reindex(order), label


def plot(ax, df: pd.DataFrame, opts: dict) -> None:
    """Bars per category of x.

    opts:
      x            categorical column (one bar position per category)
      y            numeric columns; several give grouped bars; empty = count rows
      group        optional categorical column: grouped bars, one colour per category
      agg          how rows in the same category are combined: mean | sum | median | count
      orientation  auto | vertical | horizontal (auto: horizontal for many/long labels)
      title, xLabel, yLabel
    """
    x, group = opts["x"], opts.get("group")
    require(df, x, *(opts.get("y") or []), group)
    data = non_empty(df.dropna(subset=[x] + ([group] if group else [])))
    table, value_label = _table(data, opts)

    categories = [str(c) for c in table.index]
    n_series = len(table.columns)
    orientation = opts.get("orientation", "auto")
    if orientation == "auto":
        long_labels = max((len(c) for c in categories), default=0) > 14
        orientation = "horizontal" if len(categories) > 12 or long_labels else "vertical"

    positions = np.arange(len(categories))
    width = 0.8 / n_series
    for i, column in enumerate(table.columns):
        offset = (i - (n_series - 1) / 2) * width
        values = table[column].to_numpy(dtype=float)
        label = str(column) if n_series > 1 else None
        if orientation == "horizontal":
            ax.barh(positions + offset, values, height=width, label=label)
        else:
            ax.bar(positions + offset, values, width=width, label=label)

    # "x" = the category axis and "y" = the value axis, whichever way the bars point.
    category_label = axis_label(opts, "x", x)
    value_axis_label = axis_label(opts, "y", value_label)
    if orientation == "horizontal":
        # Categories run down the y axis; values along x.
        ax.set_yticks(positions, categories)
        ax.invert_yaxis()  # first category at the top, like the table
        ax.set_ylabel(category_label)
        ax.set_xlabel(value_axis_label)
    else:
        ax.set_xticks(positions, categories)
        rotate_category_labels(ax, categories)
        ax.set_xlabel(category_label)
        ax.set_ylabel(value_axis_label)
    if opts.get("title"):
        ax.set_title(opts["title"])
    if n_series > 1:
        ax.legend(loc="best", title=group)
