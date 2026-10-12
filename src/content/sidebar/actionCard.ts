import { icon, iconButton } from './icons';

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
