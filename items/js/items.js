(function () {
  window.addEventListener("DOMContentLoaded", () => {
    if (!window.TofLeaksItemsCore) {
      return;
    }

    const app = window.TofLeaksItemsCore.createItemsApp({
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
      editable: false,
      pageTitle: "",
      pageHint: "",
      emptyRenameLabel: ""
    });

    const renderShellUi = () => {
      const language = app.getLanguage();
      document.documentElement.lang = language;
      document.title = app.getText("pageTitle");

    };

    window.DatamineHeader?.setLanguage(app.getLanguage(), false);
    window.addEventListener("datamine:language-change", (event) => {
      app.setLanguage(event.detail?.language);
      renderShellUi();
    });

    renderShellUi();
  });
})();
