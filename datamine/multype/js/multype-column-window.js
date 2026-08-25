(function (factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof window !== "undefined") {
    window.TofMultypeColumnWindow = api;
  }
})(function () {
  const DESKTOP_GEOMETRY = Object.freeze({
    boardPadding: 18,
    mainGap: 18,
    mainBorder: 2,
    bodyPadding: 14,
    subWidth: 320,
    subGap: 12
  });
  const MOBILE_GEOMETRY = Object.freeze({
    boardPadding: 12,
    mainGap: 14,
    mainBorder: 2,
    bodyPadding: 14,
    subWidth: 286,
    subGap: 12
  });

  function getResponsiveGeometry(viewportWidth) {
    return Object.assign({}, Number(viewportWidth) <= 720 ? MOBILE_GEOMETRY : DESKTOP_GEOMETRY);
  }

  function getMainWidth(subCount, geometry) {
    const count = Math.max(0, Number(subCount) || 0);
    const contentWidth = count
      ? count * geometry.subWidth + (count - 1) * geometry.subGap
      : 0;
    return geometry.mainBorder + geometry.bodyPadding * 2 + contentWidth;
  }

  class MultypeColumnWindow {
    constructor(options) {
      const settings = options || {};
      this.overscanColumns = Math.max(0, Number(settings.overscanColumns) || 2);
      this.groups = [];
      this.totalWidth = 0;
      this.geometry = getResponsiveGeometry(1280);
    }

    setModel(groups, options) {
      const settings = options || {};
      this.geometry = Object.assign(
        getResponsiveGeometry(settings.viewportWidth || 1280),
        settings.geometry || {}
      );
      let cursor = this.geometry.boardPadding;
      this.groups = (groups || []).map((group, groupIndex) => {
        const subCount = group?.subEntries?.length || 0;
        const width = getMainWidth(subCount, this.geometry);
        const entry = {
          groupIndex,
          start: cursor,
          end: cursor + width,
          width,
          subCount
        };
        cursor = entry.end + this.geometry.mainGap;
        return entry;
      });
      this.totalWidth = this.groups.length
        ? cursor - this.geometry.mainGap + this.geometry.boardPadding
        : this.geometry.boardPadding * 2;
      return this;
    }

    getPlan(scrollLeft, viewportWidth, scale) {
      const safeScale = Math.max(0.01, Number(scale) || 1);
      const logicalStart = Math.max(0, Number(scrollLeft) || 0) / safeScale;
      const logicalWidth = Math.max(0, Number(viewportWidth) || 0) / safeScale;
      const pitch = this.geometry.subWidth + this.geometry.subGap;
      const overscan = this.overscanColumns * pitch;
      const windowStart = Math.max(0, logicalStart - overscan);
      const windowEnd = logicalStart + logicalWidth + overscan;

      const groups = this.groups.map((group) => {
        const contentStart = group.start + this.geometry.mainBorder / 2 + this.geometry.bodyPadding;
        const localStart = windowStart - contentStart;
        const localEnd = windowEnd - contentStart;
        const start = Math.max(0, Math.min(group.subCount, Math.floor(localStart / pitch)));
        const end = Math.max(start, Math.min(group.subCount, Math.ceil((localEnd + this.geometry.subGap) / pitch)));
        return Object.assign({}, group, { startIndex: start, endIndex: end });
      });

      return {
        totalWidth: this.totalWidth,
        groups,
        signature: groups.map((group) => `${group.startIndex}:${group.endIndex}`).join("|")
      };
    }

    contains(plan, groupIndex, subIndex) {
      const group = plan?.groups?.[groupIndex];
      return Boolean(group && subIndex >= group.startIndex && subIndex < group.endIndex);
    }
  }

  return {
    MultypeColumnWindow,
    getResponsiveGeometry,
    getMainWidth,
    DESKTOP_GEOMETRY,
    MOBILE_GEOMETRY
  };
});
