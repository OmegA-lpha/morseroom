import type { PointerEvent } from "react";

interface MorseButtonProps {
  pressed: boolean;
  disabled?: boolean;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: (e: PointerEvent<HTMLButtonElement>) => void;
  onContextMenu: (e: React.SyntheticEvent) => void;
}

/**
 * The big morse key. Uses Pointer Events (not click) so a single press/hold
 * gesture works identically for touch, mouse and pen. touch-action: none
 * (see global.css .morseButton) stops the browser from turning holds/drags
 * into scroll, zoom or text-selection gestures.
 */
export function MorseButton({
  pressed,
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onContextMenu,
}: MorseButtonProps) {
  return (
    <button
      type="button"
      className={`morseButton${pressed ? " isPressed" : ""}`}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
      aria-pressed={pressed}
      aria-label="Morse-Taste"
    >
      MORSE
    </button>
  );
}
