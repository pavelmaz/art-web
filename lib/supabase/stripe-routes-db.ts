/**
 * Narrow Supabase typings for Stripe route handlers only (no full generated schema in repo).
 */
export type StripeRoutesDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
          subscription_status: string | null;
          plan_interval: string | null;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          plan_interval?: string | null;
        };
        Update: {
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          plan_interval?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
