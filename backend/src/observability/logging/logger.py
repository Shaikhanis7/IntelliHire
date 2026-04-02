import logging
import colorlog

_logger = None

def setup_logger():
    global _logger

    if _logger:
        return _logger

    handler = colorlog.StreamHandler()
    handler.setFormatter(
        colorlog.ColoredFormatter(
            "%(log_color)s[%(levelname)s] %(name)s: %(message)s",
            log_colors={
                "INFO": "green",
                "WARNING": "yellow",
                "ERROR": "red",
            }
        )
    )

    _logger = logging.getLogger("app")
    _logger.setLevel(logging.INFO)

    if not _logger.handlers:
        _logger.addHandler(handler)

    return _logger