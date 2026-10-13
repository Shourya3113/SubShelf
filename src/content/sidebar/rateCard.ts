import { icon } from '@/ui/icons';

export interface RateCardHandlers {
  onRate: () => void;
  onNotNow: () => void;
}

/** The one-time "Enjoying SubShelf?" card shown under the header row (see utils/ratePrompt). */
export function buildRateCard(handlers: RateCardHandlers): HTMLElement {
  const card = document.createElement('div');
  card.className = 'subdeck-rate-card';
  card.setAttribute('role', 'note');

  const title = document.createElement('div');
  title.className = 'subdeck-rate-title';
  title.textContent = 'Enjoying SubShelf?';

  const text = document.createElement('p');
  text.className = 'subdeck-rate-text';
  text.textContent = 'A quick rating helps other people find it.';

  const actions = document.createElement('div');
  actions.className = 'subdeck-rate-actions';

  const rate = document.createElement('button');
  rate.type = 'button';
  rate.className = 'subdeck-rate-btn';
  rate.appendChild(icon('star', 16));
  const rateLabel = document.createElement('span');
  rateLabel.textContent = 'Rate it';
  rate.appendChild(rateLabel);

  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'subdeck-rate-later';
  later.textContent = 'Not now';

  rate.addEventListener('click', () => {
    card.remove();
    handlers.onRate();
  });
  later.addEventListener('click', () => {
    card.remove();
    handlers.onNotNow();
  });

  actions.append(rate, later);
  card.append(title, text, actions);
  return card;
}
