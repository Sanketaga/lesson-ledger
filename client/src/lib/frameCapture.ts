export type CaptureRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CaptureSize = {
  width: number;
  height: number;
};

export type FrameCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Maps the visible player rectangle in the browser viewport onto the captured
 * current-tab video frame and keeps the crop inside that frame.
 */
export function getPlayerFrameCrop(
  playerRect: CaptureRect,
  viewport: CaptureSize,
  frame: CaptureSize,
): FrameCrop | null {
  if (viewport.width <= 0 || viewport.height <= 0 || frame.width <= 0 || frame.height <= 0) return null;
  const scaleX = frame.width / viewport.width;
  const scaleY = frame.height / viewport.height;
  const x = Math.max(0, Math.round(playerRect.left * scaleX));
  const y = Math.max(0, Math.round(playerRect.top * scaleY));
  const width = Math.min(frame.width - x, Math.round(playerRect.width * scaleX));
  const height = Math.min(frame.height - y, Math.round(playerRect.height * scaleY));
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}
