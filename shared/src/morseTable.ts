// International morse code table.
// Supports A-Z, 0-9, ".", ",", "?", "/". Space between letters is implicit
// (letters are separated by " " in a morse string), "/" separates words.

export const LETTER_TO_MORSE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "/": "-..-.",
};

export const MORSE_TO_LETTER: Record<string, string> = Object.fromEntries(
  Object.entries(LETTER_TO_MORSE).map(([letter, morse]) => [morse, letter])
);

export function lettersInAlphabet(): string[] {
  return Object.keys(LETTER_TO_MORSE);
}
