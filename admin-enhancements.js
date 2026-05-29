/* Mini markeit Admin - non-breaking enhancements */
(function () {
  const state = {
    search: "",
    pageFilter: "all",
  };

  document.addEventListener("DOMContentLoaded", () => {
    addEnhancementStylesheet();
    addQuickActions();
    addTableTools();
    improveLoginLoading();
    enhanceTopbar();
    patchAfterRender();
  });

  function addEnhancementStylesheet() {
    if (document.querySelector('link[href="admin-enhancements.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "admin-enhancements.css";
    document.head.appendChild(link);
  }

  function enhanceTopbar() {
    const topbar = document.querySelector(".topbar");
    if (!topbar || document.getElementById("openStatusDot")) return;

    const p = topbar.querySelector("p");
    if (p) {
      const dot = document.createElement("span");
      dot.id = "openStatusDot";
      dot.className = "status-dot";
      p.prepend(dot);
    }
  }

  function addQuickActions() {
    const dashboard = document.getElementById("page-dashboard");
    const stats = dashboard?.querySelector(".stats");
    if (!dashboard || !stats || document.getElementById("quickActions")) return;

    const box = document.createElement("div");
    box.id = "quickActions";
    box.className = "quick-actions";
    box.innerHTML = `
      <button class="quick-action" type="button" data-jump="products">زیادکرنا کەلوپەل<span>چوون بۆ لیستی کەلوپەلان</span></button>
      <button class="quick-action" type="button" data-jump="categories">زیادکرنا پۆل<span>ڕێکخستنی بەش و پۆلەکان</span></button>
      <button class="quick-action" type="button" data-jump="orders">داواکاری نوێ<span>بینین و گۆڕینی دۆخی داواکاری</span></button>
      <button class="quick-action" type="button" data-jump="support">پشتەڤانی<span>وەڵامدانەوەی چاتی کڕیاران</span></button>
    `;

    box.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-jump]");
      if (!btn || typeof window.showPage !== "function") return;
      window.showPage(btn.dataset.jump);
    });

    dashboard.insertBefore(box, stats);
  }

  function addTableTools() {
    addToolbar("page-products", "productsTable", "گەڕان لە کەلوپەلان...", [
      ["all", "هەموو"],
      ["active", "چالاک"],
      ["off", "ڤەمراندی"],
      ["sale", "داشکاندن"],
    ]);

    addToolbar("page-categories", "categoriesList", "گەڕان لە پۆلان...", [
      ["all", "هەموو"],
      ["active", "چالاک"],
      ["off", "ناچالاک"],
    ], true);

    addToolbar("page-orders", "ordersTable", "گەڕان لە داواکاریان...", [
      ["all", "هەموو"],
      ["new", "نوێ"],
      ["preparing", "ئامادەکرن"],
      ["delivered", "گەهاندی"],
      ["cancelled", "هەلوەشاندی"],
    ]);
  }

  function addToolbar(pageId, targetId, placeholder, filters, compact = false) {
    const page = document.getElementById(pageId);
    const panel = page?.querySelector(".panel");
    if (!panel || document.getElementById(`${targetId}-tools`)) return;

    const toolbar = document.createElement("div");
    toolbar.id = `${targetId}-tools`;
    toolbar.className = `enhancement-toolbar ${compact ? "compact" : ""}`;
    toolbar.innerHTML = `
      <input type="search" placeholder="${placeholder}" data-search-for="${targetId}" />
      <select data-filter-for="${targetId}">
        ${filters.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
      </select>
      <button class="btn secondary" type="button" data-export="${targetId}">Export CSV</button>
      <button class="btn secondary" type="button" data-backup="${targetId}">Backup JSON</button>
    `;

    panel.insertBefore(toolbar, panel.children[1] || null);

    toolbar.addEventListener("input", (event) => {
      if (event.target.matches("[data-search-for]")) {
        state.search = event.target.value.trim().toLowerCase();
        applyFilters(event.target.dataset.searchFor);
      }
    });

    toolbar.addEventListener("change", (event) => {
      if (event.target.matches("[data-filter-for]")) {
        state.pageFilter = event.target.value;
        applyFilters(event.target.dataset.filterFor);
      }
    });

    toolbar.addEventListener("click", (event) => {
      const exportBtn = event.target.closest("[data-export]");
      const backupBtn = event.target.closest("[data-backup]");
      if (exportBtn) exportVisibleTable(exportBtn.dataset.export);
      if (backupBtn) backupData(backupBtn.dataset.backup);
    });
  }

  function applyFilters(targetId) {
    if (targetId === "productsTable") filterRows("productsTable", productRowMatches);
    if (targetId === "ordersTable") filterRows("ordersTable", orderRowMatches);
    if (targetId === "categoriesList") filterCards("categoriesList", categoryCardMatches);
  }

  function rowText(row) {
    return (row.textContent || "").toLowerCase();
  }

  function productRowMatches(row) {
    const text = rowText(row);
    if (state.search && !text.includes(state.search)) return false;
    if (state.pageFilter === "active" && !text.includes("چالاک")) return false;
    if (state.pageFilter === "off" && !text.includes("ڤەمراندی")) return false;
    if (state.pageFilter === "sale" && !text.includes("داشکاندن")) return false;
    return true;
  }

  function orderRowMatches(row) {
    const text = rowText(row);
    if (state.search && !text.includes(state.search)) return false;
    if (state.pageFilter !== "all" && !text.includes(statusLabel(state.pageFilter).toLowerCase())) return false;
    return true;
  }

  function categoryCardMatches(card) {
    const text = rowText(card);
    if (state.search && !text.includes(state.search)) return false;
    if (state.pageFilter === "active" && !text.includes("چالاک")) return false;
    if (state.pageFilter === "off" && !text.includes("ڤەمراندی") && !text.includes("ناچالاک")) return false;
    return true;
  }

  function statusLabel(status) {
    return {
      new: "نوێ",
      preparing: "ئامادەکرن",
      delivered: "گەهاندی",
      cancelled: "هەلوەشاندی",
    }[status] || "";
  }

  function filterRows(tableId, matcher) {
    const table = document.getElementById(tableId);
    if (!table) return;
    let visible = 0;
    Array.from(table.querySelectorAll("tr")).forEach((row) => {
      if (row.classList.contains("no-match-row")) row.remove();
    });
    Array.from(table.querySelectorAll("tr")).forEach((row) => {
      const match = matcher(row);
      row.style.display = match ? "" : "none";
      if (match) visible += 1;
    });
    if (!visible && table.querySelector("tr")) {
      const tr = document.createElement("tr");
      tr.className = "no-match-row";
      tr.innerHTML = `<td colspan="8">هیچ ئەنجامێک نەدۆزرایەوە</td>`;
      table.appendChild(tr);
    }
  }

  function filterCards(listId, matcher) {
    const list = document.getElementById(listId);
    if (!list) return;
    let visible = 0;
    Array.from(list.children).forEach((card) => {
      const match = matcher(card);
      card.style.display = match ? "" : "none";
      if (match) visible += 1;
    });
    let empty = list.querySelector(".no-match-card");
    if (!visible) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "empty no-match-card";
        empty.textContent = "هیچ ئەنجامێک نەدۆزرایەوە";
        list.appendChild(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  function exportVisibleTable(targetId) {
    const rows = [];
    const table = document.getElementById(targetId);
    const container = document.getElementById(targetId);

    if (table?.tagName === "TBODY") {
      const header = Array.from(table.closest("table").querySelectorAll("thead th")).map((th) => clean(th.textContent));
      rows.push(header);
      Array.from(table.querySelectorAll("tr")).forEach((tr) => {
        if (tr.style.display === "none" || tr.classList.contains("no-match-row")) return;
        rows.push(Array.from(tr.children).map((td) => clean(td.textContent)));
      });
    } else if (container) {
      rows.push(["data"]);
      Array.from(container.children).forEach((child) => {
        if (child.style.display === "none") return;
        rows.push([clean(child.textContent)]);
      });
    }

    downloadText(`${targetId}-${dateStamp()}.csv`, rows.map(toCsvRow).join("\n"), "text/csv;charset=utf-8");
  }

  function backupData(targetId) {
    const data = {
      exported_at: new Date().toISOString(),
      products: safeArray(window.products),
      categories: safeArray(window.categories),
      orders: safeArray(window.orders),
      supportMessages: safeArray(window.supportMessages),
      promoCodes: safeArray(window.promoCodes),
      target: targetId,
    };
    downloadText(`mini-markeit-backup-${dateStamp()}.json`, JSON.stringify(data, null, 2), "application/json");
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function toCsvRow(row) {
    return row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",");
  }

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function improveLoginLoading() {
    const originalLogin = window.login;
    if (typeof originalLogin !== "function" || originalLogin.__enhanced) return;

    window.login = async function enhancedLogin() {
      const btn = document.querySelector(".login-card .btn.primary");
      const oldText = btn?.textContent;
      try {
        if (btn) {
          btn.classList.add("loading");
          btn.disabled = true;
          btn.textContent = "چاوەڕێ بکە...";
        }
        await Promise.race([
          originalLogin.apply(this, arguments),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000)),
        ]);
      } catch (error) {
        const errorBox = document.getElementById("loginError");
        if (errorBox) errorBox.textContent = "پەیوەندی دوا کەوت. تکایە دووبارە هەوڵ بدەوە.";
      } finally {
        if (btn) {
          btn.classList.remove("loading");
          btn.disabled = false;
          btn.textContent = oldText || "چوونەژوورەوە";
        }
      }
    };
    window.login.__enhanced = true;
  }

  function patchAfterRender() {
    const wrappers = ["loadAllData", "loadProducts", "loadCategories", "loadOrders", "loadSupportMessages", "loadPromoCodes", "loadSettings"];
    wrappers.forEach((name) => {
      const original = window[name];
      if (typeof original !== "function" || original.__enhanced) return;
      window[name] = async function enhancedLoader() {
        const result = await original.apply(this, arguments);
        updateInsights();
        syncOpenStatus();
        return result;
      };
      window[name].__enhanced = true;
    });

    setTimeout(() => {
      updateInsights();
      syncOpenStatus();
    }, 700);
  }

  function updateInsights() {
    const dashboard = document.getElementById("page-dashboard");
    const grid2 = dashboard?.querySelector(".grid2");
    if (!dashboard || !grid2) return;

    let box = document.getElementById("dashboardInsights");
    if (!box) {
      box = document.createElement("div");
      box.id = "dashboardInsights";
      box.className = "insight-grid";
      dashboard.insertBefore(box, grid2);
    }

    const orders = safeArray(window.orders);
    const products = safeArray(window.products);
    const support = safeArray(window.supportMessages);
    const promos = safeArray(window.promoCodes);

    const totalSales = orders.reduce((sum, order) => sum + Number(order.total || order.total_amount || 0), 0);
    const unavailable = products.filter((p) => p.is_available === false).length;
    const unanswered = support.filter((m) => !m.admin_reply).length;
    const activePromos = promos.filter((p) => p.is_active !== false && (!p.expires_at || new Date(p.expires_at) > new Date())).length;

    box.innerHTML = `
      <div class="insight-card"><span>کۆی فرۆشتن</span><b>${formatMoneyLocal(totalSales)}</b></div>
      <div class="insight-card"><span>کەلوپەلی ناچالاک</span><b>${unavailable}</b></div>
      <div class="insight-card"><span>چاتی بێ وەڵام</span><b>${unanswered}</b></div>
      <div class="insight-card"><span>پرۆمۆی چالاک</span><b>${activePromos}</b></div>
    `;
  }

  function syncOpenStatus() {
    const dot = document.getElementById("openStatusDot");
    const isOpenInput = document.getElementById("settingIsOpen");
    if (!dot || !isOpenInput) return;
    const isOpen = isOpenInput.checked;
    dot.style.background = isOpen ? "var(--green2)" : "#c62828";
    dot.style.boxShadow = isOpen ? "0 0 0 5px rgba(24, 184, 79, 0.11)" : "0 0 0 5px rgba(198, 40, 40, 0.11)";
  }

  function formatMoneyLocal(value) {
    return `${new Intl.NumberFormat("en-US").format(Number(value || 0))} IQD`;
  }
})();
