const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "HUF",
  "IDR",
  "INR",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "TWD",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function fractionDigitsFor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

const standardFormatters = new Map<string, Intl.NumberFormat>();
function standardFormatter(currency: string, locale: string): Intl.NumberFormat {
  const digits = fractionDigitsFor(currency);
  const key = `${locale}|${currency}|${digits}`;
  let f = standardFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    standardFormatters.set(key, f);
  }
  return f;
}

const compactFormatters = new Map<string, Intl.NumberFormat>();
function compactFormatter(currency: string, locale: string): Intl.NumberFormat {
  const key = `${locale}|${currency}|compact`;
  let f = compactFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    compactFormatters.set(key, f);
  }
  return f;
}

const symbolCache = new Map<string, string>();

export function formatCurrency(
  amountMinor: number,
  currency: string = "INR",
  locale: string = "en-IN",
): string {
  return standardFormatter(currency, locale).format(amountMinor / 100);
}

export function formatCurrencyCompact(
  amountMinor: number,
  currency: string = "INR",
  locale: string = "en-IN",
): string {
  const major = amountMinor / 100;
  const compact = Math.abs(major) >= 100_000;
  const fmt = compact
    ? compactFormatter(currency, locale)
    : standardFormatter(currency, locale);
  return fmt.format(major);
}

export function currencySymbol(
  currency: string = "INR",
  locale: string = "en-IN",
): string {
  const key = `${locale}|${currency}`;
  let s = symbolCache.get(key);
  if (s === undefined) {
    const parts = standardFormatter(currency, locale).formatToParts(0);
    s = parts.find((p) => p.type === "currency")?.value ?? currency;
    symbolCache.set(key, s);
  }
  return s;
}

export function parseAmountToMinor(
  input: string,
  currency: string = "INR",
): number | null {
  const cleaned = input.replace(/[,\s]/g, "").trim();
  if (cleaned === "") return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) return null;
  const digits = fractionDigitsFor(currency);
  if (digits === 0) {
    return Math.round(num) * 100;
  }
  return Math.round(num * 100);
}

export function minorToInputString(
  amountMinor: number,
  currency: string = "INR",
): string {
  if (amountMinor <= 0) return "";
  const digits = fractionDigitsFor(currency);
  if (digits === 0) {
    return Math.round(amountMinor / 100).toString();
  }
  return (amountMinor / 100).toFixed(digits);
}
