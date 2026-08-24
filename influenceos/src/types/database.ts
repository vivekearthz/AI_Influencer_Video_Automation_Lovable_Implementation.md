// Hand-written mirror of influenceos/supabase/migrations/*.sql. Regenerate
// with `supabase gen types typescript --local` once linked to a real
// project for full accuracy.

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type UserRole = "creator" | "brand" | "admin";

export type ProfileRow = {
  id: string;
  role: UserRole;
  email: string;
  phone: string | null;
  full_name: string | null;
  city: string | null;
  is_18_plus_confirmed: boolean;
  verified_bool: boolean;
  created_at: string;
  updated_at: string;
};

export type ConsentType = "dpdp_data_processing" | "terms_of_service" | "marketing_communications" | "age_18_plus_certification";

export type ConsentLogRow = {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  consented: boolean;
  consent_text_version: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export interface PortfolioFile {
  storage_path: string;
  public_url: string;
  file_name: string;
  size_bytes: number;
}

export type ContentCategory =
  | "Fashion" | "Beauty" | "Food" | "Travel" | "Fitness" | "Tech" | "Education"
  | "Entertainment" | "Finance" | "Gaming" | "Motivation" | "Comedy" | "Photography" | "UGC" | "Other";

export type AudienceType = "Students" | "Working Professionals" | "Entrepreneurs" | "Creators" | "Homemakers" | "Mixed" | "Other";

export type CreatorStatus = "Full-time" | "Part-time/Side Hustler" | "Aspiring" | "Professional-with-presence";

export type ContentExperience = "Less than 6mo" | "6mo-1yr" | "1-2yr" | "2+yr";

export type ContentFormat =
  | "Reels" | "Posts" | "Stories" | "Product Reviews" | "UGC Videos" | "Unboxing"
  | "Event Coverage" | "Brand Promotion" | "YouTube Videos" | "Other";

export type FollowerRange = "Below 1K" | "1K-10K" | "10K-50K" | "50K-100K" | "100K-500K" | "500K+";
export type ReelViewsRange = "Below 1K" | "1K-5K" | "5K-10K" | "10K-50K" | "50K-100K" | "100K+";

export type OpportunityInterest =
  | "Brand Collabs" | "Paid Opportunities" | "Barter Deals" | "Networking" | "Creator Events"
  | "Product Gifting" | "Exposure to Big Brands" | "Learning & Growth" | "Long Term Partnerships";

export type CollabType = "Paid" | "Barter" | "Product Gifting" | "Event Collabs" | "Affiliate" | "Long Term" | "UGC Projects";

export type CreatorProfileRow = {
  user_id: string;
  instagram_url: string | null;
  youtube_url: string | null;
  other_social_url: string | null;
  portfolio_files: PortfolioFile[];
  content_categories: ContentCategory[];
  audience_type: AudienceType[];
  creator_status: CreatorStatus | null;
  content_experience: ContentExperience | null;
  content_formats: ContentFormat[];
  instagram_followers_range: FollowerRange | null;
  avg_reel_views_range: ReelViewsRange | null;
  opportunity_interests: OpportunityInterest[];
  collab_types_open_to: CollabType[];
  contact_ok_bool: boolean;
  event_interest_enum: "Yes" | "No" | "Maybe" | null;
  paid_barter_interest_enum: "Yes" | "Maybe" | "No" | null;
  why_join: string | null;
  rating_avg: number;
  rating_count: number;
  campaigns_completed_count: number;
  razorpay_linked_account_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionTier = "starter" | "growth" | "scale" | "enterprise";
export type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "cancelled";

export type BrandProfileRow = {
  user_id: string;
  company_name: string;
  industry: string | null;
  website: string | null;
  gstin: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type CampaignBudgetType = "paid" | "barter" | "hybrid";
export type CampaignStatus = "draft" | "open" | "in_review" | "closed";

export type CampaignRow = {
  id: string;
  brand_id: string;
  title: string;
  brief: string | null;
  category: string | null;
  budget_type: CampaignBudgetType;
  budget_amount: number | null;
  target_creator_tiers: FollowerRange[];
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
};

export type CollaborationStatus =
  | "invited" | "negotiating" | "accepted" | "content_submitted" | "approved" | "paid" | "disputed" | "cancelled";
export type EscrowStatus = "none" | "held" | "released" | "refunded";

export type CollaborationRow = {
  id: string;
  campaign_id: string;
  creator_id: string;
  brand_id: string;
  status: CollaborationStatus;
  agreed_amount: number | null;
  usage_rights_terms: string | null;
  usage_rights_duration_days: number | null;
  contract_pdf_url: string | null;
  disclosure_clause_generated_bool: boolean;
  escrow_payment_id: string | null;
  escrow_status: EscrowStatus;
  escrow_amount: number | null;
  content_delivery_url: string | null;
  dispute_reason: string | null;
  dispute_raised_by: string | null;
  dispute_raised_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  collaboration_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  collaboration_id: string;
  rater_id: string;
  ratee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      consent_logs: Table<ConsentLogRow>;
      creator_profiles: Table<CreatorProfileRow>;
      brand_profiles: Table<BrandProfileRow>;
      campaigns: Table<CampaignRow>;
      collaborations: Table<CollaborationRow>;
      messages: Table<MessageRow>;
      reviews: Table<ReviewRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
  };
}
