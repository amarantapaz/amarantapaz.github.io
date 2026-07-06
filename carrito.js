/* ─────────────────────────────────────────────────────────────
   CARRITO DE COMPRAS — Amaranta Paz
   Panel lateral con persistencia (se acuerda de lo que llevas
   aunque cambies de página o cierres la pestaña).

   CÓMO AGREGAR UN PATRÓN AL CARRITO DESDE EL HTML:
   Pon un botón así donde quieras (ya está puesto en index.html y
   en patron-ejemplo.html):

     <button class="add-to-cart"
             data-id="bandana-rosa"
             data-name="Bandana Rosa"
             data-price="8000"
             data-format="PDF · descarga inmediata"
             data-img="fotos/bandana-rosa.jpg"
             data-payhip="RGsF">
       + agregar al carrito
     </button>

   - data-id      : identificador único del patrón (sin espacios)
   - data-name    : nombre que se muestra
   - data-price   : precio SOLO en número, sin símbolos ni puntos (8000, no $8.000)
   - data-format  : texto chico bajo el nombre
   - data-img     : ruta a la foto (opcional; si no hay, se ve un cuadro gris)
   - data-payhip  : la "key" del producto en Payhip (opcional por ahora;
                    se usa cuando conectes el pago real — ver más abajo)

   ── CUANDO TENGAS PAYHIP LISTO (pago real) ──
   1. Sube cada patrón a Payhip y copia su "key" (las 4-5 letras del
      link, ej: payhip.com/b/RGsF  →  la key es RGsF).
   2. Pon esa key en el data-payhip de cada botón.
   3. Copia el link de tu TIENDA Payhip (ej: https://payhip.com/amarantapaz)
      y pégalo abajo en PAYHIP_STORE_URL.
   Con eso, el botón "Pagar" del carrito llevará a tu tienda Payhip para
   completar la compra de todos los patrones juntos.
   ───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ⬇⬇ PEGA AQUÍ EL LINK DE TU TIENDA PAYHIP CUANDO LA TENGAS ⬇⬇
  // Ejemplo: 'https://payhip.com/amarantapaz'
  var PAYHIP_STORE_URL = '';
  // ⬆⬆ ────────────────────────────────────────────────── ⬆⬆

  var STORAGE_KEY = 'ap_carrito';

  /* ── datos ── */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch (e) { /* si el navegador bloquea el almacenamiento, el carrito sigue funcionando en la sesión */ }
  }
  var cart = load();

  /* ── formato de precio chileno: 8000 → $8.000 ── */
  function formatCLP(n) {
    return '$' + Number(n).toLocaleString('es-CL');
  }

  /* ── construir el panel y el fondo una sola vez ── */
  function buildDrawer() {
    if (document.querySelector('.cart-drawer')) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'cart-backdrop';

    var drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.setAttribute('aria-label', 'Carrito de compras');
    drawer.innerHTML =
      '<div class="cart-head">' +
        '<h2>Tu carrito</h2>' +
        '<button class="cart-close" aria-label="Cerrar carrito">&times;</button>' +
      '</div>' +
      '<div class="cart-items"></div>' +
      '<div class="cart-foot">' +
        '<div class="cart-total">' +
          '<span class="label">Total</span>' +
          '<span class="amount">$0</span>' +
        '</div>' +
        '<button class="cart-checkout">Pagar</button>' +
        '<p class="cart-note"></p>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    backdrop.addEventListener('click', closeCart);
    drawer.querySelector('.cart-close').addEventListener('click', closeCart);
    drawer.querySelector('.cart-checkout').addEventListener('click', checkout);
  }

  /* ── pintar la lista, el total y el contador ── */
  function render() {
    var itemsBox = document.querySelector('.cart-items');
    var amountEl = document.querySelector('.cart-total .amount');
    var checkoutBtn = document.querySelector('.cart-checkout');
    var noteEl = document.querySelector('.cart-note');
    if (!itemsBox) return;

    if (cart.length === 0) {
      itemsBox.innerHTML =
        '<p class="cart-empty">Tu carrito está vacío.<br>Cuando agregues un patrón, aparecerá aquí ♥</p>';
      checkoutBtn.disabled = true;
      noteEl.textContent = '';
    } else {
      itemsBox.innerHTML = cart.map(function (it) {
        var thumb = it.img
          ? '<div class="cart-item-thumb"><img src="' + it.img + '" alt=""></div>'
          : '<div class="cart-item-thumb"></div>';
        return (
          '<div class="cart-item">' +
            thumb +
            '<div class="cart-item-body">' +
              '<span class="cart-item-name">' + it.name + '</span>' +
              '<span class="cart-item-format">' + (it.format || '') + '</span>' +
              '<span class="cart-item-price">' + formatCLP(it.price) + '</span>' +
            '</div>' +
            '<button class="cart-item-remove" data-remove="' + it.id + '" aria-label="Quitar">&times;</button>' +
          '</div>'
        );
      }).join('');
      checkoutBtn.disabled = false;
      noteEl.textContent = PAYHIP_STORE_URL
        ? 'Pago seguro y descarga inmediata vía Payhip.'
        : '(Aún no conectas Payhip: el botón Pagar se activará cuando pegues el link de tu tienda.)';

      itemsBox.querySelectorAll('.cart-item-remove').forEach(function (btn) {
        btn.addEventListener('click', function () { removeItem(btn.getAttribute('data-remove')); });
      });
    }

    var total = cart.reduce(function (sum, it) { return sum + Number(it.price); }, 0);
    amountEl.textContent = formatCLP(total);

    // contador en el ícono del header
    var count = cart.length;
    document.querySelectorAll('.cart-count').forEach(function (badge) {
      badge.textContent = count;
      badge.classList.toggle('visible', count > 0);
    });
  }

  /* ── acciones ── */
  function addItem(data) {
    if (cart.some(function (it) { return it.id === data.id; })) {
      openCart(); // ya está: solo abrimos el carrito
      return;
    }
    cart.push(data);
    save(cart);
    render();
    openCart();
  }

  function removeItem(id) {
    cart = cart.filter(function (it) { return it.id !== id; });
    save(cart);
    render();
  }

  function openCart() {
    buildDrawer();
    render();
    document.querySelector('.cart-backdrop').classList.add('open');
    document.querySelector('.cart-drawer').classList.add('open');
  }

  function closeCart() {
    var b = document.querySelector('.cart-backdrop');
    var d = document.querySelector('.cart-drawer');
    if (b) b.classList.remove('open');
    if (d) d.classList.remove('open');
  }

  function checkout() {
    if (!PAYHIP_STORE_URL) {
      alert('El pago aún no está conectado.\n\nCuando subas tus patrones a Payhip, pega el link de tu tienda en el archivo carrito.js (variable PAYHIP_STORE_URL) y este botón llevará al pago.');
      return;
    }
    // Lleva a la tienda Payhip para completar la compra de todos los patrones.
    window.open(PAYHIP_STORE_URL, '_blank', 'noopener');
  }

  /* ── enganchar todo cuando cargue la página ── */
  function init() {
    buildDrawer();
    render();

    // abrir carrito desde el ícono del header
    document.querySelectorAll('.cart-toggle').forEach(function (btn) {
      btn.addEventListener('click', openCart);
    });

    // botones "agregar al carrito" (en cards y en producto)
    document.querySelectorAll('.add-to-cart').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation(); // que no dispare el link de la card
        addItem({
          id:      btn.getAttribute('data-id'),
          name:    btn.getAttribute('data-name'),
          price:   btn.getAttribute('data-price'),
          format:  btn.getAttribute('data-format') || '',
          img:     btn.getAttribute('data-img') || '',
          payhip:  btn.getAttribute('data-payhip') || ''
        });
        // feedback visual breve
        var original = btn.textContent;
        btn.classList.add('added');
        btn.textContent = 'agregado ✓';
        setTimeout(function () {
          btn.classList.remove('added');
          btn.textContent = original;
        }, 1200);
      });
    });

    // cerrar con la tecla Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
