// Initialize products array
let products = [];

// Load products from localStorage when the page loads
function loadProducts() {
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    }
}

// Save products to localStorage
function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
}

// Render the products table
function renderTable(productsToDisplay = products) {
    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = ''; // Clear the table

    productsToDisplay.forEach((product, index) => {
        const price = typeof product.price === "number" ? product.price.toFixed(2) : "N/A"; // Safeguard
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${price}</td>
            <td>${product.category}</td>
            <td>${product.description}</td>
            <td>
                <button class="update-btn" data-index="${index}">Update</button>
                <button class="delete-btn" data-index="${index}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Event listener for adding a product
document.getElementById('addProductForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the form from refreshing the page

    // Get form values
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value); // Parse as float
    const category = document.getElementById('productCategory').value.trim();
    const description = document.getElementById('productDescription').value.trim();

    // Validate inputs
    if (!name || isNaN(price) || !category || !description) {
        alert('Please fill in all fields with valid data.');
        return;
    }

    // Add the new product to the products array
    products.push({ name, price, category, description });

    // Save the updated products array to localStorage
    saveProducts();

    // Re-render the table to include the new product
    renderTable();

    // Clear the form inputs
    this.reset();
});

// Event delegation for update and delete buttons
document.getElementById('productsTableBody').addEventListener('click', function (event) {
    const index = event.target.getAttribute('data-index');

    // Update Button
    if (event.target.classList.contains('update-btn')) {
        const product = products[index];

        // Populate the update form with the current product data
        document.getElementById('updateIndex').value = index;
        document.getElementById('updateName').value = product.name;
        document.getElementById('updatePrice').value = product.price;
        document.getElementById('updateCategory').value = product.category;
        document.getElementById('updateDescription').value = product.description;

        // Show the update form
        document.getElementById('updateSection').style.display = 'block';
    }

    // Delete Button
    if (event.target.classList.contains('delete-btn')) {
        if (confirm(`Are you sure you want to delete "${products[index].name}"?`)) {
            products.splice(index, 1); // Remove the product from the array
            saveProducts(); // Save the updated array to localStorage
            renderTable(); // Re-render the table
        }
    }
});

// Event listener for updating a product
document.getElementById('updateProductForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const index = document.getElementById('updateIndex').value;
    const name = document.getElementById('updateName').value.trim();
    const price = parseFloat(document.getElementById('updatePrice').value); // Parse as float
    const category = document.getElementById('updateCategory').value.trim();
    const description = document.getElementById('updateDescription').value.trim();

    if (!name || isNaN(price) || !category || !description) {
        alert('Please fill in all fields with valid data.');
        return;
    }

    // Update the product in the array
    products[index] = { name, price, category, description };

    // Save the updated array to localStorage
    saveProducts();

    // Re-render the table
    renderTable();

    // Hide the update form
    document.getElementById('updateSection').style.display = 'none';
});

// Event listener for cancel button in update form
document.getElementById('cancelUpdate').addEventListener('click', function () {
    document.getElementById('updateSection').style.display = 'none';
});

// Event listener for search functionality
document.getElementById('searchButton').addEventListener('click', function () {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchValue)
    );
    renderTable(filteredProducts);
});
document.getElementById('clearSearchButton').addEventListener('click', function () {
    document.getElementById('searchInput').value = '';
    renderTable();
});

// Clear All Products Button
document.getElementById('clearAllButton').addEventListener('click', function () {
    if (confirm('Are you sure you want to clear all products?')) {
        products = [];
        saveProducts();
        renderTable();
    }
});

// Load products from localStorage and render the table when the page loads
loadProducts();
renderTable();
