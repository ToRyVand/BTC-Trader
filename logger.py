import logging
import sys

logger = logging.getLogger("ark_trader")

def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure structured logging for the bot."""
    level = logging.DEBUG if verbose else logging.INFO
    
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)-7s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    
    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(formatter)
    
    logger.setLevel(level)
    logger.addHandler(handler)
    
    # File handler (optional — append to bot.log)
    try:
        file_handler = logging.FileHandler("bot.log")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except PermissionError:
        pass
    
    return logger
