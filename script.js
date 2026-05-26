const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "12345678";

let products = JSON.parse(localStorage.getItem("mini_markeit_products")) || [];
let orders = JSON.parse(localStorage.getItem("mini_markeit_orders")) || [];
let currentLanguage = "ku_sorani";

document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  const savedLogin = localStorage.getItem("mini_markeit_admin_logged_in");
  if (savedLogin === "yes") {
    showApp();
  }

  setupNavigation();
  setupLanguageTabs();
  renderDashboard();
});

function login() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const error = document.getElementById("loginError");

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    localStorage.setItem("mini_markeit_admin_logged_in", "yes");
    error.textContent = "";
    showApp();
  } else {
    error.textContent = "ناوی بەکارهێنەر یان پاسۆرد هەڵەیە.";
  }
}

function showApp() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  lucide.createIcons();
}

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((button) => button.classList.remove("active"));
      item.classList.add("active");

      const page = item.dataset.page;
      scrollToPage(page);
    });
  });
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

  const selector = map[page];
  if (!selector) return;

  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function setupLanguageTabs() {
  const tabs = document.querySelectorAll(".language-tabs button");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((button) => button.classList.remove("active"));
      tab.classList.add("active");

      currentLanguage = tab.dataset.lang;
      loadLanguageTexts(currentLanguage);
    });
  });
}

function loadLanguageTexts(language) {
  const data = {
    ku_sorani: {
      app_name: "Mini markeit",
      app_slogan: "دهۆك، جادا بارزان، مینی مارکێت",
      home_welcome: "بەخێربێیت بۆ Mini markeit",
      home_subtitle: "کاڵاکانت هەڵبژێرە و داواکارییەکەت بنێرە",
      search_placeholder: "گەڕان بۆ کاڵا...",
      cart_title: "سەبەتەکەت",
    },
    ku_badini: {
      app_name: "Mini markeit",
      app_slogan: "دهۆک، جادا بارزان، مینی مارکێت",
      home_welcome: "بخێرهاتی بۆ Mini markeit",
      home_subtitle: "کالاێن خۆ هەلبژێره و داخوازییا خۆ بفرێنه",
      search_placeholder: "لێگەریان بۆ کالا...",
      cart_title: "سەبەتا تە",
    },
    ar: {
      app_name: "Mini markeit",
      app_slogan: "دهوك، شارع بارزان، ميني ماركيت",
      home_welcome: "أهلاً بك في Mini markeit",
      home_subtitle: "اختر المنتجات وأرسل طلبك بسهولة",
      search_placeholder: "ابحث عن منتج...",
      cart_title: "سلة الشراء",
    },
    en: {
      app_name: "Mini markeit",
      app_slogan: "Duhok, Barzan Road, Mini Market",
      home_welcome: "Welcome to Mini markeit",
      home_subtitle: "Choose your products and send your order",
      search_placeholder: "Search for products...",
      cart_title: "Your cart",
    },
  };

  const values = data[language];

  const rows = document.querySelectorAll(".text-row");
  rows.forEach((row) => {
    const key = row.querySelector("span").textContent.trim();
    const input = row.querySelector("input");

    if (values[key]) {
      input.value = values[key];
    }
  });
}

function renderDashboard() {
  renderProducts();
  renderOrders();
  updateStats();
  lucide.createIcons();
}

function updateStats() {
  document.getElementById("totalProducts").textContent = products.length;
  document.getElementById("totalOrders").textContent = orders.length;

  const salesTotal = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  document.getElementById("todaySales").textContent = formatIqd(salesTotal);

  const discountCount = products.filter((item) => item.discount).length;
  document.getElementById("activeDiscounts").textContent = discountCount;

  document.getElementById("totalCategories").textContent = "10";
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
            <span>کاڵاکان لە داشبۆرد زیاد دەکرێن و دواتر لە ئەپ دەردەکەون.</span>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  table.innerHTML = products
    .map((product, index) => {
      const imageHtml = product.image
        ? `<img class="product-img" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />`
        : `<div class="product-img placeholder"><i data-lucide="image"></i></div>`;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${imageHtml}</td>
          <td><strong>${escapeHtml(product.name)}</strong><br><small>${escapeHtml(product.unit)}</small></td>
          <td>${escapeHtml(product.category)}</td>
          <td class="price">${formatIqd(Number(product.price || 0))}</td>
          <td><div class="toggle ${product.available ? "on" : ""}" onclick="toggleProduct('${product.id}', 'available')"></div></td>
          <td><div class="toggle ${product.discount ? "on" : ""}" onclick="toggleProduct('${product.id}', 'discount')"></div></td>
          <td>
            <div class="action-buttons">
              <button onclick="editProduct('${product.id}')"><i data-lucide="pencil"></i></button>
              <button class="delete" onclick="deleteProduct('${product.id}')"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  lucide.createIcons();
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
    lucide.createIcons();
    return;
  }

  table.innerHTML = orders
    .map((order, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>#${order.id}</td>
          <td>${escapeHtml(order.customer)}<br><small>${escapeHtml(order.phone)}</small></td>
          <td>${escapeHtml(order.time)}</td>
          <td class="price">${formatIqd(Number(order.total || 0))}</td>
          <td><span class="badge ${order.statusClass}">${escapeHtml(order.status)}</span></td>
          <td>
            <div class="action-buttons">
              <button><i data-lucide="eye"></i></button>
              <button><i data-lucide="more-horizontal"></i></button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

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
  document.getElementById("productName").value = "";
  document.getElementById("productCategory").value = "سەوزە";
  document.getElementById("productPrice").value = "";
  document.getElementById("productUnit").value = "";
  document.getElementById("productImage").value = "";
  document.getElementById("productAvailable").checked = true;
  document.getElementById("productDiscount").checked = false;
  document.getElementById("productModal").removeAttribute("data-edit-id");
}

function saveProduct() {
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const price = document.getElementById("productPrice").value.trim();
  const unit = document.getElementById("productUnit").value.trim();
  const image = document.getElementById("productImage").value.trim();
  const available = document.getElementById("productAvailable").checked;
  const discount = document.getElementById("productDiscount").checked;
  const editId = document.getElementById("productModal").dataset.editId;

  if (!name) {
    alert("تکایە ناوی کاڵا بنووسە.");
    return;
  }

  if (!price || isNaN(Number(price))) {
    alert("تکایە نرخ بە ژمارەی دروست بنووسە.");
    return;
  }

  if (editId) {
    products = products.map((item) => {
      if (item.id === editId) {
        return {
          ...item,
          name,
          category,
          price: Number(price),
          unit,
          image,
          available,
          discount,
        };
      }
      return item;
    });
  } else {
    products.push({
      id: String(Date.now()),
      name,
      category,
      price: Number(price),
      unit,
      image,
      available,
      discount,
      createdAt: new Date().toISOString(),
    });
  }

  localStorage.setItem("mini_markeit_products", JSON.stringify(products));
  closeProductModal();
  renderDashboard();
}

function editProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  document.getElementById("productName").value = product.name;
  document.getElementById("productCategory").value = product.category;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productUnit").value = product.unit;
  document.getElementById("productImage").value = product.image;
  document.getElementById("productAvailable").checked = product.available;
  document.getElementById("productDiscount").checked = product.discount;
  document.getElementById("productModal").dataset.editId = product.id;

  document.getElementById("productModal").classList.remove("hidden");
  lucide.createIcons();
}

function deleteProduct(id) {
  const sure = confirm("دڵنیایت دەتەوێت ئەم کاڵایە بسڕیتەوە؟");
  if (!sure) return;

  products = products.filter((item) => item.id !== id);
  localStorage.setItem("mini_markeit_products", JSON.stringify(products));
  renderDashboard();
}

function toggleProduct(id, field) {
  products = products.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        [field]: !item[field],
      };
    }
    return item;
  });

  localStorage.setItem("mini_markeit_products", JSON.stringify(products));
  renderDashboard();
}

function addTextKey() {
  const key = prompt("ناوی کلیلیدی نوێ بنووسە، نموونە: checkout_button");
  if (!key) return;

  const editor = document.getElementById("localizationEditor");

  const row = document.createElement("div");
  row.className = "text-row";
  row.innerHTML = `
    <span>${escapeHtml(key)}</span>
    <input value="" placeholder="دەق بنووسە..." />
    <button><i data-lucide="pencil"></i></button>
  `;

  editor.appendChild(row);
  lucide.createIcons();
}

function formatIqd(value) {
  const formatter = new Intl.NumberFormat("en-US");
  return `${formatter.format(value)} IQD`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
