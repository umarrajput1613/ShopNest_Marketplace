// ===== SHOP PAGE SCRIPT =====

// Base API
const API_URL = "https://dummyjson.com/products?limit=200";

const productContainer = document.querySelector(".row.row-cols-2");
const priceRange = document.getElementById("priceRange");
const currentPrice = document.getElementById("currentPrice");
const filterButton = document.querySelector(".btn.btn-primary.w-100.mt-3");
const paginationContainer = document.querySelector(".pagination");

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 12;

// ===== Fetch All Products =====
async function loadProducts() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    allProducts = data.products;
    filteredProducts = allProducts;
    renderProducts();
    setupPagination();
  } catch (err) {
    console.error("❌ Failed to fetch products:", err);
  }
}

// ===== Render Products =====
function renderProducts() {
  productContainer.innerHTML = "";

  const start = (currentPage - 1) * productsPerPage;
  const end = start + productsPerPage;
  const productsToShow = filteredProducts.slice(start, end);

  if (productsToShow.length === 0) {
    productContainer.innerHTML = `<p class="text-center text-muted py-5">No products found.</p>`;
    return;
  }

  productsToShow.forEach((p) => {
    const card = document.createElement("div");
    card.className = "col";
    card.innerHTML = `
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
    productContainer.appendChild(card);
  });
}

// ===== Apply Filters =====
function applyFilters() {
  const electronics = document.getElementById("catElectronics").checked;
  const apparel = document.getElementById("catApparel").checked;
  const brand1 = document.getElementById("brand1").checked;
  const brand2 = document.getElementById("brand2").checked;
  const brand3 = document.getElementById("brand3").checked;
  const maxPrice = parseInt(priceRange.value);

  filteredProducts = allProducts.filter((p) => {
    const byCategory =
      (electronics && p.category.toLowerCase().includes("electronics")) ||
      (apparel && p.category.toLowerCase().includes("mens") || p.category.toLowerCase().includes("womens")) ||
      (!electronics && !apparel); // if none checked, show all

    const byBrand =
      (brand1 && p.brand?.toLowerCase().includes("apple")) ||
      (brand2 && p.brand?.toLowerCase().includes("nike")) ||
      (brand3 && p.brand?.toLowerCase().includes("samsung")) ||
      (!brand1 && !brand2 && !brand3);

    const byPrice = p.price <= maxPrice;

    return byCategory && byBrand && byPrice;
  });

  currentPage = 1;
  renderProducts();
  setupPagination();
}

// ===== Pagination =====
function setupPagination() {
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const prevBtn = `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#">Prev</a></li>`;
  paginationContainer.insertAdjacentHTML("beforeend", prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = `<li class="page-item ${i === currentPage ? "active" : ""}">
      <a class="page-link" href="#">${i}</a></li>`;
    paginationContainer.insertAdjacentHTML("beforeend", pageBtn);
  }

  const nextBtn = `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#">Next</a></li>`;
  paginationContainer.insertAdjacentHTML("beforeend", nextBtn);

  // Add event listeners
  paginationContainer.querySelectorAll(".page-link").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const text = btn.textContent.trim();

      if (text === "Prev" && currentPage > 1) currentPage--;
      else if (text === "Next" && currentPage < totalPages) currentPage++;
      else if (!isNaN(parseInt(text))) currentPage = parseInt(text);

      renderProducts();
      setupPagination();
    });
  });
}

// ===== Price Range Display =====
priceRange.addEventListener("input", () => {
  currentPrice.textContent = priceRange.value;
});

// ===== Filter Button =====
filterButton.addEventListener("click", applyFilters);

// ===== Initialize =====
loadProducts();
