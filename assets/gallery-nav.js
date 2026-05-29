(function () {
  "use strict";

  if (window.__modelAtlasNavLoaded) return;
  window.__modelAtlasNavLoaded = true;

  var currentScript = document.currentScript;
  var scriptSrc = currentScript ? currentScript.getAttribute("src") || "" : "";
  var marker = "assets/gallery-nav.js";
  var markerIndex = scriptSrc.replace(/\\/g, "/").indexOf(marker);
  var rootPrefix = markerIndex >= 0 ? scriptSrc.slice(0, markerIndex) : "";
  var currentFile = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  var onIndexPage = currentFile === "index.html" || currentFile === "";
  var inRootFolder = rootPrefix === "";

  function makeLink(href, label, detail) {
    var link = document.createElement("a");
    link.href = href;
    link.innerHTML = "<span>" + label + "</span><small>" + detail + "</small>";
    return link;
  }

  function closePanel(wrap, toggle) {
    wrap.setAttribute("data-open", "false");
    toggle.setAttribute("aria-expanded", "false");
  }

  function togglePanel(wrap, toggle) {
    var next = wrap.getAttribute("data-open") !== "true";
    wrap.setAttribute("data-open", String(next));
    toggle.setAttribute("aria-expanded", String(next));
  }

  function fallbackBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = rootPrefix + "index.html";
  }

  function init() {
    if (document.getElementById("model-atlas-nav-host")) return;

    var host = document.createElement("div");
    host.id = "model-atlas-nav-host";
    var shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML =
      "<style>" +
      ":host{all:initial;position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483647;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;pointer-events:none}" +
      ".wrap{position:relative;display:flex;flex-direction:column;align-items:flex-end;gap:8px;color:#f7f3ea}" +
      ".toggle,.panel{pointer-events:auto;box-shadow:0 18px 44px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.14);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}" +
      ".toggle{width:44px;height:44px;border:0;border-radius:999px;background:rgba(18,18,18,.72);color:#f7f3ea;font:700 18px/1 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer;display:grid;place-items:center;transition:transform .18s ease,background .18s ease}" +
      ".toggle:hover{transform:translateY(-1px);background:rgba(18,18,18,.88)}" +
      ".toggle:focus-visible,a:focus-visible,button:focus-visible{outline:2px solid rgba(255,255,255,.9);outline-offset:3px}" +
      ".panel{position:absolute;right:0;bottom:54px;min-width:184px;padding:8px;border-radius:10px;background:rgba(18,18,18,.76);display:grid;gap:4px;opacity:0;transform:translateY(8px) scale(.98);transform-origin:bottom right;visibility:hidden;transition:opacity .18s ease,transform .18s ease,visibility .18s ease}" +
      ".wrap[data-open='true'] .panel{opacity:1;transform:translateY(0) scale(1);visibility:visible}" +
      "a,.back{appearance:none;border:0;width:100%;border-radius:7px;background:transparent;color:#f7f3ea;text-decoration:none;text-align:left;display:grid;gap:2px;padding:10px 11px;cursor:pointer;font:600 12px/1.2 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.06em}" +
      "a:hover,.back:hover{background:rgba(255,255,255,.12)}" +
      "small{font:500 10px/1.2 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:rgba(247,243,234,.66);letter-spacing:.04em}" +
      ".divider{height:1px;background:rgba(255,255,255,.14);margin:3px 2px}" +
      "@media (max-width:640px){:host{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}.toggle{width:42px;height:42px}.panel{min-width:172px;bottom:52px}}" +
      "@media (prefers-reduced-motion:reduce){.toggle,.panel{transition:none}}" +
      "</style>" +
      "<div class='wrap' data-open='false'>" +
      "<nav class='panel' aria-label='Model Atlas navigation'></nav>" +
      "<button class='toggle' type='button' aria-label='Open gallery navigation' aria-expanded='false' title='Gallery navigation'>&#8962;</button>" +
      "</div>";

    var wrap = shadow.querySelector(".wrap");
    var panel = shadow.querySelector(".panel");
    var toggle = shadow.querySelector(".toggle");

    panel.appendChild(makeLink(rootPrefix + "index.html", "HOME", "Model Atlas"));
    if (!onIndexPage && !inRootFolder) {
      panel.appendChild(makeLink("index.html", "SERIES", "Current folder"));
    }
    var divider = document.createElement("div");
    divider.className = "divider";
    panel.appendChild(divider);

    var back = document.createElement("button");
    back.type = "button";
    back.className = "back";
    back.innerHTML = "<span>BACK</span><small>Browser history</small>";
    back.addEventListener("click", fallbackBack);
    panel.appendChild(back);

    toggle.addEventListener("click", function () {
      togglePanel(wrap, toggle);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closePanel(wrap, toggle);
    });

    document.addEventListener("pointerdown", function (event) {
      if (!event.composedPath().includes(host)) closePanel(wrap, toggle);
    });

    document.body.appendChild(host);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
