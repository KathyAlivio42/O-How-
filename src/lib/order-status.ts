import type { OrderStatus, FulfillmentType } from "@/lib/types";

export interface StatusStep {
  key: OrderStatus;
  label: string;
}

export const PICKUP_STEPS: StatusStep[] = [
  { key: "new", label: "Order Received" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready for Pickup" },
  { key: "completed", label: "Completed" },
];

export const DELIVERY_STEPS: StatusStep[] = [
  { key: "new", label: "Order Received" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "completed", label: "Completed" },
];

// "accepted" is treated as part of "new" for the customer-facing tracker
// (it's a staff-only intermediate state — see admin Live Orders board).
export function stepsFor(fulfillment: FulfillmentType): StatusStep[] {
  return fulfillment === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
}

export function currentStepIndex(
  status: OrderStatus,
  fulfillment: FulfillmentType
): number {
  const steps = stepsFor(fulfillment);
  if (status === "accepted") return 0;
  if (status === "cancelled") return -1;
  const idx = steps.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}
