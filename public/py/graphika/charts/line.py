"""Line chart (usually a time series)."""
import pandas as pd

from ..errors import ChartError
from ._common import format_date_axis, is_datetime, non_empty, require, set_labels, category_order


def plot(ax, df: pd.DataFrame, opts: dict) -> None:
    """One line per y column (wide data), or per category of `group` (long data).

    opts:
      x       x column (date or number)
      y       list of numeric columns; with `group`, only the first is used
      group   optional categorical column: one line per category
      title, xLabel, yLabel   optional text
    Missing values leave a visible gap in the line rather than being bridged.
    """
    x, ys, group = opts["x"], opts.get("y") or [], opts.get("group")
    if not ys:
        raise ChartError("Choose at least one column for the Y axis.")
    require(df, x, *ys, group)

    data = non_empty(df.dropna(subset=[x])).sort_values(x, kind="stable")
    if group:
        y = ys[0]
        for name in category_order(data[group]):
            part = data[data[group] == name]
            ax.plot(part[x], part[y], label=str(name))
        y_default = y
    else:
        for y in ys:
            ax.plot(data[x], data[y], label=y)
        y_default = ys[0] if len(ys) == 1 else ""

    if is_datetime(data[x]):
        format_date_axis(ax.xaxis)
    set_labels(ax, opts, x, y_default)
    if group or len(ys) > 1:
        ax.legend(loc="best", title=group)
