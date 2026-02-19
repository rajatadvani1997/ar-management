/**
 * Shared API Error Handler
 *
 * SOLID:
 *  SRP — centralises error-to-HTTP-status mapping; routes just call handleApiError().
 *  OCP — new domain error types are handled here; existing route catch blocks unchanged.
 *  DIP — routes depend on this abstraction, not concrete error details.
 */

import { NextResponse } from "next/server";
import {
  DomainError,
  NotFoundError,
  CreditLimitError,
  AllocationError,
  ForbiddenError,
} from "@/lib/errors";

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 404 });
  }
  if (err instanceof CreditLimitError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
  }
  if (err instanceof AllocationError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
  }
  if (err instanceof DomainError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
  }
  // Unknown / unexpected errors
  console.error("[API]", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
