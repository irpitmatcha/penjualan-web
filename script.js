const formatRupiah = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
}).format(value);

const getCart = () => {
    try {
        const cart = JSON.parse(localStorage.getItem('pocutCart') || '[]');
        if (!Array.isArray(cart)) {
            return [];
        }

        return cart
            .filter((item) => item && typeof item.name === 'string')
            .map((item) => ({
                name: item.name,
                price: Number(item.price) || 0,
                quantity: Math.max(Number(item.quantity) || 1, 1)
            }));
    } catch (error) {
        saveCart([]);
        return [];
    }
};

const saveCart = (cart) => {
    localStorage.setItem('pocutCart', JSON.stringify(cart));
};

const updateCartCount = () => {
    const totalItems = getCart().reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach((element) => {
        element.textContent = totalItems;
    });
};

const showToast = (message) => {
    const oldToast = document.querySelector('.toast');
    if (oldToast) {
        oldToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2200);
};

const addToCart = (name, price) => {
    const cart = getCart();
    const existingItem = cart.find((item) => item.name === name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1 });
    }

    saveCart(cart);
    updateCartCount();
    showToast(`${name} ditambahkan ke keranjang.`);
};

const updateCartItemQuantity = (name, change) => {
    const cart = getCart()
        .map((item) => item.name === name
            ? { ...item, quantity: item.quantity + change }
            : item)
        .filter((item) => item.quantity > 0);

    saveCart(cart);
    updateCartCount();
    renderCart();
};

const removeCartItem = (name) => {
    const cart = getCart().filter((item) => item.name !== name);
    saveCart(cart);
    updateCartCount();
    renderCart();
    showToast(`${name} dihapus dari keranjang.`);
};

const renderCart = () => {
    const cartItems = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const cartTotal = document.getElementById('cart-total');
    const cartSubtotal = document.getElementById('cart-subtotal');

    if (!cartItems || !emptyCart || !cartTotal) {
        return;
    }

    const cart = getCart();
    cartItems.innerHTML = '';

    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        cartTotal.textContent = formatRupiah(0);
        if (cartSubtotal) {
            cartSubtotal.textContent = formatRupiah(0);
        }
        return;
    }

    emptyCart.style.display = 'none';

    cart.forEach((item) => {
        const cartItem = document.createElement('article');
        const productInfo = document.createElement('div');
        const productName = document.createElement('h3');
        const productQuantity = document.createElement('p');
        const productSubtotal = document.createElement('strong');
        const productActions = document.createElement('div');
        const decreaseButton = document.createElement('button');
        const quantityText = document.createElement('span');
        const increaseButton = document.createElement('button');
        const removeButton = document.createElement('button');

        cartItem.className = 'cart-item';
        productName.textContent = item.name;
        productQuantity.textContent = `${item.quantity} x ${formatRupiah(item.price)}`;
        productSubtotal.textContent = formatRupiah(item.price * item.quantity);

        productActions.className = 'cart-actions';
        decreaseButton.type = 'button';
        decreaseButton.textContent = '-';
        decreaseButton.dataset.action = 'decrease';
        decreaseButton.dataset.name = item.name;
        quantityText.textContent = item.quantity;
        increaseButton.type = 'button';
        increaseButton.textContent = '+';
        increaseButton.dataset.action = 'increase';
        increaseButton.dataset.name = item.name;
        removeButton.type = 'button';
        removeButton.textContent = 'Hapus';
        removeButton.dataset.action = 'remove';
        removeButton.dataset.name = item.name;
        removeButton.className = 'remove-item';

        productInfo.append(productName, productQuantity);
        productActions.append(decreaseButton, quantityText, increaseButton, removeButton);
        cartItem.append(productInfo, productActions, productSubtotal);
        cartItems.appendChild(cartItem);
    });

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotal.textContent = formatRupiah(total);
    if (cartSubtotal) {
        cartSubtotal.textContent = formatRupiah(total);
    }
};

document.querySelectorAll('.cart-items').forEach((cartItems) => {
    cartItems.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }

        if (button.dataset.action === 'increase') {
            updateCartItemQuantity(button.dataset.name, 1);
        }

        if (button.dataset.action === 'decrease') {
            updateCartItemQuantity(button.dataset.name, -1);
        }

        if (button.dataset.action === 'remove') {
            removeCartItem(button.dataset.name);
        }
    });
});

document.querySelectorAll('.add-to-cart').forEach((button) => {
    button.addEventListener('click', () => {
        addToCart(button.dataset.name, Number(button.dataset.price));
    });
});

const clearCartButton = document.getElementById('clear-cart');
if (clearCartButton) {
    clearCartButton.addEventListener('click', () => {
        saveCart([]);
        updateCartCount();
        renderCart();
    });
}

document.querySelectorAll('.contact-form').forEach((form) => {
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        form.reset();
        showToast('Pesan berhasil disiapkan. Toko akan segera menghubungi Anda.');
    });
});

updateCartCount();
renderCart();