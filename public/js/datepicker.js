// Every <input type="date"> gets a calendar of the app instead of the browser's own picker, which CSS can't style. The real input
// stays in the form, hidden, with its YYYY-MM-DD value, so forms submit unchanged; a button in its place shows the date in the
// page's language and opens a daisyUI pop-over: a month grid, ‹ ›, Today and Clear. Keys: arrows, PageUp / PageDown (Shift: a
// year), Home / End, Enter, Escape. min / max are honoured. Without JS the native field stays.
(function () {
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (value) =>
    /^\d{4}-\d\d-\d\d$/.test(value || '')
      ? new Date(`${value}T12:00:00`)
      : null;
  const addDays = (d, n) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  // the same day n months on, kept inside the target month (31 Jan + 1 month = 28/29 Feb)
  function addMonths(d, n) {
    const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
    return new Date(
      d.getFullYear(),
      d.getMonth() + n,
      Math.min(d.getDate(), last),
      12,
    );
  }
  const clamp = (d, min, max) =>
    min && d < min ? min : max && d > max ? max : d;
  // the weeks shown for a month: 7 dates each, from the locale's first weekday (0 = Sunday … 6 = Saturday)
  function monthGrid(year, month, firstDay) {
    const first = new Date(year, month, 1, 12);
    let day = addDays(first, -((first.getDay() - firstDay + 7) % 7));
    const weeks = [];
    while (weeks.length === 0 || day.getMonth() === month) {
      const week = [];
      for (let i = 0; i < 7; i++, day = addDays(day, 1)) week.push(day);
      weeks.push(week);
    }
    return weeks;
  }
  // the locale's first weekday (Intl.Locale week info: 1 = Monday … 7 = Sunday); the browser's region refines the page's language
  function firstWeekday(lang) {
    try {
      const tag =
        (navigator.languages || []).find((l) =>
          l.toLowerCase().startsWith(lang.toLowerCase()),
        ) || lang;
      const locale = new Intl.Locale(tag.split('@')[0]); // a POSIX tag (en-US@posix) is not a BCP 47 one
      const info = locale.getWeekInfo ? locale.getWeekInfo() : locale.weekInfo;
      return info ? info.firstDay % 7 : 1;
    } catch {
      return 1;
    }
  }

  if (typeof module !== 'undefined')
    module.exports = {
      iso,
      parse,
      addDays,
      addMonths,
      clamp,
      monthGrid,
      firstWeekday,
    };
  if (typeof document === 'undefined') return;

  const VALUE = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  );
  let open = null; // { input, panel, view (a date in the month shown), focus (the day with the keyboard focus) }

  function strings() {
    const lang = document.documentElement.lang || 'en';
    const s = document.getElementById('datepicker-strings')?.dataset || {};
    const today = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(
      0,
      'day',
    );
    return {
      lang,
      today: today.charAt(0).toUpperCase() + today.slice(1),
      ...s,
    };
  }

  function label(input) {
    const d = parse(input.value);
    const { lang, noDate } = strings();
    if (!d) return noDate || '—';
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    if (d.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
    return new Intl.DateTimeFormat(lang, options).format(d);
  }

  function sync(input) {
    input._datepicker.textContent = label(input);
    input._datepicker.toggleAttribute('data-empty', !input.value);
    input._datepicker.disabled = input.disabled;
  }

  function close(refocus) {
    if (!open) return;
    const { input, panel } = open;
    panel.remove();
    input.closest('.dropdown')?.classList.remove('dropdown-open');
    input._datepicker.setAttribute('aria-expanded', 'false');
    open = null;
    if (refocus) input._datepicker.focus();
  }

  function pick(input, value) {
    input.value = value; // the setter below redraws the button
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    close(true);
  }

  function draw() {
    const { input, panel, view, focus } = open;
    const t = strings();
    const min = parse(input.min);
    const max = parse(input.max);
    const selected = input.value;
    const today = iso(new Date());
    const first = firstWeekday(t.lang);
    const weeks = monthGrid(view.getFullYear(), view.getMonth(), first);
    const long = new Intl.DateTimeFormat(t.lang, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const outside = (d) => (min && d < min) || (max && d > max);
    const title = new Intl.DateTimeFormat(t.lang, {
      month: 'long',
      year: 'numeric',
    }).format(view);
    const prevOff =
      min && new Date(view.getFullYear(), view.getMonth(), 0, 12) < min;
    const nextOff =
      max && new Date(view.getFullYear(), view.getMonth() + 1, 1, 12) > max;

    const head = document.createElement('div');
    head.className =
      'datepicker-head flex items-center justify-between gap-1 mb-2';
    head.innerHTML =
      `<button type="button" class="btn btn-ghost btn-sm btn-square" data-month="-1"${prevOff ? ' disabled' : ''}>‹</button>` +
      '<span class="datepicker-title font-semibold capitalize" aria-live="polite"></span>' +
      `<button type="button" class="btn btn-ghost btn-sm btn-square" data-month="1"${nextOff ? ' disabled' : ''}>›</button>`;
    head.children[0].setAttribute('aria-label', t.prev || '‹');
    head.children[1].textContent = title;
    head.children[2].setAttribute('aria-label', t.next || '›');

    const table = document.createElement('table');
    table.className = 'datepicker-grid w-full text-center';
    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', title);
    const narrow = new Intl.DateTimeFormat(t.lang, { weekday: 'narrow' });
    const wide = new Intl.DateTimeFormat(t.lang, { weekday: 'long' });
    const headRow = weeks[0]
      .map(
        (d) =>
          `<th scope="col" class="text-xs font-semibold" abbr="${wide.format(d)}">${narrow.format(d)}</th>`,
      )
      .join('');
    table.innerHTML = `<thead><tr>${headRow}</tr></thead><tbody></tbody>`;
    for (const week of weeks) {
      const row = table.tBodies[0].insertRow();
      for (const d of week) {
        const cell = row.insertCell();
        const value = iso(d);
        cell.setAttribute('role', 'gridcell');
        if (d.getMonth() !== view.getMonth()) continue; // the neighbouring months' days stay blank
        cell.setAttribute('aria-selected', String(value === selected));
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.date = value;
        b.textContent = String(d.getDate());
        b.setAttribute('aria-label', long.format(d));
        b.tabIndex = value === iso(focus) ? 0 : -1;
        b.className = `btn btn-sm btn-square ${value === selected ? 'btn-primary' : value === today ? 'btn-outline' : 'btn-ghost'}`;
        if (value === today) b.setAttribute('aria-current', 'date');
        if (outside(d)) b.disabled = true;
        cell.append(b);
      }
    }

    const foot = document.createElement('div');
    foot.className =
      'datepicker-foot flex items-center justify-between gap-1 mt-2';
    const todayOff = outside(parse(today));
    foot.innerHTML =
      `<button type="button" class="btn btn-ghost btn-sm" data-date="${today}"${todayOff ? ' disabled' : ''}></button>` +
      (input.required
        ? ''
        : '<button type="button" class="btn btn-ghost btn-sm" data-date=""></button>');
    foot.children[0].textContent = t.today;
    if (foot.children[1]) foot.children[1].textContent = t.clear || '×';

    const hadFocus = panel.contains(document.activeElement);
    panel.replaceChildren(head, table, foot);
    if (hadFocus || !panel.dataset.drawn)
      table.querySelector('button[tabindex="0"]')?.focus();
    panel.dataset.drawn = '1';
  }

  function place(panel, field) {
    const box = field.getBoundingClientRect();
    const width = Math.min(328, window.innerWidth - 16);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - width - 8))}px`;
    const below = window.innerHeight - box.bottom;
    const height = panel.offsetHeight;
    panel.style.top = `${below >= height + 8 || below > box.top ? box.bottom + 4 : Math.max(8, box.top - height - 4)}px`;
  }

  function show(input) {
    close();
    const min = parse(input.min);
    const max = parse(input.max);
    const start = clamp(parse(input.value) || new Date(), min, max);
    const panel = document.createElement('div');
    panel.className = 'datepicker card bg-base-100 shadow-lg z-50 p-3';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', strings().choose || 'Calendar');
    panel.style.position = 'fixed';
    open = { input, panel, view: start, focus: start };
    (input.closest('dialog') || document.body).append(panel); // inside a modal, or the modal's top layer would cover it
    input.closest('.dropdown')?.classList.add('dropdown-open'); // a daisyUI dropdown holding the field stays open meanwhile
    draw();
    place(panel, input._datepicker);
    input._datepicker.setAttribute('aria-expanded', 'true');

    panel.addEventListener('click', (event) => {
      const month = event.target.closest('[data-month]');
      const day = event.target.closest('[data-date]');
      if (month) {
        open.view = addMonths(open.view, Number(month.dataset.month));
        open.focus = clamp(
          addMonths(open.focus, Number(month.dataset.month)),
          min,
          max,
        );
        draw();
      } else if (day && !day.disabled) pick(input, day.dataset.date);
    });
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') return (event.preventDefault(), close(true));
      if (!event.target.closest('.datepicker-grid')) return;
      const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      const f = open.focus;
      let next = null;
      if (event.key in moves) next = addDays(f, moves[event.key]);
      else if (event.key === 'PageUp' || event.key === 'PageDown')
        next = addMonths(
          f,
          (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1),
        );
      else if (event.key === 'Home')
        next = addDays(
          f,
          -((f.getDay() - firstWeekday(strings().lang) + 7) % 7),
        );
      else if (event.key === 'End')
        next = addDays(
          f,
          6 - ((f.getDay() - firstWeekday(strings().lang) + 7) % 7),
        );
      else return; // Enter / Space press the focused day's button
      event.preventDefault();
      open.focus = clamp(next, min, max);
      open.view = open.focus;
      draw();
    });
  }

  function upgrade(input) {
    if (input.dataset.datepicker) return;
    input.dataset.datepicker = '1';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${input.className} datepicker-field`;
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    input._datepicker = button;
    input.hidden = true;
    input.after(button);
    // a value set by code shows at once: this input's value setter also redraws its button
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => VALUE.get.call(input),
      set: (v) => (VALUE.set.call(input, v), sync(input)),
    });
    sync(input);
    button.addEventListener('click', () =>
      open && open.input === input ? close() : show(input),
    );
    button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' && !open)
        (event.preventDefault(), show(input));
    });
  }

  const upgradeAll = () =>
    document.querySelectorAll('input[type="date"]').forEach(upgrade);
  document.addEventListener('DOMContentLoaded', upgradeAll);
  document.addEventListener('htmx:load', upgradeAll); // hx-boost swaps and fragments
  document.addEventListener('pointerdown', (event) => {
    if (
      open &&
      !open.panel.contains(event.target) &&
      event.target !== open.input._datepicker
    )
      close();
  });
  window.addEventListener('resize', () => close());
  document.addEventListener(
    'scroll',
    // the page moved: the panel follows its field, and closes once the field is out of sight
    (event) => {
      if (!open || open.panel.contains(event.target)) return;
      const box = open.input._datepicker.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) close();
      else place(open.panel, open.input._datepicker);
    },
    true,
  );
})();
