# Legacy CDP Code Archive

This directory contains legacy code and processors preserved from the monolithic Jager Customer Data Platform (`src/cdp/`) prior to decoupling into CDB.

## Contents
- **`cdp/`**: Original Jager CDP FastAPI service containing historical processors:
  - `entity_resolution.py`
  - `evaluate_segments.py`
  - `process_linkedin_connections.py`
  - `process_linkedin_messages.py`
  - `process_manual_data.py`
  - `process_notion_meeting_notes.py`
  - `main.py`, `Dockerfile`, `requirements.txt`
