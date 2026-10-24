// hx-confirm opens #confirm-modal (views/partials/confirmModal.hbs) instead of the browser's confirm().
// Loaded once in <head>, so hx-boost body swaps never add a second listener. https://htmx.org/events/#htmx:confirm
document.addEventListener('htmx:confirm', (event) => {
  const dialog = document.getElementById('confirm-modal');
  if (!event.detail.question || !dialog) return; // no question, or no dialog on this page: htmx's default
  event.preventDefault();
  document.getElementById('confirm-modal-question').textContent =
    event.detail.question;
  dialog.returnValue = '';
  dialog.addEventListener(
    'close',
    () => {
      if (dialog.returnValue === 'ok') event.detail.issueRequest(true);
    },
    { once: true },
  );
  dialog.showModal();
});
