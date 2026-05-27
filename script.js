const SUPABASE_URL = "https://fauzeybaapusunlptevc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdXpleWJhYXB1c3VubHB0ZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc3MDEsImV4cCI6MjA5NTM2MzcwMX0.9Lc3TMOp78Xj27DM9xGqX1FriZm5bNX-9Vvg-4I7ymQ";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let products = [];
let orders = [];
let categories = [];
let currentLanguage = "ku_sorani";
let editingProductId = null;

document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();
  setupNavigation();
  setupLanguageTabs();

  const { data } = await db.auth.getSession();
  if (data.session) {
    showApp();
    await loadAllData();
  } else {
    loadLanguageTexts("ku_sorani");
  }
});

async function login() {
  const email = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const error = document.getElementById("loginError");

  if (!email || !password) {
    error.textContent = "تکایە ئیمەیل و پاسۆرد بنووسە.";
    return;
  }

  error.textContent = "چاوەڕێ بکە...";
  const { error: authError } = await db.auth.signInWithPassword({ email, password });

  if (authError) {
    error.textContent = "چوونەژوورەوە سەرکەوتوو نەبوو: " + authError.message;
    return;
  }

  error.textContent = "";
  showApp();
  await loadAllData();
}

async function logout() {
  await db.auth.signOut();
  document.getElementById("app").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
}

function showApp() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  lucide.createIcons();
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      item.classList.add("active");
      scrollToPage(item.dataset.page);
    });
  });

  const refresh = document.querySelector(".refresh-btn");
  if (refresh) refresh.addEventListener("click", loadAllData);
}

function scrollToPage(page) {
  const map = {
    dashboard: ".kpi-grid",
    orders: ".two-column",
    products: ".two-column",
    categories: ".three-column",
    discounts: ".three-column",
    localization: ".localization-panel",
    notifications: ".three-column",
    appearance: ".three-column",
    settings: ".three-column",
    admins: ".three-column",
    reports: ".summary-layout",
  };
  const element = document.querySelector(map[page]);
  if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupLanguageTabs() {
  document.querySelectorAll(".language-tabs button").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".language-tabs button").forEach((b) => b.classList.remove("active"));
      tab.classList.add("active");
      currentLanguage = tab.dataset.lang;
      loadLanguageTexts(currentLanguage);
    });
  });
}

async function loadAllData() {
  await Promise.all([loadCategories(), loadProducts(), loadOrders()]);
  renderDashboard();
  loadLanguageTexts(currentLanguage);
}

async function loadCategories() {
  const { data, error } = await db.from("categories").select("*").order("sort_order", { ascending: true });
  if (error) {
    console.error(error);
    alert("هەڵە لە هێنانی هاوپۆلەکان: " + error.message);
    return;
  }
  categories = data || [];
  fillCategorySelect();
}

async function loadProducts() {
  const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    alert("هەڵە لە هێنانی کاڵاکان: " + error.message);
    return;
  }
  products = data || [];
}

async function loadOrders() {
  const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) {
    console.error(error);
    orders = [];
    return;
  }
  orders = data || [];
}

function fillCategorySelect() {
  const select = document.getElementById("productCategory");
  if (!select) return;
  if (!categories.length) return;

  select.innerHTML = categories
    .map((c) => `<option value="${c.id}">${escapeHtml(getCategoryName(c))}</option>`)
    .join("");
}

function renderDashboard() {
  renderProducts();
  renderOrders();
  updateStats();
  lucide.createIcons();
}

function updateStats() {
  setText("totalProducts", products.length);
  setText("totalOrders", orders.length);
  setText("totalCategories", categories.length || 10);

  const total = orders.reduce((sum, o) => sum + Number(read(o, ["total_iqd", "total_price", "total", "grand_total"]) || 0), 0);
  setText("todaySales", formatIqd(total));

  const discountCount = products.filter((p) => read(p, ["is_discounted", "discount", "has_discount"]) === true).length;
  setText("activeDiscounts", discountCount);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderProducts() {
  const table = document.getElementById("productsTable");
  if (!table) return;

  if (!products.length) {
    table.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i data-lucide="package-open"></i><strong>هێشتا هیچ کاڵایەک زیاد نەکراوە</strong><span>کاڵاکان لە داشبۆرد زیاد دەکرێن و یەکسەر لە ئەپ دەردەکەون.</span></div></td></tr>`;
    lucide.createIcons();
    return;
  }

  table.innerHTML = products.map((p, i) => {
    const image = read(p, ["image_url", "image", "photo_url"]);
    const name = getProductName(p);
    const unit = read(p, ["unit_sorani", "unit_ku_sorani", "unit", "size"]) || "";
    const categoryName = getProductCategoryName(p);
    const price = Number(read(p, ["price_iqd", "price", "priceIQD"]) || 0);
    const available = read(p, ["is_available", "available"]) !== false;
    const discounted = read(p, ["is_discounted", "discount", "has_discount"]) === true;

    return `<tr>
      <td>${i + 1}</td>
      <td>${image ? `<img class="product-img" src="${escapeHtml(image)}" alt="">` : `<div class="product-img placeholder"><i data-lucide="image"></i></div>`}</td>
      <td><strong>${escapeHtml(name)}</strong><br><small>${escapeHtml(unit)}</small></td>
      <td>${escapeHtml(categoryName)}</td>
      <td class="price">${formatIqd(price)}</td>
      <td><div class="toggle ${available ? "on" : ""}" onclick="toggleProduct('${p.id}', 'is_available')"></div></td>
      <td><div class="toggle ${discounted ? "on" : ""}" onclick="toggleProduct('${p.id}', 'is_discounted')"></div></td>
      <td><div class="action-buttons"><button onclick="editProduct('${p.id}')"><i data-lucide="pencil"></i></button><button class="delete" onclick="deleteProduct('${p.id}')"><i data-lucide="trash-2"></i></button></div></td>
    </tr>`;
  }).join("");
  lucide.createIcons();
}

function renderOrders() {
  const table = document.getElementById("ordersTable");
  if (!table) return;

  if (!orders.length) {
    table.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i data-lucide="receipt-text"></i><strong>هێشتا هیچ فەرمانێک نییە</strong><span>کاتێک کڕیار داواکاری بکات، لێرە دەردەکەوێت.</span></div></td></tr>`;
    lucide.createIcons();
    return;
  }

  table.innerHTML = orders.map((o, i) => {
    const customer = read(o, ["customer_name", "name", "customer"]) || "-";
    const phone = read(o, ["customer_phone", "phone", "mobile"]) || "";
    const total = Number(read(o, ["total_iqd", "total_price", "total", "grand_total"]) || 0);
    const status = read(o, ["status", "order_status"]) || "نوێ";
    const created = read(o, ["created_at", "createdAt"]) || "";
    const time = created ? new Date(created).toLocaleString("en-US") : "-";

    return `<tr>
      <td>${i + 1}</td>
      <td>#${escapeHtml(o.id)}</td>
      <td>${escapeHtml(customer)}<br><small>${escapeHtml(phone)}</small></td>
      <td>${escapeHtml(time)}</td>
      <td class="price">${formatIqd(total)}</td>
      <td><span class="status active">${escapeHtml(status)}</span></td>
      <td><div class="action-buttons"><button><i data-lucide="eye"></i></button><button><i data-lucide="more-horizontal"></i></button></div></td>
    </tr>`;
  }).join("");
  lucide.createIcons();
}

function openProductModal() {
  clearProductForm();
  document.getElementById("productModal").classList.remove("hidden");
  lucide.createIcons();
}

function closeProductModal() {
  document.getElementById("productModal").classList.add("hidden");
}

function clearProductForm() {
  editingProductId = null;
  setValue("productName", "");
  setValue("productPrice", "");
  setValue("productUnit", "");
  setValue("productImage", "");
  document.getElementById("productAvailable").checked = true;
  document.getElementById("productDiscount").checked = false;
  if (categories[0]) setValue("productCategory", categories[0].id);
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

async function saveProduct() {
  const name = document.getElementById("productName").value.trim();
  const categoryId = document.getElementById("productCategory").value;
  const price = Number(document.getElementById("productPrice").value.trim());
  const unit = document.getElementById("productUnit").value.trim();
  const image = document.getElementById("productImage").value.trim();
  const available = document.getElementById("productAvailable").checked;
  const discounted = document.getElementById("productDiscount").checked;

  if (!name) return alert("تکایە ناوی کاڵا بنووسە.");
  if (!price || Number.isNaN(price)) return alert("تکایە نرخ بە ژمارەی دروست بنووسە.");

  const payload = {
    category_id: categoryId || null,
    name_sorani: name,
    name_badini: name,
    name_arabic: name,
    name_english: name,
    unit_sorani: unit,
    unit_badini: unit,
    unit_arabic: unit,
    unit_english: unit,
    price_iqd: price,
    image_url: image || null,
    is_available: available,
    is_discounted: discounted,
    discount_price_iqd: null,
  };

  let result;
  if (editingProductId) {
    result = await db.from("products").update(payload).eq("id", editingProductId);
  } else {
    result = await db.from("products").insert(payload);
  }

  if (result.error) {
    console.error(result.error);
    alert("هەڵە لە پاشەکەوتکردنی کاڵا: " + result.error.message);
    return;
  }

  closeProductModal();
  await loadAllData();
  alert("کاڵاکە پاشەکەوت کرا و لە ئەپ دەردەکەوێت.");
}

function editProduct(id) {
  const p = products.find((item) => String(item.id) === String(id));
  if (!p) return;
  editingProductId = p.id;

  setValue("productName", getProductName(p));
  setValue("productCategory", read(p, ["category_id"]) || "");
  setValue("productPrice", read(p, ["price_iqd", "price"]) || "");
  setValue("productUnit", read(p, ["unit_sorani", "unit_ku_sorani", "unit"]) || "");
  setValue("productImage", read(p, ["image_url", "image", "photo_url"]) || "");
  document.getElementById("productAvailable").checked = read(p, ["is_available", "available"]) !== false;
  document.getElementById("productDiscount").checked = read(p, ["is_discounted", "discount", "has_discount"]) === true;

  document.getElementById("productModal").classList.remove("hidden");
  lucide.createIcons();
}

async function deleteProduct(id) {
  if (!confirm("دڵنیایت دەتەوێت ئەم کاڵایە بسڕیتەوە؟")) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return alert("هەڵە لە سڕینەوە: " + error.message);
  await loadAllData();
}

async function toggleProduct(id, field) {
  const p = products.find((item) => String(item.id) === String(id));
  if (!p) return;
  const current = read(p, [field]) === true;
  const { error } = await db.from("products").update({ [field]: !current }).eq("id", id);
  if (error) return alert("هەڵە لە گۆڕین: " + error.message);
  await loadAllData();
}

function loadLanguageTexts(lang) {
  const data = {
    ku_sorani: { app_name: "Mini markeit", app_slogan: "دهۆك، جادا بارزان، مینی مارکێت", home_welcome: "بەخێربێیت بۆ Mini markeit", home_subtitle: "کاڵاکانت هەڵبژێرە و داواکارییەکەت بنێرە", search_placeholder: "گەڕان بۆ کاڵا...", cart_title: "سەبەتەکەت" },
    ku_badini: { app_name: "Mini markeit", app_slogan: "دهۆک، جادا بارزان، مینی مارکێت", home_welcome: "بخێرهاتی بۆ Mini markeit", home_subtitle: "کالاێن خۆ هەلبژێره و داخوازییا خۆ بفرێنه", search_placeholder: "لێگەریان بۆ کالا...", cart_title: "سەبەتا تە" },
    ar: { app_name: "Mini markeit", app_slogan: "دهوك، شارع بارزان، ميني ماركيت", home_welcome: "أهلاً بك في Mini markeit", home_subtitle: "اختر المنتجات وأرسل طلبك بسهولة", search_placeholder: "ابحث عن منتج...", cart_title: "سلة الشراء" },
    en: { app_name: "Mini markeit", app_slogan: "Duhok, Barzan Road, Mini Market", home_welcome: "Welcome to Mini markeit", home_subtitle: "Choose your products and send your order", search_placeholder: "Search for products...", cart_title: "Your cart" },
  };
  const values = data[lang] || data.ku_sorani;
  const editor = document.getElementById("localizationEditor");
  if (!editor) return;
  editor.innerHTML = Object.keys(values).map((key) => `<div class="text-row"><span>${key}</span><input value="${escapeHtml(values[key])}" /><button><i data-lucide="pencil"></i></button></div>`).join("");
  lucide.createIcons();
}

function addTextKey() {
  const key = prompt("ناوی کلیلیدی نوێ بنووسە، نموونە: checkout_button");
  if (!key) return;
  document.getElementById("localizationEditor").insertAdjacentHTML("beforeend", `<div class="text-row"><span>${escapeHtml(key)}</span><input value="" placeholder="دەق بنووسە..." /><button><i data-lucide="pencil"></i></button></div>`);
  lucide.createIcons();
}

function getProductName(p) {
  return read(p, ["name_sorani", "name_ku_sorani", "name_ckb", "name", "name_en", "name_english"]) || "-";
}

function getCategoryName(c) {
  return read(c, ["name_sorani", "name_ku_sorani", "name_ckb", "name", "name_en", "name_english"]) || "-";
}

function getProductCategoryName(p) {
  const categoryId = read(p, ["category_id"]);
  const category = categories.find((c) => String(c.id) === String(categoryId));
  return category ? getCategoryName(category) : "-";
}

function read(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return null;
}

function formatIqd(value) {
  return `${new Intl.NumberFormat("en-US").format(value)} IQD`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
