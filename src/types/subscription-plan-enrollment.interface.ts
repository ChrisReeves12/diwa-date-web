import { SubscriptionPlan } from './subscription-plan.interface';

/**
 * Subscription Plan Enrollment interface definition based on the database structure
 */
export interface SubscriptionPlanEnrollment {
  id: bigint;
  user_id: bigint;
  subscription_plan_id: bigint;
  last_payment_at?: Date | null;
  next_payment_at?: Date | null;
  started_at?: Date | null;
  ends_at?: Date | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  subscription_plans: SubscriptionPlan;
}
