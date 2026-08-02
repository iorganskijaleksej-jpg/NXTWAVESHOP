/* ── URL Google Apps Script ── */
// Вставьте сюда вашу ссылку из Google Apps Script (заканчивающуюся на /exec)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxQTUxkPUXzFi8TOwq7q8mFbffxbgIfUx2S74miCJ7b9nBHUnvA1Bm7YZ7lOfBSw8NNGQ/exec';

/* ── State ── */
let cart = [];
let selectedProduct = null;
let selectedSize = null;
let footLength = '';

/* ── DOM Refs ── */
const $ = (sel) => document.querySelector(sel);

const productGrid = $('#product-grid');
const productModal = $('#product-modal');
const modalContent = $('#modal-content');
const modalClose = $('#modal-close');
const modalBackdrop = $('#modal-backdrop');
const cartOverlay = $('#cart-overlay');
const cartPanel = $('#cart-panel');
const cartToggle = $('#cart-toggle');
const cartClose = $('#cart-close');
const cartBackdrop = $('#cart-backdrop');
const cartItems = $('#cart-items');
const cartCount = $('#cart-count');
const cartSubtotal = $('#cart-subtotal');
const checkoutForm = $('#checkout-form');
const checkoutBtn = $('#checkout-btn');
const toast = $('#toast');

/* ── Helpers ── */
function formatPrice(n) {
  return '€' + n.toLocaleString('en-US');
}

function showToast(msg) {
  if (!toast) return; // Защита, если элемента нет на странице
  
  toast.textContent = msg;
  // Показываем уведомление (убираем прозрачность и запрет кликов)
  toast.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
  toast.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
  
  clearTimeout(showToast._t);
  
  // Скрываем через 5000 миллисекунд (5 секунд)
  showToast._t = setTimeout(() => {
    toast.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
    toast.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
  }, 5000);
}

function lockScroll() {
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  document.body.style.overflow = '';
}

function getImages(product) {
  return product.images || [product.image];
}

function renderCardGallery(images) {
  // Берем только самую первую картинку для карточки каталога
  const firstImage = images && images.length > 0 ? images[0] : '';
  
  return `
    <div class="w-full h-full flex items-center justify-center aspect-square">
      <img src="${firstImage}" alt="" class="product-card-image w-[90%] h-[90%] object-contain pointer-events-none" loading="lazy" draggable="false" />
    </div>
  `;
}

function renderModalGallery(images) {
  return `
    <div class="flex flex-col gap-3 mb-4 -mx-2 sm:mx-0">
      ${images.map((src) => `
        <div class="bg-canvas rounded-3xl overflow-hidden aspect-square flex items-center justify-center">
          <img src="${src}" alt="" class="w-[85%] h-[85%] object-contain" draggable="false" />
        </div>
      `).join('')}
    </div>
  `;
}

/* ── Product Grid ── */
function renderProducts() {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) return; // Защита, если блока нет на странице

  // 1. Проверяем, в каталоге ли мы (по элементу <body> или ссылке)
  const isCatalogPage = document.body.classList.contains('catalog-page') || 
                        window.location.href.toLowerCase().includes('catalog');

  // 2. Фильтруем список товаров
  const displayProducts = isCatalogPage 
    ? products 
    : products.filter((p) => !p.isCatalogOnly);

  // 3. Выводим карточки (используем displayProducts вместо products)
  productGrid.innerHTML = displayProducts.map((p) => `
    <article
      class="product-card group cursor-pointer"
      data-id="${p.id}"
      role="button"
      tabindex="0"
      aria-label="View product — ${formatPrice(p.price)}"
    >
      <div class="bg-canvas rounded-3xl overflow-hidden mb-2">
        ${renderCardGallery(getImages(p))}
      </div>
      <p class="text-sm font-semibold px-1">${formatPrice(p.price)}</p>
    </article>
  `).join('');

  // 4. Твоя родная логика кликов и открытий модального окна
  productGrid.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', () => openModal(+card.dataset.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(+card.dataset.id);
      }
    });
  });
}
/* ── Product Modal Functions ── */
function openModal(id) {
  selectedProduct = products.find((p) => p.id === id);
  selectedSize = null;
  footLength = '';
  
  renderModal();

  if (productModal) {
    // Принудительно делаем модальное окно видимым для Tailwind и CSS
    productModal.classList.remove('opacity-0', 'pointer-events-none', 'modal-hidden', 'overlay-hidden');
    productModal.classList.add('opacity-100', 'pointer-events-auto', 'modal-visible', 'overlay-visible');
    productModal.setAttribute('aria-hidden', 'false');
    lockScroll();
  }
}

function closeModal() {
  if (productModal) {
    productModal.classList.remove('opacity-100', 'pointer-events-auto', 'modal-visible', 'overlay-visible');
    productModal.classList.add('opacity-0', 'pointer-events-none', 'modal-hidden', 'overlay-hidden');
    productModal.setAttribute('aria-hidden', 'true');
  }
  
  if (!cartOverlay || cartOverlay.classList.contains('pointer-events-none')) {
    unlockScroll();
  }
}

/* ── Product Modal Form ── */
function renderModal() {
  const p = selectedProduct;
  if (!p || !modalContent) return;

  modalContent.innerHTML = `
    ${renderModalGallery(getImages(p))}
    <p class="text-xl font-semibold mb-6">${formatPrice(p.price)}</p>

    <div class="mb-6">
      <label class="block text-xs font-semibold tracking-wide uppercase text-slate mb-3">Select Size (EU)</label>
      <div id="size-selector" class="flex flex-wrap gap-2">
        ${(p.sizes || []).map((s) => `
          <button type="button" data-size="${s}"
            class="size-btn px-4 py-2.5 rounded-xl bg-gray-100 text-gray-900 text-sm font-medium border border-gray-200 hover:border-black transition-all">
            EU ${s}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="mb-6">
      <label for="foot-length" class="block text-xs font-semibold tracking-wide uppercase text-slate mb-3">Foot Length (cm)</label>
      <input
        id="foot-length"
        type="text"
        inputmode="decimal"
        placeholder="e.g. 27 cm"
        value="${footLength}"
        class="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:border-black"
      />
    </div>

    <div class="bg-gray-50 rounded-2xl px-4 py-3.5 mb-6">
      <p class="text-xs text-gray-600 leading-relaxed">
         <span class="font-medium text-gray-900">Note:</span> Once your order is placed, we immediately verify the exact dimensions in centimeters with the supplier. We then contact you to confirm the details (size, payment) and answer any questions you may have.
      </p>
    </div>

    <button id="add-to-bag" disabled
      class="w-full py-3.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
      Add to Bag
    </button>
  `;

  const sizeSelector = $('#size-selector');
  const footInput = $('#foot-length');
  const addBtn = $('#add-to-bag');

  if (sizeSelector && addBtn && footInput) {
    sizeSelector.querySelectorAll('.size-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedSize = +btn.dataset.size;
        sizeSelector.querySelectorAll('.size-btn').forEach((b) => {
          b.classList.remove('bg-black', 'text-white', 'border-black');
          b.classList.add('bg-gray-100', 'text-gray-900', 'border-gray-200');
        });
        btn.classList.remove('bg-gray-100', 'text-gray-900', 'border-gray-200');
        btn.classList.add('bg-black', 'text-white', 'border-black');
        
        validateModalForm(addBtn, footInput);
      });
    });

    footInput.addEventListener('input', (e) => {
      footLength = e.target.value;
      validateModalForm(addBtn, footInput);
    });

    addBtn.addEventListener('click', () => {
      if (!selectedSize || !footLength.trim()) return;

      // Используем функцию addToCart, чтобы товар корректно добавлялся с уникальным cartId
      addToCart({
        productId: p.id,
        name: p.name || 'Footwear',
        price: p.price,
        size: selectedSize,
        footLength: footLength.trim(),
        image: getImages(p)[0]
      });

      closeModal();
      if (typeof showToast === 'function') showToast('Added to bag successfully!');
    });
  }
}

function validateModalForm(btn, input) {
  btn.disabled = !(selectedSize && input.value.trim().length > 0);
}

/* ── Cart Logic ── */
function addToCart(item) {
  cart.push({ ...item, cartId: Date.now() });
  updateCartUI();
}

function removeFromCart(cartId) {
  cart = cart.filter((i) => i.cartId !== cartId);
  updateCartUI();
}

function getSubtotal() {
  return cart.reduce((sum, i) => sum + i.price, 0);
}

function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartSubtotal = document.getElementById('cart-subtotal');
  
  // Общее количество товаров в корзине (просто длина массива cart)
  const totalItems = cart.length;

  if (cartCount) {
    cartCount.textContent = totalItems;
    if (totalItems > 0) {
      cartCount.classList.remove('hidden');
    } else {
      cartCount.classList.add('hidden');
    }
  }

  if (cartSubtotal && typeof formatPrice === 'function') {
    cartSubtotal.textContent = formatPrice(getSubtotal());
  }

  // Вызываем отрисовку самих элементов списка
  renderCartItems();
}

function renderCartItems() {
  if (!cartItems) return;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center py-16">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-slate/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
        <p class="text-sm text-slate">Your bag is empty.</p>
      </div>
    `;
    return;
  }

  cartItems.innerHTML = cart.map((item) => `
    <div class="flex gap-4 mb-6 pb-6 border-b border-black/[0.04] last:border-0 last:mb-0 last:pb-0">
      <div class="w-20 h-20 bg-canvas rounded-2xl flex items-center justify-center shrink-0">
        <img src="${item.image}" alt="" class="w-[80%] h-[80%] object-contain" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-slate">EU ${item.size} · ${item.footLength} cm</p>
        <div class="flex items-center justify-between mt-2">
          <span class="text-sm font-semibold">${formatPrice(item.price)}</span>
          <button data-remove="${item.cartId}" class="text-xs text-slate hover:text-ink transition-colors duration-200">Remove</button>
        </div>
      </div>
    </div>
  `).join('');

  cartItems.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeFromCart(+btn.dataset.remove));
  });
}

function openCart() {
  if (cartOverlay) {
    cartOverlay.style.display = 'block'; // Возвращаем отображение
    cartOverlay.style.pointerEvents = 'auto'; // Включаем клики обратно
    cartOverlay.classList.remove('overlay-hidden');
    cartOverlay.classList.add('overlay-visible');
  }
  if (cartPanel) {
    cartPanel.classList.remove('cart-hidden');
    cartPanel.classList.add('cart-visible');
  }
  if (cartOverlay) cartOverlay.setAttribute('aria-hidden', 'false');
  lockScroll();
}

function closeCart() {
  if (cartOverlay) {
    cartOverlay.classList.add('overlay-hidden');
    cartOverlay.classList.remove('overlay-visible');
    
    // ГЛАВНОЕ: принудительно выключаем блокировку кликов и видимость на уровне стилей
    cartOverlay.style.pointerEvents = 'none';
    cartOverlay.style.display = 'none'; // Скрываем элемент гарантированно
  }
  
  if (cartPanel) {
    cartPanel.classList.add('cart-hidden');
    cartPanel.classList.remove('cart-visible');
  }
  
  if (cartOverlay) {
    cartOverlay.setAttribute('aria-hidden', 'true');
  }
  
  unlockScroll();
}

/* ── Checkout ── */
if (checkoutForm) {
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const formData = new FormData(checkoutForm);
    const rawCustomerData = Object.fromEntries(formData);

    // 1. Умное извлечение email и других полей формы
    const fullName = rawCustomerData.fullName || rawCustomerData.name || document.querySelector('#checkout-form input[type="text"]')?.value || '';
    const address = rawCustomerData.address || document.querySelector('#checkout-form input[name*="address"]')?.value || '';
    const phone = rawCustomerData.phone || rawCustomerData.tel || document.querySelector('#checkout-form input[type="tel"]')?.value || '';
    const email = rawCustomerData.email || rawCustomerData.mail || document.querySelector('#checkout-form input[type="email"]')?.value || '';

    // 2. Формируем размеры (например: "EU 42 (27 cm)")
    const sizesList = cart
      .map((item) => `EU ${item.size} (${item.footLength})`)
      .join(', ');

    // 3. Формируем список ID товаров (например: "id1, id2")
    const productIdsList = cart
      .map((item) => item.productId)
      .join(', ');

    // 4. Считаем итоговую сумму заказа
    const totalAmount = typeof formatPrice === 'function' && typeof getSubtotal === 'function' ? formatPrice(getSubtotal()) : '0';

    // 5. Формируем финальный объект отправки
    const payload = {
      fullName: fullName,
      address: address,
      phone: phone,
      email: email,
      size: sizesList,
      items: productIdsList,
      totalPrice: totalAmount
    };

    // 6. Отправка в Google Таблицу
    if (typeof GOOGLE_SCRIPT_URL !== 'undefined') {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(() => {
        if (typeof showToast === 'function') showToast('Order placed! We will contact you using the provided details to finalize the specifics and arrange payment.');
        cart = [];
        checkoutForm.reset();
        if (typeof updateCartUI === 'function') updateCartUI();
        if (typeof closeCart === 'function') closeCart();
      })
      .catch((error) => {
        console.error('Error submitting order:', error);
        if (typeof showToast === 'function') showToast('Error placing order.');
      });
    }
  }); // <-- Обработчик submit закрывается здесь!
}


/* ── Event Listeners (с безопасной проверкой) ── */
if (typeof modalClose !== 'undefined' && modalClose) modalClose.addEventListener('click', closeModal);
if (typeof modalBackdrop !== 'undefined' && modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
if (typeof cartToggle !== 'undefined' && cartToggle) cartToggle.addEventListener('click', openCart);
if (typeof cartClose !== 'undefined' && cartClose) cartClose.addEventListener('click', closeCart);
if (typeof cartBackdrop !== 'undefined' && cartBackdrop) cartBackdrop.addEventListener('click', closeCart);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (typeof cartOverlay !== 'undefined' && cartOverlay && cartOverlay.classList.contains('overlay-visible')) {
      closeCart();
    } else if (typeof productModal !== 'undefined' && productModal && productModal.classList.contains('overlay-visible')) {
      closeModal();
    }
  }
});

/* ── Init ── */
if (typeof renderProducts === 'function') {
  renderProducts();
}
if (typeof updateCartUI === 'function') updateCartUI();

/* ── Управление кнопкой корзины ── */
const cartToggleBtn = document.getElementById('cart-toggle');
const cartOverlayElement = document.getElementById('cart-overlay');
const cartCloseBtn = document.getElementById('cart-close');
const cartBackdropElement = document.getElementById('cart-backdrop');

if (cartToggleBtn && cartOverlayElement) {
  // Открытие корзины по клику на иконку в шапке
  cartToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    cartOverlayElement.classList.remove('opacity-0', 'pointer-events-none');
    cartOverlayElement.classList.add('opacity-100', 'pointer-events-auto');
    cartOverlayElement.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // блокируем скролл страницы
  });
}

// Закрытие корзины (по крестику или фону)
function closeCartDrawer() {
  if (cartOverlayElement) {
    cartOverlayElement.classList.remove('opacity-100', 'pointer-events-auto');
    cartOverlayElement.classList.add('opacity-0', 'pointer-events-none');
    cartOverlayElement.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // возвращаем скролл
  }
}

if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCartDrawer);
if (cartBackdropElement) cartBackdropElement.addEventListener('click', closeCartDrawer);

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('reviewImageModal');
  const modalImg = document.getElementById('expandedReviewImg');
  const closeBtn = document.getElementById('closeReviewModal');
  const zoomableImages = document.querySelectorAll('.zoomable');

  if (modal && modalImg && closeBtn) {
    // Открытие при клике на фото отзыва
    zoomableImages.forEach(img => {
      img.addEventListener('click', () => {
        modalImg.src = img.src;
        modal.classList.remove('hidden');
        // Небольшая задержка для плавной анимации появления (если поддерживается)
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
        
        // Блокируем прокрутку сайта под модалкой (используем вашу функцию lockScroll, если она есть)
        if (typeof lockScroll === 'function') {
          lockScroll();
        } else {
          document.body.style.overflow = 'hidden';
        }
      });
    });

    // Функция закрытия модального окна
    const closeReviewModal = () => {
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        modalImg.src = '';
      }, 300); // Время должно совпадать с transition-opacity (300мс)

      // Возвращаем прокрутку
      if (typeof unlockScroll === 'function') {
        unlockScroll();
      } else {
        document.body.style.overflow = 'auto';
      }
    };

    // Закрытие по крестику
    closeBtn.addEventListener('click', closeReviewModal);

    // Закрытие при клике на темный фон вокруг картинки
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeReviewModal();
      }
    });

    // Закрытие на клавишу Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeReviewModal();
      }
    });
  }
});









 
