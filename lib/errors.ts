/**
 * Domain Error Hierarchy
 *
 * SOLID:
 *  SRP — error classification logic lives here, not scattered across API routes.
 *  OCP — add new error types by extending DomainError; existing routes unchanged.
 *  LSP — all subclasses are valid DomainError instances; callers use the base type.
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND");
  }
}

export class AllocationError extends DomainError {
  constructor(message: string) {
    super(message, "ALLOCATION_ERROR");
  }
}

export class CreditLimitError extends DomainError {
  constructor(customerId: string, limit: number, projected: number) {
    super(
      `Credit limit exceeded for customer ${customerId}: limit ${limit}, projected ${projected}`,
      "CREDIT_LIMIT_EXCEEDED"
    );
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN");
  }
}
