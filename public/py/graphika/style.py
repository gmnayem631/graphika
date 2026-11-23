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

# Colour cycles for lines, bars, points and boxes. All but "viridis" are
# designed to stay distinguishable with common colour-vision deficiencies;
# "grayscale" is for journals that print in black and white.
PALETTES = {
    "okabe-ito": OKABE_ITO,
    # Paul Tol's "bright" qualitative scheme.
    "tol-bright": ["#4477AA", "#EE6677", "#228833", "#CCBB44", "#66CCEE", "#AA3377", "#BBBBBB"],
    # Perceptually uniform; good for ordered groups. Yellow end left out (poor on white).
    "viridis": ["#440154", "#3B528B", "#21918C", "#5EC962", "#ADDC30"],
    "grayscale": ["#000000", "#666666", "#AAAAAA", "#333333", "#888888", "#CCCCCC"],
}

FONT_FAMILIES = {
    "sans": "Liberation Sans",  # metric-compatible with Arial / Helvetica
    "serif": "Liberation Serif",  # metric-compatible with Times New Roman
}


def register_fonts(font_dir: str) -> None:
    """Make the bundled Liberation fonts available to matplotlib."""
    for path in sorted(Path(font_dir).glob("*.ttf")):
        font_manager.fontManager.addfont(str(path))


# Dash patterns paired with the greyscale colours, so lines stay distinguishable in print.
GREYSCALE_DASHES = ["-", "--", ":", "-.", (0, (5, 1.5)), (0, (3, 1, 1, 1, 1, 1))]


def _cycle(palette: str):
    from cycler import cycler

    colors = PALETTES.get(palette, OKABE_ITO)
    if palette == "grayscale":
        return cycler(color=colors) + cycler(linestyle=GREYSCALE_DASHES[: len(colors)])
    return cycler(color=colors)


def rc_params(figure: dict, palette: str = "okabe-ito") -> dict:
    """matplotlib rcParams for one figure, from the user's figure and style options."""
    size = float(figure.get("fontSizePt", 8))
    family = FONT_FAMILIES.get(figure.get("fontFamily", "sans"), "Liberation Sans")

    return {
        # Fonts: the chosen family, falling back per character to DejaVu Sans
        # (bundled with matplotlib) for glyphs Liberation lacks, e.g. "⁻¹" in
        # "t ha⁻¹". Sizes in points stay true at any DPI.
        "font.family": [family, "DejaVu Sans"],
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
        "axes.prop_cycle": _cycle(palette),
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
