(function () {
  window.addEventListener("DOMContentLoaded", () => {
    if (!window.TofMultypeCore) {
      return;
    }

    window.TofMultypeCore.createMultypeApp({
      rootSelector: "[data-multype-app]",
      pageKind: "public",
      initialMode: "renamed",
      dataUrl: "./module_extra_to_files_mapping3.json",
      renamesUrl: "./renames.base.json",
      storageKey: "tof-multype-local-renames-v1",
      pageTitle: "Multype datamine viewer",
      pageEyebrow: "Datamine / Multype",
      pageDescription:
        "Datamined buff categories from the Tower of Fantasy exporter scanner repo. Different columns are multiplicative, the same column is additive. If several fields are merged into one, they are replaceable; if not, they are stackable, but not always XD."
    });
  });
})();
