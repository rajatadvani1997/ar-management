/**
 * Domain Event Bus — Observer / Pub-Sub Pattern
 *
 * SOLID:
 *  OCP  — handlers are added without modifying the event bus or emitters.
 *  DIP  — services emit typed events; they never call handlers directly.
 *  SRP  — the bus only routes events; handlers each have one concern.
 *  ISP  — handlers only subscribe to the events they care about.
 *
 * Design choice: synchronous + in-process event bus.
 * Justification: SQLite / moderate traffic; no need for a message broker.
 * If the app grows to need async, this interface stays the same — only
 * the bus implementation changes (OCP).
 */

// ── Event catalogue ─────────────────────────────────────────────────────────

export interface InvoiceCreatedEvent {
  type: "INVOICE_CREATED";
  customerId: string;
  invoiceId: string;
  totalAmount: number;
}

export interface PaymentAllocatedEvent {
  type: "PAYMENT_ALLOCATED";
  customerId: string;
  paymentId: string;
  totalAllocated: number;
}

export interface PromiseBrokenEvent {
  type: "PROMISE_BROKEN";
  customerId: string;
  promiseId: string;
  promisedDate: Date;
}

export interface CreditLimitBreachedEvent {
  type: "CREDIT_LIMIT_BREACHED";
  customerId: string;
  creditLimit: number;
  outstandingAmt: number;
}

export type DomainEvent =
  | InvoiceCreatedEvent
  | PaymentAllocatedEvent
  | PromiseBrokenEvent
  | CreditLimitBreachedEvent;

export type EventType = DomainEvent["type"];

type Handler<E extends DomainEvent> = (event: E) => void | Promise<void>;

// ── Bus implementation ───────────────────────────────────────────────────────

class DomainEventBus {
  private readonly handlers = new Map<string, Handler<any>[]>();

  on<K extends EventType>(type: K, handler: Handler<Extract<DomainEvent, { type: K }>>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  /** Fire-and-await all handlers; throws on first error. */
  async emit<E extends DomainEvent>(event: E): Promise<void> {
    const list = this.handlers.get(event.type) ?? [];
    for (const h of list) {
      await h(event);
    }
  }

  /** Fire-and-forget; errors are logged, not thrown. */
  emitSafe<E extends DomainEvent>(event: E): void {
    const list = this.handlers.get(event.type) ?? [];
    for (const h of list) {
      Promise.resolve(h(event)).catch((err) => {
        console.error(`[EventBus] Handler error for ${event.type}:`, err);
      });
    }
  }
}

// Singleton — one bus per process
export const eventBus = new DomainEventBus();

// ── Built-in handlers registration ──────────────────────────────────────────
// Import lazily to avoid circular deps; handlers are registered once at startup.

import { recalculateCustomerTotals } from "@/lib/business/customer-totals";
import { updateRiskFlag } from "@/lib/business/risk-flag";

/** Register all domain event handlers. Call once at app startup (or lazily). */
let registered = false;
export function registerDomainHandlers(): void {
  if (registered) return;
  registered = true;

  // After invoice creation → refresh customer totals + risk
  eventBus.on("INVOICE_CREATED", async ({ customerId }) => {
    await recalculateCustomerTotals(customerId);
    await updateRiskFlag(customerId);
  });

  // After payment allocation → refresh customer totals + risk
  eventBus.on("PAYMENT_ALLOCATED", async ({ customerId }) => {
    await recalculateCustomerTotals(customerId);
    await updateRiskFlag(customerId);
  });

  // Credit breach → log warning (extend with email/SMS in future without changing emitters)
  eventBus.on("CREDIT_LIMIT_BREACHED", ({ customerId, creditLimit, outstandingAmt }) => {
    console.warn(
      `[CreditAlert] Customer ${customerId} — outstanding ${outstandingAmt} exceeds limit ${creditLimit}`
    );
    // OCP: add Slack/email notification here without touching InvoiceService
  });

  // Broken promise → log (extend with collector notification)
  eventBus.on("PROMISE_BROKEN", ({ customerId, promisedDate }) => {
    console.warn(
      `[PromiseAlert] Customer ${customerId} broke promise for ${promisedDate.toDateString()}`
    );
  });
}
