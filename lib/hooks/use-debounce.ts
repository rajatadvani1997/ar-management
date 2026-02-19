/**
 * useDebounce — delays updating a value until the user stops typing.
 *
 * Web Vitals impact: INP / TBT
 *  - Prevents excessive re-renders and API calls on every keystroke.
 *  - Used in search inputs across customer, invoice, and payment lists.
 */

"use client";
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
