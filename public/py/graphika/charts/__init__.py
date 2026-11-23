"""One module per chart type. Each exposes ``plot(ax, df, opts)``."""
from . import bar, box, heatmap, histogram, line, scatter

# chart kind (as sent from TypeScript, see src/lib/engine/protocol.ts) -> plotting function
CHARTS = {
    "line": line.plot,
    "bar": bar.plot,
    "scatter": scatter.plot,
    "histogram": histogram.plot,
    "box": box.plot,
    "heatmap": heatmap.plot,
}
