import { addToCart } from "./cart.js";

const productList = document.getElementById("productList");
const pagination = document.getElementById("pagination");

let products = [];
let currentPage = 1;
const itemsPerPage = 20;

// ===== Fetch Products =====
async function fetchProducts() {
  try {
    const res = await fetch("https://dummyjson.com/products?limit=200");
    const data = await res.json();
    products = data.products;
    renderProducts();
    renderPagination();
  } catch (error) {
    console.error("❌ Error fetching products:", error);
  }
}

// ===== Render Cards =====
function renderProducts() {
  productList.innerHTML = "";

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageProducts = products.slice(start, end);

  if (pageProducts.length === 0) {
    productList.innerHTML = `<p class="text-center text-muted py-5">No products found.</p>`;
    return;
  }

  pageProducts.forEach((p) => {
    const div = document.createElement("div");
    div.classList.add("col");
    div.innerHTML = `
      <div class="card product-card h-100 shadow-sm border-1 rounded-4"
           data-id="${p.id}"
           data-title="${p.title}"
           data-price="${p.price}"
           data-thumbnail="${p.thumbnail}">
        <img src="${p.thumbnail}" 
             class="card-img-top"
             alt="${p.title}"
             style="height:180px; object-fit:contain; background:#f8f9fa;">
        <div class="card-body text-center">
          <p class="mb-1 small text-primary fw-bold">${p.category}</p>
          <h5 class="product-title">${p.title}</h5>
          <p class="small text-muted">${p.description.slice(0, 70)}...</p>
          <p class="product-price fw-bold text-success mb-1">
            $${p.price} 
            <span class="text-danger small">(-${p.discountPercentage || 0}%)</span>
          </p>
          <p class="mb-2">⭐ ${p.rating} / 5</p>
          <a href="#" class="btn btn-sm btn-add-to-cart text-white w-100" style="background:#0d6efd;">
            <i class="bi bi-cart-fill me-1"></i> Add to Cart
          </a>
        </div>
      </div>
    `;
    productList.appendChild(div);
  });
}

// ===== Pagination =====
function renderPagination() {
  pagination.innerHTML = "";

  const totalPages = Math.ceil(products.length / itemsPerPage);

  // Prev Button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts();
      renderPagination();
    }
  };
  pagination.appendChild(prevBtn);

  // Page Buttons (show first 4 always)
  for (let i = 1; i <= Math.min(totalPages, 4); i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.classList.toggle("active", i === currentPage);
    btn.onclick = () => {
      currentPage = i;
      renderProducts();
      renderPagination();
    };
    pagination.appendChild(btn);
  }

  // Next Button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts();
      renderPagination();
    }
  };
  pagination.appendChild(nextBtn);
}
fetchProducts();
// ===== Initialize =====

// ===== Filter Logic =====

// ===== Filter Logic =====
if (document.getElementById("priceRange")) {
  const priceRange = document.getElementById("priceRange");
  const currentPrice = document.getElementById("currentPrice");
  const sortSelect = document.getElementById("sortSelect");
  const applyFilters = document.getElementById("applyFilters");

  // Price range display
  priceRange.addEventListener("input", () => {
    currentPrice.textContent = priceRange.value;
  });

  applyFilters.addEventListener("click", (e) => {
    e.preventDefault();

    const selectedCats = [];

    if (document.getElementById("catElectronics").checked) selectedCats.push("smartphones", "laptops");
    if (document.getElementById("catMen").checked) selectedCats.push("mens-shirts", "mens-shoes", "mens-watches");
    if (document.getElementById("catWomen").checked) selectedCats.push("womens-dresses", "womens-shoes", "womens-bags");
    if (document.getElementById("catHome").checked) selectedCats.push("furniture", "home-decoration");
    if (document.getElementById("catBeauty").checked) selectedCats.push("beauty", "fragrances");
    if (document.getElementById("catSports").checked) selectedCats.push("sports-accessories", "motorcycle");
    if (document.getElementById("catGroceries").checked) selectedCats.push("groceries");
    if (document.getElementById("catFashion").checked) selectedCats.push("tops");

    const maxPrice = parseInt(priceRange.value);
    const sortType = sortSelect.value;

    let filtered = products.filter((p) => {
      const inCategory = selectedCats.length === 0 || selectedCats.includes(p.category.toLowerCase());
      const inPrice = p.price <= maxPrice;
      return inCategory && inPrice;
    });

    if (sortType === "low-high") filtered.sort((a, b) => a.price - b.price);
    else if (sortType === "high-low") filtered.sort((a, b) => b.price - a.price);
    else if (sortType === "rating") filtered.sort((a, b) => b.rating - a.rating);
    else if (sortType === "newest") filtered.sort((a, b) => b.id - a.id);

    document.getElementById("pagination").innerHTML = "";
    renderFilteredProducts(filtered);
  });

  function renderFilteredProducts(filtered) {
    const productList = document.getElementById("productList");
    if (!productList) return;

    productList.innerHTML = "";

    if (filtered.length === 0) {
      productList.innerHTML = `<p class="text-center text-muted py-5">No products match your filters.</p>`;
      return;
    }

    filtered.forEach((p) => {
      const div = document.createElement("div");
      div.classList.add("col");
      div.innerHTML = `
        <div class="card product-card h-100 shadow-sm border-1 rounded-4">
          <img src="${p.thumbnail}" class="card-img-top" alt="${p.title}"
               style="height:180px; object-fit:contain; background:#f8f9fa;">
          <div class="card-body text-center">
            <p class="mb-1 small text-primary fw-bold">${p.category}</p>
            <h5 class="product-title">${p.title}</h5>
            <p class="small text-muted">${p.description.slice(0, 70)}...</p>
            <p class="product-price fw-bold text-success mb-1">$${p.price}</p>
            <p class="mb-2">⭐ ${p.rating} / 5</p>
            <a href="#" class="btn btn-sm btn-add-to-cart text-white w-100" style="background:#0d6efd;">
              <i class="bi bi-cart-fill me-1"></i> Add to Cart
            </a>
          </div>
        </div>`;
      productList.appendChild(div);
    });
  }
}


// ====== 🛒 ADD TO CART SYSTEM ======

// --- Local Cart Helpers ---
function setLocalCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}
function getLocalCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

// --- Add Product to Cart ---
// 🛒 Add To Cart Event
document.addEventListener("click", (e) => {
  if (e.target.closest(".btn-add-to-cart")) {
    e.preventDefault();
    const card = e.target.closest(".product-card");

    const title = card.querySelector(".product-title").textContent;
    const price = Number(card.querySelector(".product-price").textContent.replace("$", ""));
    const thumbnail = card.querySelector("img").src;
    const id = Date.now();

    addToCart({ id, title, price, thumbnail }); // ✅ Imported function used here
  }
});


// --- Attach Event Listeners after render ---
function setupAddToCartButtons() {
  const buttons = document.querySelectorAll(".btn-add-to-cart");
  buttons.forEach((btn, index) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const productCards = document.querySelectorAll(".product-card");
      const card = productCards[index];
      const title = card.querySelector(".product-title").textContent;
      const price = parseFloat(
        card.querySelector(".product-price").textContent.replace("$", "")
      );
      const img = card.querySelector("img").src;
      const product = { id: index + 1, title, price, thumbnail: img };
      addToCart(product);
    });
  });
}
