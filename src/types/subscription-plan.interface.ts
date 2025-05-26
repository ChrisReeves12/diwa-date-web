/**
 * Subscription Plan interface definition based on the database structure
 */
export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  pricing_interval: string;
  price: number;
  pricing_unit: string;
  created_at?: Date | null;
  updated_at?: Date | null;
}
