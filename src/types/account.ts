/**
 * Customer-facing account types. Persistence is PostgreSQL + Auth.js;
 * these shapes are what the UI renders.
 */

export type PublicCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export interface SavedAddress {
  id: string;
  customerId: string;
  label?: string;
  city: string;
  address: string;
  building: string;
  apartment: string;
  entrance: string;
  floor: string;
  notes: string;
  isDefault: boolean;
}

export type OrderStatus = "received" | "processing" | "shipped" | "delivered" | "cancelled";
