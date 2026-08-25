# Packaged exporter core

This directory contains the scripts and exporter binary used by `../RUN_EXPORT_SMALL.bat` and `../RUN_EXPORT_FULL.bat`.

- Small: all 27 structured-data rules, 2 selected image rules, and the persistent image ignore index; produces `raw_exports_small.zip`.
- Full: all 27 structured-data rules and all 9 image rules, without the ignore index; produces `raw_exports_full.zip`.
- Validation: 12 structured groups in both modes; 3 additional image groups in Full. Missing requirements abort archive creation and are recorded in `export-validation.txt`.

The package exports raw inputs only. Processing and release assembly are performed by the repository's `scripts/2-process-datamine.ps1`. Multype uses a separate scanner and is not updated here.

See `PIPELINE_GUIDE.md` for the source/output map bundled with this package.
