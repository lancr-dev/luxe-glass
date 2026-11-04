(() => {
  'use strict';

  const root = document.documentElement;
  const mobileViewport = window.matchMedia('(max-width: 62rem)');

  function initializeNavigation() {
    const header = document.querySelector('[data-header]');
    const menuButton = document.querySelector('[data-menu-toggle]');
    const navigation = document.querySelector('[data-navigation]');

    if (!header || !menuButton || !navigation) return;

    const links = [...navigation.querySelectorAll('a[href^="#"]')];
    const sidebar = document.querySelector('[data-mobile-menu]');
    const sidebarNavigation = document.querySelector(
      '[data-sidebar-navigation]',
    );
    const closeButton = document.querySelector('[data-menu-close]');
    const navigationHome = navigation.parentElement;
    const supportsSidebar = Boolean(
      sidebar &&
      sidebarNavigation &&
      closeButton &&
      typeof sidebar.showModal === 'function',
    );

    function synchronizeMenuState() {
      const open = Boolean(sidebar?.open);
      menuButton.setAttribute('aria-expanded', String(open));
      root.classList.toggle('menu-open', open);
    }

    function closeMenu(restoreFocus = true) {
      if (!sidebar?.open) return;

      sidebar.close();
      synchronizeMenuState();

      if (restoreFocus && mobileViewport.matches) {
        menuButton.focus({ preventScroll: true });
      }
    }

    function synchronizeViewport() {
      const focusInNavigation = navigation.contains(document.activeElement);
      const focusInSidebar = sidebar?.contains(document.activeElement);
      const focusOnMenu = document.activeElement === menuButton;
      closeMenu(false);

      if (mobileViewport.matches && supportsSidebar) {
        menuButton.hidden = false;
        sidebarNavigation.append(navigation);

        if (focusInNavigation || focusInSidebar) {
          menuButton.focus({ preventScroll: true });
        }
      } else {
        // Keep one set of links, including a usable inline fallback without dialog support.
        navigationHome.append(navigation);

        if (focusInSidebar || focusOnMenu) {
          links[0]?.focus({ preventScroll: true });
        }

        menuButton.hidden = true;
      }

      updateHeader();
    }

    menuButton.addEventListener('click', () => {
      if (!mobileViewport.matches || !supportsSidebar) return;

      sidebar.showModal();
      synchronizeMenuState();
    });

    if (supportsSidebar) {
      closeButton.addEventListener('click', () => closeMenu());
      sidebar.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeMenu();
      });
      sidebar.addEventListener('close', synchronizeMenuState);
      sidebar.addEventListener('click', (event) => {
        if (event.target !== sidebar) return;

        const bounds = sidebar.getBoundingClientRect();
        const outside =
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom;

        if (outside) closeMenu();
      });
    }

    navigation.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');

      if (
        !link ||
        !sidebar?.open ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;

      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;

      // Release the modal before focusing the section; native anchors handle history and scrolling.
      closeMenu(false);
      const addedTabIndex = !target.hasAttribute('tabindex');
      if (addedTabIndex) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (addedTabIndex) {
        target.addEventListener(
          'blur',
          () => target.removeAttribute('tabindex'),
          { once: true },
        );
      }
    });

    function updateHeader() {
      header.dataset.scrolled = String(window.scrollY > 16);
      // The same sticky header clearance applies on desktop and mobile.
      root.style.scrollPaddingBlockStart = `${header.offsetHeight + 24}px`;
    }

    let scrollFrame = null;

    window.addEventListener(
      'scroll',
      () => {
        if (scrollFrame !== null) return;

        scrollFrame = window.requestAnimationFrame(() => {
          scrollFrame = null;

          const scrolled = String(window.scrollY > 16);

          if (header.dataset.scrolled !== scrolled) {
            header.dataset.scrolled = scrolled;
          }
        });
      },
      { passive: true },
    );

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(updateHeader);
      observer.observe(header);
    } else {
      window.addEventListener('resize', updateHeader);
    }

    mobileViewport.addEventListener('change', synchronizeViewport);
    window.addEventListener('pageshow', synchronizeViewport);

    synchronizeViewport();

    function markCurrentSection(id) {
      for (const link of links) {
        if (link.hash === `#${id}`) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      }
    }

    if ('IntersectionObserver' in window) {
      const sections = [...document.querySelectorAll('main > section[id]')];

      const intersecting = new Set();
      let observer;
      let observedHeight = 0;

      function updateCurrentSection(entries) {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersecting.add(entry.target);
          } else {
            intersecting.delete(entry.target);
          }
        }

        const current = [...sections]
          .reverse()
          .find((section) => intersecting.has(section));

        // Sections without a primary-nav link clear the marker.
        markCurrentSection(current?.id ?? '');
      }

      function observeReadingPosition() {
        if (observedHeight === window.innerHeight) return;

        observedHeight = window.innerHeight;
        observer?.disconnect();
        intersecting.clear();

        // Pixel margins avoid width-relative percentage margins collapsing
        // the reading band on wide, short viewports.
        const top = Math.round(observedHeight * 0.2);
        const bottom = Math.max(0, observedHeight - top - 1);

        observer = new IntersectionObserver(updateCurrentSection, {
          rootMargin: `-${top}px 0px -${bottom}px 0px`,
          threshold: 0,
        });

        sections.forEach((section) => observer.observe(section));
      }

      window.addEventListener('resize', observeReadingPosition);
      observeReadingPosition();
    } else {
      const markHash = () => {
        markCurrentSection(window.location.hash.slice(1) || 'home');
      };

      window.addEventListener('hashchange', markHash);
      markHash();
    }
  }

  function initializeMaterialStudio() {
    const form = document.querySelector('[data-studio-form]');
    const controls = document.querySelector('[data-studio-controls]');
    const preview = document.querySelector('[data-preview]');
    const toggle = document.querySelector('[data-transparency-toggle]');
    const blur = document.getElementById('glass-blur');
    const opacity = document.getElementById('glass-opacity');
    const blurOutput = document.getElementById('blur-value');
    const opacityOutput = document.getElementById('opacity-value');
    const sceneLabel = document.querySelector('[data-scene-label]');
    const comparison = document.querySelector('[data-solid-preview]');
    const status = document.querySelector('[data-studio-status]');

    const preferenceNotice = document.querySelector(
      '[data-transparency-notice]',
    );

    const fallbackNotice = document.querySelector('[data-blur-notice]');

    const requiredElements = [
      form,
      controls,
      preview,
      toggle,
      blur,
      opacity,
      blurOutput,
      opacityOutput,
      comparison,
      status,
      preferenceNotice,
      fallbackNotice,
    ];

    if (!requiredElements.every(Boolean)) return;

    const preferenceKey = 'lance-liquid-glass:surface';

    const sceneNames = new Map([
      ['nebula', 'Nebula'],
      ['aurora', 'Aurora'],
      ['eclipse', 'Eclipse'],
    ]);

    const systemPreferences = [
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
      window.matchMedia('(prefers-contrast: more)'),
      window.matchMedia('(forced-colors: active)'),
    ];

    const supportsBlur = Boolean(
      window.CSS?.supports &&
      (window.CSS.supports('backdrop-filter', 'blur(1px)') ||
        window.CSS.supports('-webkit-backdrop-filter', 'blur(1px)')),
    );

    function readPreference() {
      try {
        return window.localStorage.getItem(preferenceKey) === 'solid';
      } catch {
        // Blocked storage does not prevent an in-memory preference.
        return false;
      }
    }

    let userPrefersSolid = readPreference();

    function boundedValue(input, minimum, maximum, fallback) {
      const number = input.valueAsNumber;

      return Number.isFinite(number)
        ? Math.min(maximum, Math.max(minimum, number))
        : fallback;
    }

    function render(announce = false) {
      const systemPrefersSolid = systemPreferences.some(
        (query) => query.matches,
      );

      const forcedSolid = systemPrefersSolid || !supportsBlur;
      const globalSolid = userPrefersSolid || forcedSolid;
      const previewSolid = globalSolid || comparison.checked;

      const selected = form.querySelector('input[name="scene"]:checked');

      const scene = sceneNames.has(selected?.value) ? selected.value : 'nebula';

      const blurValue = boundedValue(blur, 0, 32, 18);
      const opacityValue = boundedValue(opacity, 35, 95, 58);

      root.dataset.transparency = globalSolid ? 'solid' : 'glass';
      toggle.setAttribute('aria-pressed', String(globalSolid));
      toggle.disabled = forcedSolid;

      toggle.textContent = systemPrefersSolid
        ? 'Solid surfaces (system preference)'
        : !supportsBlur
          ? 'Solid surfaces (browser fallback)'
          : 'Solid surfaces';

      preview.dataset.scene = scene;
      preview.dataset.surface = previewSolid ? 'solid' : 'glass';

      if (sceneLabel) {
        sceneLabel.textContent = sceneNames.get(scene).toUpperCase();
      }

      preview.style.setProperty('--preview-blur', `${blurValue}px`);
      preview.style.setProperty(
        '--preview-opacity',
        String(opacityValue / 100),
      );

      blurOutput.value = `${blurValue} px`;
      opacityOutput.value = `${opacityValue}%`;

      blur.setAttribute('aria-valuetext', `${blurValue} pixels`);
      opacity.setAttribute('aria-valuetext', `${opacityValue} percent`);

      blur.style.setProperty(
        '--range-progress',
        `${((blurValue / 32) * 100).toFixed(1)}%`,
      );
      opacity.style.setProperty(
        '--range-progress',
        `${(((opacityValue - 35) / 60) * 100).toFixed(1)}%`,
      );

      blur.disabled = previewSolid;
      opacity.disabled = previewSolid;
      comparison.disabled = globalSolid;

      preferenceNotice.hidden =
        !supportsBlur || !(systemPrefersSolid || userPrefersSolid);

      fallbackNotice.hidden = supportsBlur;

      const summary = `${sceneNames.get(scene)} backdrop. ${
        previewSolid
          ? 'Solid surface.'
          : `Glass surface, ${blurValue} pixels of diffusion, ${opacityValue}% surface opacity.`
      }`;

      if (announce) {
        status.textContent = summary;
      }

      return summary;
    }

    // Native range values provide spoken feedback without a second
    // live announcement for every small slider movement.
    blurOutput.setAttribute('aria-live', 'off');
    opacityOutput.setAttribute('aria-live', 'off');

    form.addEventListener('input', () => render());
    form.addEventListener('change', () => render(true));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });

    form.addEventListener('reset', (event) => {
      // Native reset restores values after the reset event completes.
      window.setTimeout(() => {
        if (!event.defaultPrevented) {
          status.textContent = `Preview reset. ${render()}`;
        }
      }, 0);
    });

    toggle.addEventListener('click', () => {
      userPrefersSolid = !userPrefersSolid;

      const summary = render();

      try {
        window.localStorage.setItem(
          preferenceKey,
          userPrefersSolid ? 'solid' : 'glass',
        );

        status.textContent = `${
          userPrefersSolid
            ? 'Solid surfaces enabled.'
            : 'Glass surfaces enabled.'
        } ${summary}`;
      } catch {
        status.textContent = `Preference applied for this visit; your browser could not save it. ${summary}`;
      }
    });

    systemPreferences.forEach((query) => {
      query.addEventListener('change', () => render(true));
    });

    window.addEventListener('storage', (event) => {
      if (event.key !== preferenceKey && event.key !== null) return;

      userPrefersSolid = readPreference();
      render(true);
    });

    window.addEventListener('pageshow', () => render());

    // Reveal controls only after their handlers and initial state are ready.
    render();
    controls.disabled = false;
    toggle.hidden = false;
  }

  function initializeBriefCopy() {
    const button = document.querySelector('[data-copy-brief]');
    const brief = document.getElementById('project-brief');
    const status = document.querySelector('[data-copy-status]');

    if (!button || !brief || !status) return;

    function selectForManualCopy() {
      brief.focus();
      brief.select();
      brief.setSelectionRange(0, brief.value.length);

      status.textContent =
        "Automatic copy is unavailable. Your brief is selected: press Ctrl+C, Command+C, or use your device's Copy command.";
    }

    brief.addEventListener('input', () => {
      status.textContent = '';
    });

    button.addEventListener('click', async () => {
      if (button.disabled) return;

      const text = brief.value;

      if (!text.trim()) {
        status.textContent = 'Write a project brief before copying it.';
        brief.focus();
        return;
      }

      if (!window.isSecureContext || !navigator.clipboard?.writeText) {
        selectForManualCopy();
        return;
      }

      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'Copying…';
      status.textContent = '';

      try {
        await navigator.clipboard.writeText(text);

        status.textContent =
          brief.value === text
            ? 'Project brief copied. Paste it into your conversation with Lance.'
            : 'The earlier version was copied. Copy again to include your latest changes.';
      } catch {
        selectForManualCopy();
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = 'Copy project brief';
      }
    });

    button.hidden = false;
  }

  function initializeMotion() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const revealItems = [...document.querySelectorAll('[data-reveal]')];

    // Stagger elements inside a group, but leave manual delays alone.
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      const items = [...group.querySelectorAll('[data-reveal]')];

      items.forEach((item, index) => {
        if (item.hasAttribute('data-reveal-delay')) return;

        item.style.setProperty(
          '--reveal-delay',
          `${Math.min(index, 8) * 70}ms`,
        );
      });
    });

    document.querySelectorAll('[data-reveal-delay]').forEach((item) => {
      const delay = Number.parseInt(item.dataset.revealDelay, 10);

      if (Number.isFinite(delay)) {
        item.style.setProperty('--reveal-delay', `${delay}ms`);
      }
    });

    root.classList.add('is-reveal-ready');

    function revealAll() {
      revealItems.forEach((item) => item.classList.add('is-revealed'));
    }

    let revealObserver = null;

    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      revealAll();
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add('is-revealed');
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );

      revealItems.forEach((item) => revealObserver.observe(item));
    }

    // Reading progress and a very light parallax on the orbital study.
    const progress = document.querySelector('[data-scroll-progress]');
    const heroScene = document.querySelector('.orbital-scene');
    let scrollFrame = null;

    function renderScroll() {
      scrollFrame = null;

      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const value =
        maxScroll > 0
          ? Math.min(1, Math.max(0, window.scrollY / maxScroll))
          : 0;

      if (progress) {
        progress.style.transform = `scaleX(${value.toFixed(3)})`;
      }

      // Never leave a reveal waiting below the last scrollable pixel.
      if (value >= 0.9999) {
        revealAll();
      }

      if (heroScene && !reduceMotion.matches) {
        const drift = Math.min(36, Math.max(0, window.scrollY) * 0.045);
        heroScene.style.setProperty('--hero-drift', drift.toFixed(2));
      }
    }

    function requestScrollRender() {
      if (scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(renderScroll);
    }

    renderScroll();
    window.addEventListener('scroll', requestScrollRender, { passive: true });
    window.addEventListener('resize', requestScrollRender);

    // Specular highlight that follows the pointer across glass.
    document.querySelectorAll('[data-glint]').forEach((element) => {
      element.addEventListener(
        'pointermove',
        (event) => {
          if (!finePointer.matches || reduceMotion.matches) return;

          const bounds = element.getBoundingClientRect();

          if (!bounds.width || !bounds.height) return;

          const x = ((event.clientX - bounds.left) / bounds.width) * 100;
          const y = ((event.clientY - bounds.top) / bounds.height) * 100;

          element.style.setProperty('--glint-x', `${x.toFixed(2)}%`);
          element.style.setProperty('--glint-y', `${y.toFixed(2)}%`);
        },
        { passive: true },
      );
    });

    // Independent layer drift inside the hero and studio scenes.
    document.querySelectorAll('[data-tilt-scene]').forEach((scene) => {
      let frame = null;
      let pointerX = 0;
      let pointerY = 0;

      function resetScene() {
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
          frame = null;
        }

        scene.style.setProperty('--scene-x', '0');
        scene.style.setProperty('--scene-y', '0');
      }

      scene.addEventListener(
        'pointermove',
        (event) => {
          if (!finePointer.matches || reduceMotion.matches) return;

          pointerX = event.clientX;
          pointerY = event.clientY;

          if (frame !== null) return;

          frame = window.requestAnimationFrame(() => {
            frame = null;
            const bounds = scene.getBoundingClientRect();

            if (!bounds.width || !bounds.height) return;

            scene.style.setProperty(
              '--scene-x',
              ((pointerX - bounds.left) / bounds.width - 0.5).toFixed(3),
            );
            scene.style.setProperty(
              '--scene-y',
              ((pointerY - bounds.top) / bounds.height - 0.5).toFixed(3),
            );
          });
        },
        { passive: true },
      );

      scene.addEventListener('pointerleave', resetScene);
      scene.addEventListener('pointercancel', resetScene);
    });

    // A low, slow ambient light that follows the pointer.
    const ambient = document.querySelector('[data-ambient-light]');

    if (ambient) {
      let targetX = window.innerWidth * 0.74;
      let targetY = window.innerHeight * 0.12;
      let lightX = targetX;
      let lightY = targetY;
      let lightFrame = null;

      function moveLight() {
        lightFrame = null;

        if (reduceMotion.matches) return;

        lightX += (targetX - lightX) * 0.12;
        lightY += (targetY - lightY) * 0.12;

        ambient.style.setProperty('--ambient-x', `${lightX.toFixed(1)}px`);
        ambient.style.setProperty('--ambient-y', `${lightY.toFixed(1)}px`);

        if (Math.abs(targetX - lightX) + Math.abs(targetY - lightY) > 0.5) {
          lightFrame = window.requestAnimationFrame(moveLight);
        }
      }

      ambient.style.setProperty('--ambient-x', `${lightX}px`);
      ambient.style.setProperty('--ambient-y', `${lightY}px`);

      window.addEventListener(
        'pointermove',
        (event) => {
          if (!finePointer.matches || reduceMotion.matches) return;

          targetX = event.clientX;
          targetY = event.clientY;

          if (lightFrame === null) {
            lightFrame = window.requestAnimationFrame(moveLight);
          }
        },
        { passive: true },
      );
    }

    reduceMotion.addEventListener('change', (event) => {
      if (!event.matches) return;

      revealObserver?.disconnect();
      revealAll();
      heroScene?.style.setProperty('--hero-drift', '0');
    });
  }

  // Apply surface preferences before initializing the remaining interactions.
  initializeMaterialStudio();
  initializeNavigation();
  initializeBriefCopy();
  initializeMotion();
})();
