(() => {
  const storageKey = 'tamapet-shop-scroll';
  const path = window.location.pathname;

  if (path !== '/shop') {
    return;
  }

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('form[action="/shop/buy"]');
    if (!form) {
      return;
    }
    const card = form.closest('[data-shop-item-id]');
    const payload = {
      y: window.scrollY,
      itemId: card?.dataset.shopItemId || '',
      itemName: card?.dataset.shopItemName || '',
      at: Date.now(),
    };
    sessionStorage.setItem(storageKey, JSON.stringify(payload));
  });

  window.addEventListener('DOMContentLoaded', () => {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      return;
    }
    sessionStorage.removeItem(storageKey);

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const restore = () => {
      window.scrollTo({ top: Number(payload.y) || 0, behavior: 'auto' });

      if (payload.itemId) {
        const card = document.querySelector(`[data-shop-item-id="${payload.itemId}"]`);
        if (card) {
          card.classList.add('shop-card-highlight');
          window.setTimeout(() => card.classList.remove('shop-card-highlight'), 2600);
        }
      }

      const flash = document.querySelector('.flash-stack .flash');
      if (flash) {
        const toast = document.createElement('div');
        toast.className = `shop-toast ${flash.className}`;
        toast.textContent = flash.textContent || `${payload.itemName} 已购买，库存已更新`;
        document.body.appendChild(toast);
        window.setTimeout(() => {
          toast.classList.add('is-fading');
          window.setTimeout(() => toast.remove(), 220);
        }, 2600);
      }
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });
  });
})();
