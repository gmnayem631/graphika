"""Publication style: fonts, sizes, line widths and the colorblind-safe palette."""
from pathlib import Path

from matplotlib import font_manager

# Okabe & Ito (2008) colorblind-safe palette, ordered so the first colours
# contrast well on white (yellow last).
OKABE_ITO = [
    "#0072B2",  # blue
    "#D55E00",  # vermillion
    "#009E73",  # bluish green
    "#E69F00",  # orange
    "#CC79A7",  # reddish purple
    "#56B4E9",  # sky blue
    "#000000",  # black
    "#F0E442",  # yellow
]

FONT_FAMILIES = {
    "sans": "Liberation Sans",  # metric-compatible with Arial / Helvetica
    "serif": "Liberation Serif",  # metric-compatible with Times New Roman
}


def register_fonts(font_dir: str) -> None:
    """Make the bundled Liberation fonts available to matplotlib."""
    for path in sorted(Path(font_dir).glob("*.ttf")):
        font_manager.fontManager.addfont(str(path))


def rc_params(figure: dict) -> dict:
    """matplotlib rcParams for one figure, from the user's figure options."""
    size = float(figure.get("fontSizePt", 8))
    family = FONT_FAMILIES.get(figure.get("fontFamily", "sans"), "Liberation Sans")
    from cycler import cycler

    return {
        # Fonts: the chosen family only; sizes in points stay true at any DPI.
        "font.family": family,
        "font.size": size,
        "axes.titlesize": size + 1,
        "axes.labelsize": size,
        "xtick.labelsize": size - 1,
        "ytick.labelsize": size - 1,
        "legend.fontsize": size - 1,
        "mathtext.fontset": "custom",
        "mathtext.rm": family,
        # Clean axes typical of journals.
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.linewidth": 0.6,
        "axes.prop_cycle": cycler(color=OKABE_ITO),
        "xtick.major.width": 0.6,
        "ytick.major.width": 0.6,
        "xtick.major.size": 3,
        "ytick.major.size": 3,
        "lines.linewidth": 1.0,
        "legend.frameon": False,
        # White background in every format (JPG has no transparency).
        "figure.facecolor": "white",
        "savefig.facecolor": "white",
        # Embed real TrueType fonts (Type 42) in PDF/PS, as journals require.
        "pdf.fonttype": 42,
        "ps.fonttype": 42,
        # SVG text as paths: looks identical everywhere, no font needed.
        "svg.fonttype": "path",
    }
