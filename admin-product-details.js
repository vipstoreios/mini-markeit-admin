/* Mini markeit Admin - product description fields */
(function () {
  let client = null;
  let editingProductId = null;

  document.addEventListener("DOMContentLoaded", () => {
    injectProductDescriptionFields();
    wrapProductModalFunctions();
  });

  async function getClient() {
    if (client) return client;
    const scriptText = await fetch("./script.js", { cache: "no-store" }).then((r) => r.text());
    const url = matchConst(scriptText, "SUPABASE_URL");
    const key = matchConst(scriptText, "SUPABASE_ANON_KEY");
    if (!url || !key) throw new Error("Supabase settings not found");
    client = supabase.createClient(url, key);
    return client;
  }

  function matchConst(text, name) {
    const regex = new RegExp(`const\\s+${name}\\s*=\\s*[\"']([^\"']+)[\"']`);
    return text.match(regex)?.[1] || "";
  }

  function injectProductDescriptionFields() {
    const grid = document.querySelector("#productModal .form-grid");
    if (!grid || document.getElementById("productDescriptionSorani")) return;

    const block = document.createElement("div");
    block.className = "wide";
    block.innerHTML = `
      <label class="wide">شرحە - سۆرانی / بادینی
        <textarea id="productDescriptionSorani" rows="4" placeholder="وەسفی بەرهەمەکە بنووسە..."></textarea>
      </label>
      <label class="wide">شرحە - عەرەبی
        <textarea id="productDescriptionAr" rows="4" placeholder="اكتب وصف المنتج..."></textarea>
      </label>
      <label class="wide">Description - English
        <textarea id="productDescriptionEn" rows="4" placeholder="Write product description..."></textarea>
      </label>
    `;

    grid.appendChild(block);
  }

  function wrapProductModalFunctions() {
    const tryWrap = () => {
      if (typeof window.openProductModal === "function" && !window.openProductModal.__descriptionEnhanced) {
        const originalOpen = window.openProductModal;
        window.openProductModal = function () {
          editingProductId = null;
          const result = originalOpen.apply(this, arguments);
          injectProductDescriptionFields();
          clearDescriptionFields();
          return result;
        };
        window.openProductModal.__descriptionEnhanced = true;
      }

      if (typeof window.editProduct === "function" && !window.editProduct.__descriptionEnhanced) {
        const originalEdit = window.editProduct;
        window.editProduct = async function (id) {
          editingProductId = id;
          const result = originalEdit.apply(this, arguments);
          injectProductDescriptionFields();
          await loadProductDescription(id);
          return result;
        };
        window.editProduct.__descriptionEnhanced = true;
      }

      if (typeof window.saveProduct === "function" && !window.saveProduct.__descriptionEnhanced) {
        const originalSave = window.saveProduct;
        window.saveProduct = async function () {
          const beforeId = editingProductId;
          const name = value("productNameSorani") || value("productNameBadini");
          const price = Number(value("productPrice") || 0);

          const result = await originalSave.apply(this, arguments);
          await saveProductDescription(beforeId, name, price);
          return result;
        };
        window.saveProduct.__descriptionEnhanced = true;
      }
    };

    tryWrap();
    setTimeout(tryWrap, 500);
    setTimeout(tryWrap, 1200);
  }

  async function loadProductDescription(id) {
    if (!id) return;
    clearDescriptionFields();

    try {
      const sb = await getClient();
      const { data, error } = await sb
        .from("products")
        .select("description_ku_sorani, description_ku_badini, description_ar, description_en, description")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) return;

      setValue("productDescriptionSorani", data.description_ku_badini || data.description_ku_sorani || data.description || "");
      setValue("productDescriptionAr", data.description_ar || "");
      setValue("productDescriptionEn", data.description_en || "");
    } catch (_) {}
  }

  async function saveProductDescription(productId, name, price) {
    const description = value("productDescriptionSorani");
    const descriptionAr = value("productDescriptionAr");
    const descriptionEn = value("productDescriptionEn");

    if (!description && !descriptionAr && !descriptionEn) return;

    try {
      const sb = await getClient();
      let id = productId;

      if (!id && name) {
        const { data } = await sb
          .from("products")
          .select("id")
          .eq("name_ku_sorani", name)
          .eq("price", price)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        id = data?.id;
      }

      if (!id) return;

      await sb
        .from("products")
        .update({
          description_ku_sorani: description,
          description_ku_badini: description,
          description_ar: descriptionAr,
          description_en: descriptionEn,
          description: description,
        })
        .eq("id", id);
    } catch (error) {
      alert("شرحە پاشەکەوت نەبوو. تکایە SQL ـی description زیاد بکە. " + String(error));
    }
  }

  function clearDescriptionFields() {
    setValue("productDescriptionSorani", "");
    setValue("productDescriptionAr", "");
    setValue("productDescriptionEn", "");
  }

  function value(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  }
})();
