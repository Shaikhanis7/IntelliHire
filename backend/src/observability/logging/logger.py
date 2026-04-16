import logging
import sys

_logger = None

def setup_logger():
    global _logger

    if _logger:
        return _logger

    handler = logging.StreamHandler(sys.stdout)  # 👈 IMPORTANT
    formatter = logging.Formatter(
        "[%(levelname)s] %(name)s: %(message)s"
    )
    handler.setFormatter(formatter)

    _logger = logging.getLogger("app")
    _logger.setLevel(logging.INFO)

    if not _logger.handlers:
        _logger.addHandler(handler)

    # 👇 VERY IMPORTANT (propagate to root for Render/Uvicorn)
    _logger.propagate = True

    return _logger