import { CategoryDeck, SubscribedChannel } from '@/types';
import { safeAvatarUrl } from '@/utils/avatarUrl';

/** A channel as shown in the sidebar, with the storage key it is filed under. */
export interface FolderMember {
  id: string;
  channel: SubscribedChannel;
}

export interface FolderHandlers {
  /** Title click (plain left click): filter the feed or navigate to it. */
  onOpen: (cat: CategoryDeck, header: HTMLElement) => void;
  onRename: (cat: CategoryDeck, name: string, icon: string) => Promise<void>;
  onAddChannel: (cat: CategoryDeck, channelId: string) => Promise<void>;
  onDelete: (cat: CategoryDeck) => Promise<void>;
  onRemoveChannel: (cat: CategoryDeck, channelId: string) => Promise<void>;
  onToggle: (cat: CategoryDeck, collapsed: boolean) => Promise<void>;
}

const fallbackColor = (title: string): string => {
  let h = 0;
  for (const char of title) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 40% 36%)`;
};

function buildAvatarFallback(title: string): HTMLSpanElement {
  const fallback = document.createElement('span');
  fallback.className = 'subdeck-channel-avatar-fallback';
  fallback.textContent = title.charAt(0).toUpperCase();
  fallback.style.background = fallbackColor(title);
  fallback.style.color = '#fff';
  return fallback;
}

function buildChannelItem(member: FolderMember, onRemove: () => Promise<void>): HTMLElement {
  const ch = member.channel;
  const item = document.createElement('div');
  item.className = 'subdeck-channel-item';

  const link = document.createElement('a');
  link.className = 'subdeck-channel-link';
  link.href = ch.url.startsWith('https://') || ch.url.startsWith('/') ? ch.url : '#';
  link.title = ch.title;

  const titleSpan = document.createElement('span');
  titleSpan.className = 'subdeck-channel-title';
  titleSpan.textContent = ch.title;

  const safe = safeAvatarUrl(ch.avatarUrl);
  if (safe) {
    const avatar = document.createElement('img');
    avatar.className = 'subdeck-channel-avatar';
    avatar.src = safe;
    avatar.alt = '';
    avatar.loading = 'lazy';
    avatar.onerror = () => {
      avatar.style.display = 'none';
      link.insertBefore(buildAvatarFallback(ch.title), titleSpan);
    };
    link.appendChild(avatar);
  } else {
    link.appendChild(buildAvatarFallback(ch.title));
  }
  link.appendChild(titleSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'subdeck-channel-remove-btn';
  removeBtn.title = 'Remove from folder';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onRemove();
  });

  item.appendChild(link);
  item.appendChild(removeBtn);
  return item;
}

/**
 * One sidebar folder: header (title, count, edit/add/delete/collapse), rename box, channel picker and
 * channel list. `members` and `available` must already be deduplicated and sorted.
 */
export function buildFolder(
  cat: CategoryDeck,
  members: FolderMember[],
  available: FolderMember[],
  isActive: boolean,
  handlers: FolderHandlers
): HTMLElement {
  const folder = document.createElement('div');
  folder.className = 'subdeck-folder-container';

  const header = document.createElement('div');
  header.className = `subdeck-folder-header ${isActive ? 'active-filter' : ''}`;

  const folderMain = document.createElement('a');
  folderMain.className = 'subdeck-folder-main';
  folderMain.href = '/feed/subscriptions';
  folderMain.title = `Open feed for ${cat.name}`;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'subdeck-folder-icon';
  iconSpan.textContent = cat.icon;

  const titleSpan = document.createElement('span');
  titleSpan.className = 'subdeck-folder-title';
  titleSpan.textContent = cat.name;

  const countSpan = document.createElement('span');
  countSpan.className = 'subdeck-channel-count';
  countSpan.textContent = String(members.length);

  folderMain.appendChild(iconSpan);
  folderMain.appendChild(titleSpan);
  folderMain.appendChild(countSpan);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'subdeck-header-actions';

  const makeHeaderBtn = (className: string, title: string, text: string) => {
    const btn = document.createElement('button');
    btn.className = className;
    btn.title = title;
    btn.textContent = text;
    actionsDiv.appendChild(btn);
    return btn;
  };
  const editBtn = makeHeaderBtn('subdeck-header-btn edit', 'Rename folder & icon', '✏️');
  const addBtn = makeHeaderBtn('subdeck-header-btn add', 'Add channel to folder', '+');
  const deleteBtn = makeHeaderBtn('subdeck-header-btn delete', 'Delete folder', '🗑️');
  const chevronBtn = makeHeaderBtn(`subdeck-chevron-btn ${cat.isCollapsed ? '' : 'open'}`, 'Toggle channels list', '▼');

  header.appendChild(folderMain);
  header.appendChild(actionsDiv);

  // Rename / icon edit box
  const editBox = document.createElement('div');
  editBox.className = 'subdeck-folder-edit-box';
  editBox.style.display = 'none';

  const editIcon = document.createElement('input');
  editIcon.type = 'text';
  editIcon.className = 'subdeck-input-icon';
  editIcon.value = cat.icon;
  editIcon.maxLength = 8;
  editIcon.title = 'Folder icon (emoji)';

  const editName = document.createElement('input');
  editName.type = 'text';
  editName.className = 'subdeck-input-name';
  editName.value = cat.name;

  const editSaveBtn = document.createElement('button');
  editSaveBtn.className = 'subdeck-btn-save';
  editSaveBtn.textContent = 'Save';

  const editCancelBtn = document.createElement('button');
  editCancelBtn.className = 'subdeck-btn-cancel';
  editCancelBtn.textContent = '✕';

  editBox.appendChild(editIcon);
  editBox.appendChild(editName);
  editBox.appendChild(editSaveBtn);
  editBox.appendChild(editCancelBtn);

  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpening = editBox.style.display === 'none';
    editBox.style.display = isOpening ? 'flex' : 'none';
    if (isOpening) editName.focus();
  });
  editCancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editBox.style.display = 'none';
  });

  const saveEdit = (e: Event) => {
    e.stopPropagation();
    const newName = editName.value.trim();
    if (newName) handlers.onRename(cat, newName, editIcon.value.trim() || '📁');
  };
  editSaveBtn.addEventListener('click', saveEdit);
  for (const input of [editName, editIcon]) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveEdit(e);
      if (e.key === 'Escape') editBox.style.display = 'none';
    });
  }

  // Channel picker
  const addPickerBox = document.createElement('div');
  addPickerBox.className = 'subdeck-add-picker';
  addPickerBox.style.display = 'none';

  const select = document.createElement('select');
  select.className = 'subdeck-add-select';
  if (available.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'All channels already in deck';
    select.appendChild(opt);
  } else {
    for (const m of available) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.channel.title;
      select.appendChild(opt);
    }
  }

  const confirmAddBtn = document.createElement('button');
  confirmAddBtn.className = 'subdeck-add-confirm-btn';
  confirmAddBtn.textContent = 'Add';

  addPickerBox.appendChild(select);
  addPickerBox.appendChild(confirmAddBtn);

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addPickerBox.style.display = addPickerBox.style.display === 'none' ? 'flex' : 'none';
  });
  confirmAddBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (select.value) handlers.onAddChannel(cat, select.value);
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete folder "${cat.name}"?`)) handlers.onDelete(cat);
  });

  // Channel list
  const list = document.createElement('div');
  list.className = `subdeck-channel-list ${cat.isCollapsed ? 'collapsed' : ''}`;
  for (const m of members) {
    list.appendChild(buildChannelItem(m, () => handlers.onRemoveChannel(cat, m.id)));
  }

  // Chevron only toggles the list; it never navigates
  chevronBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isNowCollapsed = !list.classList.contains('collapsed');
    list.classList.toggle('collapsed');
    chevronBtn.classList.toggle('open', !isNowCollapsed);
    cat.isCollapsed = isNowCollapsed;
    handlers.onToggle(cat, isNowCollapsed);
  });

  // Title click filters the feed; modified clicks keep the link's default behavior (new tab, etc.)
  folderMain.addEventListener('click', (e: MouseEvent) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    handlers.onOpen(cat, header);
  });

  folder.appendChild(header);
  folder.appendChild(editBox);
  folder.appendChild(addPickerBox);
  folder.appendChild(list);
  return folder;
}
