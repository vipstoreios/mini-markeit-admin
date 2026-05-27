const SUPABASE_URL = "https://fauzeybaapusunlptevc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdXpleWJhYXB1c3VubHB0ZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc3MDEsImV4cCI6MjA5NTM2MzcwMX0.9Lc3TMOp78Xj27DM9xGqX1FriZm5bNX-9Vvg-4I7ymQ";

let sb;
let products = [];
let categories = [];
let orders = [];
let currentProductId = null;
let currentLanguage = "ku_sorani";

document.addEventListener("DOMContentLoaded", async () => {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (window.lucide) lucide.createIcons();

  setupNavigation();
  setupLanguageTabs();

  const { data } = await sb.auth.getSession();
  if (data.session) {
    showApp();
    await loadAllData();
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById("loginPage")?.classList.remove("hidden");
  document.getElementById("app")?.classList.add("hidden");
}

function showApp() {
  document.getElementById("loginPage")?.classList.add("hidden");
  document.getElementById("app")?.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

async function login() {
  const email = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const error = document.getElementById("loginError");

  error.textContent = "";

  const { error: loginError } = await sb.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    error.textContent = "ئیمەیڵ یان پاسۆرد هەڵەیە.";
    return;
  }

  showApp();
  await loadAllData();
}

async function logout() {
  await sb.auth.signOut();
  showLogin();
}

async function loadAllData() {
  await Promise.all([
    loadCategories(),
    loadProducts(),
    loadOrders(),
    loadSettings(),
    loadTexts(),
  ]);

  updateStats();
  if (window.lucide) lucide.createIcons();
}

async function loadCategories() {
  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    alert("هەڵە لە هێنانی هاوپۆلەکان: " + error.message);
    return;
  }

  categories = data || [];
  renderCategories();
  fillCategorySelect();
}

async function loadProducts() {
  const { data, error } = await sb
    .from("products")
    .select("*, categories(name_ku_sorani)")
    .order("created_at", { ascending: false });

  if (error) {
    alert("هەڵە لە هێنانی کاڵاکان: " + error.message);
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
    .limit(50);

  if (error) {
    alert("هەڵە لە هێنانی فەرمانەکان: " + error.message);
    return;
  }

  orders = data || [];
  renderOrders();
}

async function loadSettings() {
  const { data } = await sb
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (!data) return;

  setValue("settingAppName", data.app_name);
  setValue("settingStoreName", data.store_name);
  setValue("settingAddress", data.address);
  setValue("settingWhatsapp", data.whatsapp_number);
  setValue("settingDeliveryFee", data.delivery_fee);
  setValue("settingMinimumOrder", data.minimum_order);
  setValue("settingBannerTitle", data.banner_title);
  setValue("settingBannerSubtitle", data.banner_subtitle);
}

async function loadTexts() {
  const { data } = await sb
    .from("app_texts")
    .select("*")
    .order("text_key", { ascending: true });

  renderTexts(data || []);
}

function renderProducts() {
  const table = document.getElementById("productsTable");
  if (!table) return;

  if (products.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <i data-lucide="package-open"></i>
            <strong>هێشتا هیچ کاڵایەک زیاد نەکراوە</strong>
            <span>کاڵاکان لە داشبۆرد زیاد دەکرێن و لە ئەپ دەردەکەون.</span>
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  table.innerHTML = products.map((p, i) => {
    const categoryName = p.categories?.name_ku_sorani || "-";
    const img = p.image_url
      ? `<img class="product-img" src="${escapeHtml(p.image_url)}" />`
      : `<div class="product-img placeholder"><i data-lucide="image"></i></div>`;

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${img}</td>
        <td>
          <strong>${escapeHtml(p.name_ku_sorani)}</strong>
          <br><small>${escapeHtml(p.unit || "")}</small>
        </td>
        <td>${escapeHtml(categoryName)}</td>
        <td class="price">${formatIqd(p.price || 0)}</td>
        <td>
          <div class="toggle ${p.is_available ? "on" : ""}" onclick="toggleProduct('${p.id}', 'is_available')"></div>
        </td>
        <td>
          <div class="toggle ${p.is_discounted ? "on" : ""}" onclick="toggleProduct('${p.id}', 'is_discounted')"></div>
        </td>
        <td>
          <div class="action-buttons">
            <button onclick="editProduct('${p.id}')"><i data-lucide="pencil"></i></button>
            <button class="delete" onclick="deleteProduct('${p.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

function renderCategories() {
  const box = document.getElementById("categoriesList");
  if (!box) return;

  if (categories.length === 0) {
    box.innerHTML = `<div class="empty-state"><strong>هاوپۆل نییە</strong></div>`;
    return;
  }

  box.innerHTML = categories.map((c) => `
    <div class="list-row">
      <div>
        <strong>${escapeHtml(c.name_ku_sorani)}</strong>
        <span>${escapeHtml(c.name_en || "")}</span>
      </div>
      <div class="action-buttons">
        <button onclick="editCategory('${c.id}')"><i data-lucide="pencil"></i></button>
        <button class="delete" onclick="deleteCategory('${c.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `).join("");

  if (window.lucide) lucide.createIcons();
}

function renderOrders() {
  const table = document.getElementById("ordersTable");
  if (!table) return;

  if (orders.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <i data-lucide="receipt-text"></i>
            <strong>هێشتا هیچ فەرمانێک نییە</strong>
            <span>کاتێک کڕیار داواکاری بکات، لێرە دەردەکەوێت.</span>
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  table.innerHTML = orders.map((o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${o.id.slice(0, 8)}</td>
      <td>${escapeHtml(o.customer_name)}<br><small>${escapeHtml(o.customer_phone)}</small></td>
      <td>${formatDate(o.created_at)}</td>
      <td class="price">${formatIqd(o.total_amount || 0)}</td>
      <td>
        <select onchange="updateOrderStatus('${o.id}', this.value)">
          <option value="new" ${o.status === "new" ? "selected" : ""}>نوێ</option>
          <option value="preparing" ${o.status === "preparing" ? "selected" : ""}>ئامادەکردن</option>
          <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>گەیاندرا</option>
          <option value="cancelled" ${o.status === "cancelled" ? "selected" : ""}>هەڵوەشێندرا</option>
        </select>
      </td>
      <td>
        <div class="action-buttons">
          <button onclick="viewOrder('${o.id}')"><i data-lucide="eye"></i></button>
          <button class="delete" onclick="deleteOrder('${o.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `).join("");

  if (window.lucide) lucide.createIcons();
}

function renderTexts(texts) {
  const editor = document.getElementById("localizationEditor");
  if (!editor) return;

  const defaultTexts = texts.length ? texts : [
    { text_key: "app_name", ku_sorani: "Mini markeit" },
    { text_key: "app_slogan", ku_sorani: "دهۆك، جادا بارزان، مینی مارکێت" },
    { text_key: "home_welcome", ku_sorani: "بەخێربێیت بۆ Mini markeit" },
    { text_key: "home_subtitle", ku_sorani: "کاڵاکانت هەڵبژێرە و داواکارییەکەت بنێرە" },
    { text_key: "search_placeholder", ku_sorani: "گەڕان بۆ کاڵا..." },
    { text_key: "cart_title", ku_sorani: "سەبەتەکەت" },
  ];

  editor.innerHTML = defaultTexts.map((t) => `
    <div class="text-row">
      <span>${escapeHtml(t.text_key)}</span>
      <input data-key="${escapeHtml(t.text_key)}" value="${escapeHtml(t[currentLanguage] || "")}" />
      <button onclick="saveText('${escapeHtml(t.text_key)}')"><i data-lucide="save"></i></button>
    </div>
  `).join("");

  if (window.lucide) lucide.createIcons();
}

function fillCategorySelect() {
  const select = document.getElementById("productCategory");
  if (!select) return;

  select.innerHTML = categories.map((c) =>
    `<option value="${c.id}">${escapeHtml(c.name_ku_sorani)}</option>`
  ).join("");
}

function openProductModal() {
  currentProductId = null;
  setValue("productName", "");
  setValue("productNameBadini", "");
  setValue("productNameAr", "");
  setValue("productNameEn", "");
  setValue("productPrice", "");
  setValue("productUnit", "");
  setValue("productImage", "");
  setChecked("productAvailable", true);
  setChecked("productDiscount", false);
  document.getElementById("productModal")?.classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("productModal")?.classList.add("hidden");
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  currentProductId = id;
  setValue("productName", p.name_ku_sorani);
  setValue("productNameBadini", p.name_ku_badini);
  setValue("productNameAr", p.name_ar);
  setValue("productNameEn", p.name_en);
  setValue("productCategory", p.category_id);
  setValue("productPrice", p.price);
  setValue("productUnit", p.unit);
  setValue("productImage", p.image_url);
  setChecked("productAvailable", p.is_available);
  setChecked("productDiscount", p.is_discounted);

  document.getElementById("productModal")?.classList.remove("hidden");
}

async function saveProduct() {
  const name = getValue("productName");
  const price = Number(getValue("productPrice"));

  if (!name) return alert("ناوی کاڵا بنووسە.");
  if (!price && price !== 0) return alert("نرخ بە ژمارە بنووسە.");

  const payload = {
    name_ku_sorani: name,
    name_ku_badini: getValue("productNameBadini"),
    name_ar: getValue("productNameAr"),
    name_en: getValue("productNameEn"),
    category_id: getValue("productCategory") || null,
    price,
    unit: getValue("productUnit"),
    image_url: getValue("productImage"),
    is_available: getChecked("productAvailable"),
    is_discounted: getChecked("productDiscount"),
    updated_at: new Date().toISOString(),
  };

  let result;
  if (currentProductId) {
    result = await sb.from("products").update(payload).eq("id", currentProductId);
  } else {
    result = await sb.from("products").insert(payload);
  }

  if (result.error) return alert("هەڵە: " + result.error.message);

  closeProductModal();
  await loadProducts();
  updateStats();
}

async function deleteProduct(id) {
  if (!confirm("دڵنیایت ئەم کاڵایە بسڕیتەوە؟")) return;

  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) return alert("هەڵە: " + error.message);

  await loadProducts();
  updateStats();
}

async function toggleProduct(id, field) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const { error } = await sb
    .from("products")
    .update({ [field]: !p[field], updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return alert("هەڵە: " + error.message);

  await loadProducts();
  updateStats();
}

async function addCategory() {
  const name = prompt("ناوی هاوپۆلی نوێ بنووسە:");
  if (!name) return;

  const { error } = await sb.from("categories").insert({
    name_ku_sorani: name,
    sort_order: categories.length + 1,
    is_active: true,
  });

  if (error) return alert("هەڵە: " + error.message);

  await loadCategories();
}

async function editCategory(id) {
  const c = categories.find(x => x.id === id);
  if (!c) return;

  const name = prompt("ناوی نوێی هاوپۆل:", c.name_ku_sorani);
  if (!name) return;

  const { error } = await sb
    .from("categories")
    .update({ name_ku_sorani: name })
    .eq("id", id);

  if (error) return alert("هەڵە: " + error.message);

  await loadCategories();
  await loadProducts();
}

async function deleteCategory(id) {
  if (!confirm("دڵنیایت ئەم هاوپۆلە بسڕیتەوە؟")) return;

  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) return alert("هەڵە: " + error.message);

  await loadCategories();
  await loadProducts();
}

async function updateOrderStatus(id, status) {
  const { error } = await sb.from("orders").update({ status }).eq("id", id);
  if (error) return alert("هەڵە: " + error.message);
  await loadOrders();
}

async function deleteOrder(id) {
  if (!confirm("دڵنیایت ئەم فەرمانە بسڕیتەوە؟")) return;

  const { error } = await sb.from("orders").delete().eq("id", id);
  if (error) return alert("هەڵە: " + error.message);

  await loadOrders();
  updateStats();
}

async function viewOrder(id) {
  const { data, error } = await sb
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  if (error) return alert("هەڵە: " + error.message);

  const details = (data || [])
    .map(x => `${x.product_name} × ${x.quantity} = ${formatIqd(x.total)}`)
    .join("\n");

  alert(details || "هیچ کاڵایەک نییە.");
}

async function saveText(key) {
  const input = document.querySelector(`input[data-key="${key}"]`);
  if (!input) return;

  const payload = {
    text_key: key,
    [currentLanguage]: input.value,
    section: "general",
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from("app_texts")
    .upsert(payload, { onConflict: "text_key" });

  if (error) return alert("هەڵە: " + error.message);

  alert("دەقەکە پاشەکەوت کرا.");
}

async function addTextKey() {
  const key = prompt("کلیلیدی نوێ بنووسە، نموونە: checkout_button");
  if (!key) return;

  const { error } = await sb.from("app_texts").insert({
    text_key: key,
    ku_sorani: "",
    ku_badini: "",
    ar: "",
    en: "",
    section: "general",
  });

  if (error) return alert("هەڵە: " + error.message);

  await loadTexts();
}

async function saveSettings() {
  const payload = {
    id: 1,
    app_name: getValue("settingAppName"),
    store_name: getValue("settingStoreName"),
    address: getValue("settingAddress"),
    whatsapp_number: getValue("settingWhatsapp"),
    delivery_fee: Number(getValue("settingDeliveryFee") || 0),
    minimum_order: Number(getValue("settingMinimumOrder") || 0),
    banner_title: getValue("settingBannerTitle"),
    banner_subtitle: getValue("settingBannerSubtitle"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from("app_settings")
    .upsert(payload, { onConflict: "id" });

  if (error) return alert("هەڵە: " + error.message);

  alert("ڕێکخستنەکان پاشەکەوت کران.");
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");

      const page = btn.dataset.page;
      document.querySelectorAll(".page-section").forEach(s => s.classList.add("hidden"));

      const target = document.getElementById("page-" + page);
      if (target) target.classList.remove("hidden");
    });
  });
}

function setupLanguageTabs() {
  document.querySelectorAll(".language-tabs button").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".language-tabs button").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      currentLanguage = btn.dataset.lang || "ku_sorani";
      await loadTexts();
    });
  });
}

function updateStats() {
  setText("totalProducts", products.length);
  setText("totalOrders", orders.length);
  setText("activeDiscounts", products.filter(p => p.is_discounted).length);
  setText("totalCategories", categories.length);

  const sales = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  setText("todaySales", formatIqd(sales));
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function getChecked(id) {
  return document.getElementById(id)?.checked || false;
}

function setChecked(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatIqd(value) {
  return `${new Intl.NumberFormat("en-US").format(Number(value || 0))} IQD`;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-US");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
