# Version tracker

`version-tracker.js` is an operations tool that checks the configured game-client version endpoints and updates `version-current.json` and `version-history.txt` when a version changes.

Run it from the repository root:

```powershell
npm run check:versions
```

This tool is separate from the Datamine release manifest. Keep the existing `korea1` and `korea2` endpoint mapping unchanged unless the upstream client layout is intentionally updated.
