// Every <input list="…"> becomes a styled combobox: the <datalist> stays the source of the options, but they open in a daisyUI
// menu instead of the browser's native list, which CSS can't style. Typing filters; ↑ ↓ Enter Escape and the mouse pick.
(() => {
  let open = null; // { input, menu, items, active }

  function close() {
    if (!open) return;
    open.menu.remove();
    open.input.setAttribute('aria-expanded', 'false');
    open.input.removeAttribute('aria-activedescendant');
    open = null;
  }

  function highlight(index) {
    open.items.forEach((item, i) =>
      item.classList.toggle('menu-active', i === index),
    );
    open.active = index;
    const item = open.items[index];
    if (item) {
      open.input.setAttribute('aria-activedescendant', item.id);
      item.scrollIntoView({ block: 'nearest' });
    }
  }

  function pick(input, value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  }

  function show(input) {
    close();
    const query = input.value.trim().toLowerCase();
    const values = [...document.getElementById(input.dataset.combobox).options]
      .map((option) => option.value)
      .filter((value) => value.toLowerCase().includes(query));
    if (!values.length) return;
    const menu = document.createElement('ul');
    menu.id = `${input.dataset.combobox}-menu`;
    menu.className =
      'menu dropdown-content bg-base-100 rounded-box shadow-lg z-50';
    menu.setAttribute('role', 'listbox');
    const box = input.getBoundingClientRect();
    Object.assign(menu.style, {
      position: 'fixed',
      left: `${box.left}px`,
      top: `${box.bottom + 4}px`,
      width: `${box.width}px`,
      maxHeight: `${Math.max(120, window.innerHeight - box.bottom - 16)}px`,
      overflowY: 'auto',
      flexWrap: 'nowrap',
    });
    const items = values.map((value, i) => {
      const li = document.createElement('li');
      const option = document.createElement('a');
      option.id = `${menu.id}-${i}`;
      option.setAttribute('role', 'option');
      option.textContent = value;
      option.className = 'capitalize';
      option.addEventListener('mousedown', (event) => event.preventDefault()); // keep the focus in the input
      option.addEventListener('click', () => pick(input, value));
      li.append(option);
      menu.append(li);
      return option;
    });
    document.body.append(menu);
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', menu.id);
    open = { input, menu, items, active: -1 };
  }

  function upgrade(input) {
    if (
      input.dataset.combobox ||
      !document.getElementById(input.getAttribute('list'))
    )
      return;
    input.dataset.combobox = input.getAttribute('list');
    input.removeAttribute('list'); // no native list on top of ours
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.addEventListener('focus', () => show(input));
    input.addEventListener('input', (event) => event.isTrusted && show(input));
    input.addEventListener('blur', close);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' && !open) return show(input);
      if (!open) return;
      const last = open.items.length - 1;
      if (event.key === 'ArrowDown')
        highlight(open.active >= last ? 0 : open.active + 1);
      else if (event.key === 'ArrowUp')
        highlight(open.active <= 0 ? last : open.active - 1);
      else if (event.key === 'Enter' && open.active >= 0)
        pick(input, open.items[open.active].textContent);
      else if (event.key === 'Escape') close();
      else return;
      event.preventDefault();
    });
  }

  const upgradeAll = () =>
    document.querySelectorAll('input[list]').forEach(upgrade);
  document.addEventListener('DOMContentLoaded', upgradeAll);
  document.addEventListener('htmx:load', upgradeAll); // hx-boost swaps and fragments
  window.addEventListener('resize', close);
  document.addEventListener(
    'scroll',
    (event) => open && event.target !== open.menu && close(),
    true,
  ); // the page moved under it
})();
