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
      <div class="card product-card h-100 shadow-sm border-1 rounded-4">
        <img src="${p.thumbnail}" 
             class="card-img-top"
             alt="${p.title}"
             style="height:180px; object-fit:contain; background:#f8f9fa;">
        <div class="card-body text-center">
          <p class="mb-1 small text-primary fw-bold">${p.category}</p>
          <h5 class="product-title">${p.title}</h5>
          <p class="small text-muted">${p.description.slice(0, 70)}...</p>
          <p class="product-price fw-bold text-success mb-1">$${p.price} 
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

// ===== Initialize =====
fetchProducts();
