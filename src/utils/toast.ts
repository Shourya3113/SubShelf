/**
 * Non-blocking accessible toast notification.
 */
export function toast(msg: string, ms = 4000): void {
  const el = document.createElement('div');
  el.className = 'ss-toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('ss-toast-fade');
    setTimeout(() => el.remove(), 300);
  }, ms);
}
