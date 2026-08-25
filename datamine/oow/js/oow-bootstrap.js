import {
  DATA_SOURCES,
  fetchFirstJson,
  getActiveSeasonNumber,
  parseOowDeepLink,
  pluralRu as selectRussianPlural,
  resolveFceBoss as resolveFceBossFromIndex
} from './domain/oow-domain.js';
import {
  getDialogControls,
  OOW_CHART_THEME_COOKIE,
  renderMechanicContent,
  resolveOowChartTheme,
  syncDialogInertState,
  writeOowCookie
} from './adapters/oow-view-adapters.js';

const runtime = window.TofDatamine?.dcRuntime;
if (!runtime) throw new Error('OOW bootstrap: dcRuntime compatibility facade is unavailable');
const { React, DCLogic } = runtime.getDependencies();

export class OowController extends DCLogic {
  state = {
    mode: 'standard',
    tab: 'table',
    lang: window.DatamineHeader?.getLanguage() === 'ru' ? 'ru' : 'en',
    seasonIdx: 22,
    filter: 'ramp',
    unit: 'G',
    expandedFloor: null,
    search: null,
    modal: null,
    mechanicsExpanded: false,
    mechanicsLoading: false,
    mechanicsError: false,
    chartMode: 'ehp',
    chartMetric: 'boss',
    chartRange: 'ramp',
    chartTheme: resolveOowChartTheme(),
    promotedSub: null,
    active: [19, 20, 21, 22],
    chartHoverFloor: null,
    jumpMode: 'season',
    jumpHoverFloor: null,
    histHoverSeason: null,
    diffFloor: null,
    diffFilter: 'ramp',
    scrolled: false,
    zoomImg: null,
    zoomScale: 1,
    zoomPan: { x: 0, y: 0 },
    railCollapsed: false,
    tip: null,
    compareOpen: false,
    compareIdx: 21,
    toast: null,
    dataError: null,
    seasonError: null
  };

  constructor(props) {
    super(props);
    this.railRef = React.createRef();
    this._datasets = null;
    this._datesMap = {};
    this._fceIndex = null;
    this._fceBossCache = new Map();
    this._seasonCache = new Map();
    this._seasonRequests = new Map();
    this._floorFocusTimers = [];
  }

  _hydrateImgs() {
    try {
      const root = (this._el && this._el.ownerDocument) || document;
      root.querySelectorAll('img[data-src]').forEach((im) => {
        const v = im.getAttribute('data-src');
        if (v && v.indexOf('{{') === -1 && im.getAttribute('src') !== v) {
          const fallback = im.getAttribute('data-fallback-src');
          im.onerror = () => {
            im.onerror = null;
            if (fallback && im.getAttribute('src') !== fallback) {
              im.setAttribute('src', fallback);
            } else if (im.classList.contains('oow-mob-avatar')) {
              const defaultMob = 'assets/monsters/placeholder-mob.png';
              if (im.getAttribute('src') !== defaultMob) {
                im.setAttribute('src', defaultMob);
              }
            } else {
              im.style.display = 'none';
              im.setAttribute('aria-hidden', 'true');
              const parent = im.parentElement;
              if (parent && !parent.querySelector('.oow-img-fallback-placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'oow-img-fallback-placeholder';
                placeholder.setAttribute('aria-hidden', 'true');
                parent.appendChild(placeholder);
              }
            }
          };
          im.onload = () => {
            im.style.display = '';
            im.removeAttribute('aria-hidden');
            const parent = im.parentElement;
            const existingPlaceholder = parent?.querySelector('.oow-img-fallback-placeholder');
            if (existingPlaceholder) existingPlaceholder.remove();
          };
          im.setAttribute('src', v);
        }
      });
    } catch (e) {}
  }

  _scrollRailToSeason(seasonNum, comfortable = false, preservedScrollTop = null) {
    try {
      const run = () => {
        const list = this.railRef.current;
        if (!list) return;
        if (preservedScrollTop != null) list.scrollTop = preservedScrollTop;
        const target = seasonNum != null
          ? list.querySelector('[data-season-pill="' + seasonNum + '"]')
          : list.querySelector('[data-active-pill="1"]');
        if (!target) return;

        // Work entirely in the rail's own coordinate space. scrollIntoView()
        // is deliberately avoided because it may also scroll the document.
        const listRect = list.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const targetTop = targetRect.top - listRect.top + list.scrollTop;
        const targetBottom = targetTop + targetRect.height;
        const inset = 8;
        const visibleTop = list.scrollTop + inset;
        const visibleBottom = list.scrollTop + list.clientHeight - inset;

        if (targetTop >= visibleTop && targetBottom <= visibleBottom) return;

        if (comfortable) {
          const centered = targetTop - ((list.clientHeight - targetRect.height) / 2);
          const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
          list.scrollTop = Math.max(0, Math.min(centered, maxScrollTop));
        } else if (targetTop < visibleTop) {
          list.scrollTop = Math.max(0, targetTop - inset);
        } else {
          list.scrollTop = targetBottom - list.clientHeight + inset;
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
    } catch (e) {}
  }

  getMainBoss(floor) {
    if (!floor || !floor.enemies || !floor.enemies.length) return null;
    const bosses = floor.enemies.filter((e) => e.monsterType === 'BS_MONSTER_BOSS' || /boss_/i.test(e.codeName || e.id || ''));
    if (!bosses.length) return floor.enemies[0];
    bosses.sort((a, b) => (b.combinedHp || b.hp || 0) - (a.combinedHp || a.hp || 0));
    return bosses[0];
  }

  getActiveSeasonNumber(seasons) {
    return getActiveSeasonNumber(seasons);
  }

  async fetchFirstJson(urls) {
    return fetchFirstJson(urls);
  }

  _showInitialDatasets(datasets) {
    this._datasets = datasets;
    this._datesMap = {};
    this._sc = {};
    const mode = this._deepLink?.mode || this.state.mode;
    const ss = this.buildSeasons(mode);
    const defaultSeasonNum = this.getActiveSeasonNumber(ss);
    const requestedSeasonNum = this._deepLink?.season;
    const activeSeasonNum = requestedSeasonNum != null && ss.some((s) => Number(s.season) === Number(requestedSeasonNum))
      ? Number(requestedSeasonNum)
      : defaultSeasonNum;
    const curSea = ss.find((s) => Number(s.season) === Number(activeSeasonNum)) || ss[ss.length - 1];
    if (!curSea) return false;

    this.setState({
      mode,
      seasonIdx: activeSeasonNum,
      expandedFloor: null,
      diffFloor: curSea.floorCount,
      filter: 'ramp',
      diffFilter: 'ramp',
      active: ss.map((x) => x.season).slice(-4),
      compareIdx: activeSeasonNum > 1 ? activeSeasonNum - 1 : activeSeasonNum
    }, async () => {
      this._applyDeepLink();
      if (!this._deepLink) this._scrollRailToSeason(activeSeasonNum, true);
      const key = `${mode}_${activeSeasonNum}`;
      if (!this._seasonCache.has(key)) {
        await this.loadSeasonData(mode, activeSeasonNum);
        if (!this._unmounted) this.forceUpdate();
      }
    });
    return true;
  }

  _mergeBootstrapDataset(indexDataset, currentDataset) {
    const indexSeasons = Array.isArray(indexDataset?.seasons) ? indexDataset.seasons : [];
    const currentSeasons = Array.isArray(currentDataset?.seasons) ? currentDataset.seasons : [];
    const detailedBySeason = new Map(currentSeasons.map((season) => [Number(season.season), season]));
    const seasons = indexSeasons.map((season) => detailedBySeason.get(Number(season.season)) || season);
    currentSeasons.forEach((season) => {
      if (!seasons.some((item) => Number(item.season) === Number(season.season))) seasons.push(season);
    });
    seasons.sort((a, b) => Number(a.season) - Number(b.season));
    return {
      meta: { ...(indexDataset?.meta || {}), ...(currentDataset?.meta || {}) },
      seasons
    };
  }

  async loadSeasonData(mode, seasonNumber, retry = false) {
    mode = mode || 'standard';
    const key = `${mode}_${seasonNumber}`;
    if (this._seasonCache.has(key)) return this._seasonCache.get(key);
    if (!retry && this._seasonRequests.has(key)) return this._seasonRequests.get(key);

    const pad = String(seasonNumber).padStart(2, '0');
    const filename = mode === 'mmo' ? `mmo_s${pad}.json` : `s${pad}.json`;
    const urls = Array.from(new Set([
      `./data/seasons/${filename}?v=13`,
      `/datamine/oow/data/seasons/${filename}?v=13`
    ].map((url) => new URL(
      url,
      typeof location !== 'undefined' ? location.href : 'http://localhost/datamine/oow/',
    ).href)));

    const request = (async () => {
      const data = await this.fetchFirstJson(urls);
      if (data && Number(data.season) === Number(seasonNumber) && !this._unmounted) {
        this._seasonCache.set(key, data);
        if (this._datasets && this._datasets[mode] && Array.isArray(this._datasets[mode].seasons)) {
          const idx = this._datasets[mode].seasons.findIndex((s) => Number(s.season) === Number(seasonNumber));
          if (idx !== -1) this._datasets[mode].seasons[idx] = data;
          else this._datasets[mode].seasons.push(data);
          if (this._sc) delete this._sc[mode];
        }
        this.setState({ seasonError: null });
        if (this._deepLink && !this._deepLink._done) requestAnimationFrame(() => this._tryOpenDeepLinkCard());
        return data;
      }
      if (!this._unmounted && mode === this.state.mode && Number(seasonNumber) === Number(this.state.seasonIdx)) {
        this.setState({ seasonError: { mode, season: Number(seasonNumber) } });
      }
      return null;
    })().finally(() => this._seasonRequests.delete(key));
    this._seasonRequests.set(key, request);
    return request;
  }

  async selectSeason(seasonNumber) {
    const preservedRailScrollTop = this.railRef.current?.scrollTop ?? null;
    this.setState({
      seasonIdx: seasonNumber,
      expandedFloor: null,
      search: null,
      diffFloor: seasonNumber === this.state.seasonIdx ? this.state.diffFloor : null
    }, () => this._scrollRailToSeason(seasonNumber, false, preservedRailScrollTop));

    const mode = this.state.mode;
    const key = `${mode}_${seasonNumber}`;
    if (!this._seasonCache.has(key)) {
      const seasonData = await this.loadSeasonData(mode, seasonNumber);
      if (seasonData && !this._unmounted) {
        this.forceUpdate();
        this._scrollRailToSeason(seasonNumber, false, preservedRailScrollTop);
      }
    }
  }

  async loadDatamineData() {
    if (!this._unmounted) this.setState({ dataError: null });
    try {
      const [indexData, currentSummary] = await Promise.all([
        this.fetchFirstJson(DATA_SOURCES.index),
        this.fetchFirstJson(DATA_SOURCES.current)
      ]);

      const indexValid = indexData && indexData.standard && Array.isArray(indexData.standard.seasons) && indexData.standard.seasons.length > 0 && indexData.mmo && Array.isArray(indexData.mmo.seasons);
      if (indexValid && !this._unmounted) {
        this._datasets = {
          standard: indexData.standard || { seasons: [] },
          mmo: indexData.mmo || { seasons: [] }
        };
        this._datesMap = indexData.dates || {};

        // summary is optional lightweight metadata only; full payloads are
        // never hydrated from it and always come from the selected shard.
        this._currentSummary = currentSummary && currentSummary.schemaVersion === 2 ? currentSummary : null;

        this._showInitialDatasets(this._datasets);

        return;
      }
      if (!this._unmounted) this.setState({ dataError: 'index' });
    } catch (e) {
      console.error('[oow] Required shard index could not be loaded.', e);
      if (!this._unmounted) this.setState({ dataError: 'index' });
    }
  }

  // ---- Shareable deep-linking (query params) -----------------------------
  // Only the load-bearing "which view" state is encoded: season (s), dataset
  // (mode), the Graphs/Difficulties tab (tab), and the open opponent card
  // (floor + mob code). Everything else (filters, units, search, chart tuning)
  // is intentionally left out so links stay short and stable.

  _parseDeepLink() {
    return parseOowDeepLink(window.DatamineUrlState);
  }

  // Applies the parsed deep link after data has loaded. Called from both the
  // bootstrap and the full-data load callbacks: the first call applies the
  // base view (mode/season/tab) and, for lightweight "season-index" seasons,
  // waits for the full dataset before the opponent card can be resolved.
  _applyDeepLink() {
    if (this._deepLinkApplied) return;
    const dl = this._deepLink;
    if (!dl) { this._deepLinkApplied = true; return; }

    if (!dl._baseApplied) {
      dl._baseApplied = true;
      const targetMode = dl.mode || this.state.mode;
      const ss = this.buildSeasons(targetMode);
      let season = dl.season;
      if (season == null || !ss.some((s) => Number(s.season) === Number(season))) {
        season = this.getActiveSeasonNumber(ss);
      }
      const patch = { mode: targetMode, seasonIdx: season };
      if (dl.tab) patch.tab = dl.tab;
      if (dl.floor != null) patch.expandedFloor = dl.floor;

      this.setState(patch, () => {
        this._scrollRailToSeason(season, true);
        const season2 = this._datasets?.[this.state.mode]?.seasons?.find(
          (s) => Number(s.season) === Number(this.state.seasonIdx)
        );
        const fullDataPromise = season2?.cacheScope === 'season-index'
          ? this.loadSeasonData(this.state.mode, this.state.seasonIdx)
          : null;
        if (dl.floor != null && !dl.mob) {
          this._scrollExpandedFloorIntoView(dl.floor);
        }
        if (fullDataPromise && dl.floor != null) {
          fullDataPromise.then(() => {
            if (this._unmounted || Number(this.state.expandedFloor) !== Number(dl.floor)) return;
            // The lightweight index opens the drawer before its lineup has its
            // final height. Focus it again after full data has rendered.
            this._scrollExpandedFloorIntoView(dl.floor);
          });
        }
        this._tryOpenDeepLinkCard();
      });
      return;
    }

    // Subsequent call (phase-2 full data): retry the opponent card only.
    this._tryOpenDeepLinkCard();
  }

  _tryOpenDeepLinkCard() {
    const dl = this._deepLink;
    if (!dl || dl._done) return;
    if (dl.mob && dl.floor != null) {
      const ok = this.openOpponentByCode(this.state.seasonIdx, dl.floor, dl.mob);
      if (!ok) return; // enemies not loaded yet; wait for the phase-2 retry.
    }
    dl._done = true;
    this._deepLinkApplied = true; // deep link settled: URL syncing may begin.
  }

  // Reopens an opponent card by its code name without any new modal logic:
  // it rebuilds the target floor's lineup with the existing buildLineup() and
  // invokes the matching mob's own onOpen() (which sets state.modal).
  openOpponentByCode(seasonNumber, floorNumber, code) {
    const ss = this.buildSeasons(this.state.mode);
    const sea = ss.find((s) => Number(s.season) === Number(seasonNumber));
    if (!sea) return false;
    const f = (sea.floors || []).find((fl) => Number(fl.floor) === Number(floorNumber));
    if (!f || !(f.enemies && f.enemies.length)) return false;
    const { waves } = this.buildLineup(sea, f, this.state.unit);
    for (const wave of waves) {
      const mob = (wave.mobs || []).find((m) => m.id === code);
      if (mob && typeof mob.onOpen === 'function') {
        mob.onOpen();
        return true;
      }
    }
    return false;
  }

  // Mirrors the current view into the address bar (defaults omitted). Held off
  // until the incoming deep link has been applied so it is never clobbered.
  _syncUrl() {
    const store = window.DatamineUrlState;
    if (!store || !this._deepLinkApplied) return;
    const st = this.state;
    const modal = st.modal;
    // A card carries its own floor; otherwise reflect the expanded floor drawer.
    const floor = modal ? modal.floor : (st.expandedFloor != null ? st.expandedFloor : null);
    store.write({
      s: st.seasonIdx != null ? st.seasonIdx : null,
      mode: st.mode === 'standard' ? null : st.mode,
      tab: st.tab === 'table' ? null : st.tab,
      floor: floor,
      mob: modal ? modal.id : null
    });
  }

  componentDidMount() {
    this._hydrateImgs();
    this._deepLink = this._parseDeepLink();
    this._deepLinkApplied = false;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.lang = this.state.lang;
    this._prevLang = this.state.lang;
    this._prevMode = this.state.mode;
    this._prevExpandedFloor = this.state.expandedFloor;
    this._onScroll = () => {
      const s = (window.scrollY || 0) > 420;
      if (s !== this.state.scrolled) this.setState({ scrolled: s });
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    this._onScroll();
    this._onLanguageChange = (event) => {
      const lang = event.detail?.language === 'ru' ? 'ru' : 'en';
      if (lang !== this.state.lang) this.setState({ lang });
    };
    window.addEventListener('datamine:language-change', this._onLanguageChange);
    this._dialogKeydown = (event) => {
      const kind = this.state.zoomImg ? 'lightbox' : (this.state.modal ? 'boss' : null);
      if (!kind) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (kind === 'lightbox') this.setState({ zoomImg: null, zoomScale: 1, zoomPan: { x: 0, y: 0 } });
        else this.setState({ modal: null, mechanicsLoading: false, mechanicsError: false });
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector('[data-oow-dialog="' + kind + '"]');
      if (!dialog) return;
      const controls = getDialogControls(dialog);
      if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', this._dialogKeydown);
    this._prevModalOpen = false;
    this._prevZoomOpen = false;
    this.loadDatamineData().then(() => {
      if (!this._unmounted && this._deepLink?.floor != null) {
        // The custom template renderer may apply initial URL state before its
        // first expanded drawer commit. Re-check after both the initial commit
        // and the later lineup/layout settlement.
        const floor = this._deepLink.floor;
        [250, 1000].forEach((delay) => {
          const timer = setTimeout(() => {
            if (!this._unmounted && Number(this.state.expandedFloor) === Number(floor)) {
              this._scrollExpandedFloorIntoView(floor);
            }
          }, delay);
          this._floorFocusTimers.push(timer);
        });
      }
    });
    this.loadFceIndex();
  }

  componentDidUpdate() {
    this._hydrateImgs();
    if (this._prevExpandedFloor !== this.state.expandedFloor) {
      this._prevExpandedFloor = this.state.expandedFloor;
      if (this.state.expandedFloor != null) {
        // Run from the post-render lifecycle so URL-driven expansion and a
        // direct click share the same mounted-drawer focus behavior.
        this._scrollExpandedFloorIntoView(this.state.expandedFloor);
      }
    }
    if (this._prevLang !== this.state.lang) {
      this._prevLang = this.state.lang;
      document.documentElement.lang = this.state.lang;
    }
    if (this._prevMode !== this.state.mode) {
      this._prevMode = this.state.mode;
      this._scrollRailToSeason();
    }
    const modalOpen = !!this.state.modal;
    const zoomOpen = !!this.state.zoomImg;
    const modalOpening = modalOpen && !this._prevModalOpen;
    const modalClosing = !modalOpen && this._prevModalOpen;
    const zoomOpening = zoomOpen && !this._prevZoomOpen;
    const zoomClosing = !zoomOpen && this._prevZoomOpen;
    if (modalOpening) this._modalReturnFocus = document.activeElement;
    if (zoomOpening) this._zoomReturnFocus = document.activeElement;
    this._syncDialogInertState(modalOpen, zoomOpen);
    if (modalOpening) {
      requestAnimationFrame(() => document.querySelector('[data-oow-dialog="boss"] button')?.focus());
    } else if (modalClosing && this._modalReturnFocus?.isConnected) {
      this._modalReturnFocus.focus();
    }
    if (zoomOpening) {
      requestAnimationFrame(() => document.querySelector('[data-oow-dialog="lightbox"] button')?.focus());
    } else if (zoomClosing && this._zoomReturnFocus?.isConnected) {
      this._zoomReturnFocus.focus();
    }
    this._prevModalOpen = modalOpen;
    this._prevZoomOpen = zoomOpen;
    this._syncUrl();
  }

  componentWillUnmount() {
    this._unmounted = true;
    if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
    if (this._onLanguageChange) window.removeEventListener('datamine:language-change', this._onLanguageChange);
    if (this._dialogKeydown) document.removeEventListener('keydown', this._dialogKeydown);
    this._syncDialogInertState(false, false);
    clearTimeout(this._tt);
    this._floorFocusTimers.forEach(clearTimeout);
  }

  _syncDialogInertState(modalOpen, zoomOpen) {
    syncDialogInertState(document, modalOpen, zoomOpen);
  }

  async loadFceIndex() {
    if (this._fceIndex) return this._fceIndex;
    const data = await this.fetchFirstJson(DATA_SOURCES.fceIndex);
    if (data && !this._unmounted) {
      this._fceIndex = data;
      this.forceUpdate();
    }
    return data;
  }

  resolveFceBoss(m) {
    return resolveFceBossFromIndex(m, this._fceIndex);
  }

  toggleMechanics = () => {
    const m = this.state.modal;
    const fceBoss = this.resolveFceBoss(m);
    if (!fceBoss) return;
    const slug = fceBoss.slug;

    if (this.state.mechanicsExpanded) {
      this.setState({ mechanicsExpanded: false });
      return;
    }

    if (this._fceBossCache.has(slug)) {
      this.setState({
        mechanicsExpanded: true,
        mechanicsLoading: false,
        mechanicsError: false
      });
      return;
    }

    this.setState({
      mechanicsExpanded: true,
      mechanicsLoading: true,
      mechanicsError: false
    });

    this.fetchBossMechanics(slug);
  };

  async fetchBossMechanics(slug) {
    try {
      const urls = [
        `../fce/data/bosses/${encodeURIComponent(slug)}.json`,
        `/datamine/fce/data/bosses/${encodeURIComponent(slug)}.json`
      ];
      const data = await this.fetchFirstJson(urls);
      if (!data) throw new Error('Could not load boss mechanics JSON');
      if (!this._unmounted) {
        this._fceBossCache.set(slug, data);
        this.setState({
          mechanicsLoading: false,
          mechanicsError: false
        });
      }
    } catch (err) {
      if (!this._unmounted) {
        this.setState({
          mechanicsLoading: false,
          mechanicsError: true
        });
      }
    }
  }

  retryLoadMechanics = () => {
    const m = this.state.modal;
    const fceBoss = this.resolveFceBoss(m);
    if (!fceBoss) return;
    this.setState({ mechanicsLoading: true, mechanicsError: false });
    this.fetchBossMechanics(fceBoss.slug);
  };

  seasonColor(s) {
    return 'hsl(' + ((s * 47 + 18) % 360) + ' 68% 64%)';
  }

  _scrollExpandedFloorIntoView(floorNum, attemptsRemaining = 20) {
    if (floorNum == null) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const drawerEl = document.querySelector(`[data-oow-floor-details="${floorNum}"]`);
        const rowEl = document.querySelector(`[data-oow-floor-row="${floorNum}"]`);
        if (!drawerEl) {
          // The state callback can run before the template has mounted the
          // expanded drawer. A visible row is not enough: its final panel may
          // be hundreds of pixels taller and require document scrolling.
          if (attemptsRemaining > 0 && Number(this.state.expandedFloor) === Number(floorNum)) {
            setTimeout(() => this._scrollExpandedFloorIntoView(floorNum, attemptsRemaining - 1), 50);
          }
          return;
        }

        const drawerRect = drawerEl.getBoundingClientRect();
        const rowRect = rowEl ? rowEl.getBoundingClientRect() : drawerRect;

        const headerHeight = 72; // Top navigation bar clearance
        const bottomPadding = 24;
        const windowHeight = window.innerHeight;

        const topEdge = rowRect.top;
        const bottomEdge = drawerRect.bottom;
        const totalHeight = bottomEdge - topEdge;

        // Check if the entire expanded floor row and drawer are already comfortably visible
        const isFullyVisible = (topEdge >= headerHeight) && (bottomEdge <= windowHeight - bottomPadding);
        if (isFullyVisible) {
          return; // Already fits completely, no scroll needed
        }

        let targetScrollY = window.pageYOffset;

        if (totalHeight <= (windowHeight - headerHeight - bottomPadding)) {
          // Entire expanded floor fits within visible viewport height -> scroll so both row and drawer fit snugly
          if (bottomEdge > windowHeight - bottomPadding) {
            const overflowBottom = bottomEdge - (windowHeight - bottomPadding);
            targetScrollY = window.pageYOffset + overflowBottom;
          } else if (topEdge < headerHeight) {
            const overflowTop = headerHeight - topEdge + 8;
            targetScrollY = window.pageYOffset - overflowTop;
          }
        } else {
          // Drawer is taller than viewport height -> align top of the floor row just below the fixed header
          targetScrollY = window.pageYOffset + topEdge - headerHeight - 10;
        }

        window.scrollTo({
          top: Math.max(0, Math.round(targetScrollY)),
          behavior: 'smooth'
        });
      });
    });
  }

  setMode(m) {
    const ss = this.buildSeasons(m);
    const activeSeasonNum = this.getActiveSeasonNumber(ss);
    const curSea = ss.find((s) => s.season === activeSeasonNum) || ss[ss.length - 1];
    this.setState({
      mode: m,
      seasonIdx: activeSeasonNum,
      expandedFloor: null,
      diffFloor: curSea ? curSea.floorCount : 28,
      filter: 'ramp',
      diffFilter: 'ramp',
      search: null,
      chartRange: 'ramp',
      active: ss.map((x) => x.season).slice(-4),
      compareIdx: activeSeasonNum > 1 ? activeSeasonNum - 1 : activeSeasonNum
    });
  }

  buildSeasons(mode) {
    mode = mode || 'standard';
    this._sc = this._sc || {};
    if (this._sc[mode]) return this._sc[mode];

    const isMmo = mode === 'mmo';
    const rawData = (this._datasets && this._datasets[mode]) || null;

    if (rawData && rawData.seasons && rawData.seasons.length > 0) {
      const otStart = isMmo ? 33 : 26;
      const datesMap = this._datesMap || {};

      const list = rawData.seasons.map((s) => {
        const sNum = s.season;
        const dateInfo = datesMap[String(sNum)] || {};
        const startISO = s.startDate || dateInfo.startDate || (isMmo ? '2025-01-15' : '2023-01-15');
        const endISO = s.endDate || dateInfo.endDate || (isMmo ? '2025-02-14' : '2023-02-14');
        const sDate = new Date(startISO.replace(/-/g, '/'));
        const eDate = new Date(endISO.replace(/-/g, '/'));
        const pad = (n) => String(n).padStart(2, '0');
        const dates = pad(sDate.getDate()) + '.' + pad(sDate.getMonth() + 1) + ' ~ ' + pad(eDate.getDate()) + '.' + pad(eDate.getMonth() + 1);
        const ver = s.title || dateInfo.version || (isMmo ? ('MMO S' + sNum) : ('v' + (2.2 + (sNum - 1) * 0.1).toFixed(1)));
        const floorCount = s.floors ? s.floors.length : (isMmo ? 36 : (sNum >= 12 ? 28 : 25));

        let resist = 0.8501;
        if (!isMmo) {
          if (sNum <= 11) resist = 0.40 + (sNum - 1) * 0.006;
          else if (sNum === 12) resist = 0.7185;
          else if (sNum === 13) resist = 0.7393;
          else resist = 0.8501;
        }
        const ehpMult = 1 / (1 - resist);

        const f25 = s.floors ? s.floors.find((f) => f.floor === 25) : null;
        const f28 = s.floors ? s.floors.find((f) => f.floor === (isMmo ? 36 : 28)) : null;
        const f25Hp = f25 ? (f25.maxHp || f25.totalHp || 1) : 1;
        const f28Hp = f28 ? (f28.maxHp || f28.totalHp || 1) : 1;
        const f28mult = f28Hp > 0 && f25Hp > 0 ? Number((f28Hp / f25Hp).toFixed(2)) : (isMmo ? 3.6 : 2.5);

        const floors = (s.floors || []).map((fl) => {
          const isOt = fl.floor >= otStart;
          const bossHp = fl.maxHp || fl.totalHp || 0;
          const totalHp = fl.totalHp || bossHp || 0;
          const bossG = bossHp / 1e9;
          const totalG = totalHp / 1e9;
          const mobs = fl.mobCount || (fl.enemies ? fl.enemies.length : 1);
          const waveN = Math.max(1, ...(fl.enemies || []).map((e) => e.wave || 1));

          return {
            floor: fl.floor,
            bossG,
            totalG,
            bossHp,
            totalHp,
            mobs,
            ot: isOt,
            waveN,
            f28mult,
            unlockDay: fl.unlockDay || 1,
            difficultySchedule: fl.difficultySchedule || { initialPct: isOt ? 2000 : 100, daysToMin: 1, steps: [] },
            enemies: fl.enemies || [],
            stageMutators: fl.stageMutators || [],
            dropBuffs: fl.dropBuffs || []
          };
        });

        const peak = Math.max(...floors.map((f) => f.difficultySchedule.initialPct || 100), 100);

        return {
          season: sNum,
          ver,
          dates,
          startISO,
          endISO,
          floorCount,
          otStart,
          resist,
          ehpMult,
          f28mult,
          floors,
          color: this.seasonColor(sNum),
          maxDifficulty: peak
        };
      });

      this._sc[mode] = list;
      return list;
    }

    return [];
  }

  fmt(v, unit) {
    if (v == null || isNaN(v)) return '0';
    if (unit === 'RAW') {
      return Math.round(v * 1e9).toLocaleString('en-US');
    }
    if (unit === 'M') {
      const m = v * 1000;
      return m >= 100 ? (m >= 1000 ? Math.round(m).toLocaleString('en-US') : m.toFixed(1)) : m.toFixed(2);
    }
    // Billions mode.
    if (v >= 10) return v.toFixed(1);
    if (v >= 1) return v.toFixed(2);
    return v.toFixed(2);
  }

  unitLabel(u) {
    if (u === 'RAW') return '';
    if (u === 'M') return 'M';
    return 'G';
  }

  pluralRu(count, one, few, many) {
    return selectRussianPlural(count, one, few, many);
  }

  mobStyle(type) {
    if (type === 'boss') return { bg: 'radial-gradient(120% 130% at 12% 0%, rgba(255,107,139,.22), transparent 56%), rgba(255,107,139,.05)', bd: 'rgba(255,107,139,.4)', bdHover: 'rgba(255,107,139,.7)', hpCol: '#ff9bb2', tagCol: '#ff9bb2', tagBg: 'rgba(255,107,139,.16)' };
    if (type === 'elite') return { bg: 'radial-gradient(120% 130% at 12% 0%, rgba(181,123,255,.22), transparent 56%), rgba(181,123,255,.04)', bd: 'rgba(181,123,255,.32)', bdHover: 'rgba(181,123,255,.6)', hpCol: '#c79dff', tagCol: '#c79dff', tagBg: 'rgba(181,123,255,.16)' };
    return { bg: 'rgba(255,255,255,.03)', bd: 'rgba(255,255,255,.09)', bdHover: 'rgba(79,227,193,.5)', hpCol: '#f6f1fb', tagCol: '#8fe6d4', tagBg: 'rgba(79,227,193,.12)' };
  }

  modalStats(m, sea, isRu) {
    const stats = (m && m.stats) || {};
    const loc = (n) => (n || 0).toLocaleString('en-US');
    const armor = stats.ArmorBase || 0;
    const critDef = stats.FinalCritDef != null ? ((stats.FinalCritDef * 100).toFixed(1).replace(/\.0$/, '') + '%') : '0%';
    const maxHp = stats.MaxHealth || m.hp || 0;
    const hpM = maxHp / 1e6;
    const atk = stats.CommonAtkBase || m.atk || 0;

    const primary = [
      {
        icon: 'assets/icons/stat_hp.svg',
        label: isRu ? 'Максимальное ОЗ' : 'Max Health',
        value: loc(maxHp),
        sub: hpM.toFixed(1) + ' M',
        color: '#ff6b8b',
        valColor: '#ff8fa8',
        bg: 'rgba(255,107,139,.06)',
        bd: 'rgba(255,107,139,.25)',
        iconBg: 'rgba(255,107,139,.14)'
      },
      {
        icon: 'assets/icons/stat_atk.svg',
        label: isRu ? 'Базовая Атака (ATK)' : 'Base Attack (ATK)',
        value: loc(atk),
        sub: (atk / 1e6).toFixed(2) + ' M',
        color: '#f5d97a',
        valColor: '#f6f1fb',
        bg: 'rgba(245,217,122,.06)',
        bd: 'rgba(245,217,122,.25)',
        iconBg: 'rgba(245,217,122,.14)'
      },
      {
        icon: 'assets/icons/stat_armor.svg',
        label: isRu ? 'Прочность щита (Armor)' : 'Shield Points (Armor)',
        value: loc(armor),
        sub: isRu ? 'базовый щит' : 'shield points',
        color: '#4fe3c1',
        valColor: '#4fe3c1',
        bg: 'rgba(79,227,193,.06)',
        bd: 'rgba(79,227,193,.25)',
        iconBg: 'rgba(79,227,193,.14)'
      },
      {
        icon: 'assets/icons/stat_critdef.svg',
        label: isRu ? 'Снижение крит. урона (FinalCritDef)' : 'Crit Resistance (FinalCritDef)',
        value: critDef,
        sub: isRu ? 'анти-крит' : 'reduce crit chance',
        color: '#b57bff',
        valColor: '#c79dff',
        bg: 'rgba(181,123,255,.06)',
        bd: 'rgba(181,123,255,.25)',
        iconBg: 'rgba(181,123,255,.14)'
      }
    ];

    const phyDef = stats.PhyDefBase || m.def || 4000;
    const fireDef = stats.FireDefBase || phyDef;
    const iceDef = stats.IceDefBase || phyDef;
    const thunderDef = stats.ThunderDefBase || phyDef;
    const superDef = stats.SuperpowerDefBase || phyDef;

    const calcRes = (defVal) => (sea && sea.resist) ? ((sea.resist * 100).toFixed(2) + '%') : (((defVal / (defVal + 4000)) * 100).toFixed(1) + '%');

    const elems = [
      { icon: 'assets/icons/elem_phys.png', name: isRu ? 'Физический' : 'Physical', res: calcRes(phyDef), def: loc(phyDef) + ' DEF' },
      { icon: 'assets/icons/elem_fire.png', name: isRu ? 'Огонь' : 'Flame', res: calcRes(fireDef), def: loc(fireDef) + ' DEF' },
      { icon: 'assets/icons/elem_frost.png', name: isRu ? 'Лед' : 'Frost', res: calcRes(iceDef), def: loc(iceDef) + ' DEF' },
      { icon: 'assets/icons/elem_volt.png', name: isRu ? 'Молния' : 'Volt', res: calcRes(thunderDef), def: loc(thunderDef) + ' DEF' },
      { icon: 'assets/icons/elem_altered.png', name: isRu ? 'Альтер' : 'Altered', res: calcRes(superDef), def: loc(superDef) + ' DEF' },
    ];

    const overrides = [];
    const checkOverride = (key, labelEn, labelRu, valFormat, descEn, descRu) => {
      const v = stats[key];
      if (v != null && v !== 0 && v !== '0' && v !== 'None' && v !== '') {
        overrides.push({
          key,
          label: isRu ? labelRu : labelEn,
          val: typeof valFormat === 'function' ? valFormat(v) : String(v),
          desc: isRu ? descRu : descEn
        });
      }
    };

    checkOverride('PhyDefIgnoreMult', 'Phys Def Ignore Mult', 'Игнор физ. защиты', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('FireDefIgnoreMult', 'Flame Def Ignore Mult', 'Игнор огненной защиты', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('IceDefIgnoreMult', 'Frost Def Ignore Mult', 'Игнор ледяной защиты', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('ThunderDefIgnoreMult', 'Volt Def Ignore Mult', 'Игнор электро защиты', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('SuperpowerDefIgnoreMult', 'Altered Def Ignore Mult', 'Игнор альтер защиты', (v) => Math.round(v * 100) + '%', '', '');

    // ExecuteMult: strictly only show if not 0 and not 150% (150% is standard normal value)
    const execV = stats.ExecuteMult;
    if (execV != null && execV !== 0 && execV !== '0' && execV !== 150 && execV !== '150' && execV !== 1.5 && execV !== '150%') {
      overrides.push({
        key: 'ExecuteMult',
        label: isRu ? 'Множитель казни' : 'Execution Multiplier',
        val: execV + '%',
        desc: ''
      });
    }

    checkOverride('Crit', 'Base Crit Rate', 'Базовый крит. шанс', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('CritDef', 'Base Crit Evasion', 'Базовое уклонение от крита', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('FinalCrit', 'Final Crit Probability', 'Итоговый крит. шанс', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('AbnormalState', 'Abnormal State Infliction', 'Сила аномального состояния', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('AbnormalStateResistance', 'Abnormal State Resistance', 'Сопротивление аномалиям', (v) => Math.round(v * 100) + '%', '', '');
    checkOverride('Rigidity', 'Rigidity (Stagger Power)', 'Сила ошеломления', (v) => loc(v), '', '');
    checkOverride('RigidityResistance', 'Rigidity Resistance', 'Сопротивление пошатыванию', (v) => loc(v), '', '');
    checkOverride('MaxRage', 'Max Rage Gauge', 'Макс. шкала ярости', (v) => loc(v), '', '');

    return { primary, elems, overrides };
  }

  buildLineup(sea, f, unit) {
    const isRu = this.state.lang === 'ru';
    const resistStr = (sea.resist * 100).toFixed(2) + '%';
    const enemies = f.enemies || [];

    if (!enemies.length) {
      return { waves: [], resistStr };
    }

    const waveMap = new Map();
    enemies.forEach((m) => {
      const w = m.wave || 1;
      if (!waveMap.has(w)) waveMap.set(w, []);
      waveMap.get(w).push(m);
    });

    const waves = [];
    Array.from(waveMap.keys()).sort((a, b) => a - b).forEach((wNum) => {
      const mobsInWave = waveMap.get(wNum).slice().sort((a, b) => {
        const hpA = a.combinedHp || a.hp || 0;
        const hpB = b.combinedHp || b.hp || 0;
        return hpB - hpA;
      });
      const isFinalWave = wNum === waveMap.size;
      const tag = isFinalWave ? (isRu ? 'Финальный босс' : 'Final Boss') : (wNum === 1 ? (isRu ? 'Авангард' : 'Vanguard') : (isRu ? 'Штурм' : 'Assault'));

      const totalMobs = mobsInWave.length;
      const mobs = mobsInWave.map((m, idx) => {
        let flex = '1 1 300px';
        if (totalMobs === 4) {
          flex = (idx === 0) ? '1 1 100%' : '1 1 calc(33.333% - 12px)';
        } else if (totalMobs === 5) {
          flex = (idx === 0 || idx === 1) ? '1 1 calc(50% - 12px)' : '1 1 calc(33.333% - 12px)';
        } else if (totalMobs === 3) {
          flex = '1 1 calc(33.333% - 12px)';
        } else if (totalMobs === 2) {
          flex = '1 1 calc(50% - 12px)';
        } else if (totalMobs === 1) {
          flex = '1 1 100%';
        }

        const code = m.codeName || m.blueprint || m.bossId || '';
        const isBoss = m.monsterType === 'BS_MONSTER_BOSS' || /boss_/i.test(code) || /boss/i.test(m.bossId || '');
        const isElite = !isBoss && (m.monsterType === 'BS_MONSTER_ELITE' || /elite/i.test(m.nameEn || '') || /elite/i.test(code) || m.hpBillions >= 0.05 || (m.hp && m.hp >= 5e7));
        const type = isBoss ? 'boss' : (isElite ? 'elite' : 'norm');
        const cls = isBoss ? (isRu ? 'Босс' : 'Boss') : (isElite ? (isRu ? 'Элита' : 'Elite') : (isRu ? 'Моб' : 'Creep'));
        const id = code || m.key || ('mob_' + (m.mob || m.mobIndex || (idx + 1)));

        const placeholderMap = {
          boss: 'assets/monsters/placeholder-boss.png',
          elite: 'assets/monsters/placeholder-elite.png',
          norm: 'assets/monsters/placeholder-mob.png'
        };
        const fallbackImg = placeholderMap[type] || 'assets/monsters/placeholder-mob.png';

        let name = isRu ? (m.nameRu || m.nameEn) : (m.nameEn || m.nameRu || ('Enemy #' + (m.mob || m.mobIndex || (idx + 1))));
        let img = m.image;
        if (isBoss) {
          const fceBoss = this.resolveFceBoss(m);
          if (fceBoss) {
            if (fceBoss.slug) {
              img = `../fce/assets/bosses/${fceBoss.slug}.png`;
            }
            name = isRu ? (fceBoss.name_ru || fceBoss.name) : (fceBoss.name || fceBoss.name_ru);
          }
        }
        if (!img || img.includes('placeholder_') || img.includes('placeholder-')) {
          img = fallbackImg;
        }

        const hpValG = (m.combinedHp || m.hp || 0) / 1e9;
        const atkValG = (m.atk || 0) / 1e6;
        const st = this.mobStyle(type);

        const buffs = (m.inherentBuffs || []).filter((b) => b.id && !b.id.toLowerCase().includes('immuneeverything')).map((b) => ({
          icon: b.icon || 'assets/buffs/buff_AddElementDefFoodBase.png',
          name: isRu ? (b.nameRu || b.nameEn) : (b.nameEn || b.nameRu),
          desc: isRu ? (b.descRu || b.descEn) : (b.descEn || b.descRu)
        }));

        const ms = this.modalStats(m, sea, isRu);

        const mobObj = {
          name,
          flex,
          img,
          fallbackImg,
          type,
          cls,
          id,
          isBoss,
          hp: this.fmt(hpValG, unit),
          unit: this.unitLabel(unit),
          ehp: this.fmt(hpValG * sea.ehpMult, unit) + (this.unitLabel(unit) ? ' ' + this.unitLabel(unit) : ''),
          ehpNum: this.fmt(hpValG * sea.ehpMult, unit),
          sub: (m.count > 1 ? '×' + m.count + ' · ' : '') + 'ATK ' + this.fmt(atkValG, 'M') + 'M',
          buffs,
          ...st,
        };

        mobObj.onOpen = () => {
          const modalData = {
            name,
            img,
            fallbackImg,
            type,
            cls,
            id,
            isBoss,
            codeName: m.codeName || '',
            blueprint: m.blueprint || '',
            bossId: isBoss ? (m.bossId || '') : '',
            monsterType: m.monsterType || '',
            hp: this.fmt(hpValG, unit) + ' ' + this.unitLabel(unit),
            ehp: this.fmt(hpValG * sea.ehpMult, unit) + ' ' + this.unitLabel(unit),
            atk: this.fmt(atkValG, 'M') + 'M',
            def: resistStr,
            buffs,
            season: sea.season,
            floor: f.floor,
            primary: ms.primary,
            elems: ms.elems,
            overrides: ms.overrides
          };
          const fceBoss = this.resolveFceBoss(modalData);
          if (fceBoss && fceBoss.slug && !this._fceBossCache.has(fceBoss.slug)) {
            this.setState({
              modal: modalData,
              mechanicsLoading: true,
              mechanicsError: false
            });
            this.fetchBossMechanics(fceBoss.slug);
          } else {
            this.setState({
              modal: modalData,
              mechanicsLoading: false,
              mechanicsError: false
            });
          }
        };

        return mobObj;
      });

      waves.push({
        label: isRu ? ('ВОЛНА ' + wNum) : ('WAVE ' + wNum),
        tag,
        mobs
      });
    });

    return { waves, resistStr };
  }

  buildAffixes(f) {
    const isRu = this.state.lang === 'ru';
    const totalDropWeight = (f.dropBuffs || []).reduce((sum, d) => sum + (d.weight || 0), 0);
    const dropMap = new Map();
    (f.dropBuffs || []).forEach((d) => {
      const pct = totalDropWeight > 0 ? (d.weight / totalDropWeight) * 100 : 0;
      const formattedPct = pct % 1 === 0 ? pct.toFixed(0) + '%' : pct.toFixed(1) + '%';
      dropMap.set(d.id, { weight: d.weight, pctStr: formattedPct });
    });

    const unifiedBuffs = [];
    const seenBuffIds = new Set();

    (f.stageMutators || []).forEach((mut) => {
      if (!mut.id || mut.id.toLowerCase().includes('immuneeverything')) return;
      seenBuffIds.add(mut.id);
      const dropInfo = dropMap.get(mut.id);
      unifiedBuffs.push({
        icon: mut.icon || 'assets/buffs/buff_AddElementDefFoodBase.png',
        name: isRu ? (mut.nameRu || mut.nameEn) : (mut.nameEn || mut.nameRu || mut.id),
        desc: isRu ? (mut.descRu || mut.descEn) : (mut.descEn || mut.descRu || ''),
        badge: dropInfo ? ((isRu ? 'ДРОП: ' : 'DROP: ') + dropInfo.pctStr) : (isRu ? 'АФФИКС' : 'AFFIX'),
        kind: dropInfo ? 'drop' : 'affix',
        accent: dropInfo ? '#f5d97a' : '#ff6b8b',
        badgeCol: dropInfo ? '#f5d97a' : '#ff9bb2',
        badgeBg: dropInfo ? 'rgba(245,217,122,.14)' : 'rgba(255,107,139,.14)',
        badgeBd: dropInfo ? 'rgba(245,217,122,.35)' : 'rgba(255,107,139,.35)'
      });
    });

    (f.dropBuffs || []).forEach((d) => {
      if (!d.id || d.id.toLowerCase().includes('immuneeverything')) return;
      if (!seenBuffIds.has(d.id)) {
        seenBuffIds.add(d.id);
        const dropInfo = dropMap.get(d.id);
        unifiedBuffs.push({
          icon: d.icon || 'assets/buffs/buff_AddElementDefFoodBase.png',
          name: isRu ? (d.nameRu || d.nameEn) : (d.nameEn || d.nameRu || d.id),
          desc: isRu ? (d.descRu || d.descEn) : (d.descEn || d.descRu || ''),
          badge: (isRu ? 'ДРОП: ' : 'DROP: ') + (dropInfo ? dropInfo.pctStr : '50%'),
          kind: 'drop',
          accent: '#f5d97a',
          badgeCol: '#f5d97a',
          badgeBg: 'rgba(245,217,122,.14)',
          badgeBd: 'rgba(245,217,122,.35)'
        });
      }
    });

    (f.enemies || []).forEach((m) => {
      (m.inherentBuffs || []).forEach((ib) => {
        if (!ib.id || ib.id.toLowerCase().includes('immuneeverything')) return;
        if (!seenBuffIds.has(ib.id)) {
          seenBuffIds.add(ib.id);
          const dropInfo = dropMap.get(ib.id);
          unifiedBuffs.push({
            icon: ib.icon || 'assets/buffs/buff_AddElementDefFoodBase.png',
            name: isRu ? (ib.nameRu || ib.nameEn) : (ib.nameEn || ib.nameRu || ib.id),
            desc: isRu ? (ib.descRu || ib.descEn) : (ib.descEn || ib.descRu || ''),
            badge: dropInfo ? ((isRu ? 'ДРОП: ' : 'DROP: ') + dropInfo.pctStr) : (isRu ? 'АФФИКС' : 'AFFIX'),
            kind: dropInfo ? 'drop' : 'affix',
            accent: dropInfo ? '#f5d97a' : '#ff6b8b',
            badgeCol: dropInfo ? '#f5d97a' : '#ff9bb2',
            badgeBg: dropInfo ? 'rgba(245,217,122,.14)' : 'rgba(255,107,139,.14)',
            badgeBd: dropInfo ? 'rgba(245,217,122,.35)' : 'rgba(255,107,139,.35)'
          });
        }
      });
    });

    unifiedBuffs.sort((a, b) => {
      if (a.kind === 'drop' && b.kind !== 'drop') return -1;
      if (a.kind !== 'drop' && b.kind === 'drop') return 1;
      return 0;
    });

    return unifiedBuffs;
  }

  toast(msg) {
    this.setState({ toast: msg });
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.setState({ toast: null }), 1800);
  }

  setChartTheme(theme) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    writeOowCookie(OOW_CHART_THEME_COOKIE, normalized);
    this.setState({ chartTheme: normalized });
  }

  // Double-click a sub-chart to swap it into the main (full-width) slot, and the
  // main chart down into the sub-chart's slot. Double-click again to swap back.
  // A FLIP animation makes the swap glide smoothly instead of snapping.
  togglePromoteChart(which) {
    return (event) => {
      if (event && event.target && event.target.closest('button, a, input, select, .oow-chart-theme-switch')) return;
      const next = this.state.promotedSub === which ? null : which;
      this._flipCharts(() => this.setState({ promotedSub: next }));
    };
  }

  _flipCharts(mutate) {
    const grid = document.querySelector('.oow-charts-grid');
    if (!grid) { mutate(); return; }
    const first = new Map();
    grid.querySelectorAll('[data-chart-card]').forEach((card) => {
      first.set(card.getAttribute('data-chart-card'), card.getBoundingClientRect());
    });
    mutate();
    const play = () => {
      const grid2 = document.querySelector('.oow-charts-grid');
      if (!grid2) return;
      grid2.querySelectorAll('[data-chart-card]').forEach((card) => {
        const before = first.get(card.getAttribute('data-chart-card'));
        if (!before) return;
        const after = card.getBoundingClientRect();
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        const sx = after.width ? before.width / after.width : 1;
        const sy = after.height ? before.height / after.height : 1;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
        if (typeof card.animate !== 'function') return;
        card.animate(
          [
            { transformOrigin: 'top left', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' },
            { transformOrigin: 'top left', transform: 'none' }
          ],
          { duration: 460, easing: 'cubic-bezier(.4,0,.2,1)' }
        );
      });
    };
    // Run after the runtime has committed the new layout.
    requestAnimationFrame(() => requestAnimationFrame(play));
  }

  // Builds the primary multi-season chart geometry.
  mainChart() {
    const seasons = this.buildSeasons(this.state.mode);
    const { active, chartMetric, chartMode, chartRange } = this.state;
    const act = seasons.filter((s) => active.includes(s.season)).sort((a, b) => a.season - b.season);
    let minF, maxF;
    const _maxActFloor = Math.max(...act.map((s) => s.floorCount), (this.state.mode === 'mmo' ? 36 : 28));
    const _ot = this.state.mode === 'mmo' ? 33 : 26;
    const _ramp = this.state.mode === 'mmo' ? 25 : 17;
    if (chartRange === 'overtime') { minF = _ot; maxF = _maxActFloor; }
    else if (chartRange === 'ramp') { minF = _ramp; maxF = _maxActFloor; }
    else { minF = 1; maxF = _maxActFloor; }
    const W = 920, H = 300, L = 64, R = 24, T = 16, B = 30, pw = W - L - R, ph = H - T - B;
    const valOf = (s, fl) => (chartMetric === 'boss' ? fl.bossG : fl.totalG) * (chartMode === 'ehp' ? s.ehpMult : 1);
    let ymax = 0;
    act.forEach((s) => s.floors.forEach((fl) => { if (fl.floor >= minF && fl.floor <= maxF) ymax = Math.max(ymax, valOf(s, fl)); }));
    ymax = ymax * 1.08 || 1;
    const x = (f) => L + (maxF === minF ? 0 : (f - minF) / (maxF - minF)) * pw;
    const y = (v) => T + ph - (v / ymax) * ph;
    const series = act.map((s) => {
      const fls = s.floors.filter((fl) => fl.floor >= minF && fl.floor <= maxF);
      const pts = fls.map((fl) => {
        const value = valOf(s, fl);
        return {
          cx: +x(fl.floor).toFixed(1),
          cy: +y(value).toFixed(1),
          floor: fl.floor,
          value,
          label: this.fmt(value, 'G') + 'G',
          r: fl.ot ? 3.4 : 2.2
        };
      });
      const path = pts.map((p, i) => (i ? 'L' : 'M') + p.cx + ' ' + p.cy).join(' ');
      const area = pts.length ? 'M' + pts[0].cx + ' ' + (T + ph) + ' ' + pts.map((p) => 'L' + p.cx + ' ' + p.cy).join(' ') + ' L' + pts[pts.length - 1].cx + ' ' + (T + ph) + ' Z' : '';
      return { color: s.color, fill: s.color, label: 'S' + s.season, path, area, pts, season: s.season };
    });
    // One label per visible value. When seasons share a point, the newest
    // season wins so the label uses the same color as the topmost series.
    const labelByPoint = new Map();
    series.forEach((s) => {
      s.pts.forEach((p) => {
        const key = p.floor + ':' + p.value.toPrecision(12);
        labelByPoint.set(key, { ...p, color: s.color, season: s.season });
      });
    });
    const labels = Array.from(labelByPoint.values()).map((p, index) => ({
      ...p,
      lx: +(p.cx - 32).toFixed(1),
      fy: +Math.max(T, p.cy - (index % 2 ? 22 : 13)).toFixed(1)
    }));
    const yticks = [];
    for (let i = 0; i <= 4; i++) {
      const v = ymax * i / 4;
      const yy = +y(v).toFixed(1);
      yticks.push({ y: yy, ty: yy + 4, fy: yy - 8, label: (v >= 100 ? Math.round(v) : v.toFixed(1)) + 'G' });
    }
    const step = Math.max(1, Math.round((maxF - minF) / 7));
    const xticks = [];
    for (let f = minF; f <= maxF; f += step) {
      const xx = +x(f).toFixed(1);
      xticks.push({ x: xx, fx: xx - 25, label: 'F' + f });
    }
    if (xticks.length && xticks[xticks.length - 1].label !== 'F' + maxF) {
      const xx = +x(maxF).toFixed(1);
      xticks.push({ x: xx, fx: xx - 25, label: 'F' + maxF });
    }
    return { series, labels, yticks, xticks, x, y, minF, maxF, W, H, L, R, pw, valOf, act };
  }

  // Places small value labels next to a set of points while avoiding overlap.
  // Each input point: { cx, cy, label, color, prefer }, prefer = 'above'|'below'.
  // Labels that cannot find a clear slot are dropped (auto-thin) so dense charts
  // stay readable. Returns only the labels that should be rendered, each with
  // { lx, fy, color, label } matching the oow-svg-value-label foreignObject.
  placeValueLabels(points, opts) {
    const o = opts || {};
    const width = o.width || 64;      // foreignObject width used by the template
    const halfW = width / 2;
    const rowH = o.rowH || 16;        // vertical footprint of one label (label box is 15px + halo)
    const top = o.top != null ? o.top : 4;
    const bottom = o.bottom != null ? o.bottom : 296;
    const left = o.left != null ? o.left : 2;
    const right = o.right != null ? o.right : 918;
    const occupied = [];
    const overlaps = (a) => occupied.some((b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t);
    const out = [];
    points.forEach((p) => {
      const above = p.prefer !== 'below';
      // Candidate top-edge offsets from the point (px). Try near first, then further.
      const offs = above
        ? [-15, -24, -33, 8, 17]
        : [6, 15, 24, -15, -24];
      let cx = Math.max(left + halfW, Math.min(right - halfW, p.cx));
      let placed = null;
      for (let i = 0; i < offs.length; i++) {
        let fy = p.cy + offs[i];
        fy = Math.max(top, Math.min(bottom - rowH, fy));
        const rect = { l: cx - halfW, r: cx + halfW, t: fy, b: fy + rowH };
        if (!overlaps(rect)) { placed = { fy, rect }; break; }
      }
      if (!placed) return; // drop this label
      occupied.push(placed.rect);
      out.push({ lx: +(cx - halfW).toFixed(1), fy: +placed.fy.toFixed(1), color: p.color, label: p.label });
    });
    return out;
  }

  downloadBlob(content, mimeType, fileName) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  chartExportName(extension) {
    const metric = this.state.chartMetric === 'boss' ? 'boss-hp' : 'total-floor-hp';
    return 'oow-' + this.state.mode + '-' + metric + '-' + this.state.chartMode + '-' + this.state.chartRange + '.' + extension;
  }

  downloadMainChartCsv() {
    const chart = this.mainChart();
    const seasons = chart.act;
    const rows = [['Floor', ...seasons.map((s) => 'S' + s.season + ' (G)')]];
    for (let floor = chart.minF; floor <= chart.maxF; floor++) {
      rows.push([
        'F' + floor,
        ...seasons.map((season) => {
          const item = season.floors.find((entry) => entry.floor === floor);
          return item ? String(chart.valOf(season, item)) : '';
        })
      ]);
    }
    const csv = '\uFEFF' + rows.map((row) => row.map((value) => {
      const text = String(value);
      return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }).join(',')).join('\r\n');
    this.downloadBlob(csv, 'text/csv;charset=utf-8', this.chartExportName('csv'));
  }

  async downloadMainChartPng() {
    const isRu = this.state.lang === 'ru';
    return this.downloadChartPng('[data-oow-main-chart]', this.chartExportName('png'), {
      title: isRu ? 'HP босса по этажам — испытание OOW' : 'Boss HP across floors — OOW Challenge',
      badges: [
        {
          label: (isRu ? 'Режим HP · ' : 'HP Mode · ') + (this.state.chartMode === 'ehp' ? (isRu ? 'Эффективное HP' : 'Effective HP') : (isRu ? 'Номинальное HP' : 'Raw HP')),
          color: this.state.chartMode === 'ehp' ? '#2dbfa4' : '#d65b88'
        },
        {
          label: (isRu ? 'Метрика · ' : 'Metric · ') + (this.state.chartMetric === 'boss' ? (isRu ? 'HP босса' : 'Boss HP') : (isRu ? 'Весь этаж' : 'Total Floor')),
          color: '#c99d22'
        }
      ]
    });
  }

  downloadCsvRows(rows, fileName) {
    const csv = '\uFEFF' + rows.map((row) => row.map((value) => {
      const text = String(value ?? '');
      return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }).join(',')).join('\r\n');
    this.downloadBlob(csv, 'text/csv;charset=utf-8', fileName);
  }

  async downloadChartPng(selector, fileName, exportMeta = {}) {
    const source = document.querySelector(selector);
    if (!source) return;
    const clone = source.cloneNode(true);
    const headerHeight = exportMeta.title ? 78 : 0;
    const exportHeight = 300 + headerHeight;
    clone.setAttribute('viewBox', '0 0 920 ' + exportHeight);
    clone.setAttribute('width', '1840');
    clone.setAttribute('height', String(exportHeight * 2));

    if (headerHeight) {
      const svgNs = 'http://www.w3.org/2000/svg';
      const chartNodes = Array.from(clone.childNodes);
      const chartGroup = document.createElementNS(svgNs, 'g');
      chartGroup.setAttribute('transform', 'translate(0 ' + headerHeight + ')');
      chartNodes.forEach((node) => chartGroup.appendChild(node));

      const exportBackground = document.createElementNS(svgNs, 'rect');
      exportBackground.setAttribute('x', '0');
      exportBackground.setAttribute('y', '0');
      exportBackground.setAttribute('width', '920');
      exportBackground.setAttribute('height', String(exportHeight));
      exportBackground.setAttribute('fill', this.state.chartTheme === 'dark' ? '#0f0b15' : '#ffffff');
      clone.appendChild(exportBackground);

      const title = document.createElementNS(svgNs, 'text');
      title.setAttribute('x', '460');
      title.setAttribute('y', '27');
      title.setAttribute('text-anchor', 'middle');
      title.setAttribute('fill', this.state.chartTheme === 'dark' ? '#f6f1fb' : '#17111f');
      title.setAttribute('font-family', 'Barlow, Manrope, system-ui, sans-serif');
      title.setAttribute('font-size', '17');
      title.setAttribute('font-weight', '700');
      title.textContent = exportMeta.title;
      clone.appendChild(title);

      const badges = Array.isArray(exportMeta.badges) ? exportMeta.badges : [];
      const badgeWidths = badges.map((badge) => Math.max(82, Math.min(230, badge.label.length * 6.3 + 24)));
      const badgeGap = 8;
      const badgesWidth = badgeWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, badges.length - 1) * badgeGap;
      // Right-align the badge row to the plot's right edge (x=896) instead of centering.
      let badgeX = 896 - badgesWidth;
      badges.forEach((badge, index) => {
        const width = badgeWidths[index];
        const rect = document.createElementNS(svgNs, 'rect');
        rect.setAttribute('x', String(badgeX));
        rect.setAttribute('y', '40');
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', '24');
        rect.setAttribute('rx', '12');
        rect.setAttribute('fill', this.state.chartTheme === 'dark' ? '#211827' : '#fffaf0');
        rect.setAttribute('stroke', badge.color || '#c99d22');
        rect.setAttribute('stroke-width', '1');
        clone.appendChild(rect);

        const badgeText = document.createElementNS(svgNs, 'text');
        badgeText.setAttribute('x', String(badgeX + width / 2));
        badgeText.setAttribute('y', '56');
        badgeText.setAttribute('text-anchor', 'middle');
        badgeText.setAttribute('fill', this.state.chartTheme === 'dark' ? '#f6f1fb' : '#302735');
        badgeText.setAttribute('font-family', 'Manrope, Arial, sans-serif');
        badgeText.setAttribute('font-size', '9');
        badgeText.setAttribute('font-weight', '700');
        badgeText.textContent = badge.label;
        clone.appendChild(badgeText);
        badgeX += width + badgeGap;
      });
      clone.appendChild(chartGroup);
    }
    // foreignObject is useful for live labels with this template runtime, but
    // it taints a canvas. Convert labels to native SVG text in the export copy.
    clone.querySelectorAll('foreignObject').forEach((label) => {
      const isValue = label.classList.contains('oow-svg-value-label');
      const x = Number(label.getAttribute('x') || 0);
      const y = Number(label.getAttribute('y') || 0);
      const width = Number(label.getAttribute('width') || 0);
      const height = Number(label.getAttribute('height') || 0);
      const content = label.textContent.trim();
      const sourceText = label.querySelector('div');
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const isXAxis = !isValue && y >= 270;
      text.setAttribute('x', String(isValue || isXAxis ? x + width / 2 : x + width));
      text.setAttribute('y', String(y + height * 0.76));
      text.setAttribute('text-anchor', isValue || isXAxis ? 'middle' : 'end');
      text.setAttribute('fill', sourceText?.style.color || (this.state.chartTheme === 'dark' ? '#6b6480' : '#665e6d'));
      text.setAttribute('font-family', 'JetBrains Mono, monospace');
      text.setAttribute('font-size', isValue ? '9' : '10');
      if (isValue) {
        text.setAttribute('font-weight', '700');
        text.setAttribute('paint-order', 'stroke');
        text.setAttribute('stroke', this.state.chartTheme === 'dark' ? '#0f0b15' : '#ffffff');
        text.setAttribute('stroke-width', '2.6');
        text.setAttribute('stroke-linejoin', 'round');
      }
      text.textContent = content;
      label.replaceWith(text);
    });
    const markup = new XMLSerializer().serializeToString(clone);
    const svgUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = svgUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 1840;
      canvas.height = exportHeight * 2;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) this.downloadBlob(blob, 'image/png', fileName);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  render() {}

  renderVals() {
    const st = this.state;
    const isRu = st.lang === 'ru';
    const copy = isRu ? {
      gameModeLabel: 'Режим игры',
      originalModeLabel: 'Оригинальный OOW',
      tableTabLabel: 'Таблица этажей и составы',
      chartsTabLabel: 'Графики инфляции и EHP',
      difficultyTabLabel: 'График сложности',
      seasonsLabel: 'СЕЗОНЫ',
      collapseSeasonsTitle: 'Свернуть панель сезонов',
      expandSeasonsTitle: 'Развернуть панель сезонов',
      exactLabel: 'Точно',
      compareLabelText: 'Сравнить',
      copyJsonLabel: 'Копировать JSON',
      compareTitle: 'Инфляция HP сезона',
      versusLabel: 'против',
      compareWithLabel: 'Сравнить с',
      floorLabel: 'Этаж',
      totalHpLabel: 'Общее HP',
      maxMobLabel: 'Макс. HP врага',
      mobsLabel: 'Враги',
      waveDistributionLabel: 'Распределение по волнам',
      resistsLabel: 'Сопротивления',
      effectiveHpLabel: 'Эффективное HP',
      affixesLabel: 'Модификаторы и аффиксы этажа',
      hpModeLabel: 'Режим HP',
      rawHpLabel: 'Номинальное HP',
      metricLabel: 'Метрика',
      bossHpLabel: 'HP босса',
      totalFloorLabel: 'Весь этаж',
      floorRangeLabel: 'Диапазон этажей',
      allLabel: 'Все',
      presetsLabel: 'Наборы',
      seasonsOnChartLabel: 'Сезоны на графике',
      mainChartTitle: 'HP босса по этажам — испытание OOW',
      historyChartTitle: 'Историческая инфляция финального этажа',
      historyChartDescription: 'HP финального босса от первого сезона до текущего — номинальное и эффективное в логарифмической шкале.',
      seasonToSeasonLabel: 'Сезон → сезон',
      floorToFloorLabel: 'Этаж → этаж',
      goToFloorPlaceholder: 'Перейти к этажу…',
      difficultyDescription: 'Множитель сложности поэтапно снижается от стартового пика до базовых 100% в течение сезона.',
      liveNowLabel: 'Сейчас активно',
      allFloorsDifficultyTitle: 'Все этажи — снижение сложности и даты',
      peakLabel: 'Пик %',
      peakWindowLabel: 'Период пика',
      baselineFromLabel: '100% с',
      stepsLabel: 'Этапы',
      timelineLabel: 'Хронология',
      scrollTopTitle: 'Наверх',
      zoomImageTitle: 'Нажмите, чтобы увеличить изображение',
      enlargedImageLabel: 'Увеличенное изображение босса',
      closeImageLabel: 'Закрыть изображение',
      dataUnavailableLabel: 'Не удалось загрузить индекс OOW. Повторите попытку.',
      seasonUnavailableLabel: 'Не удалось загрузить выбранный сезон. Повторите попытку.',
      blueprintIdLabel: 'ID шаблона',
      resistLabel: 'Сопротивление',
      closeLabel: 'Закрыть',
      primaryStatsLabel: 'Основные боевые характеристики',
      elementalResistancesLabel: 'Сопротивления стихиям',
      difficultyContextLabel: 'при сложности 2000%',
      overridesLabel: 'Особые параметры',
      zoomOutLabel: 'Уменьшить',
      zoomInLabel: 'Увеличить',
      resetZoomLabel: 'Сбросить масштаб',
      resetLabel: 'Сбросить',
      chartPaletteLabel: 'Палитра графика',
      chartPaletteAria: 'Цветовая тема графика',
      lightLabel: 'Светлая',
      darkLabel: 'Тёмная',
      downloadPngLabel: 'Скачать PNG',
      downloadCsvLabel: 'Скачать CSV'
    } : {
      gameModeLabel: 'Game Mode',
      originalModeLabel: 'Original OOW',
      tableTabLabel: 'Floor Table & Lineups',
      chartsTabLabel: 'Inflation & EHP Charts',
      difficultyTabLabel: 'Difficulty Schedule',
      seasonsLabel: 'SEASONS',
      collapseSeasonsTitle: 'Collapse seasons panel',
      expandSeasonsTitle: 'Expand seasons panel',
      exactLabel: 'Exact',
      compareLabelText: 'Compare',
      copyJsonLabel: 'Copy JSON',
      compareTitle: 'Season HP Inflation',
      versusLabel: 'vs',
      compareWithLabel: 'Compare with',
      floorLabel: 'Floor',
      totalHpLabel: 'Total HP',
      maxMobLabel: 'Max Mob',
      mobsLabel: 'Mobs',
      waveDistributionLabel: 'Wave Distribution',
      resistsLabel: 'Resists',
      effectiveHpLabel: 'Effective HP',
      affixesLabel: 'Stage Mutators & Affixes',
      hpModeLabel: 'HP Mode',
      rawHpLabel: 'Raw HP',
      metricLabel: 'Metric',
      bossHpLabel: 'Boss HP',
      totalFloorLabel: 'Total Floor',
      floorRangeLabel: 'Floor Range',
      allLabel: 'All',
      presetsLabel: 'Presets',
      seasonsOnChartLabel: 'Seasons on chart',
      mainChartTitle: 'Boss HP across floors — OOW Challenge',
      historyChartTitle: 'Historical final-floor inflation',
      historyChartDescription: 'Final boss HP from the first season to now — raw vs effective on a logarithmic scale.',
      seasonToSeasonLabel: 'Season → Season',
      floorToFloorLabel: 'Floor → Floor',
      goToFloorPlaceholder: 'Go to floor…',
      difficultyDescription: 'The difficulty multiplier decays step by step from the launch peak to the 100% baseline during the season.',
      liveNowLabel: 'Live now',
      allFloorsDifficultyTitle: 'All floors — difficulty decay & dates',
      peakLabel: 'Peak %',
      peakWindowLabel: 'Peak window',
      baselineFromLabel: '100% from',
      stepsLabel: 'Steps',
      timelineLabel: 'Timeline',
      scrollTopTitle: 'Scroll to top',
      zoomImageTitle: 'Click to zoom image',
      enlargedImageLabel: 'Enlarged boss image',
      closeImageLabel: 'Close image',
      dataUnavailableLabel: 'The OOW index could not be loaded. Please retry.',
      seasonUnavailableLabel: 'The selected season could not be loaded. Please retry.',
      blueprintIdLabel: 'Blueprint ID',
      resistLabel: 'Resist',
      closeLabel: 'Close',
      primaryStatsLabel: 'Primary Combat Stats',
      elementalResistancesLabel: 'Elemental Resistances',
      difficultyContextLabel: 'at 2000% difficulty',
      overridesLabel: 'Notable Attribute Overrides',
      zoomOutLabel: 'Zoom out',
      zoomInLabel: 'Zoom in',
      resetZoomLabel: 'Reset scale',
      resetLabel: 'Reset',
      chartPaletteLabel: 'Chart palette',
      chartPaletteAria: 'Chart color theme',
      lightLabel: 'Light',
      darkLabel: 'Dark',
      downloadPngLabel: 'Download PNG',
      downloadCsvLabel: 'Download CSV'
    };
    const seasons = this.buildSeasons(st.mode);
    const isDataLoaded = Array.isArray(seasons) && seasons.length > 0;
    const sea = isDataLoaded ? (seasons.find((s) => s.season === st.seasonIdx) || seasons[seasons.length - 1]) : null;
    const otStart = sea ? sea.otStart : (st.mode === 'mmo' ? 33 : 26);
    const finalF = sea ? sea.floorCount : (st.mode === 'mmo' ? 36 : 28);
    const rampStart = st.mode === 'mmo' ? 25 : 17;
    const rampLabel = isDataLoaded ? (rampStart + '–' + finalF) : '';
    const chartRampLabel = st.mode === 'mmo' ? '25–36' : '17–28';
    const chartChallengeLabel = st.mode === 'mmo' ? '33–36' : '26–28';
    const U = st.unit, UL = this.unitLabel(U);

    // season pills (when loading: exactly 3 neutral empty placeholders preserving geometry)
    const seasonPills = isDataLoaded ? seasons.map((s) => {
      const activeSel = s.season === st.seasonIdx;
      const lastFloor = s.floors[s.floors.length - 1];
      const maxBossEnemy = this.getMainBoss(lastFloor);
      let bossDisplayName = this.fmt(lastFloor ? lastFloor.bossG : 0, 'G') + 'G';
      if (maxBossEnemy) {
        const fceBoss = this.resolveFceBoss(maxBossEnemy);
        if (fceBoss) {
          bossDisplayName = isRu ? (fceBoss.name_ru || fceBoss.name) : (fceBoss.name || fceBoss.name_ru);
        } else {
          bossDisplayName = isRu ? (maxBossEnemy.nameRu || maxBossEnemy.nameEn) : (maxBossEnemy.nameEn || maxBossEnemy.nameRu);
        }
      }

      return {
        num: s.season,
        label: 'S' + s.season,
        ver: s.ver,
        dates: s.dates,
        floors: s.floorCount,
        boss: this.fmt(lastFloor ? lastFloor.bossG : 0, 'G') + 'G',
        bossName: bossDisplayName,
        color: s.color,
        titleCol: activeSel ? '#f5d97a' : '#cbc2de',
        metaCol: activeSel ? '#e9c96f' : '#7a7290',
        style: 'flex:none; cursor:pointer; min-width:130px; border-radius:14px; padding:11px 15px; transition:transform .15s ease; ' + (activeSel
          ? 'background:linear-gradient(145deg, rgba(245,217,122,.16), rgba(181,123,255,.08)); border:1px solid rgba(245,217,122,.55); box-shadow:0 0 24px rgba(245,217,122,.16);'
          : 'background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);'),
        activeFlag: activeSel ? '1' : '0',
        currentAria: activeSel ? 'true' : 'false',
        railStyle: 'cursor:pointer; border-radius:11px; padding:10px 12px; transition:background .12s; ' + (activeSel
          ? 'background:linear-gradient(135deg, rgba(245,217,122,.15), rgba(181,123,255,.07)); border:1px solid rgba(245,217,122,.5);'
          : 'background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07);'),
        onSelect: () => this.selectSeason(s.season),
      };
    }) : [
      {
        label: '',
        ver: '',
        dates: '',
        floors: '',
        boss: '',
        bossName: '',
        color: 'transparent',
        titleCol: 'transparent',
        metaCol: 'transparent',
        activeFlag: '0',
        currentAria: 'false',
        railStyle: 'cursor:default; border-radius:11px; padding:10px 12px; min-height:52px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); pointer-events:none;',
        onSelect: () => {}
      },
      {
        label: '',
        ver: '',
        dates: '',
        floors: '',
        boss: '',
        bossName: '',
        color: 'transparent',
        titleCol: 'transparent',
        metaCol: 'transparent',
        activeFlag: '0',
        currentAria: 'false',
        railStyle: 'cursor:default; border-radius:11px; padding:10px 12px; min-height:52px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); pointer-events:none;',
        onSelect: () => {}
      },
      {
        label: '',
        ver: '',
        dates: '',
        floors: '',
        boss: '',
        bossName: '',
        color: 'transparent',
        titleCol: 'transparent',
        metaCol: 'transparent',
        activeFlag: '0',
        currentAria: 'false',
        railStyle: 'cursor:default; border-radius:11px; padding:10px 12px; min-height:52px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); pointer-events:none;',
        onSelect: () => {}
      }
    ];

    // KPIs & Boss
    const last = sea && sea.floors ? sea.floors[sea.floors.length - 1] : null;
    const avg = sea && sea.floors && sea.floors.length ? (sea.floors.reduce((a, f) => a + f.totalG, 0) / sea.floors.length) : 0;
    const finalBossEnemy = this.getMainBoss(last);

    // floor rows with Universal Smart Search
    let floors = sea && sea.floors ? sea.floors.slice() : [];
    if (st.search != null && String(st.search).trim() !== '') {
      const q = String(st.search).trim().toLowerCase();
      const num = parseInt(q, 10);
      const isPureNum = !isNaN(num) && String(num) === q;
      floors = floors.filter((f) => {
        if (isPureNum && f.floor === num) return true;
        if (String(f.floor) === q || ('f' + f.floor) === q || ('floor ' + f.floor) === q || ('этаж ' + f.floor) === q) return true;
        const hasMob = (f.enemies || []).some((m) =>
          (m.nameEn && m.nameEn.toLowerCase().includes(q)) ||
          (m.nameRu && m.nameRu.toLowerCase().includes(q)) ||
          (m.codeName && m.codeName.toLowerCase().includes(q)) ||
          (m.bossId && m.bossId.toLowerCase().includes(q)) ||
          (m.key && m.key.toLowerCase().includes(q))
        );
        if (hasMob) return true;
        const hasBuff = (f.stageMutators || []).some((b) => (b.nameEn && b.nameEn.toLowerCase().includes(q)) || (b.nameRu && b.nameRu.toLowerCase().includes(q))) ||
          (f.dropBuffs || []).some((b) => (b.nameEn && b.nameEn.toLowerCase().includes(q)) || (b.nameRu && b.nameRu.toLowerCase().includes(q)));
        return hasBuff;
      });
    } else if (st.filter === 'ramp') {
      floors = floors.filter((f) => f.floor >= rampStart);
    } else if (st.filter === 'boss') {
      floors = floors.filter((f) => f.floor >= otStart);
    }

    // Multi-wave palette
    const gradByWave = ['linear-gradient(90deg,#4fe3c1,#38e0d0)', 'linear-gradient(90deg,#b57bff,#9d6bff)', 'linear-gradient(90deg,#f5d97a,#f0b94e)', 'linear-gradient(90deg,#ff8fa8,#ff6b8b)'];
    const waveColors = ['#4fe3c1', '#c79dff', '#f5d97a', '#ff9bb2'];

    // Single-wave enemy sectors palette (distinct vibrant gradient scheme)
    const gradByMob = ['linear-gradient(90deg,#ff6b8b,#ff4d73)', 'linear-gradient(90deg,#f5a623,#f0b94e)', 'linear-gradient(90deg,#a855f7,#8b5cf6)', 'linear-gradient(90deg,#38bdf8,#0ea5e9)', 'linear-gradient(90deg,#34d399,#10b981)'];
    const mobColors = ['#ff6b8b', '#f5a623', '#a855f7', '#38bdf8', '#34d399'];

    const rows = isDataLoaded ? floors.map((f) => {
      const expanded = st.expandedFloor === f.floor;
      const enemies = f.enemies || [];

      const waveMap = new Map();
      enemies.forEach((m) => {
        const w = m.wave || 1;
        if (!waveMap.has(w)) waveMap.set(w, []);
        waveMap.get(w).push(m);
      });

      let segs = [];

      if (waveMap.size > 1 && f.totalHp > 0) {
        // Multi-wave division by waves
        const waveHps = {};
        enemies.forEach((m) => {
          const w = m.wave || 1;
          waveHps[w] = (waveHps[w] || 0) + (m.combinedHp || m.hp || 0);
        });
        const wKeys = Array.from(waveMap.keys()).sort((a, b) => a - b);
        let pcts = wKeys.map((wk) => Math.round((waveHps[wk] / f.totalHp) * 100));
        const sumP = pcts.reduce((a, b) => a + b, 0);
        if (sumP !== 100 && pcts.length > 0) pcts[pcts.length - 1] += (100 - sumP);

        segs = pcts.map((p, i) => {
          const wNum = wKeys[i];
          const wHpG = (waveHps[wNum] / 1e9);
          return {
            pct: p,
            grad: gradByWave[i % gradByWave.length],
            onHover: (e) => this.setState({
              tip: {
                x: e.clientX,
                y: e.clientY,
                label: (isRu ? ('Волна ' + wNum) : ('Wave ' + wNum)) + ' · F' + f.floor + ' (' + p + '%)',
                hp: this.fmt(wHpG, U) + ' ' + UL,
                col: waveColors[i % waveColors.length]
              }
            })
          };
        });
      } else if (enemies.length > 1 && f.totalHp > 0) {
        // Single-wave division by enemies (distinct mob sector palette)
        const sortedEnemies = enemies.slice().sort((a, b) => (b.combinedHp || b.hp || 0) - (a.combinedHp || a.hp || 0));
        let pcts = sortedEnemies.map((m) => Math.round(((m.combinedHp || m.hp || 0) / f.totalHp) * 100));
        const sumP = pcts.reduce((a, b) => a + b, 0);
        if (sumP !== 100 && pcts.length > 0) pcts[pcts.length - 1] += (100 - sumP);

        segs = sortedEnemies.map((m, i) => {
          const mHpG = (m.combinedHp || m.hp || 0) / 1e9;
          const p = pcts[i] || 0;
          let mobName = isRu ? (m.nameRu || m.nameEn) : (m.nameEn || m.nameRu || ('Mob #' + (i + 1)));
          if (m.monsterType === 'BS_MONSTER_BOSS' || /boss_/i.test(m.codeName || m.id)) {
            const fceBoss = this.resolveFceBoss(m);
            if (fceBoss) {
              mobName = isRu ? (fceBoss.name_ru || fceBoss.name) : (fceBoss.name || fceBoss.name_ru);
            }
          }
          return {
            pct: p,
            grad: gradByMob[i % gradByMob.length],
            onHover: (e) => this.setState({
              tip: {
                x: e.clientX,
                y: e.clientY,
                label: mobName + ' · F' + f.floor + ' (' + p + '%)',
                hp: this.fmt(mHpG, U) + ' ' + UL,
                col: mobColors[i % mobColors.length]
              }
            })
          };
        });
      } else {
        // Fallback / single unit
        segs = [{
          pct: 100,
          grad: gradByWave[0],
          onHover: (e) => this.setState({
            tip: {
              x: e.clientX,
              y: e.clientY,
              label: (isRu ? 'Волна 1' : 'Wave 1') + ' · F' + f.floor + ' (100%)',
              hp: this.fmt(f.totalG, U) + ' ' + UL,
              col: waveColors[0]
            }
          })
        }];
      }

      const built = expanded ? this.buildLineup(sea, f, U) : null;
      return {
        n: 'F' + f.floor,
        floorNum: f.floor,
        hp: this.fmt(f.totalG, U),
        max: this.fmt(f.bossG, U),
        unit: UL,
        mobs: f.mobs,
        rowBg: f.ot ? 'rgba(255,107,139,.05)' : 'transparent',
        floorCol: f.ot ? '#ff9bb2' : '#cbc2de',
        floorBg: f.ot ? 'rgba(255,107,139,.12)' : 'rgba(255,255,255,.05)',
        floorBd: f.ot ? 'rgba(255,107,139,.35)' : 'rgba(255,255,255,.09)',
        floorBadgeStyle: 'padding:6px 12px; border-radius:8px;',
        hpPlaceholderStyle: '',
        maxPlaceholderStyle: '',
        mobsPlaceholderStyle: '',
        chev: expanded ? '▾' : '›',
        chevCol: expanded ? '#f5d97a' : '#5b5470',
        segs,
        expanded,
        lineup: built ? built.waves : [],
        resistStr: built ? built.resistStr : ((sea.resist * 100).toFixed(2) + '%'),
        lineupTitle: f.ot ? (isRu ? 'Состав волн испытания' : 'Challenge Lineup') : (isRu ? 'Состав волн и боссы' : 'Wave Composition'),
        affixes: expanded ? this.buildAffixes(f) : [],
        onToggle: async () => {
          const nextExpanded = expanded ? null : f.floor;
          this.setState(
            { expandedFloor: nextExpanded },
            nextExpanded ? () => this._scrollExpandedFloorIntoView(f.floor) : undefined
          );
          if (nextExpanded && (!f.enemies || f.enemies.length === 0)) {
            await this.loadSeasonData(this.state.mode, sea.season);
            if (!this._unmounted) {
              this.forceUpdate();
              // The first reveal ran against the lightweight season-index
              // drawer. Reposition again after the full lineup changes its
              // rendered height.
              this._scrollExpandedFloorIntoView(f.floor);
            }
          }
        },
      };
    }) : Array.from({ length: 10 }, (_, i) => ({
      n: '',
      floorNum: i + 1,
      hp: '',
      max: '',
      unit: '',
      mobs: '',
      rowBg: 'transparent',
      floorCol: 'transparent',
      floorBg: 'rgba(255,255,255,.04)',
      floorBd: 'rgba(255,255,255,.07)',
      floorBadgeStyle: 'display:inline-block; width:44px; height:24px; border-radius:8px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);',
      hpPlaceholderStyle: 'display:inline-block; width:64px; height:16px; border-radius:4px; background:rgba(255,255,255,.03);',
      maxPlaceholderStyle: 'display:inline-block; width:52px; height:14px; border-radius:4px; background:rgba(255,255,255,.02);',
      mobsPlaceholderStyle: 'display:inline-block; width:18px; height:14px; border-radius:4px; background:rgba(255,255,255,.02);',
      chev: '',
      chevCol: 'transparent',
      segs: [],
      expanded: false,
      lineup: [],
      resistStr: '',
      lineupTitle: '',
      affixes: [],
      onToggle: () => {}
    }));

    // compare
    const cmp = isDataLoaded ? (seasons.find((s) => s.season === st.compareIdx) || seasons[0]) : null;
    const cmpLast = cmp && cmp.floors ? cmp.floors[cmp.floors.length - 1] : null;
    const cmpAvg = cmp && cmp.floors && cmp.floors.length ? (cmp.floors.reduce((a, f) => a + f.totalG, 0) / cmp.floors.length) : 0;
    const delta = (a, b) => {
      if (b === 0 || !b) return { d: '—', up: 0 };
      const pc = ((a - b) / b) * 100;
      return { d: (pc >= 0 ? '+' : '') + pc.toFixed(0) + '%', up: pc };
    };
    const mkStat = (label, a, b) => {
      const d = delta(a, b);
      return {
        label,
        value: this.fmt(a, U) + ' ' + UL,
        delta: d.d,
        deltaCol: d.up > 0 ? '#ff9bb2' : (d.up < 0 ? '#4fe3c1' : '#948aa8'),
        deltaBg: d.up > 0 ? 'rgba(255,107,139,.14)' : (d.up < 0 ? 'rgba(79,227,193,.14)' : 'rgba(255,255,255,.06)')
      };
    };
    const compareStats = isDataLoaded ? [
      mkStat(isRu ? 'ХП финального босса' : 'Final Boss HP', last ? last.bossG : 0, cmpLast ? cmpLast.bossG : 0),
      mkStat(isRu ? 'Среднее HP на этаж' : 'Avg Floor HP', avg, cmpAvg),
    ] : [];
    const compareOptions = isDataLoaded ? seasons.filter((s) => s.season !== st.seasonIdx).map((s) => ({ value: String(s.season), label: 'S' + s.season + ' (' + s.ver + ')', selected: s.season === st.compareIdx })) : [];

    // chip / button style helpers
    const chip = (on, col) => 'cursor:pointer; font:600 12px/1 "Manrope"; padding:8px 13px; border-radius:8px; border:1px solid ' + (on ? 'transparent' : 'rgba(255,255,255,.08)') + '; ' + (on ? 'color:#17111f; background:' + col + ';' : 'color:#cbc2de; background:rgba(255,255,255,.05);');
    const cctl = (on, col) => 'flex:1; text-align:center; cursor:pointer; font:600 10px/1.1 "Manrope"; padding:7px 5px; border-radius:7px; border:1px solid ' + (on ? col : 'rgba(255,255,255,.1)') + '; ' + (on ? 'color:#17111f; background:' + col + ';' : 'color:#b9b0cc; background:rgba(255,255,255,.04);');
    const seg = (on, col) => 'cursor:pointer; font:700 11px/1 "JetBrains Mono"; padding:7px 12px; border-radius:999px; border:none; ' + (on ? 'background:rgba(245,217,122,.2); color:' + col + ';' : 'background:transparent; color:#7a7290;');
    const tabStyle = (on) => 'cursor:pointer; font:' + (on ? '700' : '600') + ' 12px/1 "Manrope"; padding:8px 14px; border-radius:9px; border:1px solid ' + (on ? 'transparent' : 'rgba(255,255,255,.09)') + '; ' + (on ? 'color:#17111f; background:linear-gradient(135deg,#f5d97a,#f0b94e);' : 'color:#cbc2de; background:rgba(255,255,255,.05);');
    const modePill = (on) => 'cursor:pointer; font:700 13px/1 "Manrope"; padding:9px 18px; border-radius:999px; border:none; transition:all .15s; ' + (on ? 'background:linear-gradient(135deg,#f5d97a,#f0b94e); color:#17111f;' : 'background:transparent; color:#7a7290;');

    const chartIsLight = st.chartTheme !== 'dark';
    const chartThemeButton = (active) => 'border:0; border-radius:6px; background:' + (active ? (chartIsLight ? '#f5d97a' : '#6f537f') : 'transparent') + '; color:' + (active ? (chartIsLight ? '#17101e' : '#fff9ff') : '#948aa8') + ';';

    // Chart swap (promote a sub-chart into the main full-width slot). Placement is
    // expressed purely as grid order + column span; the FLIP animation handles motion.
    const promoted = st.promotedSub === 'history' || st.promotedSub === 'jump' ? st.promotedSub : null;
    const chartPlacement = (() => {
      if (!promoted) return { main: { o: 0, full: true }, history: { o: 1, full: false }, jump: { o: 2, full: false } };
      if (promoted === 'history') return { history: { o: 0, full: true }, main: { o: 1, full: false }, jump: { o: 2, full: false } };
      return { jump: { o: 0, full: true }, history: { o: 1, full: false }, main: { o: 2, full: false } };
    })();
    const placeStyle = (which) => 'order:' + chartPlacement[which].o + '; grid-column:' + (chartPlacement[which].full ? '1 / -1' : 'auto') + '; min-width:0;';
    const subctl = (on, col) => 'flex:1; text-align:center; cursor:pointer; font:600 10px/1.1 "Manrope"; padding:7px 8px; border-radius:7px; border:1px solid ' + (on ? col : 'transparent') + '; ' + (on ? 'color:#17111f; background:' + col + ';' : 'color:' + (chartIsLight ? '#514958' : '#b9b0cc') + '; background:transparent;');

    // charts
    const mc = this.mainChart();
    const hoverF = st.chartHoverFloor;
    let showGuide = false, guideX = 0, guideLeftPct = 0, guideShift = '-50%', guideRows = [], guideFloorLabel = '';
    if (hoverF != null && hoverF >= mc.minF && hoverF <= mc.maxF) {
      showGuide = true;
      guideX = +mc.x(hoverF).toFixed(1);
      guideLeftPct = +((guideX / mc.W) * 100).toFixed(2);
      guideShift = guideLeftPct > 70 ? '-100%' : (guideLeftPct < 12 ? '0%' : '-50%');
      guideFloorLabel = (isRu ? 'Этаж F' : 'Floor F') + hoverF + (hoverF >= (st.mode === 'mmo' ? 33 : 26) ? (isRu ? ' · Испытание' : ' · Challenge') : '');
      guideRows = mc.act.map((s) => {
        const flo = s.floors.find((x) => x.floor === hoverF);
        if (!flo) return null;
        return { color: s.color, label: 'S' + s.season, val: this.fmt(mc.valOf(s, flo), U) + ' ' + UL };
      }).filter(Boolean);
    }

    // history chart (log, full width)
    const NS = seasons.length, LI = NS - 1, lastSeason = seasons[LI];
    const HW = 920, HH = 300, HL = 58, HR = 22, HT = 22, HB = 42, hpw = HW - HL - HR, hph = HH - HT - HB, hBase = HT + hph;
    const maxHistVal = NS > 0 ? Math.max(...seasons.map((s) => (s.floors[s.floors.length - 1]?.bossG || 1) * s.ehpMult)) : 100;
    const logMin = Math.log10(0.01), logMax = Math.log10(Math.max(0.1, maxHistVal) * 1.3);
    const hx = (s) => HL + (NS <= 1 ? 0 : (s - 1) / (NS - 1)) * hpw;
    const hy = (v) => HT + hph - (Math.log10(Math.max(v, 0.01)) - logMin) / ((logMax - logMin) || 1) * hph;
    const rawPts = NS > 0 ? seasons.map((s) => ({ x: +hx(s.season).toFixed(1), y: +hy(s.floors[s.floors.length - 1]?.bossG || 0.01).toFixed(1) })) : [];
    const ehpPts = NS > 0 ? seasons.map((s) => ({ x: +hx(s.season).toFixed(1), y: +hy((s.floors[s.floors.length - 1]?.bossG || 0.01) * s.ehpMult).toFixed(1) })) : [];
    const toPath = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' ');
    const histRawPath = toPath(rawPts), histEhpPath = toPath(ehpPts);
    const histEhpArea = ehpPts.length ? ('M' + ehpPts[0].x + ' ' + hBase + ' ' + ehpPts.map((p) => 'L' + p.x + ' ' + p.y).join(' ') + ' L' + ehpPts[ehpPts.length - 1].x + ' ' + hBase + ' Z') : '';
    const histYTicks = [0.01, 0.1, 1, 10, 100, 1000].map((v) => {
      const yy = +hy(v).toFixed(1);
      return { y: yy, ty: yy + 3, fy: yy - 8, label: v >= 1000 ? ((v / 1000) + 'KG') : (v + 'G') };
    });
    const histTickStep = Math.max(1, Math.round((NS - 1) / 6));
    const histXTicks = [];
    if (NS > 0) {
      for (let s = 1; s <= NS; s += histTickStep) {
        const xx = +hx(s).toFixed(1);
        histXTicks.push({ x: xx, fx: xx - 25, label: 'S' + s });
      }
      if (histXTicks.length && histXTicks[histXTicks.length - 1].label !== 'S' + NS) {
        const xx = +hx(NS).toFixed(1);
        histXTicks.push({ x: xx, fx: xx - 25, label: 'S' + NS });
      }
    }
    const histRawDots = rawPts.map((p) => ({ cx: p.x, cy: p.y }));
    const histEhpDots = ehpPts.map((p) => ({ cx: p.x, cy: p.y }));
    const hLastRaw = lastSeason ? (lastSeason.floors[lastSeason.floors.length - 1]?.bossG || 0) : 0;
    const histLast = {
      rawX: rawPts[LI] ? rawPts[LI].x : 0,
      rawY: rawPts[LI] ? rawPts[LI].y : 0,
      ehpX: ehpPts[LI] ? ehpPts[LI].x : 0,
      ehpY: ehpPts[LI] ? ehpPts[LI].y : 0,
      labelX: Math.max(0, (rawPts[LI] ? rawPts[LI].x : 0) - 76),
      ehpLabelY: Math.max(0, (ehpPts[LI] ? ehpPts[LI].y : 0) - 22),
      rawLabelY: Math.min(280, (rawPts[LI] ? rawPts[LI].y : 0) + 4),
      rawVal: this.fmt(hLastRaw, 'G') + 'G',
      ehpVal: this.fmt(hLastRaw * (lastSeason ? lastSeason.ehpMult : 1), 'G') + 'G'
    };
    // Per-point value labels for both lines (EHP on top → above, Raw → below).
    const ehpLabelPts = NS > 0 ? seasons.map((s, i) => {
      const raw = s.floors[s.floors.length - 1]?.bossG || 0;
      return { cx: ehpPts[i].x, cy: ehpPts[i].y, color: '#c79dff', prefer: 'above', label: this.fmt(raw * s.ehpMult, 'G') + 'G' };
    }) : [];
    const rawLabelPts = NS > 0 ? seasons.map((s, i) => {
      const raw = s.floors[s.floors.length - 1]?.bossG || 0;
      return { cx: rawPts[i].x, cy: rawPts[i].y, color: '#f5d97a', prefer: 'below', label: this.fmt(raw, 'G') + 'G' };
    }) : [];
    const histLabels = this.placeValueLabels([...ehpLabelPts, ...rawLabelPts], { top: HT, bottom: hBase, left: HL - 30, right: HW - HR + 30 });

    const hhs = st.histHoverSeason;
    let histGuide = false, histGuideX = 0, histGuidePct = 0, histGuideShift = '-50%', histGuideRows = [], histGuideLabel = '', histGuideSub = '';
    if (hhs != null && hhs >= 1 && hhs <= NS) {
      const targetSea = seasons.find((s) => s.season === hhs);
      if (targetSea) {
        histGuide = true;
        histGuideX = +hx(hhs).toFixed(1);
        histGuidePct = +((histGuideX / 920) * 100).toFixed(2);
        histGuideShift = histGuidePct > 70 ? '-100%' : (histGuidePct < 14 ? '0%' : '-50%');
        const finalF = targetSea.floors[targetSea.floors.length - 1];
        const rawG = finalF ? finalF.bossG : 0;
        const ehpG = rawG * targetSea.ehpMult;
        const finalMob = this.getMainBoss(finalF) || (finalF && finalF.mobs && finalF.mobs[0]);
        let bossName = ('F' + targetSea.floorCount);
        if (finalMob) {
          const fceBoss = this.resolveFceBoss(finalMob);
          if (fceBoss) {
            bossName = isRu ? (fceBoss.name_ru || fceBoss.name) : (fceBoss.name || fceBoss.name_ru);
          } else {
            bossName = isRu ? (finalMob.nameRu || finalMob.nameEn) : (finalMob.nameEn || finalMob.nameRu);
          }
        }
        const verTag = targetSea.ver && targetSea.ver !== ('Season ' + targetSea.season) && targetSea.ver !== ('S' + targetSea.season) ? (' · ' + targetSea.ver) : '';
        histGuideLabel = (isRu ? 'Сезон ' : 'Season ') + targetSea.season + verTag;
        histGuideSub = bossName + ' · F' + targetSea.floorCount;
        histGuideRows = [
          { color: '#f5d97a', label: isRu ? 'Номинал HP' : 'Raw HP', val: this.fmt(rawG, 'G') + ' G' },
          { color: '#c79dff', label: isRu ? 'Эффективное' : 'Effective HP', val: this.fmt(ehpG, 'G') + ' G' },
          { color: '#8fe6d4', label: isRu ? 'Резист' : 'Resist', val: (targetSea.resist * 100).toFixed(1) + '%' }
        ];
      }
    }

    // jump chart
    const jMode = st.jumpMode;
    const jMinF = mc.minF, jMaxF = mc.maxF;
    const JL = 56, JR = 22, JT = 18, JBP = 42, jpw = 920 - JL - JR, jph = 300 - JT - JBP;
    const jx = (f) => JL + (jMaxF === jMinF ? 0 : (f - jMinF) / (jMaxF - jMinF)) * jpw;
    const jactRaw = mc.act;
    const pctSeries = jactRaw.map((s) => {
      const fls = s.floors.filter((fl) => fl.floor >= jMinF && fl.floor <= jMaxF);
      const pts = fls.map((fl) => {
        let base;
        if (jMode === 'floor') {
          const pv = s.floors.find((x) => x.floor === fl.floor - 1);
          base = pv && pv.bossG > 0 ? ((fl.bossG - pv.bossG) / pv.bossG) * 100 : null;
        } else {
          const ps = seasons.find((x) => x.season === s.season - 1);
          const pf = ps && ps.floors.find((x) => x.floor === fl.floor);
          base = pf && pf.bossG > 0 ? ((fl.bossG - pf.bossG) / pf.bossG) * 100 : null;
        }
        return { floor: fl.floor, pct: base };
      });
      return { season: s.season, color: s.color, pts: pts.filter((p) => p.pct != null) };
    }).filter((s) => s.pts.length);

    let jMinV = 0, jMaxV = 10;
    pctSeries.forEach((s) => s.pts.forEach((p) => { jMinV = Math.min(jMinV, p.pct); jMaxV = Math.max(jMaxV, p.pct); }));
    const jRange = (jMaxV - jMinV) || 1;
    jMaxV += jRange * 0.1;
    jMinV -= jRange * 0.06;
    const jy = (v) => JT + jph - ((v - jMinV) / (jMaxV - jMinV)) * jph;
    const jumpSeries = pctSeries.map((s) => {
      const pts = s.pts.map((p) => ({ cx: +jx(p.floor).toFixed(1), cy: +jy(p.pct).toFixed(1), floor: p.floor, pct: p.pct }));
      return { color: s.color, season: s.season, label: 'S' + s.season, pts, path: pts.map((p, i) => (i ? 'L' : 'M') + p.cx + ' ' + p.cy).join(' ') };
    });
    // Per-point % labels. When several series share the same value at a floor the
    // labels stack exactly, so keep one per (floor, value) — newest season wins.
    const jumpLabelByPoint = new Map();
    jumpSeries.forEach((s) => {
      s.pts.forEach((p) => {
        const rounded = Math.round(p.pct);
        jumpLabelByPoint.set(p.floor + ':' + rounded, {
          cx: p.cx, cy: p.cy, color: s.color, prefer: 'above',
          label: (rounded > 0 ? '+' : '') + rounded + '%'
        });
      });
    });
    const jumpLabels = this.placeValueLabels(
      Array.from(jumpLabelByPoint.values()),
      { width: 48, top: JT, bottom: JT + jph, left: JL - 24, right: 920 - JR + 24 }
    );
    const jStepV = jRange > 400 ? 200 : (jRange > 200 ? 100 : (jRange > 80 ? 50 : (jRange > 30 ? 20 : 10)));
    const jumpYTicks = [];
    for (let v = Math.ceil(jMinV / jStepV) * jStepV; v <= jMaxV; v += jStepV) {
      const yy = +jy(v).toFixed(1);
      jumpYTicks.push({ y: yy, ty: yy + 3, fy: yy - 8, label: (v > 0 ? '+' : '') + Math.round(v) + '%', stroke: v === 0 ? (chartIsLight ? '#b8b1bf' : 'rgba(255,255,255,.24)') : (chartIsLight ? '#e8e5eb' : 'rgba(255,255,255,.06)') });
    }
    const jStepX = Math.max(1, Math.round((jMaxF - jMinF) / 7));
    const jumpXTicks = [];
    for (let f = jMinF; f <= jMaxF; f += jStepX) {
      const xx = +jx(f).toFixed(1);
      jumpXTicks.push({ x: xx, fx: xx - 25, label: 'F' + f });
    }

    const jhf = st.jumpHoverFloor;
    let jumpGuide = false, jumpGuideX = 0, jumpGuidePct = 0, jumpGuideShift = '-50%', jumpGuideRows = [], jumpGuideLabel = '';
    if (jhf != null && jhf >= jMinF && jhf <= jMaxF && jumpSeries.length) {
      jumpGuide = true;
      jumpGuideX = +jx(jhf).toFixed(1);
      jumpGuidePct = +((jumpGuideX / 920) * 100).toFixed(2);
      jumpGuideShift = jumpGuidePct > 70 ? '-100%' : (jumpGuidePct < 14 ? '0%' : '-50%');
      jumpGuideLabel = (isRu ? 'Этаж F' : 'Floor F') + jhf;
      jumpGuideRows = jumpSeries.map((s) => {
        const p = s.pts.find((x) => x.floor === jhf);
        if (!p) return null;
        return { color: s.color, label: 'S' + s.season, val: (p.pct > 0 ? '+' : '') + Math.round(p.pct) + '%', valCol: p.pct >= 0 ? '#4fe3c1' : '#ff9bb2' };
      }).filter(Boolean);
    }

    // presets & chips
    const allS = seasons.map((s) => s.season);
    const presetDefs = [
      { key: 'current', label: isRu ? 'Текущий' : 'Current', set: isDataLoaded && st.seasonIdx ? [st.seasonIdx] : [] },
      { key: 'last4', label: isRu ? 'Посл. 4' : 'Last 4', set: allS.slice(-4) },
      { key: 'last10', label: isRu ? 'Посл. 10' : 'Last 10', set: allS.slice(-10) },
      { key: 'all', label: isRu ? 'Все' : 'All', set: allS },
    ];
    const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    const presets = presetDefs.map((p) => ({ label: p.label, style: chip(sameSet(st.active, p.set), '#f5d97a'), onClick: () => this.setState({ active: p.set }) }));
    const seasonChips = seasons.map((s) => {
      const on = st.active.includes(s.season);
      return {
        label: 'S' + s.season,
        color: s.color,
        style: 'cursor:pointer; font:600 11px/1 "Manrope"; padding:6px 10px; border-radius:8px; border:1px solid ' + (on ? 'rgba(245,217,122,.4)' : 'rgba(255,255,255,.08)') + '; color:' + (on ? '#f6f1fb' : '#6b6480') + '; background:' + (on ? 'rgba(245,217,122,.08)' : 'rgba(255,255,255,.03)') + ';',
        onClick: () => this.setState({ active: on ? st.active.filter((x) => x !== s.season) : [...st.active, s.season] })
      };
    });

    // difficulty tab
    let diffFloorNum = st.diffFloor || finalF;
    let diffSteps = [];
    let diffRows = [];
    const diffFilter = st.diffFilter || 'all';

    if (isDataLoaded && sea && Array.isArray(sea.floors) && sea.floors.length > 0) {
      if (!sea.floors.some((f) => f.floor === diffFloorNum)) diffFloorNum = finalF;
      const diffFloorObj = sea.floors.find((f) => f.floor === diffFloorNum) || sea.floors[sea.floors.length - 1];
      const dstart = new Date((sea.startISO || '2025-01-15').replace(/-/g, '/'));
      const addDays = (n) => { const d = new Date(dstart); d.setDate(d.getDate() + n - 1); return d; };
      const fmtD = (d) => String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
      const rng = (a, b) => (a === b ? fmtD(addDays(a)) : fmtD(addDays(a)) + ' – ' + fmtD(addDays(b)));
      const stepCol = (pct) => pct >= 1500 ? { c: '#d98a99', bar: 'rgba(217,138,153,.6)' } : pct >= 600 ? { c: '#d0b174', bar: 'rgba(208,177,116,.55)' } : pct > 100 ? { c: '#cbb98a', bar: 'rgba(203,185,138,.5)' } : { c: '#8fbdb2', bar: 'rgba(143,189,178,.5)' };
      const now = new Date();
      const schedMax = Math.max(...(diffFloorObj && diffFloorObj.difficultySchedule && diffFloorObj.difficultySchedule.steps ? diffFloorObj.difficultySchedule.steps.map((s) => s.pct) : [100]), 100);

      const unlockDay = (sea.season >= 21) ? diffFloorNum : 1;
      const rawDiffSteps = (diffFloorObj && diffFloorObj.difficultySchedule && diffFloorObj.difficultySchedule.steps) || [];
      rawDiffSteps.forEach((s) => {
        if (s.endDay < unlockDay) return;
        const startDay = Math.max(s.startDay, unlockDay);
        const durDays = Math.max(1, s.endDay - startDay + 1);
        const d1 = addDays(startDay), d2 = addDays(s.endDay);
        const col = stepCol(s.pct);
        const live = now >= new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()) && now <= new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), 23, 59, 59);
        diffSteps.push({
          dayLabel: startDay === s.endDay ? ((isRu ? 'День ' : 'Day ') + startDay) : ((isRu ? 'Дни ' : 'Days ') + startDay + '–' + s.endDay),
          dur: durDays + (isRu ? ' дн.' : 'd'),
          date: rng(startDay, s.endDay),
          pct: s.pct + '%',
          barW: Math.max(8, Math.round((s.pct / schedMax) * 100)),
          col: col.c,
          barCol: col.bar,
          liveShow: live
        });
      });

      diffRows = sea.floors.filter((f) => (diffFilter === 'all' ? true : (diffFilter === 'ramp' ? f.floor >= rampStart : f.floor >= otStart))).map((f) => {
        const ot = f.floor >= otStart;
        const sch = f.difficultySchedule || { initialPct: 100, daysToMin: 30, steps: [] };
        const fUnlockDay = (sea.season >= 21) ? f.floor : 1;
        const rawSteps = sch.steps || [];
        const visibleSteps = [];
        rawSteps.forEach((s) => {
          if (s.endDay < fUnlockDay) return;
          const startDay = Math.max(s.startDay, fUnlockDay);
          const durDays = Math.max(1, s.endDay - startDay + 1);
          visibleSteps.push({
            ...s,
            startDay,
            durDays,
            dateRange: rng(startDay, s.endDay)
          });
        });

        const first = visibleSteps.length ? visibleSteps[0] : (rawSteps[0] || { startDay: 1, endDay: 1, durDays: 1, pct: 100, dateRange: '' });
        const col = stepCol(first.pct || sch.initialPct);
        const pills = visibleSteps.map((s) => {
          const pc = stepCol(s.pct);
          return {
            txt: (s.startDay === s.endDay ? ('D' + s.startDay) : ('D' + s.startDay + '-' + s.endDay)) + ' · ' + s.pct + '%',
            col: pc.c
          };
        });

        return {
          n: 'F' + f.floor,
          ot,
          sel: f.floor === diffFloorNum,
          rowBg: f.floor === diffFloorNum ? 'rgba(245,217,122,.06)' : 'transparent',
          initial: (first.pct || sch.initialPct) + '%',
          initialCol: col.c,
          peakDur: (first.durDays || 1) + (isRu ? ' дн.' : 'd'),
          peakDate: first.dateRange || rng(first.startDay, first.endDay),
          baseDate: fmtD(addDays(sch.daysToMin || 30)),
          baseDay: 'D' + (sch.daysToMin || 30),
          stepsN: visibleSteps.length || 1,
          pills,
          floorCol: ot ? '#d98a99' : '#b2aac2',
          floorBd: ot ? 'rgba(217,138,153,.3)' : 'rgba(255,255,255,.09)',
          floorBg: ot ? 'rgba(217,138,153,.08)' : 'rgba(255,255,255,.05)',
          onClick: () => this.setState({ diffFloor: f.floor })
        };
      });
    }

    const m = st.modal;
    const modalStyle = m ? this.mobStyle(m.type) : {};

    const fceBoss = this.resolveFceBoss(m);
    const hasFceMechanics = !!(fceBoss && (fceBoss.mechanics_count > 0 || fceBoss.mechanics_count === undefined));
    const fceSlug = fceBoss ? fceBoss.slug : '';
    const fceCachedData = fceSlug ? this._fceBossCache.get(fceSlug) : null;
    const fceNameColor = (fceBoss && fceBoss.name_color) || '';

    let modalMechanicsList = [];
    if (fceCachedData) {
      const lang = isRu ? 'ru' : 'en';
      const localized = fceCachedData[lang] || fceCachedData.en || {};
      const rawList = Array.isArray(localized.mechanics)
        ? localized.mechanics
        : ((fceCachedData.en && fceCachedData.en.mechanics) || []);

      const React = window.React;
      modalMechanicsList = rawList.map((mech, idx) => {
        const rawIdx = mech.index != null ? String(mech.index) : String(idx + 1);
        const numPadded = rawIdx.length === 1 ? ('0' + rawIdx) : rawIdx;
        const rawContent = (typeof mech.html === 'string' && mech.html.trim()) ? mech.html : (mech.text || '');
        return {
          index: numPadded,
          content: renderMechanicContent(rawContent, React)
        };
      });
    }

    let heroBossImg = '';
    if (isDataLoaded) {
      if (finalBossEnemy) {
        const fceBoss = this.resolveFceBoss(finalBossEnemy);
        if (fceBoss && fceBoss.slug) {
          heroBossImg = `../fce/assets/bosses/${fceBoss.slug}.png`;
        } else if (finalBossEnemy.image && !finalBossEnemy.image.includes('placeholder_')) {
          heroBossImg = finalBossEnemy.image;
        } else {
          heroBossImg = 'assets/monsters/boss2.png';
        }
      } else {
        heroBossImg = 'assets/monsters/boss2.png';
      }
    }
    const heroImgVisible = isDataLoaded && !!heroBossImg;
    const activeSeasonLabel = isDataLoaded && sea ? ((isRu ? 'Сезон ' : 'Season ') + sea.season + ' · ' + sea.dates) : '';
    const hasActiveSeasonLabel = isDataLoaded && !!sea;
    const seasonCountLabel = isDataLoaded ? (seasons.length + (isRu ? (' ' + this.pluralRu(seasons.length, 'сезон', 'сезона', 'сезонов')) : ' seasons')) : '';

    return {
      ...copy,
      isDataLoaded,
      runtimeError: !!(st.dataError || st.seasonError),
      runtimeErrorLabel: st.dataError ? copy.dataUnavailableLabel : copy.seasonUnavailableLabel,
      retryRuntime: () => {
        if (st.dataError) {
          this.setState({ dataError: null, seasonError: null }, () => this.loadDatamineData());
        } else if (st.seasonError) {
          const failed = st.seasonError;
          this.setState({ seasonError: null }, async () => {
            const data = await this.loadSeasonData(failed.mode, failed.season, true);
            if (data && !this._unmounted) this.forceUpdate();
          });
        }
      },
      railRef: this.railRef,
      isTable: st.tab === 'table',
      isCharts: st.tab === 'charts',
      goTable: () => this.setState({ tab: 'table' }),
      goCharts: () => this.setState({ tab: 'charts' }),
      goDiff: () => this.setState({ tab: 'difficulty' }),
      tabTableStyle: tabStyle(st.tab === 'table'),
      tabChartsStyle: tabStyle(st.tab === 'charts'),
      tabDiffStyle: tabStyle(st.tab === 'difficulty'),
      isDiff: st.tab === 'difficulty',
      modeStd: () => this.setMode('standard'),
      modeMmo: () => this.setMode('mmo'),
      modeStdStyle: modePill(st.mode === 'standard'),
      modeMmoStyle: modePill(st.mode === 'mmo'),
      searchPlaceholder: isRu ? 'Поиск этажа, босса, кода…' : 'Search floor, boss, code…',
      heroSubtitle: isRu ? 'ДАТАМАЙН · ИСТОКИ ВОЙНЫ' : 'DATAMINE · ORIGIN OF WAR',
      heroTitle: isRu ? 'Характеристики противников и сезонная сложность' : 'Enemy Stats & Seasonal Scaling',
      heroImg: heroBossImg,
      heroImgVisible,
      challengeLabel: (isRu ? 'Испытание ' : 'Challenge ') + otStart + '–' + finalF,
      rampLabel,
      chartRampLabel,
      chartChallengeLabel,
      allFloorsLabel: isRu ? 'Все этажи' : 'All Floors',
      showRailExpanded: !st.railCollapsed,
      showRailCollapsed: !!st.railCollapsed,
      toggleRail: () => this.setState((prev) => ({ railCollapsed: !prev.railCollapsed })),
      seasonCountLabel,
      showScrollTop: st.scrolled,
      scrollTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      diffSteps,
      diffRows,
      diffFilterAll: () => this.setState({ diffFilter: 'all' }),
      diffFilterRamp: () => this.setState({ diffFilter: 'ramp' }),
      diffFilterBoss: () => this.setState({ diffFilter: 'boss' }),
      diffChipAll: chip(diffFilter === 'all', '#f5d97a'),
      diffChipRamp: chip(diffFilter === 'ramp', '#f5d97a'),
      diffChipBoss: chip(diffFilter === 'boss', '#d98a99'),
      onDiffSearch: (e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v)) this.setState({ diffFloor: v });
      },
      diffFloorTitle: isDataLoaded ? ('F' + diffFloorNum + (isRu ? ' · Поэтапный спад сложности и даты' : ' · Day-by-Day Difficulty & Dates')) : '',
      activeSeasonLabel,
      hasActiveSeasonLabel,
      seasonPills,
      filterAll: () => this.setState({ filter: 'all', search: null }),
      filterRamp: () => this.setState({ filter: 'ramp', search: null }),
      filterBoss: () => this.setState({ filter: 'boss', search: null }),
      chipAll: chip(st.filter === 'all' && st.search == null, '#f5d97a'),
      chipRamp: chip(st.filter === 'ramp', '#f5d97a'),
      chipBoss: chip(st.filter === 'boss', '#ff9bb2'),
      onSearch: (e) => {
        const v = e.target.value.trim();
        this.setState({ search: v || null, expandedFloor: v ? st.expandedFloor : null });
      },
      unitG: () => this.setState({ unit: 'G' }),
      unitM: () => this.setState({ unit: 'M' }),
      unitRaw: () => this.setState({ unit: 'RAW' }),
      unitGStyle: seg(U === 'G', '#f5d97a'),
      unitMStyle: seg(U === 'M', '#f5d97a'),
      unitRawStyle: seg(U === 'RAW', '#f5d97a'),
      toggleCompare: () => this.setState({ compareOpen: !st.compareOpen }),
      compareBtnStyle: 'font:600 12px/1 "Manrope"; cursor:pointer; padding:8px 13px; border-radius:999px; border:1px solid ' + (st.compareOpen ? 'rgba(181,123,255,.5)' : 'rgba(255,255,255,.08)') + '; color:' + (st.compareOpen ? '#c79dff' : '#cbc2de') + '; background:' + (st.compareOpen ? 'rgba(181,123,255,.1)' : 'rgba(255,255,255,.05)') + ';',
      copyJson: () => {
        if (!sea) return;
        try {
          navigator.clipboard.writeText(JSON.stringify({ season: sea.season, version: sea.ver, floors: sea.floors.map((f) => ({ floor: f.floor, totalHp: f.totalHp, bossHp: f.bossHp, mobs: f.mobs })) }, null, 2));
        } catch (e) {}
        this.toast(isRu ? ('Сезон ' + sea.season + ' скопирован в JSON') : ('Season ' + sea.season + ' JSON copied'));
      },
      showCompare: st.compareOpen,
      compareLabel: cmp ? ('S' + cmp.season) : '',
      compareStats,
      compareOptions,
      onCompareChange: (e) => this.setState({ compareIdx: parseInt(e.target.value, 10) }),
      rows,
      // Chart controls and data.
      modeEhp: () => this.setState({ chartMode: 'ehp' }),
      modeRaw: () => this.setState({ chartMode: 'raw' }),
      modeEhpStyle: cctl(st.chartMode === 'ehp', '#4fe3c1'),
      modeRawStyle: cctl(st.chartMode === 'raw', '#ff9bb2'),
      metricBoss: () => this.setState({ chartMetric: 'boss' }),
      metricTotal: () => this.setState({ chartMetric: 'total' }),
      metricBossStyle: cctl(st.chartMetric === 'boss', '#f5d97a'),
      metricTotalStyle: cctl(st.chartMetric === 'total', '#f5d97a'),
      rangeRamp: () => this.setState({ chartRange: 'ramp' }),
      rangeOvertime: () => this.setState({ chartRange: 'overtime' }),
      rangeAll: () => this.setState({ chartRange: 'all' }),
      rangeRampStyle: cctl(st.chartRange === 'ramp', '#f5d97a'),
      rangeOtStyle: cctl(st.chartRange === 'overtime', '#ff9bb2'),
      rangeAllStyle: cctl(st.chartRange === 'all', '#f5d97a'),
      presets,
      seasonChips,
      mainSeries: mc.series,
      mainLabels: mc.labels,
      mainYTicks: mc.yticks,
      mainXTicks: mc.xticks,
      chartThemeLight: () => this.setChartTheme('light'),
      chartThemeDark: () => this.setChartTheme('dark'),
      chartThemeLightPressed: chartIsLight ? 'true' : 'false',
      chartThemeDarkPressed: chartIsLight ? 'false' : 'true',
      chartThemeLightStyle: chartThemeButton(chartIsLight),
      chartThemeDarkStyle: chartThemeButton(!chartIsLight),
      chartsGridStyle: '',
      mainChartCardStyle: 'border-radius:14px; padding:14px 18px; transition:background-color .18s ease,border-color .18s ease; background:' + (chartIsLight ? '#ffffff' : 'rgba(255,255,255,.02)') + '; border:1px solid ' + (chartIsLight ? '#dedbe3' : 'rgba(255,255,255,.07)') + ';' + placeStyle('main'),
      subChartCardStyle: 'border-radius:16px; padding:20px 22px; transition:background-color .18s ease,border-color .18s ease; background:' + (chartIsLight ? '#ffffff' : 'rgba(255,255,255,.02)') + '; border:1px solid ' + (chartIsLight ? '#dedbe3' : 'rgba(255,255,255,.07)') + ';',
      historyCardStyle: 'border-radius:16px; padding:20px 22px; transition:background-color .18s ease,border-color .18s ease; background:' + (chartIsLight ? '#ffffff' : 'rgba(255,255,255,.02)') + '; border:1px solid ' + (chartIsLight ? '#dedbe3' : 'rgba(255,255,255,.07)') + ';' + placeStyle('history'),
      jumpCardStyle: 'border-radius:16px; padding:20px 22px; transition:background-color .18s ease,border-color .18s ease; background:' + (chartIsLight ? '#ffffff' : 'rgba(255,255,255,.02)') + '; border:1px solid ' + (chartIsLight ? '#dedbe3' : 'rgba(255,255,255,.07)') + ';' + placeStyle('jump'),
      promoteHistory: this.togglePromoteChart('history'),
      promoteJump: this.togglePromoteChart('jump'),
      demoteMain: promoted ? this.togglePromoteChart(promoted) : (() => {}),
      mainDblHint: promoted ? (isRu ? 'Двойной клик — вернуть' : 'Double-click to restore') : '',
      subDblHint: isRu ? 'Двойной клик — увеличить' : 'Double-click to enlarge',
      mainChartTitleStyle: 'font:700 16px/1.2 "Barlow", "Manrope", system-ui, sans-serif; margin:0; color:' + (chartIsLight ? '#17111f' : '#f6f1fb') + ';',
      subChartTitleStyle: 'font:700 17px/1.2 "Barlow", "Manrope", system-ui, sans-serif; margin:0 0 4px; color:' + (chartIsLight ? '#17111f' : '#f6f1fb') + ';',
      subChartDescriptionStyle: 'font:500 12px/1.5 "Barlow", "Manrope", system-ui, sans-serif; margin:0; color:' + (chartIsLight ? '#665e6d' : '#948aa8') + ';',
      subChartControlBackground: chartIsLight ? '#f3f0f5' : 'rgba(255,255,255,.05)',
      subChartControlBorder: chartIsLight ? '#d9d4de' : 'rgba(255,255,255,.08)',
      modeBadgeStyle: 'font:700 10px/1 "Manrope"; color:' + (chartIsLight ? '#6f5312' : '#f5d97a') + '; background:' + (chartIsLight ? '#fff8dd' : 'rgba(245,217,122,.12)') + '; border:1px solid ' + (chartIsLight ? '#e8d38a' : 'rgba(245,217,122,.3)') + '; padding:6px 11px; border-radius:999px; white-space:nowrap;',
      exportCsvStyle: 'color:' + (chartIsLight ? '#403849' : '#cbc2de') + '; border-color:' + (chartIsLight ? '#d7d2dc' : 'rgba(255,255,255,.12)') + '; background:' + (chartIsLight ? '#f7f5f8' : 'rgba(255,255,255,.05)') + ';',
      chartPlotBackground: chartIsLight ? '#ffffff' : '#0f0b15',
      chartGridColor: chartIsLight ? '#e8e5eb' : 'rgba(255,255,255,.06)',
      chartAxisColor: chartIsLight ? '#665e6d' : '#6b6480',
      chartLabelHalo: chartIsLight ? '#ffffff' : '#0f0b15',
      downloadMainPng: () => this.downloadMainChartPng(),
      downloadMainCsv: () => this.downloadMainChartCsv(),
      downloadHistoryPng: () => this.downloadChartPng('[data-oow-history-chart]', 'oow-' + st.mode + '-final-floor-history.png', {
        title: copy.historyChartTitle,
        badges: [
          { label: copy.rawHpLabel, color: '#c99d22' },
          { label: copy.effectiveHpLabel, color: '#9e6ae2' }
        ]
      }),
      downloadHistoryCsv: () => this.downloadCsvRows([
        ['Season', 'Final floor', 'Raw HP (G)', 'Effective HP (G)', 'Resistance'],
        ...seasons.map((season) => {
          const finalFloor = season.floors[season.floors.length - 1];
          const raw = finalFloor?.bossG || 0;
          return ['S' + season.season, 'F' + season.floorCount, raw, raw * season.ehpMult, season.resist];
        })
      ], 'oow-' + st.mode + '-final-floor-history.csv'),
      downloadJumpPng: () => this.downloadChartPng('[data-oow-jump-chart]', 'oow-' + st.mode + '-' + jMode + '-growth.png', {
        title: jMode === 'floor' ? (isRu ? 'Рост HP от этажа к этажу' : 'Floor-over-floor HP jump') : (isRu ? 'Инфляция HP между сезонами' : 'Season-over-season HP growth (per floor)'),
        badges: [{
          label: jMode === 'floor' ? copy.floorToFloorLabel : copy.seasonToSeasonLabel,
          color: jMode === 'floor' ? '#c99d22' : '#9e6ae2'
        }]
      }),
      downloadJumpCsv: () => {
        const floorsOnChart = Array.from(new Set(jumpSeries.flatMap((series) => series.pts.map((point) => point.floor)))).sort((a, b) => a - b);
        this.downloadCsvRows([
          ['Floor', ...jumpSeries.map((series) => 'S' + series.season + ' (%)')],
          ...floorsOnChart.map((floor) => [
            'F' + floor,
            ...jumpSeries.map((series) => series.pts.find((point) => point.floor === floor)?.pct ?? '')
          ])
        ], 'oow-' + st.mode + '-' + jMode + '-growth.csv');
      },
      modeBadge: st.chartMode === 'ehp' ? (isRu ? '🛡 Эффективное HP (EHP)' : '🛡 Effective HP (EHP)') : (isRu ? '❤ Номинальное HP' : '❤ Raw HP'),
      showGuide,
      guideX,
      guideLeftPct,
      guideShift,
      guideRows,
      guideFloorLabel,
      onChartMove: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const vx = ((e.clientX - r.left) / r.width) * mc.W;
        const f = Math.round(mc.minF + ((vx - mc.L) / mc.pw) * (mc.maxF - mc.minF));
        this.setState({ chartHoverFloor: Math.max(mc.minF, Math.min(mc.maxF, f)) });
      },
      onChartLeave: () => this.setState({ chartHoverFloor: null }),
      histRawPath,
      histEhpPath,
      histEhpArea,
      histYTicks,
      histXTicks,
      histRawDots,
      histEhpDots,
      histLast,
      histLabels,
      jumpSeries,
      jumpLabels,
      jumpYTicks,
      jumpXTicks,
      jumpTitle: jMode === 'floor' ? (isRu ? 'Рост HP от этажа к этажу' : 'Floor-over-floor HP jump') : (isRu ? 'Инфляция HP между сезонами' : 'Season-over-season HP growth (per floor)'),
      jumpSub: jMode === 'floor' ? (isRu ? '% прироста каждого этажа относительно предыдущего.' : '% increase of each floor vs the previous floor.') : (isRu ? '% роста каждого этажа относительно прошлого сезона.' : '% growth of each floor vs the same floor last season.'),
      histGuide,
      histGuideX,
      histGuidePct,
      histGuideShift,
      histGuideRows,
      histGuideLabel,
      histGuideSub,
      onHistMove: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const vx = ((e.clientX - r.left) / r.width) * 920;
        const s = Math.round(1 + ((vx - HL) / hpw) * (NS - 1));
        this.setState({ histHoverSeason: Math.max(1, Math.min(NS, s)) });
      },
      onHistLeave: () => this.setState({ histHoverSeason: null }),
      jumpFloor: () => this.setState({ jumpMode: 'floor' }),
      jumpSeason: () => this.setState({ jumpMode: 'season' }),
      jumpFloorStyle: subctl(jMode === 'floor', '#f5d97a'),
      jumpSeasonStyle: subctl(jMode === 'season', '#c79dff'),
      jumpGuide,
      jumpGuideX,
      jumpGuidePct,
      jumpGuideShift,
      jumpGuideRows,
      jumpGuideLabel,
      onJumpMove: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const vx = ((e.clientX - r.left) / r.width) * 920;
        const f = Math.round(mc.minF + ((vx - 56) / (920 - 56 - 22)) * (mc.maxF - mc.minF));
        this.setState({ jumpHoverFloor: Math.max(mc.minF, Math.min(mc.maxF, f)) });
      },
      onJumpLeave: () => this.setState({ jumpHoverFloor: null }),
      showTip: !!st.tip,
      tipX: st.tip ? st.tip.x : 0,
      tipY: st.tip ? st.tip.y : 0,
      tipLabel: st.tip ? st.tip.label : '',
      tipHp: st.tip ? st.tip.hp : '',
      tipCol: st.tip ? st.tip.col : '#fff',
      clearTip: () => this.setState({ tip: null }),
      showModal: !!m,
      closeModal: () => this.setState({ modal: null, mechanicsLoading: false, mechanicsError: false }),
      stop: (e) => e.stopPropagation(),
      modalName: m ? m.name : '',
      modalImg: m ? m.img : '',
      modalFallbackImg: m ? (m.fallbackImg || 'assets/monsters/placeholder-boss.png') : '',
      modalCls: m ? m.cls : '',
      modalId: m ? m.id : '',
      modalSeason: m ? m.season : '',
      modalFloor: m ? m.floor : '',
      modalHp: m ? m.hp : '',
      modalEhp: m ? m.ehp : '',
      modalAtk: m ? m.atk : '',
      modalDef: m ? m.def : '',
      modalPrimary: m ? m.primary : [],
      modalElems: m ? m.elems : [],
      modalOverrides: m ? m.overrides : [],
      modalHasOverrides: !!(m && m.overrides && m.overrides.length),
      modalCardClass: 'oow-modal-card dm-scrollbar',
      modalBd: modalStyle.bd || 'rgba(255,255,255,.1)',
      modalHeaderBg: m ? modalStyle.bg : 'transparent',
      modalTagCol: modalStyle.tagCol || '#fff',
      modalTagBg: modalStyle.tagBg || 'rgba(255,255,255,.1)',
      modalHasMechanics: hasFceMechanics,
      modalMechanicsCount: (fceBoss && fceBoss.mechanics_count) || (modalMechanicsList.length || 0),
      modalMechanicsStyle: fceNameColor ? `--mechanics-accent-color:${fceNameColor};` : '',
      mechanicsToggleClass: 'oow-mechanics-toggle' + (st.mechanicsExpanded ? ' is-expanded' : ''),
      mechanicsExpanded: st.mechanicsExpanded,
      mechanicsExpandedStr: st.mechanicsExpanded ? 'true' : 'false',
      toggleMechanics: this.toggleMechanics,
      mechanicsTitleLabel: isRu ? 'Механики босса' : 'Boss mechanics',
      mechanicsLoadingLabel: isRu ? 'Загрузка механик...' : 'Loading mechanics...',
      mechanicsErrorLabel: isRu ? 'Не удалось загрузить механики.' : 'Mechanics could not be loaded.',
      retryLabel: isRu ? 'Повторить' : 'Retry',
      retryLoadMechanics: this.retryLoadMechanics,
      mechanicsLoading: st.mechanicsLoading,
      mechanicsError: st.mechanicsError,
      mechanicsReady: !st.mechanicsLoading && !st.mechanicsError && modalMechanicsList.length > 0,
      modalMechanicsList,
      modalFceLink: `../fce/#${fceSlug}`,
      viewFullFceLabel: isRu ? 'Открыть карточку FCE' : 'View full FCE card',
      showToast: !!st.toast,
      toastMsg: st.toast || '',
      showZoomImg: !!st.zoomImg,
      zoomImgSrc: st.zoomImg || '',
      zoomImgName: m ? m.name : '',
      zoomScale: st.zoomScale || 1,
      zoomPanX: (st.zoomPan && st.zoomPan.x) || 0,
      zoomPanY: (st.zoomPan && st.zoomPan.y) || 0,
      zoomPct: Math.round((st.zoomScale || 1) * 100),
      closeZoomImg: () => this.setState({ zoomImg: null, zoomScale: 1, zoomPan: { x: 0, y: 0 } }),
      onZoomImg: () => {
        if (m && m.img) this.setState({ zoomImg: m.img, zoomScale: 1, zoomPan: { x: 0, y: 0 } });
      },
      onZoomIn: () => this.setState((prev) => ({ zoomScale: Math.min(5, Number(((prev.zoomScale || 1) * 1.25).toFixed(2))) })),
      onZoomOut: () => this.setState((prev) => ({ zoomScale: Math.max(0.5, Number(((prev.zoomScale || 1) * 0.8).toFixed(2))) })),
      onZoomReset: () => this.setState({ zoomScale: 1, zoomPan: { x: 0, y: 0 } }),
      onZoomToggleScale: () => this.setState((prev) => ({ zoomScale: (prev.zoomScale || 1) > 1.2 ? 1 : 2.5, zoomPan: { x: 0, y: 0 } })),
      onZoomWheel: (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const delta = e.deltaY < 0 ? 1.15 : 0.85;
        this.setState((prev) => ({
          zoomScale: Math.min(5, Math.max(0.5, Number(((prev.zoomScale || 1) * delta).toFixed(2))))
        }));
      },
      onZoomMouseDown: (e) => {
        this._isDragging = true;
        this._startX = e.clientX - ((this.state.zoomPan && this.state.zoomPan.x) || 0);
        this._startY = e.clientY - ((this.state.zoomPan && this.state.zoomPan.y) || 0);
      },
      onZoomMouseMove: (e) => {
        if (this._isDragging) {
          this.setState({ zoomPan: { x: e.clientX - this._startX, y: e.clientY - this._startY } });
        }
      },
      onZoomMouseUp: () => {
        this._isDragging = false;
      },
      onZoomTouchStart: (e) => {
        if (e.touches.length === 2) {
          this._touchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          this._initialScale = this.state.zoomScale || 1;
        } else if (e.touches.length === 1) {
          this._isDragging = true;
          this._startX = e.touches[0].clientX - ((this.state.zoomPan && this.state.zoomPan.x) || 0);
          this._startY = e.touches[0].clientY - ((this.state.zoomPan && this.state.zoomPan.y) || 0);
        }
      },
      onZoomTouchMove: (e) => {
        if (e.touches.length === 2 && this._touchDist) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          const newScale = Math.min(5, Math.max(0.5, Number(((this._initialScale * dist) / this._touchDist).toFixed(2))));
          this.setState({ zoomScale: newScale });
        } else if (e.touches.length === 1 && this._isDragging) {
          this.setState({ zoomPan: { x: e.touches[0].clientX - this._startX, y: e.touches[0].clientY - this._startY } });
        }
      },
      onZoomTouchEnd: () => {
        this._isDragging = false;
        this._touchDist = null;
      },
    };
  }
}

runtime.registerRootController(OowController);
