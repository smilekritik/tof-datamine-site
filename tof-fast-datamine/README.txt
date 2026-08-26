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
