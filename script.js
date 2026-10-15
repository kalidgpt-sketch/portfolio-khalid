'use strict';
(function () {
  const L = window.PortfolioLogic;
  if (!L) return;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  let apps = {};
  try { apps = JSON.parse($('#appPayloads')?.textContent || '{}'); } catch (_) { /* Readable project pages remain available. */ }
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  let effectsEnabled = !reduced;
  const motionButton = $('#motionToggle');
  if (motionButton) {
    motionButton.hidden = false;
    motionButton.setAttribute('aria-pressed', String(effectsEnabled));
    motionButton.textContent = effectsEnabled ? 'Efectos activos ◉' : 'Movimiento reducido ◉';
    if (reduced) motionButton.disabled = true;
    motionButton.addEventListener('click', () => {
      effectsEnabled = !effectsEnabled;
      document.documentElement.classList.toggle('effects-off', !effectsEnabled);
      motionButton.setAttribute('aria-pressed', String(effectsEnabled));
      motionButton.textContent = effectsEnabled ? 'Efectos activos ◉' : 'Efectos pausados ○';
    });
  }
  document.documentElement.classList.add('enhanced');
  $$('[data-js-control]').forEach(node => { node.hidden = false; });
  const nav = $('#navLinks'), menu = $('#menuToggle');
  function closeMenu(returnFocus = false) {
    nav?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Abrir menú');
    if (returnFocus) menu?.focus();
  }
  if (menu && nav) {
    menu.hidden = false;
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    $$('a', nav).forEach(a => a.addEventListener('click', () => closeMenu()));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')) closeMenu(true);
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu();
    });
    window.matchMedia?.('(min-width: 761px)').addEventListener?.('change', event => {
      if (event.matches) closeMenu();
    });
  }
  const progress = $('#progress');
  function updateProgress() {
    if (!progress) return;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (available > 0 ? Math.min(100, Math.max(0, window.scrollY / available * 100)) : 0) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();
  function select(buttons, current) {
    buttons.forEach(button => {
      const active = button === current;
      button.setAttribute('aria-pressed', String(active)); button.classList.toggle('active', active);
    });
  }
  const filters = $$('[data-filter]');
  filters.forEach(button => button.addEventListener('click', () => {
    select(filters, button); let count = 0;
    $$('.project-card').forEach(card => {
      card.hidden = !L.visibleCategory(card.dataset.category, button.dataset.filter);
      if (!card.hidden) count++;
      if (!card.hidden && effectsEnabled && card.animate) card.animate([{ opacity: .45, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' });
    });
    $('#filterStatus').textContent = count + (count === 1 ? ' proyecto visible' : ' proyectos visibles');
    updateProgress();
  }));

  function initDemo(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const kind = root.dataset.demo;
    if (kind === 'brasa') {
      let basket = {};
      const list = $('[data-basket-items]', root);
      function draw() {
        list.replaceChildren();
        Object.entries(basket).forEach(([id, quantity]) => {
          if (!quantity) return;
          const li = document.createElement('li'), button = document.createElement('button');
          li.append(document.createTextNode(quantity + ' × ' + L.menu[id].name + ' · ' + L.money(L.menu[id].cents * quantity) + ' '));
          button.type = 'button'; button.textContent = 'Quitar uno';
          button.setAttribute('aria-label', 'Quitar una unidad de ' + L.menu[id].name);
          button.addEventListener('click', () => {
            basket[id]--; draw();
            $('[data-basket-reset]', root).focus({ preventScroll: true });
          });
          li.append(button); list.append(li);
        });
        const count = Object.values(basket).reduce((a, b) => a + b, 0);
        $('[data-basket-total]', root).textContent = count + ' productos · Total de muestra: ' + L.money(L.basketTotal(basket));
        $$('[data-add]', root).forEach(button => { button.disabled = (basket[button.dataset.add] || 0) >= 99; });
      }
      $$('[data-add]', root).forEach(button => button.addEventListener('click', () => {
        const id = button.dataset.add;
        basket[id] = Math.min(99, (basket[id] || 0) + 1); draw();
      }));
      $('[data-basket-reset]', root).addEventListener('click', () => { basket = {}; draw(); });
      const buttons = $$('[data-menu-filter]', root);
      buttons.forEach(button => button.addEventListener('click', () => {
        select(buttons, button);
        $$('[data-menu-category]', root).forEach(item => { item.hidden = !L.visibleCategory(item.dataset.menuCategory, button.dataset.menuFilter); });
      }));
      draw();
    }
    if (kind === 'auto') {
      const output = $('[data-inbox-result]', root), reviewed = $('[data-reviewed]', root);
      const stages = $$('[data-stage]', root), message = $('[data-message]', root);
      function reset() {
        output.textContent = 'Selecciona una consulta para ver cómo se organizaría.';
        reviewed.disabled = true;
        stages.forEach(stage => stage.classList.remove('done'));
      }
      $('[data-process]', root).addEventListener('click', () => {
        const result = L.classify(message.value);
        output.textContent = result.category + '. ' + result.next;
        stages.forEach(stage => stage.classList.add('done')); reviewed.disabled = false;
      });
      reviewed.addEventListener('click', () => {
        output.textContent = 'Consulta marcada como revisada en esta simulación. No se ha enviado respuesta ni confirmado reserva.';
        reviewed.disabled = true;
      });
      message.addEventListener('change', reset);
      $('[data-inbox-reset]', root).addEventListener('click', () => { message.value = 'reserva'; reset(); });
    }
    if (kind === 'compras') {
      const inputs = $$('[data-stock]', root);
      function recalculate() {
        let total = 0, valid = true;
        inputs.forEach(input => {
          const result = L.replenish(input.dataset.stock, input.value);
          input.setAttribute('aria-invalid', String(!result));
          const cell = $('[data-order="' + input.dataset.stock + '"]', root);
          if (!result) { cell.textContent = 'Revisa stock'; valid = false; return; }
          total += result.cents;
          cell.textContent = result.count + ' ' + result.unit + (result.count ? ' · ' + result.supplier : '');
        });
        $('[data-stock-error]', root).textContent = valid ? '' : 'Introduce existencias enteras entre 0 y 999 en todos los productos.';
        $('[data-stock-total]', root).textContent = valid ? 'Compra de muestra: ' + L.money(total) + ' eligiendo el menor precio por producto.' : 'Total pendiente de corregir las existencias.';
      }
      inputs.forEach(input => input.addEventListener('input', recalculate));
      $('[data-stock-reset]', root).addEventListener('click', () => {
        inputs.forEach(input => { input.value = L.inventory[input.dataset.stock].initial; }); recalculate();
      });
      recalculate();
    }
    if (kind === 'gg') {
      const buttons = $$('[data-radar-filter]', root);
      buttons.forEach(button => button.addEventListener('click', () => {
        select(buttons, button); let count = 0;
        $$('[data-change]', root).forEach(item => {
          item.hidden = !L.visibleCategory(item.dataset.change, button.dataset.radarFilter);
          if (!item.hidden) count++;
        });
        $('[data-radar-count]', root).textContent = count + ' cambios de muestra';
      }));
    }
    if (kind === 'cie') {
      const steps = {
        fuente: ['Identificar el origen', 'El diseño exige registrar de dónde procede un documento y permitir volver a su fuente.'],
        version: ['Conservar la edición', 'La propuesta separa ediciones y evita mezclar contenido de versiones diferentes.'],
        evaluacion: ['Comprobar antes de afirmar', 'Las pruebas técnicas y los casos deben poder revisarse. Una batería proyectada no equivale a una evaluación superada.']
      };
      const buttons = $$('[data-method]', root);
      buttons.forEach(button => button.addEventListener('click', () => {
        select(buttons, button);
        const [title, text] = steps[button.dataset.method];
        const output = $('[data-method-output]', root);
        $('strong', output).textContent = title; $('p', output).textContent = text;
      }));
    }
    if (kind === 'darija') {
      $('[data-document]', root).addEventListener('change', event => {
        const appointment = event.target.value === 'cita';
        $('[data-document-original]', root).textContent = appointment ? '«Ejemplo: revisa la fecha y la hora indicadas en tu recordatorio».' : '«Ejemplo: comprueba qué información solicita este formulario».';
        $('p', $('[data-document-output]', root)).textContent = appointment ? 'El mensaje te pide comprobar cuándo es la cita. Si faltan datos o no los entiendes, pregunta a quien emitió el documento.' : 'El mensaje te pide leer los campos solicitados. Si algo no se entiende, consúltalo con la entidad que entrega el formulario antes de completarlo.';
      });
    }
  }
  $$('[data-demo]').forEach(initDemo);

  function initApplications(scope = document) {
    $$('[data-application]', scope).forEach(stage => {
      if (stage.dataset.ready) return;
      stage.dataset.ready = 'true';
      const id = stage.dataset.application, frame = $('iframe[data-app]', stage);
      const status = $('.app-runtime-status', stage);
      if (!apps[id]) {
        status.textContent = 'No se encontró esta copia de la aplicación. Abre la carpeta web del ZIP para recuperarla.';
        status.classList.add('error'); return;
      }
      frame.addEventListener('load', () => { if (!status.classList.contains('error')) status.textContent = 'Interfaz original cargada · copia local de portafolio'; });
      frame.srcdoc = apps[id];
      $('[data-app-reset]', stage).addEventListener('click', () => {
        status.classList.remove('error'); status.textContent = 'Reiniciando la aplicación…';
        frame.srcdoc = apps[id];
      });
      $('[data-app-expand]', stage).addEventListener('click', event => {
        const target = stage.closest('dialog') || stage;
        const expanded = target.classList.toggle('app-expanded');
        event.currentTarget.setAttribute('aria-pressed', String(expanded));
        event.currentTarget.textContent = expanded ? 'Salir de vista amplia ↙' : 'Vista amplia ↗';
      });
      $('[data-app-download]', stage).addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([apps[id]], { type: 'text/html;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = 'Khalid_' + id + '_demo_original.html';
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      });
    });
  }
  initApplications();
  // The thumbnail runs the original GG Radar interface, rather than imitating a screenshot.
  $$('[data-preview-app]').forEach(box => {
    const id = box.dataset.previewApp;
    if (!apps[id]) return;
    const frame = document.createElement('iframe');
    frame.title = 'Vista de la interfaz original de GG Radar';
    frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true'); frame.setAttribute('inert', '');
    frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('referrerpolicy', 'no-referrer');
    function fit() { frame.style.transform = 'scale(' + box.clientWidth / 1200 + ')'; }
    frame.addEventListener('load', () => { box.classList.add('loaded'); fit(); });
    box.append(frame); frame.srcdoc = apps[id]; fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(box);
    else window.addEventListener('resize', fit, { passive: true });
  });
  window.addEventListener('message', event => {
    if (!event.data || !['portfolio-app-error', 'portfolio-app-escape'].includes(event.data.type)) return;
    const frame = $$('iframe[data-app]').find(candidate => candidate.contentWindow === event.source);
    if (!frame) return;
    if (event.data.type === 'portfolio-app-escape') {
      const parentDialog = frame.closest('dialog'); if (parentDialog?.open) parentDialog.close();
      return;
    }
    const status = $('.app-runtime-status', frame.closest('[data-application]'));
    status.textContent = 'La aplicación ha encontrado un error al iniciar. Puedes reiniciarla o descargar su copia independiente.';
    status.classList.add('error');
  });
  $$('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (!effectsEnabled || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--tilt-x', (0.5 - y) * 5 + 'deg');
      card.style.setProperty('--tilt-y', (x - 0.5) * 5 + 'deg');
      card.style.setProperty('--shine-x', x * 100 + '%'); card.style.setProperty('--shine-y', y * 100 + '%');
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg'); });
  });
  const hero = $('.hero');
  hero?.addEventListener('pointermove', event => {
    if (!effectsEnabled || event.pointerType === 'touch') return;
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty('--hero-x', ((event.clientX - rect.left) / rect.width - .5) * 14 + 'px');
    hero.style.setProperty('--hero-y', ((event.clientY - rect.top) / rect.height - .5) * 10 + 'px');
  });
  hero?.addEventListener('pointerleave', () => { hero.style.setProperty('--hero-x', '0px'); hero.style.setProperty('--hero-y', '0px'); });
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-active');
        $$('[data-section-link]').forEach(link => {
          const active = link.dataset.sectionLink === entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-25% 0px -55% 0px', threshold: 0 });
    $$('.scene').forEach(section => observer.observe(section));
  }

  const dialog = $('#projectDialog'), lock = L.createScrollLock(window);
  let trigger = null;
  function closeDialog() { if (dialog?.open) dialog.close(); }
  if (dialog && typeof dialog.showModal === 'function') {
    $$('[data-project]').forEach(link => link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const template = $('#case-' + link.dataset.project);
      if (!template) return;
      trigger = link;
      $('#dialogTitle').textContent = template.dataset.title;
      $('#dialogContent').replaceChildren(template.content.cloneNode(true));
      $('#casePermalink').href = link.getAttribute('href');
      $('#casePermalink').hidden = link.getAttribute('href').startsWith('#');
      $$('[data-demo]', dialog).forEach(initDemo);
      initApplications(dialog);
      lock.lock();
      try { dialog.showModal(); } catch (_) { lock.unlock(); return; }
      event.preventDefault();
      $('.dialog-scroll', dialog).scrollTop = 0;
      $('#dialogClose').focus({ preventScroll: true });
    }));
    $('#dialogClose').addEventListener('click', closeDialog);
    $('[data-close-dialog]', dialog).addEventListener('click', closeDialog);
    // Native dialog provides focus containment, Escape/cancel and an inert background.
    dialog.addEventListener('close', () => {
      lock.unlock(); trigger?.focus({ preventScroll: true }); dialog.classList.remove('app-expanded');
      // Release embedded apps and any session-only draft when the viewer closes.
      $('#dialogContent').replaceChildren(); updateProgress();
    });
    // Close only if both press and release happen on the backdrop itself.
    let backdropPress = false;
    function outside(event) {
      const rect = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    }
    dialog.addEventListener('pointerdown', event => { backdropPress = outside(event); });
    dialog.addEventListener('pointerup', event => { if (backdropPress && outside(event)) closeDialog(); backdropPress = false; });
    window.addEventListener('pagehide', () => { if (dialog.open) dialog.close(); lock.unlock(); });
  }
  $('#copyEmail')?.addEventListener('click', async () => {
    const email = 'elkadiassimkhalid@gmail.com', status = $('#copyStatus');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      status.textContent = 'Correo copiado.'; $('#copyEmail').textContent = 'Correo copiado ✓';
      setTimeout(() => { $('#copyEmail').textContent = 'Copiar correo ⧉'; }, 2500);
    } catch (_) {
      status.classList.remove('sr-only');
      status.textContent = 'No se pudo copiar automáticamente. Selecciona el correo visible o pulsa sobre él para abrir tu aplicación de correo.';
    }
  });
  // Deep links in the standalone review file retain a readable fallback.
  function openTargetCase() {
    const id = window.location.hash.slice(1);
    if (!id.startsWith('caso-')) return;
    const details = document.getElementById(id);
    if (details?.tagName === 'DETAILS') details.open = true;
  }
  window.addEventListener('hashchange', openTargetCase); openTargetCase();
})();
