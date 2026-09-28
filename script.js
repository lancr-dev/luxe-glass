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
    let menuOpen = false;

    function setMenuOpen(open, restoreFocus = false) {
      menuOpen = mobileViewport.matches && open;
      menuButton.setAttribute('aria-expanded', String(menuOpen));

      if (restoreFocus && mobileViewport.matches) {
        menuButton.focus();
      }

      navigation.hidden = mobileViewport.matches && !menuOpen;
    }

    function synchronizeViewport() {
      if (mobileViewport.matches) {
        menuButton.hidden = false;
        setMenuOpen(false, navigation.contains(document.activeElement));
      } else {
        setMenuOpen(false);

        if (document.activeElement === menuButton) {
          links[0]?.focus();
        }

        menuButton.hidden = true;
      }

      updateHeader();
    }

    menuButton.addEventListener('click', () => {
      setMenuOpen(!menuOpen);
    });

    header.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !menuOpen) return;

      event.preventDefault();
      setMenuOpen(false, true);
    });

    document.addEventListener('click', (event) => {
      if (!menuOpen || header.contains(event.target)) return;

      setMenuOpen(false, navigation.contains(document.activeElement));
    });

    header.addEventListener('focusout', (event) => {
      if (
        menuOpen &&
        event.relatedTarget &&
        !header.contains(event.relatedTarget)
      ) {
        setMenuOpen(false);
      }
    });

    navigation.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');

      if (
        !link ||
        !menuOpen ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = document.getElementById(link.hash.slice(1));

      if (!target) return;

      // Move keyboard focus out of the closing menu.
      // Native anchor navigation handles scrolling, history, and the URL.
      const addedTabIndex = !target.hasAttribute('tabindex');

      if (addedTabIndex) {
        target.setAttribute('tabindex', '-1');
      }

      target.focus({ preventScroll: true });

      if (addedTabIndex) {
        target.addEventListener(
          'blur',
          () => target.removeAttribute('tabindex'),
          { once: true },
        );
      }

      setMenuOpen(false);
    });

    function updateHeader() {
      const scrolled = String(window.scrollY > 16);

      if (header.dataset.scrolled !== scrolled) {
        header.dataset.scrolled = scrolled;
      }

      // Keep anchored sections clear of the desktop header.
      const clearance = mobileViewport.matches ? 24 : header.offsetHeight + 24;

      root.style.scrollPaddingBlockStart = `${clearance}px`;
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

  // Apply surface preferences before initializing the remaining interactions.
  initializeMaterialStudio();
  initializeNavigation();
  initializeBriefCopy();
})();
