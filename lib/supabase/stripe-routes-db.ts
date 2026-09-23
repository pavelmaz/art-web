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
      artworks: {
        Row: {
          id: string;
          url: string | null;
          image_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      print_orders: {
        Row: {
          id: number;
          user_id: string | null;
          artwork_id: string;
          stripe_session_id: string;
          sku: string;
          status: string;
          vendor_order_id: string | null;
          tracking_url: string | null;
          amount_total: number | null;
          currency: string | null;
          recipient_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string | null;
          artwork_id: string;
          stripe_session_id: string;
          sku: string;
          status?: string;
          vendor_order_id?: string | null;
          tracking_url?: string | null;
          amount_total?: number | null;
          currency?: string | null;
          recipient_email?: string | null;
        };
        Update: {
          status?: string;
          vendor_order_id?: string | null;
          tracking_url?: string | null;
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
