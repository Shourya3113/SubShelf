import { debounce } from './debounce';

export function createDebouncedObserver(
  target: HTMLElement,
  callback: () => void,
  options: MutationObserverInit,
  debounceMs: number = 150
): MutationObserver {
  const debouncedCallback = debounce(callback, debounceMs);
  const observer = new MutationObserver(debouncedCallback);
  observer.observe(target, options);
  return observer;
}
