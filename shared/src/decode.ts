import { MORSE_TO_LETTER } from "./morseTable";

/** Decodes a single morse letter pattern (e.g. "-.-.") into a character, or "" if unknown. */
export function decodeLetter(morse: string): string {
  return MORSE_TO_LETTER[morse] ?? "";
}

/**
 * Decodes a full morse string (letters separated by spaces, words by " / ")
 * into plain text.
 */
export function decodeMorse(morse: string): string {
  const words = morse.trim().split("/");
  return words
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(decodeLetter)
        .join("")
    )
    .join(" ");
}
