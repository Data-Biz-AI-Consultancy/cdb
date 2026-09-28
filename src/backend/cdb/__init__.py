"""
CDB (Client DataBase) - Open-source Personal CRM & Customer Data Platform.

MIT Licensed core engine for organizational single-tenant deployment and operation.
"""

from importlib.metadata import PackageNotFoundError, version

from cdb.main import app, create_application

try:
    __version__ = version("cdb")
except PackageNotFoundError:
    __version__ = "1.43.0"

__all__ = [
    "__version__",
    "app",
    "create_application",
]
