(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const menu = Object.freeze({
    ensalada: { name: 'Ensalada de temporada', cents: 850 },
    verduras: { name: 'Verduras a la brasa', cents: 1200 },
    tarta: { name: 'Tarta de la casa', cents: 500 }
  });
  const inventory = Object.freeze({
    tomate: { min: 8, initial: 2, a: 220, b: 240, unit: 'kg' },
    arroz: { min: 5, initial: 6, a: 180, b: 165, unit: 'kg' },
    agua: { min: 4, initial: 1, a: 360, b: 340, unit: 'cajas' }
  });
  function money(cents) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }
  function basketTotal(basket) {
    return Object.entries(basket).reduce((total, [id, n]) => {
      if (!menu[id] || !Number.isInteger(n) || n < 0 || n > 99) throw new RangeError('Selección inválida');
      return total + menu[id].cents * n;
    }, 0);
  }
  function replenish(id, raw) {
    const item = inventory[id];
    const n = typeof raw === 'string' && raw.trim() === '' ? NaN : Number(raw);
    if (!item || raw === null || !Number.isInteger(n) || n < 0 || n > 999) return null;
    const count = Math.max(0, item.min - n);
    return { count, cents: count * Math.min(item.a, item.b), supplier: item.a <= item.b ? 'A' : 'B', unit: item.unit };
  }
  function classify(value) {
    const choices = {
      reserva: { category: 'Solicitud de reserva', next: 'Pendiente: una persona debe contactar y confirmar disponibilidad.' },
      horario: { category: 'Consulta de horario', next: 'Pendiente: una persona debe revisar y responder.' },
      otro: { category: 'Consulta general', next: 'Pendiente: una persona debe leer el mensaje.' }
    };
    return choices[value] || choices.otro;
  }
  function visibleCategory(category, filter) { return filter === 'all' || category === filter; }
  function createScrollLock(env) {
    let saved = null;
    return {
      lock() {
        if (saved) return;
        const body = env.document.body, html = env.document.documentElement;
        saved = { x: env.scrollX, y: env.scrollY, body: body.style.cssText, html: html.style.cssText };
        const gap = Math.max(0, env.innerWidth - html.clientWidth);
        const padding = parseFloat(env.getComputedStyle(body).paddingRight) || 0;
        body.style.position = 'fixed';
        body.style.top = '-' + saved.y + 'px';
        body.style.left = '0'; body.style.right = '0'; body.style.width = '100%';
        body.style.overflow = 'hidden'; body.style.paddingRight = padding + gap + 'px';
        html.style.overflow = 'hidden';
      },
      unlock() {
        if (!saved) return;
        const state = saved; saved = null;
        const html = env.document.documentElement;
        env.document.body.style.cssText = state.body;
        html.style.cssText = state.html;
        const behavior = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        env.scrollTo(state.x, state.y);
        html.style.scrollBehavior = behavior;
      }
    };
  }
  return { menu, inventory, money, basketTotal, replenish, classify, visibleCategory, createScrollLock };
});
