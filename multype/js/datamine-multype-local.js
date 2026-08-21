(function () {
  window.addEventListener("DOMContentLoaded", () => {
    if (!window.TofMultypeCore) {
      return;
    }

    window.TofMultypeCore.createMultypeApp({
      rootSelector: "[data-multype-app]",
      pageKind: "local",
      dataUrl: "./data/module_extra_to_files_mapping3.json",
      renamesUrl: "./data/renames.base.json",
      storageKey: "tof-multype-local-renames-v1",
      pageTitle: "Multype local rename editor",
      pageEyebrow: "Datamine / Multype / Local",
      pageDescription:
        "Page for self edit table."
    });
  });
})();
