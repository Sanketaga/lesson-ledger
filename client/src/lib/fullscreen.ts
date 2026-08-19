/** Returns whether the requested player surface is the element currently in fullscreen. */
export function isFullscreenTarget(target: Element | null, fullscreenElement: Element | null) {
  return target !== null && target === fullscreenElement;
}
