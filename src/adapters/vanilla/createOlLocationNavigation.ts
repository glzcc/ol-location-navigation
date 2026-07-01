import { OlLocationNavigationCore } from '../../core/OlLocationNavigationCore';
import type { OlLocationNavigationOptions } from '../../types/navigation';

export function createOlLocationNavigation(
  target: HTMLElement | string,
  options: Omit<OlLocationNavigationOptions, 'target'>
): OlLocationNavigationCore {
  const container = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!container) {
    throw new Error('找不到地图容器');
  }

  return new OlLocationNavigationCore(container, options);
}
