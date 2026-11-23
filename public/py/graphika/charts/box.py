"""Box plot (Tukey: median, quartiles, whiskers at 1.5 × IQR)."""
import numpy as np
import pandas as pd
from matplotlib import rcParams

from ._common import category_order, non_empty, require, rotate_category_labels, set_labels

POINTS_AUTO_MAX = 50  # overlay raw points when every box has at most this many


def plot(ax, df: pd.DataFrame, opts: dict) -> None:
    """Distributions side by side.

    opts:
      y           numeric columns; without `group` there is one box per column
      group       optional categorical column: one box per category (first y only)
      showPoints  overlay the data points: true | false | "auto" (small samples only)
      title, xLabel, yLabel
    """
    ys, group = opts.get("y") or [], opts.get("group")
    require(df, *ys, group)

    if group:
        y = ys[0]
        data = non_empty(df.dropna(subset=[y, group]))
        labels = [str(c) for c in category_order(data[group])]
        samples = [data.loc[data[group].astype(str) == c, y].to_numpy(dtype=float) for c in labels]
        x_default, y_default = group, y
    else:
        labels = list(ys)
        samples = [df[y].dropna().to_numpy(dtype=float) for y in ys]
        if all(len(s) == 0 for s in samples):
            non_empty(pd.DataFrame())
        x_default, y_default = "", ys[0] if len(ys) == 1 else ""

    colors = rcParams["axes.prop_cycle"].by_key()["color"]
    parts = ax.boxplot(
        samples,
        patch_artist=True,
        widths=0.6,
        medianprops={"color": "black", "linewidth": 1.2},
        flierprops={"marker": "o", "markersize": 2.5, "markeredgewidth": 0, "markerfacecolor": "0.4"},
    )
    for i, patch in enumerate(parts["boxes"]):
        patch.set_facecolor(colors[i % len(colors)])
        patch.set_alpha(0.45)
        patch.set_edgecolor("black")

    show = opts.get("showPoints", "auto")
    if show == "auto":
        show = max((len(s) for s in samples), default=0) <= POINTS_AUTO_MAX
    if show:
        rng = np.random.default_rng(0)  # fixed seed: the same jitter every render
        for i, s in enumerate(samples, start=1):
            ax.scatter(i + rng.uniform(-0.12, 0.12, len(s)), s, s=6, color="black", alpha=0.6, linewidths=0, zorder=3)
        for line in parts["fliers"]:
            line.set_visible(False)  # outliers are already shown as points

    ax.set_xticks(range(1, len(labels) + 1), labels)
    rotate_category_labels(ax, labels)
    set_labels(ax, opts, x_default, y_default)
