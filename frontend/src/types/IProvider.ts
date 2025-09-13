// frontend/src/types/IProvider.ts
export interface Referral {
  id: string; // backend uses UUID strings; if number in your DB, switch to number
  first_name: string;
  last_name: string;
  referred_for?: string;
  status: string;
  created_at: string;
  referrer_first_name?: string;
  referrer_last_name?: string;
  phone_number?: string;
  email_address?: string;
}
