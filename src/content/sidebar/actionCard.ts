export interface ActionCardHandlers {
  /** Runs the full Auto-AI flow; the button is passed so the flow can show progress on it. */
  onAutoAI: (button: HTMLButtonElement) => Promise<void>;
  onCreateFolder: (name: string, icon: string) => Promise<void>;
  onShowAll: () => Promise<void>;
}

/** The SubShelf card (brand, channel count, Auto-AI, + Folder) followed by "Show All Subscriptions". */
export function buildActionCard(channelCount: number, handlers: ActionCardHandlers): DocumentFragment {
  const fragment = document.createDocumentFragment();

  const actionCard = document.createElement('div');
  actionCard.className = 'subdeck-action-card';

  const actionHeader = document.createElement('div');
  actionHeader.className = 'subdeck-action-header';

  const brandSpan = document.createElement('span');
  brandSpan.className = 'subdeck-brand';
  brandSpan.textContent = 'SubShelf';

  const subtextSpan = document.createElement('span');
  subtextSpan.className = 'subdeck-subtext';
  subtextSpan.textContent = `${channelCount} channels`;

  actionHeader.appendChild(brandSpan);
  actionHeader.appendChild(subtextSpan);

  const actionBtns = document.createElement('div');
  actionBtns.className = 'subdeck-action-buttons';

  const aiBtn = document.createElement('button');
  aiBtn.className = 'subdeck-btn-ai';
  aiBtn.id = 'subdeck-ai-btn';
  aiBtn.textContent = '✨ Auto-AI';

  const manualBtn = document.createElement('button');
  manualBtn.className = 'subdeck-btn-manual';
  manualBtn.id = 'subdeck-manual-btn';
  manualBtn.textContent = '+ Folder';

  actionBtns.appendChild(aiBtn);
  actionBtns.appendChild(manualBtn);

  const manualBox = document.createElement('div');
  manualBox.className = 'subdeck-manual-input-box';
  manualBox.id = 'subdeck-manual-box';
  manualBox.style.display = 'none';

  const iconInput = document.createElement('input');
  iconInput.type = 'text';
  iconInput.id = 'subdeck-new-folder-icon';
  iconInput.className = 'subdeck-input-icon';
  iconInput.value = '📁';
  iconInput.maxLength = 8;
  iconInput.title = 'Folder icon (emoji)';

  const folderInput = document.createElement('input');
  folderInput.type = 'text';
  folderInput.id = 'subdeck-new-folder-name';
  folderInput.className = 'subdeck-input-name';
  folderInput.placeholder = 'Folder name...';

  const saveBtn = document.createElement('button');
  saveBtn.id = 'subdeck-save-folder-btn';
  saveBtn.className = 'subdeck-btn-save';
  saveBtn.textContent = 'Save';

  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'subdeck-cancel-folder-btn';
  cancelBtn.className = 'subdeck-btn-cancel';
  cancelBtn.textContent = '✕';

  manualBox.appendChild(iconInput);
  manualBox.appendChild(folderInput);
  manualBox.appendChild(saveBtn);
  manualBox.appendChild(cancelBtn);

  actionCard.appendChild(actionHeader);
  actionCard.appendChild(actionBtns);
  actionCard.appendChild(manualBox);

  aiBtn.addEventListener('click', () => {
    if (!aiBtn.disabled) handlers.onAutoAI(aiBtn);
  });

  manualBtn.addEventListener('click', () => {
    manualBox.style.display = manualBox.style.display === 'none' ? 'flex' : 'none';
    if (manualBox.style.display === 'flex') folderInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    manualBox.style.display = 'none';
  });

  const saveFolder = async () => {
    const name = folderInput.value.trim();
    if (!name) return;
    await handlers.onCreateFolder(name, iconInput.value.trim() || '📁');
    folderInput.value = '';
    iconInput.value = '📁';
    manualBox.style.display = 'none';
  };

  saveBtn.addEventListener('click', saveFolder);
  for (const input of [folderInput, iconInput]) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveFolder();
      if (e.key === 'Escape') manualBox.style.display = 'none';
    });
  }

  const showAllBtn = document.createElement('button');
  showAllBtn.textContent = '☰ Show All Subscriptions';
  showAllBtn.className = 'subdeck-clear-filter';
  showAllBtn.addEventListener('click', () => handlers.onShowAll());

  fragment.appendChild(actionCard);
  fragment.appendChild(showAllBtn);
  return fragment;
}
