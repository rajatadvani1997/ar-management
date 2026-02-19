import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, symbol = "₹"): string {
  return `${symbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysOverdue(dueDate: string | Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const RISK_FLAG_CONFIG = {
  SAFE: { label: "Safe", className: "bg-green-100 text-green-800" },
  WATCHLIST: { label: "Watchlist", className: "bg-yellow-100 text-yellow-800" },
  HIGH_RISK: { label: "High Risk", className: "bg-red-100 text-red-800" },
} as const;

export const INVOICE_STATUS_CONFIG = {
  UNPAID: { label: "Unpaid", className: "bg-gray-100 text-gray-700" },
  PARTIAL: { label: "Partial", className: "bg-blue-100 text-blue-700" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700" },
  WRITTEN_OFF: { label: "Written Off", className: "bg-purple-100 text-purple-700" },
} as const;

export const CALL_STATUS_CONFIG = {
  CONNECTED: { label: "Connected", className: "bg-green-100 text-green-700" },
  NOT_REACHABLE: { label: "Not Reachable", className: "bg-red-100 text-red-700" },
  CALL_BACK_LATER: { label: "Call Back Later", className: "bg-yellow-100 text-yellow-700" },
  LEFT_MESSAGE: { label: "Left Message", className: "bg-blue-100 text-blue-700" },
  WRONG_NUMBER: { label: "Wrong Number", className: "bg-gray-100 text-gray-700" },
} as const;

export const PROMISE_STATUS_CONFIG = {
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  KEPT: { label: "Kept", className: "bg-green-100 text-green-700" },
  BROKEN: { label: "Broken", className: "bg-red-100 text-red-700" },
} as const;

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  NEFT: "NEFT",
  RTGS: "RTGS",
  IMPS: "IMPS",
  UPI: "UPI",
  OTHER: "Other",
};
