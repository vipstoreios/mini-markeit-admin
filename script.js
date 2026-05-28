const SUPABASE_URL = "https://fauzeybaapusunlptevc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdXpleWJhYXB1c3VubHB0ZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc3MDEsImV4cCI6MjA5NTM2MzcwMX0.9Lc3TMOp78Xj27DM9xGqX1FriZm5bNX-9Vvg-4I7ymQ";

let sb;
let products = [];
let categories = [];
let orders = [];
let supportMessages = [];
let promoCodes = [];
let settingsRow = null;

let currentProductId = null;
let currentCategoryId = null;
let currentPromoId = null;

document.addEventListener("DOMContentLoaded", async () => {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  injectPromoDashboard();
  setupNavigation();

  const { data } = await sb.auth.getSession();

  if (data.session) {
    showApp();
    await loadAllData();
  } else {
    showLogin();
  }
});


function injectPromoStyles() {
  if (document.getElementById("promoInlineStyles")) return;

  const style = document.createElement("style");
  style.id = "promoInlineStyles";
  style.textContent = `
    .promo-products-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0 10px;
    }
    .promo-products-head b {
      margin-left: auto;
      color: var(--text, #102915);
      font-size: 14px;
    }
    .promo-products-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      max-height: 260px;
      overflow: auto;
      padding: 4px;
      border: 1px solid var(--border, #dfe9e2);
      border-radius: 18px;
      background: #fbfdfb;
    }
    .promo-product-item {
      display: grid;
      grid-template-columns: auto 44px 1fr;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border: 1px solid var(--border, #dfe9e2);
      border-radius: 16px;
      background: white;
      cursor: pointer;
    }
    .promo-product-item input {
      width: auto;
      margin: 0;
    }
    .promo-product-img {
      width: 44px;
      height: 44px;
      border-radius: 13px;
      background: #edf4ef;
      overflow: hidden;
      display: grid;
      place-items: center;
    }
    .promo-product-img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .promo-product-item b {
      display: block;
      font-size: 13px;
      color: var(--text, #102915);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .promo-product-item small {
      display: block;
      margin-top: 3px;
      color: var(--muted, #66736a);
      font-weight: 800;
    }
    @media (max-width: 560px) {
      .promo-products-list {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}


function injectPromoDashboard() {
  injectPromoStyles();
  const sidebar = document.querySelector(".sidebar");
  const settingsNav = document.querySelector('.nav[data-page="settings"]');

  if (sidebar && !document.querySelector('.nav[data-page="promos"]')) {
    const btn = document.createElement("button");
    btn.className = "nav";
    btn.dataset.page = "promos";
    btn.textContent = "پرۆمۆ کۆد";
    if (settingsNav) {
      sidebar.insertBefore(btn, settingsNav);
    } else {
      sidebar.appendChild(btn);
    }
  }

  const content = document.querySelector(".content");
  if (content && !document.getElementById("page-promos")) {
    const page = document.createElement("section");
    page.id = "page-promos";
    page.className = "page hidden";
    page.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <h2>پرۆمۆ کۆد</h2>
          <button class="btn primary" onclick="openPromoModal()">زیادکرنا پرۆمۆ کۆد</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>کۆد</th>
                <th>ناونیشان</th>
                <th>جۆر</th>
                <th>بڕ</th>
                <th>بەکارهێنان</th>
                <th>دۆخ</th>
                <th>چالاکی</th>
              </tr>
            </thead>
            <tbody id="promosTable"></tbody>
          </table>
        </div>
      </div>
    `;
    content.appendChild(page);
  }

  if (!document.getElementById("promoModal")) {
    const modal = document.createElement("div");
    modal.id = "promoModal";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h2 id="promoModalTitle">زیادکرنا پرۆمۆ کۆد</h2>
          <button onclick="closePromoModal()">×</button>
        </div>

        <div class="form-grid">
          <label>کۆدی پرۆمۆ
            <input id="promoCode" placeholder="EID10 یان FREEDELIVERY" />
          </label>

          <label>ناونیشان
            <input id="promoTitle" placeholder="داشکاندنی جەژن" />
          </label>

          <label class="wide">وەسف
            <input id="promoDescription" placeholder="وەسفی داشکاندن" />
          </label>

          <label>جۆری داشکاندن
            <select id="promoDiscountType">
              <option value="percent">ڕێژە %</option>
              <option value="fixed">بڕی پارە IQD</option>
              <option value="free_delivery">گەیاندنی خۆرایی</option>
              <option value="delivery_fixed">داشکاندنی گەیاندن IQD</option>
            </select>
          </label>

          <label>بڕی داشکاندن
            <input id="promoDiscountValue" type="number" placeholder="10 یان 2000" />
          </label>

          <label>بۆ چی بەکاربێت؟
            <select id="promoAppliesTo">
              <option value="order">کۆی داواکاری</option>
              <option value="delivery">گەیاندن</option>
            </select>
          </label>

          <label>کەمترین کۆی داواکاری
            <input id="promoMinOrder" type="number" placeholder="5000" />
          </label>

          <label>زۆرترین جار بەکارهێنان
            <input id="promoMaxUses" type="number" placeholder="100" />
          </label>

          <label>بەرواری کۆتایی
            <input id="promoExpiresAt" type="datetime-local" />
          </label>

          <label class="check">
            <input id="promoActive" type="checkbox" />
            پرۆمۆ کۆد چالاکە
          </label>

          <label class="check wide">
            <input id="promoOnlySelectedProducts" type="checkbox" onchange="togglePromoProductsBox()" />
            تەنها بۆ بەرهەمە هەڵبژێردراوەکان کار بکات
          </label>

          <div id="promoProductsBox" class="wide hidden">
            <div class="promo-products-head">
              <b>بەرهەمەکان هەڵبژێرە</b>
              <button type="button" class="btn mini" onclick="selectAllPromoProducts()">هەموو</button>
              <button type="button" class="btn mini" onclick="clearPromoProducts()">هیچ</button>
            </div>
            <div id="promoProductsList" class="promo-products-list"></div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn secondary" onclick="closePromoModal()">داخستن</button>
          <button class="btn primary" onclick="savePromo()">پاشەکەوتکرن</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  if (!document.getElementById("totalPromos")) {
    const stats = document.querySelector(".stats");
    if (stats) {
      const stat = document.createElement("div");
      stat.className = "stat";
      stat.innerHTML = `<span>پرۆمۆ کۆد</span><b id="totalPromos">0</b>`;
      stats.appendChild(stat);
    }
  }
}

function showLogin() {
  document.getElementById("loginPage").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

function showApp() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
}

async function login() {
  const email = getValue("usernameInput");
  const password = getValue("passwordInput");
  const errorBox = document.getElementById("loginError");

  errorBox.textContent = "";

  if (!email || !password) {
    errorBox.textContent = "ئیمەیڵ و پاسۆرد بنووسە.";
    return;
  }

  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    errorBox.textContent = "ئیمەیڵ یان پاسۆرد هەڵەیە.";
    return;
  }

  showApp();
  await loadAllData();
}

async function logout() {
  await sb.auth.signOut();
  showLogin();
}

function setupNavigation() {
  document.querySelectorAll(".nav").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });
}

function showPage(page) {
  document.querySelectorAll(".nav").forEach((b) => b.classList.remove("active"));
  document.querySelector(`.nav[data-page="${page}"]`)?.classList.add("active");

  document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
  document.getElementById(`page-${page}`)?.classList.remove("hidden");

  const titles = {
    dashboard: "سەرەکی",
    products: "کەلوپەل",
    categories: "پۆلێن / بەشەکان",
    orders: "داواکاری",
    support: "چات دگەل پشتەڤانیێ",
    promos: "پرۆمۆ کۆد",
    settings: "ڕێکخستن",
  };

  setText("pageTitle", titles[page] || "Mini markeit");
}

async function loadAllData() {
  await Promise.all([
    loadCategories(),
    loadProducts(),
    loadOrders(),
    loadSupportMessages(),
    loadPromoCodes(),
    loadSettings(),
  ]);

  updateStats();
  renderDashboard();
  toast("هاتە نویکرنەوە");
}

async function loadCategories() {
  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    alert("هەڵە لە هێنانی پۆلان: " + error.message);
    return;
  }

  categories = data || [];
  renderCategories();
  fillCategorySelect();
}

async function loadProducts() {
  const { data, error } = await sb
    .from("products")
    .select("*, categories(name_ku_sorani, name_ku_badini)")
    .order("sort_order", { ascending: true });

  if (error) {
    alert("هەڵە لە هێنانی کەلوپەلان: " + error.message);
    return;
  }

  products = data || [];
  renderProducts();
}

async function loadOrders() {
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    alert("هەڵە لە هێنانی داواکاریان: " + error.message);
    return;
  }

  orders = data || [];
  renderOrders();
}

async function loadSupportMessages() {
  const { data, error } = await sb
    .from("support_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    alert("هەڵە لە هێنانی چاتێ: " + error.message);
    return;
  }

  supportMessages = data || [];
  renderSupportMessages();
}

async function loadPromoCodes() {
  const { data, error } = await sb
    .from("promo_codes")
    .select("*, promo_code_products(product_id)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    alert("هەڵە لە هێنانی پرۆمۆ کۆدەکان: " + error.message);
    return;
  }

  promoCodes = data || [];
  renderPromoCodes();
}

async function loadSettings() {
  const { data, error } = await sb
    .from("app_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return;

  settingsRow = data;

  if (!data) return;

  setValue("settingAppName", data.app_name || "Mini markeit");
  setValue("settingStoreName", data.store_name || "مینی مارکێت");
  setValue("settingAddress", data.address || "Duhok, Barzan Road, Mini Market");
  setValue("settingPhone", data.phone || "");
  setValue("settingWhatsapp", data.whatsapp || data.whatsapp_number || "");
  setValue("settingDeliveryFee", data.delivery_fee || 1500);
  setValue("settingDeliveryTime", data.delivery_time || "60 - 90 خولەک");
  setChecked("settingIsOpen", data.is_open !== false);
}

function renderDashboard() {
  const latestOrders = document.getElementById("latestOrders");
  const latestSupport = document.getElementById("latestSupport");

  if (latestOrders) {
    latestOrders.innerHTML =
      orders
        .slice(0, 5)
        .map(
          (o) => `
        <div class="mini-row">
          <div>
            <b>${escapeHtml(o.customer_name || "کڕیار")}</b>
            <small>${escapeHtml(o.customer_phone || "")}</small>
          </div>
          <span>${formatMoney(o.total || o.total_amount || 0)}</span>
        </div>
      `
        )
        .join("") || `<div class="empty">هێشتا داواکاری نییە</div>`;
  }

  if (latestSupport) {
    latestSupport.innerHTML =
      supportMessages
        .slice(0, 5)
        .map(
          (m) => `
        <div class="mini-row">
          <div>
            <b>${escapeHtml(m.customer_name || "کڕیار")}</b>
            <small>${escapeHtml(m.message || "")}</small>
          </div>
          <span class="${m.admin_reply ? "badge done" : "badge new"}">
            ${m.admin_reply ? "بەرسڤ درا" : "نوێ"}
          </span>
        </div>
      `
        )
        .join("") || `<div class="empty">هێشتا چات نییە</div>`;
  }
}

function renderProducts() {
  const table = document.getElementById("productsTable");
  if (!table) return;

  if (!products.length) {
    table.innerHTML = `<tr><td colspan="6" class="empty">هێشتا کەلوپەل نەهاتیە زێدەکرن</td></tr>`;
    return;
  }

  table.innerHTML = products
    .map((p) => {
      const categoryName =
        p.categories?.name_ku_badini || p.categories?.name_ku_sorani || "-";

      const image = p.image_url
        ? `<img class="thumb" src="${escapeAttr(p.image_url)}" alt="">`
        : `<div class="thumb ph">🛍️</div>`;

      return `
      <tr>
        <td>${image}</td>
        <td>
          <b>${escapeHtml(p.name_ku_badini || p.name_ku_sorani || p.name_en || "-")}</b>
          <small>${escapeHtml(p.unit || "")}</small>
        </td>
        <td>${escapeHtml(categoryName)}</td>
        <td>${formatMoney(p.price || 0)}</td>
        <td>
          <span class="badge ${p.is_available !== false ? "done" : "off"}">
            ${p.is_available !== false ? "چالاک" : "ڤەمراندی"}
          </span>
          ${p.is_discount ? `<span class="badge sale">داشکاندن</span>` : ""}
        </td>
        <td>
          <button class="btn mini" onclick="editProduct('${p.id}')">گۆڕین</button>
          <button class="btn danger mini" onclick="deleteProduct('${p.id}')">سڕین</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderCategories() {
  const box = document.getElementById("categoriesList");
  if (!box) return;

  if (!categories.length) {
    box.innerHTML = `<div class="empty">هێشتا پۆل نەهاتیە زێدەکرن</div>`;
    return;
  }

  box.innerHTML = categories
    .map((c) => {
      const imgUrl = c.image_url || c.icon || "";
      const visual = isImageUrl(imgUrl)
        ? `<img src="${escapeAttr(imgUrl)}" alt="">`
        : `<span>${escapeHtml(imgUrl || "🛍️")}</span>`;

      return `
      <div class="cat-card">
        <div class="cat-img">${visual}</div>
        <div class="cat-body">
          <h3>${escapeHtml(c.name_ku_badini || c.name_ku_sorani || "-")}</h3>
          <p>${escapeHtml(c.name_en || "")}</p>
          <div>
            <span class="badge ${c.is_active !== false ? "done" : "off"}">
              ${c.is_active !== false ? "چالاک" : "ڤەمراندی"}
            </span>
            <span class="badge">#${c.sort_order || 0}</span>
          </div>
        </div>
        <div class="cat-actions">
          <button class="btn mini" onclick="editCategory('${c.id}')">گۆڕین</button>
          <button class="btn danger mini" onclick="deleteCategory('${c.id}')">سڕین</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderOrders() {
  const table = document.getElementById("ordersTable");
  if (!table) return;

  if (!orders.length) {
    table.innerHTML = `<tr><td colspan="6" class="empty">هێشتا داواکاری نییە</td></tr>`;
    return;
  }

  table.innerHTML = orders
    .map(
      (o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <b>${escapeHtml(o.customer_name || "کڕیار")}</b>
        <small>${formatDate(o.created_at)}</small>
      </td>
      <td>${escapeHtml(o.customer_phone || "")}</td>
      <td>
        <b>${formatMoney(o.total || o.total_amount || 0)}</b>
        ${
          o.promo_code
            ? `<small>پرۆمۆ: ${escapeHtml(o.promo_code)} - داشکاندن: ${formatMoney(o.promo_discount || 0)}</small>`
            : ""
        }
      </td>
      <td><span class="badge">${escapeHtml(orderStatusText(o.status))}</span></td>
      <td class="actions">
        <button class="btn mini" onclick="viewOrder('${o.id}')">وردەکاری</button>
        <select onchange="updateOrderStatus('${o.id}', this.value)">
          <option value="">دۆخ</option>
          <option value="new">نوێ</option>
          <option value="preparing">ئامادەکرن</option>
          <option value="delivered">گەهاندی</option>
          <option value="cancelled">هەلوەشاندی</option>
        </select>
        <button class="btn danger mini" onclick="deleteOrder('${o.id}')">سڕین</button>
      </td>
    </tr>
  `
    )
    .join("");
}

function renderSupportMessages() {
  const box = document.getElementById("supportList");
  if (!box) return;

  if (!supportMessages.length) {
    box.innerHTML = `<div class="empty">هێشتا چات نییە</div>`;
    return;
  }

  box.innerHTML = supportMessages
    .map(
      (m) => `
    <div class="support-card">
      <div class="support-head">
        <div>
          <h3>${escapeHtml(m.customer_name || "کڕیار")}</h3>
          <p>${escapeHtml(m.customer_phone || "")} • ${formatDate(m.created_at)}</p>
        </div>
        <span class="${m.admin_reply ? "badge done" : "badge new"}">
          ${m.admin_reply ? "بەرسڤ درا" : "نوێ"}
        </span>
      </div>

      <div class="chat-box customer">
        <b>کڕیار:</b>
        <p>${escapeHtml(m.message || "")}</p>
      </div>

      ${
        m.admin_reply
          ? `
        <div class="chat-box admin">
          <b>ئەدمین:</b>
          <p>${escapeHtml(m.admin_reply)}</p>
        </div>
      `
          : ""
      }

      <textarea id="reply-${m.id}" placeholder="بەرسڤا خۆ بنویسە...">${escapeHtml(
        m.admin_reply || ""
      )}</textarea>

      <div class="support-actions">
        <button class="btn primary" onclick="replySupport('${m.id}')">شاندنا بەرسڤێ</button>
        <button class="btn danger" onclick="deleteSupport('${m.id}')">سڕین</button>
      </div>
    </div>
  `
    )
    .join("");
}

function renderPromoCodes() {
  const table = document.getElementById("promosTable");
  if (!table) return;

  if (!promoCodes.length) {
    table.innerHTML = `<tr><td colspan="7" class="empty">هێشتا پرۆمۆ کۆد نییە</td></tr>`;
    return;
  }

  table.innerHTML = promoCodes
    .map((p) => {
      const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
      const uses = `${p.used_count || 0}${p.max_uses ? " / " + p.max_uses : ""}`;

      return `
        <tr>
          <td><b>${escapeHtml(p.code || "-")}</b></td>
          <td>
            <b>${escapeHtml(p.title || "-")}</b>
            <small>${escapeHtml(p.description || "")}</small>
          </td>
          <td>${escapeHtml(promoTypeText(p.discount_type))}</td>
          <td>${promoValueText(p)}</td>
          <td>${escapeHtml(uses)}</td>
          <td>
            <span class="badge ${
              p.is_active && !isExpired ? "done" : "off"
            }">${p.is_active && !isExpired ? "چالاک" : "ناچالاک"}</span>
            ${isExpired ? `<span class="badge sale">بەسەرچووە</span>` : ""}
          </td>
          <td>
            <button class="btn mini" onclick="editPromo('${p.id}')">گۆڕین</button>
            <button class="btn danger mini" onclick="deletePromo('${p.id}')">سڕین</button>
          </td>
        </tr>
      `;
    })
    .join("");
}


function renderPromoProductsSelector(selectedIds = []) {
  const box = document.getElementById("promoProductsList");
  if (!box) return;

  if (!products.length) {
    box.innerHTML = `<div class="empty">هێشتا بەرهەم نییە</div>`;
    return;
  }

  const selected = new Set((selectedIds || []).map(String));

  box.innerHTML = products
    .map((p) => {
      const name = p.name_ku_badini || p.name_ku_sorani || p.name_en || "بەرهەم";
      const checked = selected.has(String(p.id)) ? "checked" : "";
      const image = p.image_url
        ? `<img src="${escapeAttr(p.image_url)}" alt="">`
        : `<span>🛍️</span>`;

      return `
        <label class="promo-product-item">
          <input type="checkbox" class="promo-product-check" value="${escapeAttr(p.id)}" ${checked} />
          <div class="promo-product-img">${image}</div>
          <div>
            <b>${escapeHtml(name)}</b>
            <small>${formatMoney(p.price || 0)}</small>
          </div>
        </label>
      `;
    })
    .join("");
}

function getSelectedPromoProductIds() {
  return Array.from(document.querySelectorAll(".promo-product-check:checked")).map((el) => el.value);
}

function togglePromoProductsBox() {
  const box = document.getElementById("promoProductsBox");
  if (!box) return;

  const enabled = getChecked("promoOnlySelectedProducts");
  box.classList.toggle("hidden", !enabled);

  if (enabled) {
    renderPromoProductsSelector(getSelectedPromoProductIds());
  }
}

function selectAllPromoProducts() {
  document.querySelectorAll(".promo-product-check").forEach((el) => {
    el.checked = true;
  });
}

function clearPromoProducts() {
  document.querySelectorAll(".promo-product-check").forEach((el) => {
    el.checked = false;
  });
}

function fillCategorySelect() {
  const select = document.getElementById("productCategory");
  if (!select) return;

  select.innerHTML =
    `<option value="">بێ پۆل</option>` +
    categories
      .map(
        (c) =>
          `<option value="${escapeAttr(c.id)}">${escapeHtml(
            c.name_ku_badini || c.name_ku_sorani || "-"
          )}</option>`
      )
      .join("");
}

function openProductModal() {
  currentProductId = null;
  setText("productModalTitle", "زیادکرنا کەلوپەل");

  setValue("productNameSorani", "");
  setValue("productNameBadini", "");
  setValue("productNameAr", "");
  setValue("productNameEn", "");
  setValue("productCategory", "");
  setValue("productPrice", "");
  setValue("productOldPrice", "");
  setValue("productUnit", "");
  setValue("productImage", "");
  setValue("productSort", products.length + 1);

  setChecked("productAvailable", true);
  setChecked("productDiscount", false);

  document.getElementById("productModal").classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("productModal").classList.add("hidden");
}

function editProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;

  currentProductId = id;
  setText("productModalTitle", "گۆڕینا کەلوپەلی");

  setValue("productNameSorani", p.name_ku_sorani);
  setValue("productNameBadini", p.name_ku_badini);
  setValue("productNameAr", p.name_ar);
  setValue("productNameEn", p.name_en);
  setValue("productCategory", p.category_id);
  setValue("productPrice", p.price);
  setValue("productOldPrice", p.old_price);
  setValue("productUnit", p.unit);
  setValue("productImage", p.image_url);
  setValue("productSort", p.sort_order);

  setChecked("productAvailable", p.is_available !== false);
  setChecked("productDiscount", !!p.is_discount);

  document.getElementById("productModal").classList.remove("hidden");
}

async function saveProduct() {
  const name = getValue("productNameSorani");
  const price = Number(getValue("productPrice") || 0);

  if (!name) {
    alert("ناڤێ کەلوپەلی بنویسە.");
    return;
  }

  const payload = {
    name_ku_sorani: name,
    name_ku_badini: getValue("productNameBadini"),
    name_ar: getValue("productNameAr"),
    name_en: getValue("productNameEn"),
    category_id: getValue("productCategory") || null,
    price,
    old_price: getValue("productOldPrice")
      ? Number(getValue("productOldPrice"))
      : null,
    unit: getValue("productUnit"),
    image_url: getValue("productImage"),
    sort_order: Number(getValue("productSort") || 0),
    is_available: getChecked("productAvailable"),
    is_discount: getChecked("productDiscount"),
  };

  let result;

  if (currentProductId) {
    result = await sb.from("products").update(payload).eq("id", currentProductId);
  } else {
    result = await sb.from("products").insert(payload);
  }

  if (result.error) {
    alert("هەڵە: " + result.error.message);
    return;
  }

  closeProductModal();
  await loadProducts();
  updateStats();
  toast("کەلوپەل پاشەکەوت بوو");
}

async function deleteProduct(id) {
  if (!confirm("دڵنیایی ئەم کەلوپەلە بسڕیتەوە؟")) return;

  const { error } = await sb.from("products").delete().eq("id", id);

  if (error) {
    alert("هەڵە: " + error.message);
    return;
  }

  await loadProducts();
  updateStats();
}

function openCategoryModal() {
  currentCategoryId = null;
  setText("categoryModalTitle", "زیادکرنا پۆلێ");

  setValue("categoryNameSorani", "");
  setValue("categoryNameBadini", "");
  setValue("categoryNameAr", "");
  setValue("categoryNameEn", "");
  setValue("categoryIcon", "");
  setValue("categorySort", categories.length + 1);

  setChecked("categoryActive", true);

  document.getElementById("categoryModal").classList.remove("hidden");
}

function closeCategoryModal() {
  document.getElementById("categoryModal").classList.add("hidden");
}

function editCategory(id) {
  const c = categories.find((x) => x.id === id);
  if (!c) return;

  currentCategoryId = id;
  setText("categoryModalTitle", "گۆڕینا پۆلێ");

  setValue("categoryNameSorani", c.name_ku_sorani);
  setValue("categoryNameBadini", c.name_ku_badini);
  setValue("categoryNameAr", c.name_ar);
  setValue("categoryNameEn", c.name_en);
  setValue("categoryIcon", c.image_url || c.icon || "");
  setValue("categorySort", c.sort_order);

  setChecked("categoryActive", c.is_active !== false);

  document.getElementById("categoryModal").classList.remove("hidden");
}

async function saveCategory() {
  const name = getValue("categoryNameSorani");
  const image = getValue("categoryIcon");

  if (!name) {
    alert("ناڤێ پۆلێ بنویسە.");
    return;
  }

  const payload = {
    name_ku_sorani: name,
    name_ku_badini: getValue("categoryNameBadini"),
    name_ar: getValue("categoryNameAr"),
    name_en: getValue("categoryNameEn"),
    icon: image,
    image_url: image,
    sort_order: Number(getValue("categorySort") || 0),
    is_active: getChecked("categoryActive"),
  };

  let result;

  if (currentCategoryId) {
    result = await sb.from("categories").update(payload).eq("id", currentCategoryId);
  } else {
    result = await sb.from("categories").insert(payload);
  }

  if (result.error) {
    alert("هەڵە: " + result.error.message);
    return;
  }

  closeCategoryModal();
  await loadCategories();
  await loadProducts();
  updateStats();
  toast("پۆل پاشەکەوت بوو");
}

async function deleteCategory(id) {
  if (!confirm("دڵنیایی ئەم پۆلە بسڕیتەوە؟")) return;

  const { error } = await sb.from("categories").delete().eq("id", id);

  if (error) {
    alert("هەڵە: " + error.message);
    return;
  }

  await loadCategories();
  await loadProducts();
  updateStats();
}

function openPromoModal() {
  currentPromoId = null;
  setText("promoModalTitle", "زیادکرنا پرۆمۆ کۆد");

  setValue("promoCode", "");
  setValue("promoTitle", "");
  setValue("promoDescription", "");
  setValue("promoDiscountType", "percent");
  setValue("promoDiscountValue", "");
  setValue("promoAppliesTo", "order");
  setValue("promoMinOrder", "0");
  setValue("promoMaxUses", "");
  setValue("promoExpiresAt", "");

  setChecked("promoActive", true);
  setChecked("promoOnlySelectedProducts", false);

  renderPromoProductsSelector([]);
  togglePromoProductsBox();

  document.getElementById("promoModal").classList.remove("hidden");
}

function closePromoModal() {
  document.getElementById("promoModal").classList.add("hidden");
}

function editPromo(id) {
  const p = promoCodes.find((x) => x.id === id);
  if (!p) return;

  currentPromoId = id;
  setText("promoModalTitle", "گۆڕینا پرۆمۆ کۆد");

  setValue("promoCode", p.code || "");
  setValue("promoTitle", p.title || "");
  setValue("promoDescription", p.description || "");
  setValue("promoDiscountType", p.discount_type || "percent");
  setValue("promoDiscountValue", p.discount_value || 0);
  setValue("promoAppliesTo", p.applies_to || "order");
  setValue("promoMinOrder", p.min_order_total || 0);
  setValue("promoMaxUses", p.max_uses || "");
  setValue("promoExpiresAt", p.expires_at ? toDatetimeLocal(p.expires_at) : "");

  setChecked("promoActive", p.is_active !== false);
  setChecked("promoOnlySelectedProducts", p.only_selected_products === true);

  const selectedIds = ((p.promo_code_products || [])).map((x) => x.product_id);
  renderPromoProductsSelector(selectedIds);
  togglePromoProductsBox();

  document.getElementById("promoModal").classList.remove("hidden");
}

async function savePromo() {
  const code = getValue("promoCode").toUpperCase().replace(/\s+/g, "");
  const title = getValue("promoTitle");
  const discountType = getValue("promoDiscountType");

  if (!code) {
    alert("کۆدی پرۆمۆ بنویسە.");
    return;
  }

  if (!title) {
    alert("ناونیشانی پرۆمۆ بنویسە.");
    return;
  }

  const payload = {
    code,
    title,
    description: getValue("promoDescription"),
    discount_type: discountType,
    discount_value:
      discountType === "free_delivery"
        ? 0
        : Number(getValue("promoDiscountValue") || 0),
    applies_to: getValue("promoAppliesTo"),
    min_order_total: Number(getValue("promoMinOrder") || 0),
    max_uses: getValue("promoMaxUses") ? Number(getValue("promoMaxUses")) : null,
    is_active: getChecked("promoActive"),
    only_selected_products: getChecked("promoOnlySelectedProducts"),
    expires_at: getValue("promoExpiresAt")
      ? new Date(getValue("promoExpiresAt")).toISOString()
      : null,
  };

  let result;

  if (currentPromoId) {
    result = await sb.from("promo_codes").update(payload).eq("id", currentPromoId);
  } else {
    result = await sb.from("promo_codes").insert(payload);
  }

  if (result.error) {
    alert("هەڵە: " + result.error.message);
    return;
  }

  let promoId = currentPromoId;

  if (!promoId) {
    const { data: savedPromo, error: fetchError } = await sb
      .from("promo_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (fetchError || !savedPromo) {
      alert("پرۆمۆ پاشەکەوت بوو، بەڵام ID نەدۆزرایەوە.");
      return;
    }

    promoId = savedPromo.id;
  }

  await sb.from("promo_code_products").delete().eq("promo_code_id", promoId);

  if (getChecked("promoOnlySelectedProducts")) {
    const selectedProductIds = getSelectedPromoProductIds();

    if (!selectedProductIds.length) {
      alert("ئەگەر تەنها بەرهەمە هەڵبژێردراوەکان هەڵدەبژێریت، پێویستە لانیکەم بەرهەمێک دیاری بکەیت.");
      return;
    }

    const rows = selectedProductIds.map((productId) => ({
      promo_code_id: promoId,
      product_id: productId,
    }));

    const { error: linkError } = await sb.from("promo_code_products").insert(rows);

    if (linkError) {
      alert("پرۆمۆ پاشەکەوت بوو، بەڵام بەستنەوەی بەرهەمان هەڵەی دا: " + linkError.message);
      return;
    }
  }

  closePromoModal();
  await loadPromoCodes();
  updateStats();
  toast("پرۆمۆ کۆد پاشەکەوت بوو");
}

async function deletePromo(id) {
  if (!confirm("دڵنیایی ئەم پرۆمۆ کۆدە بسڕیتەوە؟")) return;

  const { error } = await sb.from("promo_codes").delete().eq("id", id);

  if (error) {
    alert("هەڵە: " + error.message);
    return;
  }

  await loadPromoCodes();
  updateStats();
}

async function updateOrderStatus(id, status) {
  if (!status) return;

  const { error } = await sb.from("orders").update({ status }).eq("id", id);

  if (error) {
    alert("هەڵە: " + error.message);
    return;
  }

  await loadOrders();
  toast("دۆخ هاتە گۆڕین");
}

async function deleteOrder(id) {
  if (!confirm("دڵنیایی ئەم داواکارییە بسڕیتەوە؟")) return;

  const { error } = await sb.from("orders").delete().eq("id", id);

  if (error) {
    alert("هەڵە: " + error.message);
    return;
  }

  await loadOrders();
  updateStats();
}

async function viewOrder(id) {
  const order = orders.find((x) => x.id === id);

  const { data, error } = await sb
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  if (error) {
    alert("هەڵە: " + error.message);
    return;
  }

  const details = (data || [])
    .map((x) => {
      return `${x.product_name || "-"} × ${x.quantity || 1} = ${formatMoney(
        x.total || 0
      )}`;
    })
    .join("\n");

  const promoInfo = order?.promo_code
    ? `\n\nپرۆمۆ کۆد: ${order.promo_code}\nداشکاندن: ${formatMoney(order.promo_discount || 0)}`
    : "";

  alert((details || "هیچ کەلوپەلەک نییە.") + promoInfo);
}

async function replySupport(id) {
  const reply = getValue(`reply-${id}`);

  if (!reply) {
    alert("بەرسڤێ بنویسە.");
    return;
  }

  const { error } = await sb
    .from("support_messages")
    .update({
      admin_reply: reply,
      status: "replied",
      replied_at: new Date().toISOString(),
      admin_read: true,
    })
    .eq("id", id);

  if (error) {
    alert("هەڵە: " + error.message);
    return;
  }

  await loadSupportMessages();
  updateStats();
  renderDashboard();
  toast("بەرسڤ هاتە شاندن");
}

async function deleteSupport(id) {
  if (!confirm("دڵنیایی ئەم چاتە بسڕیتەوە؟")) return;

  const { error } = await sb.from("support_messages").delete().eq("id", id);

  if (error) {
    alert("هەڵە: " + error.message);
    return;
  }

  await loadSupportMessages();
  updateStats();
}

async function saveSettings() {
  const payload = {
    app_name: getValue("settingAppName") || "Mini markeit",
    store_name: getValue("settingStoreName") || "مینی مارکێت",
    address: getValue("settingAddress"),
    phone: getValue("settingPhone"),
    whatsapp: getValue("settingWhatsapp"),
    delivery_fee: Number(getValue("settingDeliveryFee") || 0),
    delivery_time: getValue("settingDeliveryTime"),
    is_open: getChecked("settingIsOpen"),
    updated_at: new Date().toISOString(),
  };

  let result;

  if (settingsRow?.id) {
    result = await sb.from("app_settings").update(payload).eq("id", settingsRow.id);
  } else {
    result = await sb.from("app_settings").insert(payload).select().single();
  }

  if (result.error) {
    alert("هەڵە: " + result.error.message);
    return;
  }

  await loadSettings();
  toast("ڕێکخستن پاشەکەوت بوو");
}

function updateStats() {
  setText("totalProducts", products.length);
  setText("totalCategories", categories.length);
  setText("totalOrders", orders.length);
  setText("totalPromos", promoCodes.length);
  setText(
    "newSupportCount",
    supportMessages.filter((m) => !m.admin_reply).length
  );
}

function promoTypeText(type) {
  const map = {
    percent: "ڕێژە %",
    fixed: "بڕی پارە",
    free_delivery: "گەیاندنی خۆرایی",
    delivery_fixed: "داشکاندنی گەیاندن",
  };

  return map[type] || type || "-";
}

function promoValueText(p) {
  if (p.discount_type === "free_delivery") return "گەیاندن 0 IQD";
  if (p.discount_type === "percent") return `${p.discount_value || 0}%`;
  return formatMoney(p.discount_value || 0);
}

function isImageUrl(value) {
  const v = String(value || "").toLowerCase().trim();

  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.endsWith(".png") ||
    v.endsWith(".jpg") ||
    v.endsWith(".jpeg") ||
    v.endsWith(".webp")
  );
}

function orderStatusText(status) {
  const map = {
    new: "نوێ",
    preparing: "ئامادەکرن",
    delivered: "گەهاندی",
    cancelled: "هەلوەشاندی",
  };

  return map[status] || status || "نوێ";
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function getChecked(id) {
  return !!document.getElementById(id)?.checked;
}

function setChecked(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "";
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("en-US").format(Number(value || 0))} IQD`;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-US");
}

function toDatetimeLocal(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function toast(message) {
  const t = document.getElementById("toast");
  if (!t) return;

  t.textContent = message;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 1800);
}
