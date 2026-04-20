import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function roundValue(value: number | null, digits = 2) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}
