# Portable two-stage Datamine package

Stage 1 extracts files from the game client. Stage 2 reads that export and builds a replacement datamine/ tree without a source checkout or an existing Datamine folder.

There are two launch options:

RUN_EXPORT_SMALL.bat — the short export for regular data handoffs.
It exports all required JSON files. For images it checks only the void and WorldBossList folders, while UnrealExporter skips previously extracted images listed in exported-images-ignore.txt.
Output: raw_exports_small.zip.

RUN_EXPORT_FULL.bat — the full export for refreshing the complete image database.
It exports the required JSON files and every configured image folder without applying the image ignore list.
Output: raw_exports_full.zip.

How it works

1. The script reads the Tower of Fantasy path from GAME_PATH.txt or asks you to select it. The file is created locally only after a folder is selected.
2. The previous raw_exports folder is deleted.
3. An UnrealExporter config is generated for the selected mode: SMALL disables unnecessary image exports in the application config, while FULL enables the complete set.
4. Twelve structured source groups are validated in raw_exports/export-validation.txt in both modes. FULL also validates three image groups.
5. The matching archive is created after successful validation.

What to send to kritik

Normally run RUN_EXPORT_SMALL.bat and send raw_exports_small.zip.
Use RUN_EXPORT_FULL.bat and send raw_exports_full.zip when the complete image database needs to be refreshed.

exported-images-ignore.txt is the one-time index of images already exported to raw_exports_temp. It is not regenerated on each run.

Multype is not updated by this pipeline.

Processing

Run RUN_PROCESS.bat after either export. It accepts raw_exports_full.zip, raw_exports_small.zip, or a raw_exports folder. A successful run writes dist_datamine_bundle/datamine and dist_datamine_bundle.zip. Copy the generated datamine folder over the main Datamine folder with replacement enabled.

The package includes physical copies of canonical processors and the manually maintained inputs required to preserve item renames, FCE cards, OOW dates, and the buff catalog. package-manifest.json records processor hashes and the input list. Processing validates required JSON and outputs before publication. Failed processing keeps raw inputs and does not publish an empty or stale bundle. A temporary ZIP extraction is removed only after validation succeeds; export-only ZIP files remain.

The config contains 27 exact structured-data rules and 9 image rules. FCE runtime data is fce-index.json plus manually maintained bosses/*.json, not the former monolithic fce-bosses files.

Delete GAME_PATH.txt if you need to change the saved game path. Do not distribute a package containing a machine-specific path.
