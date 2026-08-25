/**
 * Shared "scroll to top" button for every /datamine page.
 *
 * Framework-agnostic: injects one fixed button + its styles, then watches
 * scrolling on the window AND any inner scroll container (via a capture-phase
 * listener, since scroll events don't bubble). The button appears once the
 * active scroller has moved more than half a viewport from the top and returns
 * that scroller to the top on click.
 */
(function () {
  "use strict";

  if (window.__dmScrollTopReady) return;
  window.__dmScrollTopReady = true;

  function getLabel() {
    var language = window.DatamineHeader && typeof window.DatamineHeader.getLanguage === "function"
      ? window.DatamineHeader.getLanguage()
      : document.documentElement.lang;
    return language === "ru" ? "Наверх" : "Scroll to top";
  }

  function init() {
    if (document.querySelector(".dm-scrolltop")) return;

    var reduceMotion = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    var style = document.createElement("style");
    style.textContent = [
      ".dm-scrolltop{",
      "  position:fixed;right:24px;bottom:24px;z-index:70;",
      "  width:40px;height:40px;border-radius:6px;",
      "  border:1px solid rgba(255,255,255,.12);",
      "  background:rgba(21,17,25,.92);color:#f5d97a;",
      "  display:flex;align-items:center;justify-content:center;",
      "  cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.5);",
      "  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);",
      "  opacity:0;transform:translateY(8px);pointer-events:none;",
      "  transition:opacity .2s ease,transform .2s ease,background .16s ease,border-color .16s ease;",
      "}",
      ".dm-scrolltop.is-visible{opacity:1;transform:translateY(0);pointer-events:auto;}",
      ".dm-scrolltop:hover{background:#f5d97a;color:#17111f;border-color:#f5d97a;}",
      ".dm-scrolltop:focus-visible{outline:2px solid #f5d97a;outline-offset:2px;}",
      ".dm-scrolltop svg{width:18px;height:18px;}",
      "@media (max-width:600px){.dm-scrolltop{right:14px;bottom:14px;}}",
      "@media (prefers-reduced-motion:reduce){.dm-scrolltop{transition:opacity .2s ease;transform:none;}}"
    ].join("");
    document.head.appendChild(style);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dm-scrolltop";
    function applyLabel() {
      var label = getLabel();
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    }
    applyLabel();
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>';
    document.body.appendChild(btn);

    // The scroller the button currently refers to (last one scrolled).
    var active = window;

    function isDoc(node) {
      return (
        node === document ||
        node === document.documentElement ||
        node === document.body ||
        node === window
      );
    }
    function offsetOf(s) {
      return s === window
        ? window.pageYOffset || document.documentElement.scrollTop || 0
        : s.scrollTop;
    }
    function viewOf(s) {
      return s === window ? window.innerHeight : s.clientHeight;
    }

    function update() {
      var show = offsetOf(active) > viewOf(active) * 0.5;
      btn.classList.toggle("is-visible", show);
    }

    // Capture phase catches scroll from the window and from any inner container,
    // including containers rendered after this script runs. A class toggle on
    // scroll is cheap, so update directly rather than gating on rAF (which is
    // paused for hidden/background tabs).
    document.addEventListener(
      "scroll",
      function (event) {
        active = isDoc(event.target) ? window : event.target;
        update();
      },
      true
    );
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("datamine:language-change", applyLabel);
    window.addEventListener("datamine:languagechange", applyLabel);

    btn.addEventListener("click", function () {
      var target = active === window ? window : active;
      try {
        target.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      } catch (e) {
        // Older engines: no options object.
        if (target === window) window.scrollTo(0, 0);
        else target.scrollTop = 0;
      }
      // We're heading to the top, so retract the button right away.
      btn.classList.remove("is-visible");
    });

    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
