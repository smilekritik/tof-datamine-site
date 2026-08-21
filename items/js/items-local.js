(function () {
  window.addEventListener("DOMContentLoaded", () => {
    if (!window.TofLeaksItemsCore) {
      return;
    }

    window.TofLeaksItemsCore.createItemsApp({
      rootSelector: "[data-items-app]",
      datasets: {
        gacha: {
          label: "Gacha",
          dataUrls: ["./data/merged_mapping_with_original.json"],
          saveMode: "gacha"
        },
        mmo: {
          label: "MMO",
          dataUrls: ["./data/merged_mapping_with_original_mmo.json"],
          saveMode: "mmo"
        }
      },
      editable: true,
      pageTitle: "",
      pageHint: "Double click rename to edit. Enter or blur saves, Escape cancels.",
      emptyRenameLabel: ""
    });
  });
})();
