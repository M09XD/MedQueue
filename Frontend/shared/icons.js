// Icons are provided by the Lucide standalone script (see index.html),
// which turns any <i data-lucide="name"></i> into an inline SVG when we
// call refreshIcons(). This keeps icon markup as plain, readable HTML.

export function icon(name, sizeClass = "ic-base", extraClass = "") {
  return `<i data-lucide="${name}" class="${sizeClass} ${extraClass}"></i>`;
}

// Call this after any innerHTML update that added new [data-lucide] tags.
export function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}
