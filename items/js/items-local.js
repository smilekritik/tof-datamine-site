(function () {
  window.addEventListener("DOMContentLoaded", () => {
    if (!window.TofLeaksItemsCore) {
      return;
    }

    window.TofLeaksItemsCore.createItemsApp({
      rootSelector: "[data-items-app]",
      dataUrls: ["./merged_mapping_with_original.json"],
      editable: true,
      pageTitle: "",
      pageHint: "Double click rename to edit. Enter or blur saves, Escape cancels.",
      emptyRenameLabel: ""
    });
  });
})();
