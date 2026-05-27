const SUPABASE_URL = "https://fauzeybaapusunlptevc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdXpleWJhYXB1c3VubHB0ZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc3MDEsImV4cCI6MjA5NTM2MzcwMX0.9Lc3TMOp78Xj27DM9xGqX1FriZm5bNX-9Vvg-4I7ymQ";

let sb;
let products = [];
let categories = [];
let orders = [];
let supportMessages = [];
let settingsRow = null;
let currentProductId = null;
let currentCategoryId = null;

document.addEventListener("DOMContentLoaded", async () => {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  setupNavigation();

  const { data } = await sb.auth.getSession();

  if (data.session) {
    showApp();
    await loadAllData();
  } else {
    showLogin();
  }
});

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
      <td>${formatMoney(o.total || o.total_amount || 0)}</td>
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

  alert(details || "هیچ کەلوپەلەک نییە.");
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
  setText(
    "newSupportCount",
    supportMessages.filter((m) => !m.admin_reply).length
  );
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
