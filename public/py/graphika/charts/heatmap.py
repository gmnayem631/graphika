"""Correlation matrix heatmap."""
import pandas as pd

from ..errors import ChartError
from ._common import require

METHOD_LABELS = {"pearson": "Pearson r", "spearman": "Spearman ρ"}
ANNOTATE_MAX = 12  # write the coefficient in each cell up to this many columns


def plot(ax, df: pd.DataFrame, opts: dict) -> None:
    """Pairwise correlations between numeric columns.

    opts:
      columns  numeric columns (at least 2)
      method   pearson | spearman
      title
    Uses a diverging red–blue scale fixed at −1…1, so colours are comparable
    between figures. Pairs are computed on rows where both values exist.
    """
    columns = opts.get("columns") or []
    if len(columns) < 2:
        raise ChartError("Choose at least two numeric columns for a correlation matrix.")
    require(df, *columns)
    method = opts.get("method", "pearson")
    corr = df[columns].astype(float).corr(method=method)

    image = ax.imshow(corr.to_numpy(), cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(columns)), columns, rotation=40, ha="right", rotation_mode="anchor")
    ax.set_yticks(range(len(columns)), columns)
    ax.tick_params(length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)

    if len(columns) <= ANNOTATE_MAX:
        for i in range(len(columns)):
            for j in range(len(columns)):
                value = corr.iat[i, j]
                if pd.isna(value):
                    continue
                ax.text(j, i, f"{value:.2f}", ha="center", va="center",
                        fontsize="small", color="white" if abs(value) > 0.6 else "black")

    colorbar = ax.figure.colorbar(image, ax=ax, shrink=0.85)
    colorbar.set_label(METHOD_LABELS.get(method, method))
    colorbar.outline.set_visible(False)
    if opts.get("title"):
        ax.set_title(opts["title"])
