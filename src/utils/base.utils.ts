import { toast } from "react-hot-toast";
import QRCode from "qrcode";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// format number input to 100,000,000 format
export const formatQubicAmount = (amount: number, seperator = ",") => {
  return amount
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, seperator)
    .replace(".0", "");
};

export const truncateMiddle = (str: string, charsToRemove: number) => {
  const length = str.length;
  const start = Math.floor((length - charsToRemove) / 2);
  const end = start + charsToRemove;

  return str.slice(0, start) + "..." + str.slice(end);
};

export const copyText = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

export const sumArray = (arr: any[]) => arr.reduce((acc, curr) => acc + curr, 0);

// Basic validation checks
export const isAddressValid = (toAddress: string) => toAddress.length === 60 && /^[A-Z]+$/.test(toAddress);
export const isPositiveNumber = (amount: number) => !isNaN(Number(amount)) && Number(amount) > 0;
export const isAmountValid = (amount: number) => isPositiveNumber(amount) && amount % 1 === 0;

export const generateQRCode = async (text: string) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(text);
    return qrCodeDataURL;
  } catch (err) {
    console.error("Failed to generate QR code", err);
    return "";
  }
};

export const valueOfAssetName = (asset: string): bigint => {
  const bytes = new Uint8Array(8);
  bytes.set(new TextEncoder().encode(asset));
  return new DataView(bytes.buffer).getBigInt64(0, true);
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCssVariable(variableName: string): string {
  const rootStyle = getComputedStyle(document.documentElement);
  return rootStyle.getPropertyValue(variableName).trim();
}

function resolveCssVariableValue(variableName: string, depth = 0): string {
  if (depth > 10) {
    throw new Error(`CSS variable resolution exceeded max depth for ${variableName}`);
  }

  const raw = getCssVariable(variableName).trim();

  // Custom properties return the specified text, so support alias tokens like:
  // --ob-chart-grid: var(--border);
  if (raw.startsWith("var(") && raw.endsWith(")")) {
    const inner = raw.slice(4, -1).trim();
    const commaIdx = inner.indexOf(",");
    const ref = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
    const fallback = (commaIdx === -1 ? "" : inner.slice(commaIdx + 1)).trim();

    if (ref.startsWith("--")) {
      return resolveCssVariableValue(ref, depth + 1);
    }
    if (fallback) return fallback;
  }

  return raw;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h % 360; // Ensure hue is within 0-359
  s = s / 100; // Convert saturation to a decimal
  l = l / 100; // Convert lightness to a decimal

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => {
    const hex = value.toString(16);
    return hex.length === 1 ? "0" + hex : hex; // Ensure two digits
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function convertHslToHex(hslString: string): string {
  const [h, s, l] = hslString.split(" ").map((value) => parseFloat(value));

  if (isNaN(h) || isNaN(s) || isNaN(l)) {
    throw new Error("Invalid HSL string format");
  }

  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export function getCssVariableAsRgb(variableName: string): string {
  const hslValue = resolveCssVariableValue(variableName);
  const rgbValue = convertHslToHex(hslValue);
  return rgbValue;
}
