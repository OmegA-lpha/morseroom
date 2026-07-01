import { LETTER_TO_MORSE } from "./morseTable";

/**
 * Encodes plain text into morse code.
 * Letters are separated by a single space, words by " / ".
 * Unknown characters are skipped.
 */
export function encodeText(text: string): string {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  return words
    .map((word) =>
      word
        .split("")
        .map((char) => LETTER_TO_MORSE[char])
        .filter((morse): morse is string => Boolean(morse))
        .join(" ")
    )
    .filter(Boolean)
    .join(" / ");
}
