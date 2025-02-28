const TABBABLE_ELs = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], button:not([disabled]), [tabindex="0"], audio[controls], video[controls], [contenteditable]:not([contenteditable="false"])';

export function useFocusTrap(el: MaybeRef<HTMLElement | null | undefined>) {
  if (import.meta.server)
    return;

  let lastFocusedEl: HTMLElement | undefined;
  let off: (() => any) | undefined;
  let observer: MutationObserver | undefined;
  let cachedEls: Array<HTMLElement> = [];
  let scheduled: boolean = true;

  function stop() {
    off && off();
    observer && observer.disconnect();

    off = undefined;
    observer = undefined;
    cachedEls.length = 0;
    scheduled = true;
  }

  function focusLastElement() {
    lastFocusedEl && lastFocusedEl.focus();
    lastFocusedEl = undefined;
  }

  function getFocusableEls(el: HTMLElement) {
    if (scheduled) {
      scheduled = false;
      cachedEls = Array.from(
        el.querySelectorAll(TABBABLE_ELs) as NodeListOf<HTMLElement>,
      ).filter((el) => !isElementHidden(el));
    }

    return cachedEls;
  }

  watch(() => unref(el), (el) => {
    stop();

    if (!el)
      return focusLastElement();

    if (document.activeElement)
      lastFocusedEl = document.activeElement as HTMLElement;

    getFocusableEls(el)[0].focus();

    observer = new MutationObserver(
      debounce(() => {
        scheduled = true;
      }, 100),
    );

    observer.observe(el, {
      childList: true,
    });

    off = on(el, 'keydown', (e) => {
      if (e.key !== 'Tab') return;

      const focusableEls = getFocusableEls(el);
      const firstFocusableEl = focusableEls.at(0);
      const lastFocusedEl = focusableEls.at(-1);

      if (e.shiftKey && e.target === firstFocusableEl) {
        lastFocusedEl?.focus();
        e.preventDefault();
      }
      else if (!e.shiftKey && e.target === lastFocusedEl) {
        firstFocusableEl?.focus();
        e.preventDefault();
      }
    });
  });

  onScopeDispose(() => {
    stop();
    focusLastElement();
  });

  return stop;
}

function isElementHidden(node: HTMLElement) {
  return node.offsetParent === null || getComputedStyle(node).visibility === 'hidden';
}
