/** Tiny haptic taps. Silent no-op where unsupported (desktop browsers). */
export function buzz(pattern: number | number[] = 10): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore — haptics are decorative
  }
}
