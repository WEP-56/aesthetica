(function () {
  "use strict";

  var rootHandle = null;
  var indexHandle = null;
  var indexText = "";
  var entries = [];
  var selectedIndex = -1;
  var htmlPaths = [];
  var isDirty = false;

  var els = {
    pickRoot: document.getElementById("pickRoot"),
    reloadIndex: document.getElementById("reloadIndex"),
    saveIndex: document.getElementById("saveIndex"),
    supportNotice: document.getElementById("supportNotice"),
    addEntry: document.getElementById("addEntry"),
    entryList: document.getElementById("entryList"),
    entryForm: document.getElementById("entryForm"),
    moveUp: document.getElementById("moveUp"),
    moveDown: document.getElementById("moveDown"),
    deleteEntry: document.getElementById("deleteEntry"),
    cardPreview: document.getElementById("cardPreview"),
    saveState: document.getElementById("saveState"),
    htmlPaths: document.getElementById("htmlPaths"),
    navTarget: document.getElementById("navTarget"),
    installSelectedNav: document.getElementById("installSelectedNav"),
    installAllNav: document.getElementById("installAllNav")
  };

  var fields = {
    model: els.entryForm.elements.model,
    title: els.entryForm.elements.title,
    href: els.entryForm.elements.href,
    linkTitle: els.entryForm.elements.linkTitle,
    tagline: els.entryForm.elements.tagline,
    linkDesc: els.entryForm.elements.linkDesc,
    note: els.entryForm.elements.note,
    pageNum: els.entryForm.elements.pageNum,
    accent: els.entryForm.elements.accent,
    textColor: els.entryForm.elements.textColor
  };

  var colorPairs = [
    ["#e8e0ff", "#4a3a8a"],
    ["#d4ecd4", "#1a4a1a"],
    ["#ffecd4", "#7a3a0a"],
    ["#d7eefc", "#22486a"],
    ["#d8efe9", "#24605b"],
    ["#ffe9d4", "#8c4d1f"],
    ["#f0ddff", "#7646a8"],
    ["#ebeff3", "#4f5c66"]
  ];

  function setStatus(message) {
    els.saveState.textContent = message;
  }

  function setDirty(next) {
    isDirty = next;
    els.saveIndex.disabled = !rootHandle || !isDirty;
    setStatus(rootHandle ? (isDirty ? "有未保存修改" : "已保存") : "未选择文件夹");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function decodeHtml(value) {
    var textarea = document.createElement("textarea");
    textarea.innerHTML = value || "";
    return textarea.value;
  }

  function normalizePath(value) {
    return String(value || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\.\//, "");
  }

  function filePathFromHref(value) {
    return normalizePath(value).split("#")[0].split("?")[0];
  }

  function isSafeRelativePath(value) {
    var raw = String(value || "").trim();
    var normalized = normalizePath(raw);
    if (!normalized) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return false;
    if (/^[\\/]/.test(raw)) return false;
    return !normalized.split("/").includes("..");
  }

  function slugify(value) {
    var slug = String(value || "entry")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "entry";
  }

  function normalizeColor(value, fallback) {
    var text = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
  }

  function titleToHtml(value) {
    return escapeHtml(value).replace(/\r?\n/g, "<br>");
  }

  function titleFromHtml(value) {
    return decodeHtml(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function getEntryClass(entry) {
    return "editor-" + slugify(entry.model);
  }

  function getRelativeDepth(path) {
    var normalized = normalizePath(path);
    if (!normalized || !normalized.includes("/")) return "";
    return "../".repeat(normalized.split("/").length - 1);
  }

  async function readFile(handle) {
    var file = await handle.getFile();
    return file.text();
  }

  async function writeFile(handle, content) {
    var writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async function readBytes(handle) {
    var file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  async function writeBytes(handle, bytes) {
    var writable = await handle.createWritable();
    await writable.write(new Blob([bytes]));
    await writable.close();
  }

  function textBytes(value) {
    return new TextEncoder().encode(value);
  }

  function asciiIndexOf(bytes, needleText) {
    var needle = textBytes(needleText.toLowerCase());
    for (var i = 0; i <= bytes.length - needle.length; i++) {
      var matched = true;
      for (var j = 0; j < needle.length; j++) {
        var code = bytes[i + j];
        if (code >= 65 && code <= 90) code += 32;
        if (code !== needle[j]) {
          matched = false;
          break;
        }
      }
      if (matched) return i;
    }
    return -1;
  }

  function insertBytes(bytes, index, insert) {
    var next = new Uint8Array(bytes.length + insert.length);
    next.set(bytes.slice(0, index), 0);
    next.set(insert, index);
    next.set(bytes.slice(index), index + insert.length);
    return next;
  }

  async function getFileByPath(path, create) {
    var parts = normalizePath(path).split("/").filter(Boolean);
    var current = rootHandle;
    for (var i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i], { create: !!create });
    }
    return current.getFileHandle(parts[parts.length - 1], { create: !!create });
  }

  function parseEntries(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var style = doc.querySelector("style");
    var styleText = style ? style.textContent : "";
    return Array.from(doc.querySelectorAll(".grid > .column")).map(function (column, index) {
      var className = Array.from(column.classList).find(function (name) {
        return name.indexOf("col-") === 0;
      }) || "col-entry-" + index;
      var key = className.replace(/^col-/, "");
      var label = column.querySelector(".model-label");
      var title = column.querySelector(".column-header h2");
      var tagline = column.querySelector(".tagline");
      var note = column.querySelector(".model-note");
      var link = column.querySelector(".page-item a");
      var pageNum = column.querySelector(".page-num");
      var linkTitle = column.querySelector(".page-title");
      var linkDesc = column.querySelector(".page-desc");
      var colors = extractColors(styleText, key, index);
      return {
        classKey: key,
        model: label ? label.textContent.trim() : "Model",
        title: title ? titleFromHtml(title.innerHTML.trim()) : "Untitled",
        tagline: tagline ? tagline.textContent.trim() : "",
        note: note ? note.textContent.trim() : "",
        href: link ? normalizePath(link.getAttribute("href")) : "",
        pageNum: pageNum ? pageNum.textContent.trim() : String(index).padStart(2, "0"),
        linkTitle: linkTitle ? linkTitle.textContent.trim() : "Index",
        linkDesc: linkDesc ? linkDesc.textContent.trim() : "",
        accent: colors.accent,
        textColor: colors.textColor
      };
    });
  }

  function extractColors(styleText, key, index) {
    var pairIndex = index % colorPairs.length;
    var fallback = colorPairs[pairIndex];
    var rule = new RegExp("\\.col-" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+\\.model-label\\s*\\{([\\s\\S]*?)\\}", "i").exec(styleText);
    if (!rule) {
      return { accent: fallback[0], textColor: fallback[1] };
    }
    var background = /background:\s*([^;]+);/i.exec(rule[1]);
    var color = /color:\s*([^;]+);/i.exec(rule[1]);
    return {
      accent: resolveCssColor(styleText, background ? background[1].trim() : "", fallback[0]),
      textColor: resolveCssColor(styleText, color ? color[1].trim() : "", fallback[1])
    };
  }

  function resolveCssColor(styleText, value, fallback) {
    var varMatch = /var\(--([^)]+)\)/.exec(value);
    if (varMatch) {
      var cssVar = new RegExp("--" + varMatch[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*([^;]+);", "i").exec(styleText);
      if (cssVar) return normalizeColor(cssVar[1].trim(), fallback);
    }
    return normalizeColor(value, fallback);
  }

  function renderEntryList() {
    els.entryList.innerHTML = "";
    entries.forEach(function (entry, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "entry-tab";
      button.setAttribute("aria-current", String(index === selectedIndex));
      button.innerHTML = "<strong>" + escapeHtml(entry.model) + "</strong><span>" + escapeHtml(entry.href || "no path") + "</span>";
      button.addEventListener("click", function () {
        selectEntry(index);
      });
      els.entryList.appendChild(button);
    });
  }

  function setFormEnabled(enabled) {
    Object.keys(fields).forEach(function (key) {
      fields[key].disabled = !enabled;
    });
    els.moveUp.disabled = !enabled || selectedIndex <= 0;
    els.moveDown.disabled = !enabled || selectedIndex < 0 || selectedIndex >= entries.length - 1;
    els.deleteEntry.disabled = !enabled;
  }

  function selectEntry(index) {
    selectedIndex = index;
    var entry = entries[selectedIndex];
    if (!entry) {
      setFormEnabled(false);
      renderEntryList();
      renderPreview(null);
      return;
    }
    setFormEnabled(true);
    fields.model.value = entry.model;
    fields.title.value = entry.title;
    fields.href.value = entry.href;
    fields.linkTitle.value = entry.linkTitle;
    fields.tagline.value = entry.tagline;
    fields.linkDesc.value = entry.linkDesc;
    fields.note.value = entry.note;
    fields.pageNum.value = entry.pageNum;
    fields.accent.value = normalizeColor(entry.accent, "#e8e0ff");
    fields.textColor.value = normalizeColor(entry.textColor, "#4a3a8a");
    renderEntryList();
    renderPreview(entry);
  }

  function updateSelectedFromForm() {
    if (!entries[selectedIndex]) return;
    entries[selectedIndex] = {
      classKey: entries[selectedIndex].classKey,
      model: fields.model.value.trim() || "Model",
      title: fields.title.value.trim() || "Untitled",
      href: normalizePath(fields.href.value),
      linkTitle: fields.linkTitle.value.trim() || "Index",
      tagline: fields.tagline.value.trim(),
      linkDesc: fields.linkDesc.value.trim(),
      note: fields.note.value.trim(),
      pageNum: fields.pageNum.value.trim() || "00",
      accent: fields.accent.value,
      textColor: fields.textColor.value
    };
    renderEntryList();
    renderPreview(entries[selectedIndex]);
    setDirty(true);
  }

  function renderPreview(entry) {
    if (!entry) {
      els.cardPreview.className = "preview-card empty";
      els.cardPreview.textContent = "选择或新增一个入口";
      return;
    }
    els.cardPreview.className = "preview-card";
    els.cardPreview.innerHTML =
      "<div>" +
      "<span class=\"preview-label\" style=\"background:" + escapeHtml(entry.accent) + ";color:" + escapeHtml(entry.textColor) + "\">" + escapeHtml(entry.model) + "</span>" +
      "<h3 class=\"preview-title\">" + titleToHtml(entry.title) + "</h3>" +
      "<div class=\"preview-tagline\">" + escapeHtml(entry.tagline) + "</div>" +
      "<div class=\"preview-note\">" + escapeHtml(entry.note) + "</div>" +
      "</div>" +
      "<a class=\"preview-link\" href=\"" + escapeHtml(entry.href || "#") + "\">" +
      "<span class=\"preview-num\">" + escapeHtml(entry.pageNum) + "</span>" +
      "<span class=\"preview-info\">" +
      "<span class=\"preview-link-title\">" + escapeHtml(entry.linkTitle) + "</span>" +
      "<span class=\"preview-link-desc\">" + escapeHtml(entry.linkDesc) + "</span>" +
      "</span>" +
      "<span class=\"preview-arrow\">&rarr;</span>" +
      "</a>";
  }

  function makeStyleBlock(entriesToRender) {
    return entriesToRender.map(function (entry) {
      return "    .col-" + getEntryClass(entry) + " .model-label {\n" +
        "      background: " + normalizeColor(entry.accent, "#e8e0ff") + ";\n" +
        "      color: " + normalizeColor(entry.textColor, "#4a3a8a") + ";\n" +
        "    }";
    }).join("\n");
  }

  function makeColumn(entry) {
    var classKey = getEntryClass(entry);
    return "      <div class=\"column col-" + classKey + "\">\n" +
      "        <div class=\"column-header\">\n" +
      "          <span class=\"model-label\">" + escapeHtml(entry.model) + "</span>\n" +
      "          <h2>" + titleToHtml(entry.title) + "</h2>\n" +
      "          <div class=\"tagline\">" + escapeHtml(entry.tagline) + "</div>\n" +
      "          <div class=\"model-note\">" + escapeHtml(entry.note) + "</div>\n" +
      "        </div>\n" +
      "        <ul class=\"page-list\">\n" +
      "          <li class=\"page-item\">\n" +
      "            <a href=\"" + escapeHtml(normalizePath(entry.href)) + "\">\n" +
      "              <span class=\"page-num\">" + escapeHtml(entry.pageNum) + "</span>\n" +
      "              <span class=\"page-info\">\n" +
      "                <span class=\"page-title\">" + escapeHtml(entry.linkTitle) + "</span>\n" +
      "                <span class=\"page-desc\">" + escapeHtml(entry.linkDesc) + "</span>\n" +
      "              </span>\n" +
      "              <span class=\"page-arrow\">&rarr;</span>\n" +
      "            </a>\n" +
      "          </li>\n" +
      "        </ul>\n" +
      "      </div>";
  }

  function replaceBetween(text, startMarker, endMarker, replacement) {
    var start = text.indexOf(startMarker);
    var end = text.indexOf(endMarker, start + startMarker.length);
    if (start < 0 || end < 0) {
      return text;
    }
    return text.slice(0, start + startMarker.length) + "\n" + replacement + "\n" + text.slice(end);
  }

  function hasManagedMarkers(text) {
    return text.includes("/* gallery-editor:card-styles:start */") && text.includes("<!-- gallery-editor:cards:start -->");
  }

  function ensureMarkers(text) {
    if (hasManagedMarkers(text)) return text;

    var styleInsertAt = text.lastIndexOf("    .col-pending .model-label");
    if (styleInsertAt < 0) {
      styleInsertAt = text.indexOf("    .column-header h2");
    }
    if (styleInsertAt >= 0) {
      text = text.slice(0, styleInsertAt) +
        "    /* gallery-editor:card-styles:start */\n" +
        "    /* gallery-editor:card-styles:end */\n\n" +
        text.slice(styleInsertAt);
    }

    var gridStart = text.indexOf("    <div class=\"grid\">");
    var footerStart = text.indexOf("\n    <div class=\"footer\">", gridStart);
    var gridCloseStart = footerStart >= 0 ? text.lastIndexOf("\n    </div>", footerStart) : -1;
    if (gridStart >= 0 && footerStart >= 0 && gridCloseStart >= 0) {
      var openEnd = text.indexOf("\n", gridStart);
      text = text.slice(0, openEnd + 1) +
        "      <!-- gallery-editor:cards:start -->\n" +
        text.slice(openEnd + 1, gridCloseStart).trimEnd() +
        "\n      <!-- gallery-editor:cards:end -->\n" +
        text.slice(gridCloseStart);
    }
    return text;
  }

  function buildIndexHtml() {
    var next = ensureMarkers(indexText);
    next = replaceBetween(
      next,
      "    /* gallery-editor:card-styles:start */",
      "    /* gallery-editor:card-styles:end */",
      makeStyleBlock(entries)
    );
    next = replaceBetween(
      next,
      "      <!-- gallery-editor:cards:start -->",
      "      <!-- gallery-editor:cards:end -->",
      entries.map(makeColumn).join("\n\n")
    );
    next = next.replace(/<p class="subtitle">.*?<\/p>/, "<p class=\"subtitle\">" + escapeHtml(numberWord(entries.length)) + " live entries</p>");
    next = next.replace(/<div>.*?live entries, no reserved slots<\/div>/, "<div>" + escapeHtml(numberWord(entries.length)) + " live entries, no reserved slots</div>");
    return next;
  }

  function numberWord(count) {
    var words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
    return words[count] || String(count);
  }

  async function chooseRoot() {
    if (!window.showDirectoryPicker) {
      els.supportNotice.textContent = "当前浏览器不支持文件夹写入。请用新版 Chrome 或 Edge 打开 gallery-editor.html。";
      return;
    }
    rootHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    await loadIndex();
    await refreshHtmlPaths();
    setRootEnabled(true);
    setDirty(false);
  }

  function setRootEnabled(enabled) {
    els.reloadIndex.disabled = !enabled;
    els.addEntry.disabled = !enabled;
    els.navTarget.disabled = !enabled;
    els.installSelectedNav.disabled = !enabled;
    els.installAllNav.disabled = !enabled;
  }

  async function loadIndex() {
    indexHandle = await rootHandle.getFileHandle("index.html");
    indexText = await readFile(indexHandle);
    entries = parseEntries(indexText);
    selectedIndex = entries.length ? 0 : -1;
    selectEntry(selectedIndex);
    els.supportNotice.textContent = "已读取 index.html。编辑后点击保存，改动会直接写回画廊根目录。";
    setDirty(false);
  }

  async function refreshHtmlPaths() {
    htmlPaths = [];
    await walkDirectory(rootHandle, "");
    htmlPaths = htmlPaths.filter(function (path) {
      return path !== "gallery-editor.html";
    });
    htmlPaths.sort(function (a, b) {
      return a.localeCompare(b);
    });
    els.htmlPaths.innerHTML = htmlPaths.map(function (path) {
      return "<option value=\"" + escapeHtml(path) + "\"></option>";
    }).join("");
  }

  async function walkDirectory(directoryHandle, prefix) {
    for await (var pair of directoryHandle.entries()) {
      var name = pair[0];
      var handle = pair[1];
      if (name === ".git" || name === "node_modules") continue;
      var path = prefix ? prefix + "/" + name : name;
      if (handle.kind === "file" && /\.html?$/i.test(name)) {
        htmlPaths.push(path);
      } else if (handle.kind === "directory") {
        await walkDirectory(handle, path);
      }
    }
  }

  function makeNewEntry() {
    var colors = colorPairs[entries.length % colorPairs.length];
    return {
      classKey: "",
      model: "New Model",
      title: "New\nEntry",
      href: "",
      linkTitle: "Index",
      tagline: "Main index for the folder",
      linkDesc: "Open the directory",
      note: "Archive entry for the works.",
      pageNum: "00",
      accent: colors[0],
      textColor: colors[1]
    };
  }

  async function saveIndex() {
    updateSelectedFromForm();
    var invalid = entries.find(function (entry) {
      return !isSafeRelativePath(entry.href);
    });
    if (invalid) {
      throw new Error("路径必须是画廊根目录下的相对路径：" + invalid.href);
    }
    var next = buildIndexHtml();
    await writeFile(indexHandle, next);
    indexText = next;
    setDirty(false);
    els.supportNotice.textContent = "index.html 已保存。";
  }

  async function installNavForPath(path) {
    var original = String(path || "").trim();
    if (!original) return "skipped";
    if (!isSafeRelativePath(original)) {
      throw new Error("只能处理画廊根目录下的相对 HTML 路径：" + path);
    }
    var normalized = filePathFromHref(original);
    if (!normalized || normalized === "index.html" || normalized === "gallery-editor.html") {
      return "skipped";
    }
    var handle = await getFileByPath(normalized, false);
    var bytes = await readBytes(handle);
    if (asciiIndexOf(bytes, "gallery-nav.js") >= 0) return "exists";
    var bodyIndex = asciiIndexOf(bytes, "</body>");
    if (bodyIndex < 0) return "missing-body";
    var scriptSrc = getRelativeDepth(normalized) + "assets/gallery-nav.js";
    var insert = textBytes("\n  <script src=\"" + scriptSrc + "\"></script>\n");
    await writeBytes(handle, insertBytes(bytes, bodyIndex, insert));
    return "added";
  }

  async function installSelectedNav() {
    var path = normalizePath(els.navTarget.value || fields.href.value);
    var result = await installNavForPath(path);
    els.supportNotice.textContent = "返回组件处理完成：" + path + " / " + result;
  }

  async function installAllNav() {
    await refreshHtmlPaths();
    var added = 0;
    var exists = 0;
    var skipped = 0;
    for (var i = 0; i < htmlPaths.length; i++) {
      if (htmlPaths[i] === "index.html" || htmlPaths[i] === "gallery-editor.html") {
        skipped++;
        continue;
      }
      var result = await installNavForPath(htmlPaths[i]);
      if (result === "added") added++;
      if (result === "exists") exists++;
      if (result !== "added" && result !== "exists") skipped++;
    }
    els.supportNotice.textContent = "批量完成：新增 " + added + "，已存在 " + exists + "，跳过 " + skipped + "。";
  }

  els.pickRoot.addEventListener("click", function () {
    chooseRoot().catch(function (error) {
      els.supportNotice.textContent = "选择失败：" + error.message;
    });
  });

  els.reloadIndex.addEventListener("click", function () {
    loadIndex().catch(function (error) {
      els.supportNotice.textContent = "读取失败：" + error.message;
    });
  });

  els.saveIndex.addEventListener("click", function () {
    saveIndex().catch(function (error) {
      els.supportNotice.textContent = "保存失败：" + error.message;
    });
  });

  els.addEntry.addEventListener("click", function () {
    entries.push(makeNewEntry());
    selectEntry(entries.length - 1);
    setDirty(true);
  });

  els.deleteEntry.addEventListener("click", function () {
    if (selectedIndex < 0) return;
    entries.splice(selectedIndex, 1);
    selectedIndex = Math.min(selectedIndex, entries.length - 1);
    selectEntry(selectedIndex);
    setDirty(true);
  });

  els.moveUp.addEventListener("click", function () {
    if (selectedIndex <= 0) return;
    var entry = entries[selectedIndex];
    entries.splice(selectedIndex, 1);
    entries.splice(selectedIndex - 1, 0, entry);
    selectEntry(selectedIndex - 1);
    setDirty(true);
  });

  els.moveDown.addEventListener("click", function () {
    if (selectedIndex < 0 || selectedIndex >= entries.length - 1) return;
    var entry = entries[selectedIndex];
    entries.splice(selectedIndex, 1);
    entries.splice(selectedIndex + 1, 0, entry);
    selectEntry(selectedIndex + 1);
    setDirty(true);
  });

  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", updateSelectedFromForm);
  });

  els.installSelectedNav.addEventListener("click", function () {
    installSelectedNav().catch(function (error) {
      els.supportNotice.textContent = "返回组件添加失败：" + error.message;
    });
  });

  els.installAllNav.addEventListener("click", function () {
    installAllNav().catch(function (error) {
      els.supportNotice.textContent = "批量添加失败：" + error.message;
    });
  });

  window.addEventListener("beforeunload", function (event) {
    if (!isDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  setFormEnabled(false);
  renderPreview(null);
  if (!window.showDirectoryPicker) {
    els.supportNotice.textContent = "当前浏览器不支持文件夹写入。请用新版 Chrome 或 Edge 打开 gallery-editor.html。";
  }
})();
