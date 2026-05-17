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

    const bookCards = document.querySelectorAll('.results-grid .book-card');
    if (bookCards.length > 0) {
        bookCards.forEach(card => {
            const isbnEl = card.querySelector('.book-isbn');
            if (isbnEl) {
                const isbn = isbnEl.textContent.replace('ISBN: ', '').trim();
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

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
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
