// Reset for V2 logic
if (!localStorage.getItem('v2_reset')) {
    localStorage.removeItem('verba_purchased');
    localStorage.removeItem('verba_cart');
    localStorage.removeItem('verba_cart_expires');
    localStorage.setItem('v2_reset', 'true');
}

const CART_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes

function getCart() {
    checkCartExpiration();
    const cartStr = localStorage.getItem('verba_cart');
    return cartStr ? JSON.parse(cartStr) : [];
}

function saveCart(cart) {
    localStorage.setItem('verba_cart', JSON.stringify(cart));
    if (cart.length > 0) {
        localStorage.setItem('verba_cart_expires', Date.now() + CART_EXPIRATION_MS);
    } else {
        localStorage.removeItem('verba_cart_expires');
    }
    updateCartUI();
}

function checkCartExpiration() {
    const expiresAt = localStorage.getItem('verba_cart_expires');
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
        localStorage.removeItem('verba_cart');
        localStorage.removeItem('verba_cart_expires');
    }
}

window.addToCart = function(book) {
    const cart = getCart();
    if (cart.find(item => item.isbn === book.isbn)) {
        return false; 
    }
    cart.push(book);
    saveCart(cart);
    return true;
};

window.removeFromCart = function(isbn) {
    let cart = getCart();
    cart = cart.filter(item => item.isbn !== isbn);
    saveCart(cart);
};

window.getCartExpirationTime = function() {
    checkCartExpiration();
    const expiresAt = localStorage.getItem('verba_cart_expires');
    return expiresAt ? parseInt(expiresAt) : null;
};

function updateCartUI() {
    const cart = getCart();
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) {
        cartCountEl.textContent = cart.length;
    }

    const purchasedStr = localStorage.getItem('verba_purchased');
    const purchased = purchasedStr ? JSON.parse(purchasedStr) : [];

    const bookCards = document.querySelectorAll('.results-grid .book-card');
    if (bookCards.length > 0) {
        bookCards.forEach(card => {
            const isbnEl = card.querySelector('.book-isbn');
            if (isbnEl) {
                const isbn = isbnEl.textContent.replace('ISBN: ', '').trim();
                
                // If purchased, hide completely
                if (purchased.includes(isbn)) {
                    card.classList.add('purchased');
                    card.classList.remove('in-cart');
                    card.style.display = 'none';
                    return;
                }

                const isInCart = cart.some(item => item.isbn === isbn);
                if (isInCart) {
                    card.classList.add('in-cart'); 
                } else {
                    card.classList.remove('in-cart');
                }
            }
        });
        
        if (typeof window.triggerFilterBooks === 'function') {
            window.triggerFilterBooks();
        }
    }
}

// Global Timer & Toast UI
window.showToast = function(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.right = '20px';
    toast.style.backgroundColor = 'var(--color-dark-blue, #0d1b2a)';
    toast.style.color = 'white';
    toast.style.padding = '15px 25px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    toast.style.zIndex = '10000';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    toast.style.maxWidth = '300px';
    toast.style.lineHeight = '1.4';
    document.body.appendChild(toast);

    setTimeout(() => { toast.style.opacity = '1'; }, 10);
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 300);
    }, 8000);
};

function createGlobalTimer() {
    let timerEl = document.getElementById('globalCartTimer');
    if (!timerEl) {
        timerEl = document.createElement('div');
        timerEl.id = 'globalCartTimer';
        timerEl.style.position = 'fixed';
        timerEl.style.bottom = '20px';
        timerEl.style.right = '20px';
        timerEl.style.backgroundColor = '#e53e3e';
        timerEl.style.color = 'white';
        timerEl.style.padding = '12px 20px';
        timerEl.style.borderRadius = '8px';
        timerEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        timerEl.style.zIndex = '9999';
        timerEl.style.fontWeight = 'bold';
        timerEl.style.display = 'none';
        document.body.appendChild(timerEl);
    }
    return timerEl;
}

function updateGlobalTimer() {
    const timerEl = createGlobalTimer();
    
    if (window.location.pathname.includes('checkout.html')) {
        timerEl.style.display = 'none';
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        timerEl.style.display = 'none';
        return;
    }

    const expiresAt = window.getCartExpirationTime();
    if (!expiresAt) return;

    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) {
        timerEl.style.display = 'none';
        return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    timerEl.textContent = `Cart Reservation: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    timerEl.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    updateGlobalTimer();
    setInterval(updateGlobalTimer, 1000);

    // Check expiration every 10 seconds
    setInterval(() => {
        const hadExpiration = !!localStorage.getItem('verba_cart_expires');
        checkCartExpiration();
        const hasExpiration = !!localStorage.getItem('verba_cart_expires');
        if (hadExpiration && !hasExpiration) {
            updateCartUI(); // Cart just expired
            if (window.location.pathname.includes('checkout.html')) {
                window.location.reload(); // Reload checkout if expired
            }
        }
    }, 10000);
});

// --- Dynamic Products Logic ---
document.addEventListener('DOMContentLoaded', () => {
    let pageCategory = 'books';
    const path = window.location.pathname;
    if (path.includes('accessories')) pageCategory = 'accessories';
    else if (path.includes('snacks')) pageCategory = 'snacks';
    else if (path.includes('technology')) pageCategory = 'technology';

    const products = JSON.parse(localStorage.getItem('verba_products')) || [];
    const grids = document.querySelectorAll('.results-grid');
    
    if (grids.length > 0) {
        const grid = grids[0];
        products.forEach(p => {
            if (p.category === pageCategory) {
                const card = document.createElement('div');
                card.className = 'book-card';
                card.setAttribute('data-category', 'custom-eboard');
                
                let imageHtml = p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%; height:250px; object-fit:cover; margin-bottom:15px; border-radius: 0;">` : `<div class="placeholder-cover">NEW</div>`;
                
                card.innerHTML = `
                    ${imageHtml}
                    <div class="book-hover">
                        <button class="add-to-cart-btn custom-cart-btn" data-isbn="CUST-${p.id}" data-title="${p.name}" data-price="${parseFloat(p.price).toFixed(2)}" data-category="${p.category}">Add to Cart</button>
                    </div>
                    <p class="book-title">${p.name}</p>
                    <p class="book-author">By E-Board</p>
                    <p class="book-price">$${parseFloat(p.price).toFixed(2)}</p>
                    <p class="book-isbn" style="display:none;">ISBN: CUST-${p.id}</p>
                `;
                
                card.style.cursor = 'pointer';
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('custom-cart-btn')) return;
                    
                    const modal = document.getElementById('bookModal');
                    if (!modal) return;
                    
                    document.getElementById('modalTitle').textContent = p.name;
                    document.getElementById('modalAuthor').textContent = "By E-Board";
                    document.getElementById('modalPrice').textContent = "$" + parseFloat(p.price).toFixed(2);
                    
                    const coverEl = document.getElementById('modalCover');
                    if(p.image) {
                        coverEl.innerHTML = `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">`;
                    } else {
                        coverEl.textContent = p.category.toUpperCase();
                    }

                    const modalDetails = document.querySelector('.modal-details');
                    if (modalDetails && p.category === 'books') {
                        modalDetails.innerHTML = `
                            <p><strong>Condition:</strong> ${p.condition || 'New'}</p>
                            <p><strong>ISBN:</strong> <span id="modalIsbn">CUST-${p.id}</span></p>
                            <p><strong>Pages:</strong> ${p.pages || 'N/A'}</p>
                            <p><strong>Publisher:</strong> ${p.publisher || 'N/A'}</p>
                            <p><strong>Language:</strong> English</p>
                        `;
                    } else if (modalDetails) {
                        modalDetails.innerHTML = `<p><strong>Item ID:</strong> CUST-${p.id}</p>`;
                    }

                    const modalSynopsis = document.querySelector('.modal-synopsis');
                    if (modalSynopsis && p.category === 'books') {
                        modalSynopsis.innerHTML = `
                            <h3>Synopsis</h3>
                            <p>${p.synopsis || 'No synopsis provided.'}</p>
                        `;
                    } else if (modalSynopsis) {
                        modalSynopsis.innerHTML = '';
                    }

                    const modalLinks = document.querySelector('.modal-links');
                    if (modalLinks) {
                        if (p.rating && p.goodreadsLink && p.category === 'books') {
                            modalLinks.innerHTML = `
                                <a href="${p.goodreadsLink}" target="_blank" class="modal-link" style="color: #d69e2e; font-weight: bold; font-size: 1.1rem; text-decoration: none;">⭐ ${p.rating} on Goodreads</a>
                            `;
                        } else {
                            modalLinks.innerHTML = '';
                        }
                    }

                    modal.style.display = 'flex';
                    
                    const addToCartBtn = modal.querySelector('.add-to-cart-btn');
                    if (addToCartBtn) {
                        const newBtn = addToCartBtn.cloneNode(true);
                        addToCartBtn.parentNode.replaceChild(newBtn, addToCartBtn);
                        
                        newBtn.textContent = 'Add to Cart';
                        newBtn.disabled = false;
                        newBtn.style.backgroundColor = 'var(--color-accent-blue)';
                        newBtn.style.cursor = 'pointer';

                        newBtn.addEventListener('click', () => {
                            const added = window.addToCart({
                                title: p.name,
                                author: "E-Board",
                                price: "$" + parseFloat(p.price).toFixed(2),
                                isbn: "CUST-" + p.id,
                                category: p.category.toUpperCase()
                            });
                            if (added) {
                                newBtn.textContent = 'Added to Cart!';
                                newBtn.style.backgroundColor = '#48bb78';
                                if (typeof window.showToast === 'function') window.showToast('Item reserved in your cart for 30 minutes.');
                                setTimeout(() => { modal.style.display = 'none'; }, 1000);
                            } else {
                                newBtn.textContent = 'Already in Cart';
                                newBtn.disabled = true;
                                newBtn.style.cursor = 'not-allowed';
                            }
                        });
                    }
                });

                grid.prepend(card);
            }
        });
        
        document.querySelectorAll('.custom-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.target;
                const success = window.addToCart({
                    title: b.getAttribute('data-title'),
                    author: "E-Board",
                    price: "$" + b.getAttribute('data-price'),
                    isbn: b.getAttribute('data-isbn'),
                    category: b.getAttribute('data-category').toUpperCase()
                });
                if (success) {
                    if (typeof window.showToast === 'function') {
                        window.showToast('Item reserved in your cart for 30 minutes.');
                    }
                } else {
                    alert('Item is already in your cart!');
                }
            });
        });
    }
});
