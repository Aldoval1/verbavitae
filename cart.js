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
