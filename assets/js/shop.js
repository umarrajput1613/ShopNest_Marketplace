<script>
    const productList = document.getElementById('productList');
    const pagination = document.getElementById('pagination');
    let products = [];
    let currentPage = 1;
    const itemsPerPage = 20;

    async function fetchProducts() {
      try {
        const res = await fetch('https://dummyjson.com/products?limit=500');
        const data = await res.json();
        products = data.products;
        renderProducts();
        renderPagination();
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }

    function renderProducts() {
      productList.innerHTML = '';
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageProducts = products.slice(start, end);

      pageProducts.forEach(p => {
        const div = document.createElement('div');
        div.classList.add('product');
        div.innerHTML = `
          <img src="${p.thumbnail}" alt="${p.title}">
          <h4>${p.title}</h4>
          <p>$${p.price}</p>
        `;
        productList.appendChild(div);
      });
    }

    function renderPagination() {
      pagination.innerHTML = '';

      const totalPages = Math.ceil(products.length / itemsPerPage);

      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = currentPage === 1;
      prevBtn.classList.toggle('disabled', currentPage === 1);
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          renderProducts();
          renderPagination();
        }
      };
      pagination.appendChild(prevBtn);

      // Show first 4 page buttons
      for (let i = 1; i <= Math.min(totalPages, 4); i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.classList.toggle('active', i === currentPage);
        btn.onclick = () => {
          currentPage = i;
          renderProducts();
          renderPagination();
        };
        pagination.appendChild(btn);
      }

      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next';
      nextBtn.disabled = currentPage >= totalPages;
      nextBtn.classList.toggle('disabled', currentPage >= totalPages);
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
  </script>
