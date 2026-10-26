// Reset for V2 logic
if (!localStorage.getItem('v2_reset')) {
    localStorage.removeItem('verba_purchased');
    localStorage.removeItem('verba_cart');
    localStorage.removeItem('verba_cart_expires');
    localStorage.setItem('v2_reset', 'true');
}

const CART_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
    
    const hiddenStr = localStorage.getItem('verba_hidden_products');
    const hidden = hiddenStr ? JSON.parse(hiddenStr) : [];

    const bookCards = document.querySelectorAll('.results-grid .book-card');
    if (bookCards.length > 0) {
        bookCards.forEach(card => {
            const isbnEl = card.querySelector('.book-isbn');
            if (isbnEl) {
                const isbn = isbnEl.textContent.replace('ISBN: ', '').trim();
                
                // If purchased or hidden, hide completely
                if (purchased.includes(isbn) || hidden.includes(isbn)) {
                    card.classList.add('purchased');
                    card.classList.remove('in-cart');
                    card.style.display = 'none';
                    return;
                } else {
                    card.classList.remove('purchased');
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

// Helper to build a product card and attach its modal
function createProductCard(p) {
    const card = document.createElement('div');
    card.className = 'book-card dynamic-product-card';
    card.setAttribute('data-category', p.subCategory || p.category || 'custom-admin');
    card.setAttribute('data-date', p.id || Date.now());
    card.setAttribute('data-rating', p.rating || '4.8');
    if (p.id !== undefined) {
        card.setAttribute('data-product-id', String(p.id));
    }

    const safeName = escapeHtml(p.name);
    const safeImage = escapeHtml(p.image);
    const rawIsbn = p.isbn || `CUST-${p.id}`;
    const safeIsbn = escapeHtml(rawIsbn);
    const rawAuthor = p.author ? `By ${p.author}` : (p.category === 'books' ? 'By Unknown Author' : 'Verba Vitae');
    const safeAuthor = escapeHtml(rawAuthor);
    const priceNum = isNaN(parseFloat(p.price)) ? 0 : parseFloat(p.price);

    let imageHtml = p.image 
        ? `<img src="${safeImage}" alt="${safeName}" style="width:100%; height:250px; object-fit:cover; margin-bottom:15px; border-radius: 0;">`
        : `<div class="placeholder-cover">NEW</div>`;
    
    card.innerHTML = `
        ${imageHtml}
        <p class="book-title">${safeName}</p>
        <p class="book-author">${safeAuthor}</p>
        <p class="book-price">$${priceNum.toFixed(2)}</p>
        <p class="book-isbn" style="display:none;">ISBN: ${safeIsbn}</p>
    `;
    
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('custom-cart-btn')) return;
        
        const modal = document.getElementById('bookModal');
        if (!modal) return;
        
        document.getElementById('modalTitle').textContent = p.name || '';
        document.getElementById('modalAuthor').textContent = rawAuthor;
        document.getElementById('modalPrice').textContent = '$' + priceNum.toFixed(2);
        
        const coverEl = document.getElementById('modalCover');
        if (coverEl) {
            if (p.image) {
                coverEl.innerHTML = `<img src="${safeImage}" alt="${safeName}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                coverEl.innerHTML = '';
                coverEl.textContent = (p.category || 'NEW').toUpperCase();
            }
        }

        const modalDetails = document.querySelector('.modal-details');
        if (modalDetails && p.category === 'books') {
            modalDetails.innerHTML = `
                <p><strong>Condition:</strong> ${escapeHtml(p.condition || 'New')}</p>
                <p><strong>ISBN:</strong> <span id="modalIsbn">${safeIsbn}</span></p>
                <p><strong>Pages:</strong> ${escapeHtml(p.pages || 'N/A')}</p>
                <p><strong>Publisher:</strong> ${escapeHtml(p.publisher || 'N/A')}</p>
                <p><strong>Language:</strong> ${escapeHtml(p.language || 'English')}</p>
                <p><strong>In Stock:</strong> ${escapeHtml(p.quantity || 1)}</p>
            `;
        } else if (modalDetails) {
            modalDetails.innerHTML = `<p><strong>Item ID:</strong> CUST-${escapeHtml(p.id)}</p>`;
        }

        const modalSynopsis = document.querySelector('.modal-synopsis');
        if (modalSynopsis && p.category === 'books') {
            modalSynopsis.innerHTML = `
                <h3>Synopsis</h3>
                <p>${escapeHtml(p.synopsis || 'No synopsis provided.')}</p>
            `;
        } else if (modalSynopsis) {
            modalSynopsis.innerHTML = '';
        }

        const modalLinks = document.querySelector('.modal-links');
        if (modalLinks) {
            modalLinks.innerHTML = '';
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
                    author: p.author || (p.category === 'books' ? 'Unknown Author' : 'Verba Vitae'),
                    price: '$' + priceNum.toFixed(2),
                    isbn: rawIsbn,
                    category: (p.category || 'NEW').toUpperCase()
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

    return card;
}

function renderDynamicProducts(products) {
    let pageCategory = 'books';
    const path = window.location.pathname;
    if (path.includes('accessories')) pageCategory = 'accessories';
    else if (path.includes('snacks')) pageCategory = 'snacks';
    else if (path.includes('technology')) pageCategory = 'technology';

    const grids = document.querySelectorAll('.results-grid');
    const newSlider = document.getElementById('newAcquisitionsSlider');
    const staffSlider = document.getElementById('staffPicksSlider');

    // Remove previously injected dynamic cards in main grid to avoid duplicates on re-render
    if (grids.length > 0) {
        const grid = grids[0];
        grid.querySelectorAll('.dynamic-product-card').forEach(el => el.remove());
        products.forEach(p => {
            if (p.category === pageCategory) {
                if (p.quantity !== undefined && p.quantity <= 0) return;
                const card = createProductCard(p);
                grid.prepend(card);
            }
        });
    }

    // Populate Sliders if present
    if (newSlider && staffSlider) {
        const availableBooks = products.filter(p => p.category === 'books' && (p.quantity === undefined || p.quantity > 0));

        const newAcqs = [...availableBooks].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 4);
        if (newAcqs.length > 0) {
            newSlider.innerHTML = '';
            newAcqs.forEach(p => {
                newSlider.appendChild(createProductCard(p));
            });
        }

        const staffPicks = availableBooks.filter(p => p.isStaffPick);
        if (staffPicks.length > 0) {
            staffSlider.innerHTML = '';
            staffPicks.forEach(p => {
                staffSlider.appendChild(createProductCard(p));
            });
        }
    }
}

// Consolidated DOMContentLoaded: render dynamic products FIRST, then updateCartUI()
document.addEventListener('DOMContentLoaded', async () => {
    let localProducts = [];
    try {
        localProducts = JSON.parse(localStorage.getItem('verba_products')) || [];
    } catch (e) {
        localProducts = [];
    }

    // Initial render with localStorage products before updateCartUI
    renderDynamicProducts(localProducts);
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

    // Fetch custom products and hidden products from Firestore if available
    if (typeof db !== 'undefined' && db) {
        try {
            const [productsSnap, hiddenDoc] = await Promise.all([
                db.collection('products').get().catch(() => null),
                db.collection('settings').doc('hidden_products').get().catch(() => null)
            ]);

            if (hiddenDoc && hiddenDoc.exists) {
                const data = hiddenDoc.data() || {};
                const remoteHidden = data.list || data.isbns || data.hidden || data.items || [];
                const localHidden = JSON.parse(localStorage.getItem('verba_hidden_products') || '[]');
                const mergedHidden = Array.from(new Set([...localHidden, ...remoteHidden]));
                localStorage.setItem('verba_hidden_products', JSON.stringify(mergedHidden));
            }

            if (productsSnap && !productsSnap.empty) {
                const remoteProducts = [];
                productsSnap.forEach(doc => {
                    const d = doc.data();
                    if (d) {
                        remoteProducts.push({ ...d, id: d.id !== undefined ? d.id : doc.id });
                    }
                });
                // Merge remote and local products by id/isbn
                const map = new Map();
                localProducts.forEach(p => map.set(String(p.isbn || p.id), p));
                remoteProducts.forEach(p => map.set(String(p.isbn || p.id), p));
                const mergedProducts = Array.from(map.values());
                localStorage.setItem('verba_products', JSON.stringify(mergedProducts));
                renderDynamicProducts(mergedProducts);
            }

            updateCartUI();
        } catch (err) {
            console.warn('Firestore product sync warning:', err);
        }
    }
});
