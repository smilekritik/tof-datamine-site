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

  function init() {
    if (document.querySelector(".dm-scrolltop")) return;

    var reduceMotion = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    var style = document.createElement("style");
    style.textContent = [
      ".dm-scrolltop{",
      "  position:fixed;right:24px;bottom:24px;z-index:70;",
      "  width:46px;height:46px;border-radius:13px;",
      "  border:1px solid rgba(245,217,122,.4);",
      "  background:rgba(18,10,26,.92);color:#f5d97a;",
      "  display:flex;align-items:center;justify-content:center;",
      "  cursor:pointer;box-shadow:0 12px 34px rgba(0,0,0,.5);",
      "  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);",
      "  opacity:0;transform:translateY(12px);pointer-events:none;",
      "  transition:opacity .2s ease,transform .2s ease,background .16s ease;",
      "}",
      ".dm-scrolltop.is-visible{opacity:1;transform:translateY(0);pointer-events:auto;}",
      ".dm-scrolltop:hover{background:rgba(245,217,122,.16);}",
      ".dm-scrolltop:focus-visible{outline:2px solid rgba(245,217,122,.68);outline-offset:3px;}",
      ".dm-scrolltop svg{width:20px;height:20px;}",
      "@media (max-width:600px){.dm-scrolltop{right:16px;bottom:16px;}}",
      "@media (prefers-reduced-motion:reduce){.dm-scrolltop{transition:opacity .2s ease;transform:none;}}"
    ].join("");
    document.head.appendChild(style);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dm-scrolltop";
    btn.setAttribute("aria-label", "Scroll to top");
    btn.setAttribute("title", "Scroll to top");
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
