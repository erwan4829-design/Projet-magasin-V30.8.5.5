const applyGlobalText = () => {
  const elements = document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, label, div');
  elements.forEach(el => {
    el.style.setProperty('line-height', '1.6');
    el.style.setProperty('font-family', 'system-ui, sans-serif');
    el.style.setProperty('word-break', 'break-word');
  });
};
window.addEventListener('DOMContentLoaded', applyGlobalText);
