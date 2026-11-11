export type Dictionary = Record<string, string>;

export function translate(dict: Dictionary, key: string, replacements?: Record<string, string>): string {
  let text = dict[key] ?? key;
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) text = text.replace(`{${k}}`, v);
  }
  return text;
}
