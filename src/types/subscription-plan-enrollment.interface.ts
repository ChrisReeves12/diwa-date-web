import { SubscriptionPlan } from './subscription-plan.interface';

/**
 * Subscription Plan Enrollment interface definition based on the database structure
 */
export interface SubscriptionPlanEnrollment {
  id: number;
  userId: number;
  subscriptionPlanId: number;
  lastPaymentAt?: Date | null;
  nextPaymentAt?: Date | null;
  started_at?: Date | null;
  endsAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  subscriptionPlans: SubscriptionPlan;
}
