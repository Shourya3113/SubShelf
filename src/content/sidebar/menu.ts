import { icon, IconName } from './icons';

export interface MenuItem {
  label: string;
  icon: IconName;
  danger?: boolean;
  onSelect: () => void;
}

let closeOpenMenu: (() => void) | null = null;

/**
 * Opens a popover menu under `anchor`. Attached to <body> so the guide's scrolling container can't
 * clip it. Arrow keys move focus, Enter/Space selects, Escape or any outside click/scroll closes.
 */
export function openMenu(anchor: HTMLElement, items: MenuItem[]): void {
  closeOpenMenu?.();

  const menu = document.createElement('div');
  menu.className = 'subdeck-menu';
  menu.setAttribute('role', 'menu');

  const buttons = items.map((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `subdeck-menu-item${item.danger ? ' danger' : ''}`;
    btn.setAttribute('role', 'menuitem');
    btn.appendChild(icon(item.icon, 18));
    const label = document.createElement('span');
    label.textContent = item.label;
    btn.appendChild(label);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
      item.onSelect();
    });
    menu.appendChild(btn);
    return btn;
  });

  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${Math.round(rect.bottom + 4)}px`;
  menu.style.left = `${Math.round(Math.max(8, rect.right - 180))}px`;
  document.body.appendChild(menu);

  const onKey = (e: KeyboardEvent) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      anchor.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
      buttons[next].focus({ preventScroll: true });
    } else if (e.key === 'Tab') {
      close();
    }
  };
  const onOutside = (e: Event) => {
    if (!menu.contains(e.target as Node) && e.target !== anchor && !anchor.contains(e.target as Node)) close();
  };

  function close() {
    menu.remove();
    anchor.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
    if (closeOpenMenu === close) closeOpenMenu = null;
  }

  anchor.setAttribute('aria-expanded', 'true');
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onOutside, true);
  window.addEventListener('scroll', close, true);
  window.addEventListener('resize', close);
  closeOpenMenu = close;
  buttons[0]?.focus({ preventScroll: true });
}
