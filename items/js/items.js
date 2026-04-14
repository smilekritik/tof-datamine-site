(function () {
  window.addEventListener("DOMContentLoaded", () => {
    if (!window.TofLeaksItemsCore) {
      return;
    }

    window.TofLeaksItemsCore.createItemsApp({
      rootSelector: "[data-items-app]",
      dataUrls: ["./merged_mapping_with_original.json"],
      editable: false,
      pageTitle: "",
      pageHint: "",
      emptyRenameLabel: ""
    });
  });
})();
