import { CategoryDeck, SubscribedChannel } from '@/types';
import { safeAvatarUrl } from '@/utils/avatarUrl';
import { icon, iconButton } from '@/ui/icons';
import { openMenu } from './menu';

/** A channel as shown in the sidebar, with the storage key it is filed under. */
export interface FolderMember {
  id: string;
  channel: SubscribedChannel;
}

/** What was dropped on a folder: one of our channel rows, or a link dragged from YouTube's own list. */
export interface DroppedChannel {
  channelId?: string;
  url?: string;
  /** Ctrl/⌘ held: add to this folder and keep it where it is. */
  copy?: boolean;
}

export interface FolderHandlers {
  /** Title click (plain left click): filter the feed or navigate to it. */
  onOpen: (cat: CategoryDeck, header: HTMLElement) => void;
  onRename: (cat: CategoryDeck, name: string, icon: string) => Promise<void>;
  onAddChannel: (cat: CategoryDeck, channelId: string) => Promise<void>;
  onDelete: (cat: CategoryDeck) => Promise<void>;
  onRemoveChannel: (cat: CategoryDeck, channelId: string) => Promise<void>;
  onToggle: (cat: CategoryDeck, collapsed: boolean) => Promise<void>;
  onDropChannel: (cat: CategoryDeck, dropped: DroppedChannel) => Promise<void>;
  /** Whether YouTube shows its blue "new videos" dot for this channel. */
  hasNewUploads: (channel: SubscribedChannel) => boolean;
  /** A channel link was clicked (clears its dot). */
  onOpenChannel: (channel: SubscribedChannel) => void;
  /** Move the dragged folder just before or after `target`. */
  onReorder: (draggedId: string, target: CategoryDeck, after: boolean) => Promise<void>;
  /** Move one place up (-1) or down (+1). */
  onMove: (cat: CategoryDeck, step: -1 | 1) => Promise<void>;
}

/** YouTube's blue "new videos" dot. */
function newDot(className: string): HTMLElement {
  const dot = document.createElement('span');
  dot.className = className;
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}

/** MIME type for dragging one of our channel rows (keeps drags from other pages/apps out). */
export const CHANNEL_DRAG_TYPE = 'application/x-subshelf-channel';
/** MIME type for dragging a folder to reorder it; never mixed up with a channel drag. */
export const FOLDER_DRAG_TYPE = 'application/x-subshelf-folder';
const PICKER_LIMIT = 50;

const fallbackColor = (title: string): string => {
  let h = 0;
  for (const char of title) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 40% 36%)`;
};

function buildAvatar(ch: SubscribedChannel, onBroken: (fallback: HTMLElement) => void): HTMLElement {
  const fallback = () => {
    const el = document.createElement('span');
    el.className = 'subdeck-channel-avatar-fallback';
    el.textContent = ch.title.charAt(0).toUpperCase();
    el.style.background = fallbackColor(ch.title);
    el.style.color = '#fff';
    return el;
  };
  const safe = safeAvatarUrl(ch.avatarUrl);
  if (!safe) return fallback();
  const img = document.createElement('img');
  img.className = 'subdeck-channel-avatar';
  img.src = safe;
  img.alt = '';
  img.loading = 'lazy';
  img.onerror = () => onBroken(fallback());
  return img;
}

function buildChannelItem(
  member: FolderMember,
  folderName: string,
  hasNew: boolean,
  onOpen: () => void,
  onRemove: () => void
): HTMLElement {
  const ch = member.channel;
  const item = document.createElement('div');
  item.className = 'subdeck-channel-item';
  item.draggable = true;
  item.title = `${ch.title}${hasNew ? ' (new videos)' : ''} — drag onto another folder to move it, or Ctrl+drag to add it there too`;

  const link = document.createElement('a');
  link.className = 'subdeck-channel-link';
  link.href = ch.url.startsWith('https://') || ch.url.startsWith('/') ? ch.url : '#';
  link.draggable = false; // drag the row (our data), not the bare link
  if (hasNew) link.setAttribute('aria-label', `${ch.title}, new videos`);
  link.addEventListener('click', onOpen);

  const titleSpan = document.createElement('span');
  titleSpan.className = 'subdeck-channel-title';
  titleSpan.textContent = ch.title;

  const avatar = buildAvatar(ch, (fb) => avatar.replaceWith(fb));
  link.append(avatar, titleSpan);

  const removeBtn = iconButton('close', `Remove ${ch.title} from ${folderName}`, 'subdeck-channel-remove-btn', 16);
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onRemove();
  });

  item.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData(CHANNEL_DRAG_TYPE, member.id);
    e.dataTransfer?.setData('text/plain', ch.title);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove';
    item.classList.add('dragging');
    document.documentElement.classList.add('subdeck-dragging');
  });
  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    document.documentElement.classList.remove('subdeck-dragging');
  });

  if (hasNew) item.append(link, newDot('subdeck-new-dot'), removeBtn);
  else item.append(link, removeBtn);
  return item;
}

/** Search box + filtered list; replaces a native <select> that was unusable with hundreds of channels. */
function buildPicker(available: FolderMember[], onPick: (id: string) => void, onClose: () => void): HTMLElement {
  const box = document.createElement('div');
  box.className = 'subdeck-picker';

  const search = document.createElement('div');
  search.className = 'subdeck-picker-search';
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = available.length ? `Search ${available.length} channels` : 'All channels are already here';
  input.setAttribute('aria-label', 'Search channels to add');
  input.disabled = available.length === 0;
  search.append(icon('search', 16), input);

  const list = document.createElement('div');
  list.className = 'subdeck-picker-list';
  list.setAttribute('role', 'listbox');

  const renderList = () => {
    const q = input.value.trim().toLowerCase();
    const matches = available
      .filter(m => !q || m.channel.title.toLowerCase().includes(q) || m.channel.handle.toLowerCase().includes(q))
      .slice(0, PICKER_LIMIT);
    list.replaceChildren(
      ...matches.map((m) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'subdeck-picker-option';
        opt.setAttribute('role', 'option');
        opt.append(buildAvatar(m.channel, () => {}), document.createTextNode(m.channel.title));
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          onPick(m.id);
        });
        return opt;
      })
    );
  };
  input.addEventListener('input', renderList);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') (list.querySelector('.subdeck-picker-option') as HTMLButtonElement | null)?.click();
  });
  renderList();

  box.append(search, list);
  return box;
}

/**
 * One sidebar folder: header (icon, name, count, ⋯ menu, collapse), rename form, channel picker and
 * channel list. The whole folder is a drop target for channels. `members`/`available` come sorted.
 */
export function buildFolder(
  cat: CategoryDeck,
  members: FolderMember[],
  available: FolderMember[],
  isActive: boolean,
  position: { first: boolean; last: boolean },
  handlers: FolderHandlers
): HTMLElement {
  const folder = document.createElement('div');
  folder.className = 'subdeck-folder-container';
  folder.dataset.folderId = cat.id;

  const header = document.createElement('div');
  header.className = `subdeck-folder-header ${isActive ? 'active-filter' : ''}`;
  header.dataset.folderId = cat.id;

  const folderMain = document.createElement('a');
  folderMain.className = 'subdeck-folder-main';
  folderMain.href = '/feed/subscriptions';
  folderMain.title = `Show videos from ${cat.name}`;
  folderMain.draggable = false; // drag the header (reorders the folder), not the bare link

  const iconSpan = document.createElement('span');
  iconSpan.className = 'subdeck-folder-icon';
  iconSpan.textContent = cat.icon;

  const titleSpan = document.createElement('span');
  titleSpan.className = 'subdeck-folder-title';
  titleSpan.textContent = cat.name;

  const countSpan = document.createElement('span');
  countSpan.className = 'subdeck-channel-count';
  countSpan.textContent = String(members.length);

  folderMain.append(iconSpan, titleSpan, countSpan);
  const newCount = members.filter(m => handlers.hasNewUploads(m.channel)).length;
  if (newCount > 0) {
    folderMain.append(newDot('subdeck-new-dot subdeck-folder-new-dot'));
    folderMain.title += ` (${newCount} with new videos)`;
  }

  const moreBtn = iconButton('more', `More actions for ${cat.name}`, 'subdeck-more-btn', 18);
  moreBtn.setAttribute('aria-haspopup', 'menu');
  moreBtn.setAttribute('aria-expanded', 'false');

  const list = document.createElement('div');
  list.className = `subdeck-channel-list ${cat.isCollapsed ? 'collapsed' : ''}`;
  list.id = `subdeck-list-${cat.id}`;

  const chevronBtn = iconButton('chevronDown', cat.isCollapsed ? `Show channels in ${cat.name}` : `Hide channels in ${cat.name}`, `subdeck-chevron-btn ${cat.isCollapsed ? '' : 'open'}`, 18);
  chevronBtn.setAttribute('aria-expanded', String(!cat.isCollapsed));
  chevronBtn.setAttribute('aria-controls', list.id);

  const actions = document.createElement('div');
  actions.className = 'subdeck-header-actions';
  actions.append(moreBtn, chevronBtn);
  header.append(folderMain, actions);

  // Rename form
  const editBox = document.createElement('div');
  editBox.className = 'subdeck-inline-form';
  editBox.hidden = true;

  const editIcon = document.createElement('input');
  editIcon.type = 'text';
  editIcon.className = 'subdeck-input-icon';
  editIcon.value = cat.icon;
  editIcon.maxLength = 8;
  editIcon.setAttribute('aria-label', 'Folder icon (emoji)');

  const editName = document.createElement('input');
  editName.type = 'text';
  editName.className = 'subdeck-input-name';
  editName.value = cat.name;
  editName.setAttribute('aria-label', 'Folder name');

  const editSaveBtn = document.createElement('button');
  editSaveBtn.type = 'button';
  editSaveBtn.className = 'subdeck-btn-save';
  editSaveBtn.textContent = 'Save';

  const editCancelBtn = iconButton('close', 'Cancel', 'subdeck-btn-cancel', 18);
  editBox.append(editIcon, editName, editSaveBtn, editCancelBtn);

  const saveEdit = (e: Event) => {
    e.stopPropagation();
    const newName = editName.value.trim();
    if (newName) handlers.onRename(cat, newName, editIcon.value.trim() || '📁');
  };
  editSaveBtn.addEventListener('click', saveEdit);
  editCancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editBox.hidden = true;
  });
  for (const input of [editName, editIcon]) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveEdit(e);
      if (e.key === 'Escape') editBox.hidden = true;
    });
  }

  // Channel picker (built on first open)
  const pickerSlot = document.createElement('div');
  pickerSlot.hidden = true;
  const closePicker = () => {
    pickerSlot.hidden = true;
    pickerSlot.replaceChildren();
  };
  const openPicker = () => {
    pickerSlot.replaceChildren(buildPicker(available, (id) => handlers.onAddChannel(cat, id), closePicker));
    pickerSlot.hidden = false;
    pickerSlot.querySelector('input')?.focus();
  };

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    openMenu(moreBtn, [
      { label: 'Rename', icon: 'edit', onSelect: () => { editBox.hidden = false; editName.focus(); } },
      { label: 'Add channel', icon: 'add', onSelect: () => (pickerSlot.hidden ? openPicker() : closePicker()) },
      ...(position.first ? [] : [{ label: 'Move up', icon: 'arrowUp' as const, onSelect: () => { handlers.onMove(cat, -1); } }]),
      ...(position.last ? [] : [{ label: 'Move down', icon: 'arrowDown' as const, onSelect: () => { handlers.onMove(cat, 1); } }]),
      { label: 'Delete folder', icon: 'delete', danger: true, onSelect: () => {
        if (confirm(`Delete folder "${cat.name}"? Its channels stay subscribed and become unsorted.`)) handlers.onDelete(cat);
      } },
    ]);
  });

  for (const m of members) {
    list.appendChild(buildChannelItem(
      m,
      cat.name,
      handlers.hasNewUploads(m.channel),
      () => handlers.onOpenChannel(m.channel),
      () => handlers.onRemoveChannel(cat, m.id)
    ));
  }

  // Chevron only toggles the list; it never navigates
  chevronBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isNowCollapsed = !list.classList.contains('collapsed');
    list.classList.toggle('collapsed', isNowCollapsed);
    chevronBtn.classList.toggle('open', !isNowCollapsed);
    chevronBtn.setAttribute('aria-expanded', String(!isNowCollapsed));
    chevronBtn.setAttribute('aria-label', `${isNowCollapsed ? 'Show' : 'Hide'} channels in ${cat.name}`);
    cat.isCollapsed = isNowCollapsed;
    handlers.onToggle(cat, isNowCollapsed);
  });

  // Title click filters the feed; modified clicks keep the link's default behavior (new tab, etc.)
  folderMain.addEventListener('click', (e: MouseEvent) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    handlers.onOpen(cat, header);
  });

  // The header drags the whole folder to reorder it
  header.draggable = true;
  header.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData(FOLDER_DRAG_TYPE, cat.id);
    e.dataTransfer?.setData('text/plain', cat.name);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    folder.classList.add('dragging');
  });
  header.addEventListener('dragend', () => folder.classList.remove('dragging'));

  // Drop target: our channel rows, channel links dragged from YouTube's own subscription list, or
  // another folder being reordered (placed before or after this one, by pointer position)
  const isFolderDrag = (e: DragEvent) => Boolean(e.dataTransfer?.types.includes(FOLDER_DRAG_TYPE));
  const accepts = (e: DragEvent) =>
    Boolean(e.dataTransfer?.types.includes(CHANNEL_DRAG_TYPE) || e.dataTransfer?.types.includes('text/uri-list'));
  const dropsAfter = (e: DragEvent) => e.clientY > folder.getBoundingClientRect().top + header.offsetHeight / 2;
  const clearDropMarks = () => folder.classList.remove('subdeck-drop-target', 'subdeck-drop-before', 'subdeck-drop-after');
  folder.addEventListener('dragover', (e) => {
    if (isFolderDrag(e)) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const after = dropsAfter(e);
      folder.classList.toggle('subdeck-drop-after', after);
      folder.classList.toggle('subdeck-drop-before', !after);
      return;
    }
    if (!accepts(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
    folder.classList.add('subdeck-drop-target');
  });
  folder.addEventListener('dragleave', (e) => {
    if (!folder.contains(e.relatedTarget as Node)) clearDropMarks();
  });
  folder.addEventListener('drop', (e) => {
    clearDropMarks();
    if (isFolderDrag(e)) {
      e.preventDefault();
      const draggedId = e.dataTransfer?.getData(FOLDER_DRAG_TYPE);
      if (draggedId && draggedId !== cat.id) handlers.onReorder(draggedId, cat, dropsAfter(e));
      return;
    }
    if (!accepts(e)) return;
    e.preventDefault();
    const channelId = e.dataTransfer?.getData(CHANNEL_DRAG_TYPE) || undefined;
    const url = channelId ? undefined : e.dataTransfer?.getData('text/uri-list')?.split('\n')[0]?.trim();
    handlers.onDropChannel(cat, { channelId, url, copy: e.ctrlKey || e.metaKey });
  });

  folder.append(header, editBox, pickerSlot, list);
  return folder;
}
