#!/usr/bin/env python3
"""
CDB — Data Migration CLI Wrapper: Jager `cdp` to CDB `cdb`
=========================================================
Delegates to the packaged `cdb.services.migration` module.
"""

import sys
from pathlib import Path

# Add src/backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "src" / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from cdb.services.migration import (  # noqa: E402
    DataMigrator,
    main,
    map_lead_stage,
    normalise_email,
    normalise_linkedin_url,
    normalise_phone,
    validate_target,
)

if __name__ == "__main__":
    main()
