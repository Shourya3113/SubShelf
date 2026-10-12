import { icon, iconButton } from '@/ui/icons';

export interface ActionCardHandlers {
  /** Runs the full Auto-sort flow; the button is passed so the flow can show progress on it. */
  onAutoSort: (button: HTMLButtonElement) => Promise<void>;
  onCreateFolder: (name: string, icon: string) => Promise<void>;
}

/** Sets the Auto-sort button's label while keeping its icon. */
export function setAutoSortLabel(button: HTMLButtonElement, text: string): void {
  const label = button.querySelector('.subdeck-autosort-label');
  if (label) label.textContent = text;
}

/** One compact row: "SubShelf · 85" with Auto-sort and New folder, plus the inline new-folder form. */
export function buildActionCard(channelCount: number, handlers: ActionCardHandlers): DocumentFragment {
  const fragment = document.createDocumentFragment();

  const header = document.createElement('div');
  header.className = 'subdeck-header';

  const brand = document.createElement('span');
  brand.className = 'subdeck-brand';
  brand.textContent = 'SubShelf';

  const count = document.createElement('span');
  count.className = 'subdeck-subtext';
  count.textContent = String(channelCount);
  count.title = `${channelCount} subscribed channels`;

  const autoSort = document.createElement('button');
  autoSort.type = 'button';
  autoSort.className = 'subdeck-autosort-btn';
  autoSort.id = 'subdeck-ai-btn';
  autoSort.title = 'Sort every channel into folders';
  autoSort.appendChild(icon('sparkle', 16));
  const autoSortLabel = document.createElement('span');
  autoSortLabel.className = 'subdeck-autosort-label';
  autoSortLabel.textContent = 'Auto-sort';
  autoSort.appendChild(autoSortLabel);

  const newFolderBtn = iconButton('newFolder', 'New folder', 'subdeck-newfolder-btn');
  newFolderBtn.setAttribute('aria-expanded', 'false');

  header.append(brand, count, autoSort, newFolderBtn);

  // Inline "new folder" form
  const form = document.createElement('div');
  form.className = 'subdeck-inline-form';
  form.hidden = true;

  const iconInput = document.createElement('input');
  iconInput.type = 'text';
  iconInput.className = 'subdeck-input-icon';
  iconInput.value = '📁';
  iconInput.maxLength = 8;
  iconInput.setAttribute('aria-label', 'Folder icon (emoji)');

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'subdeck-input-name';
  nameInput.placeholder = 'Folder name';
  nameInput.setAttribute('aria-label', 'Folder name');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'subdeck-btn-save';
  saveBtn.textContent = 'Create';

  const cancelBtn = iconButton('close', 'Cancel', 'subdeck-btn-cancel', 18);
  form.append(iconInput, nameInput, saveBtn, cancelBtn);

  const setFormOpen = (open: boolean) => {
    form.hidden = !open;
    newFolderBtn.setAttribute('aria-expanded', String(open));
    if (open) nameInput.focus();
  };

  autoSort.addEventListener('click', () => {
    if (!autoSort.disabled) handlers.onAutoSort(autoSort);
  });
  newFolderBtn.addEventListener('click', () => setFormOpen(form.hidden));
  cancelBtn.addEventListener('click', () => setFormOpen(false));

  const save = async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    await handlers.onCreateFolder(name, iconInput.value.trim() || '📁');
    nameInput.value = '';
    iconInput.value = '📁';
    setFormOpen(false);
  };
  saveBtn.addEventListener('click', save);
  for (const input of [nameInput, iconInput]) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') setFormOpen(false);
    });
  }

  fragment.append(header, form);
  return fragment;
}

/**
 * First-run card, shown while the user has no folders yet: explains the product in one sentence and
 * offers the one-click start. The button reuses the Auto-sort flow (and its progress labels).
 */
export function buildFirstRunCard(channelCount: number, onAutoSort: (button: HTMLButtonElement) => Promise<void>): HTMLElement {
  const card = document.createElement('div');
  card.className = 'subdeck-firstrun';

  const title = document.createElement('div');
  title.className = 'subdeck-firstrun-title';
  const text = document.createElement('p');
  text.className = 'subdeck-firstrun-text';

  if (channelCount === 0) {
    title.textContent = 'Finding your subscriptions…';
    text.textContent = 'SubShelf reads them from this sidebar. If nothing appears, make sure you\'re signed in, then click "Show more" under Subscriptions.';
    card.append(title, text);
    return card;
  }

  title.textContent = `Sort your ${channelCount} subscriptions`;
  text.textContent = 'Put every channel into a folder in one click. It runs on your device and learns from any channel you move afterwards.';

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'subdeck-firstrun-btn';
  start.appendChild(icon('sparkle', 18));
  const label = document.createElement('span');
  label.className = 'subdeck-autosort-label';
  label.textContent = `Auto-sort ${channelCount} channels`;
  start.appendChild(label);
  start.addEventListener('click', () => {
    if (!start.disabled) onAutoSort(start);
  });

  const hint = document.createElement('p');
  hint.className = 'subdeck-firstrun-hint';
  hint.textContent = 'Prefer to do it yourself? Use the folder button above.';

  card.append(title, text, start, hint);
  return card;
}
