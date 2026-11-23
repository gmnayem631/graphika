"""One module per chart type. Each exposes ``plot(ax, df, opts)``."""
from . import line

# chart kind (as sent from TypeScript) -> plotting function
CHARTS = {
    "line": line.plot,
}
