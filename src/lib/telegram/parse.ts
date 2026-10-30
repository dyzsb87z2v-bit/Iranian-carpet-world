// Parsers for the free-text answers sellers type in the bot.
// They accept Persian and Arabic-Indic digits and common Persian phrasings.

export function normalizeDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٬,،_]/g, "")
    .trim();
}

/** "300x200", "۳۰۰ در ۲۰۰", "3*2" (metres) → { lengthCm, widthCm } with length ≥ width. */
export function parseSize(input: string): { lengthCm: number; widthCm: number } | null {
  const s = normalizeDigits(input).toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:x|×|\*|در|ب|by|-)\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let a = Number(m[1]);
  let b = Number(m[2]);
  // Values up to 10 are metres.
  if (a <= 10 && b <= 10) {
    a *= 100;
    b *= 100;
  }
  a = Math.round(a);
  b = Math.round(b);
  if (a < 20 || b < 20 || a > 2000 || b > 2000) return null;
  return { lengthCm: Math.max(a, b), widthCm: Math.min(a, b) };
}

/** "۱۲۰ میلیون", "120,000,000", "۱.۵ میلیارد" → toman integer. */
export function parseToman(input: string): number | null {
  const s = normalizeDigits(input).replace(/تومان|toman/gi, "").trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(میلیارد|میلیون|هزار)?$/);
  if (!m) return null;
  const mult = m[2] === "میلیارد" ? 1e9 : m[2] === "میلیون" ? 1e6 : m[2] === "هزار" ? 1e3 : 1;
  const value = Math.round(Number(m[1]) * mult);
  return value > 0 ? value : null;
}

export function parseInt0(input: string, max = 1000): number | null {
  const n = Number(normalizeDigits(input));
  return Number.isInteger(n) && n >= 0 && n <= max ? n : null;
}

export function parseCommand(text: string): { cmd: string; args: string[] } | null {
  const t = normalizeDigits(text);
  if (!t.startsWith("/")) return null;
  const [cmd, ...args] = t.slice(1).split(/\s+/);
  return { cmd: cmd.split("@")[0].toLowerCase(), args };
}
