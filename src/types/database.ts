// -----------------------------------------------------------------------------
// Hand-written mirror of the Supabase schema (supabase/migrations/*.sql).
// Regenerate with `supabase gen types typescript --local` once the project is
// linked to a real Supabase instance for full accuracy; this file is kept
// deliberately pragmatic (Insert/Update = Partial<Row>) so the app compiles
// and stays typed without depending on the Supabase CLI in this workspace.
// -----------------------------------------------------------------------------

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  brand_kit: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export type AutomationSettingsRow = {
  workspace_id: string;
  max_cost_per_video_usd: number;
  max_daily_spend_usd: number;
  max_monthly_spend_usd: number;
  max_retries: number;
  default_quality_profile: "economy" | "balanced" | "premium";
  video_generation_paused: boolean;
  social_publishing_paused: boolean;
  whatsapp_paused: boolean;
  email_paused: boolean;
  third_party_publishing_enabled: boolean;
  default_timezone: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export type AIProviderType =
  | "text"
  | "image"
  | "video"
  | "avatar"
  | "tts"
  | "music"
  | "storage"
  | "social"
  | "email"
  | "whatsapp"
  | "third_party_publisher";

export type AIProviderRow = {
  id: string;
  provider_key: string;
  provider_name: string;
  provider_type: AIProviderType;
  capabilities: string[];
  enabled: boolean;
  priority: number;
  cost_score: number;
  quality_score: number;
  latency_score: number;
  supports_portrait: boolean;
  supports_audio: boolean;
  supports_reference_image: boolean;
  supports_async_jobs: boolean;
  docs_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ProviderHealthStatus = "unknown" | "healthy" | "degraded" | "unhealthy" | "not_configured";

export type AIProviderCredentialRow = {
  id: string;
  workspace_id: string;
  provider_id: string;
  account_label: string | null;
  credential_ref: string;
  enabled: boolean;
  last_health_check: string | null;
  health_status: ProviderHealthStatus;
  health_detail: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AIModelCapability = "text" | "image" | "video" | "avatar" | "tts" | "music";

export type AIModelRow = {
  id: string;
  provider_id: string;
  model_key: string;
  display_name: string | null;
  capability: AIModelCapability;
  enabled: boolean;
  is_default: boolean;
  quality_score: number | null;
  cost_per_second: number | null;
  cost_per_unit: number | null;
  unit_type: string | null;
  supports_audio: boolean;
  supports_portrait: boolean;
  supports_reference_image: boolean;
  max_duration_seconds: number | null;
  deprecated_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PresenterSourceType = "generated" | "licensed_stock" | "user_uploaded" | "employee" | "client";

export type PresenterRow = {
  id: string;
  workspace_id: string;
  name: string;
  style: string | null;
  age_range: string | null;
  clothing_style: string | null;
  languages: string[];
  reference_image_url: string | null;
  voice_profile_id: string | null;
  brand_associations: string[];
  source_type: PresenterSourceType;
  consent_confirmed: boolean;
  consent_metadata: Record<string, unknown>;
  status: "available" | "generating" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type VoiceProfileRow = {
  id: string;
  workspace_id: string;
  provider: string;
  provider_voice_id: string | null;
  name: string;
  language: string;
  gender: string | null;
  style: string | null;
  enabled: boolean;
  consent_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type BrandTemplateRow = {
  id: string;
  workspace_id: string;
  name: string;
  logo_url: string | null;
  primary_font: string | null;
  secondary_font: string | null;
  colors: Record<string, unknown>;
  overlay_config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type QualityProfile = "economy" | "balanced" | "premium";
export type AspectRatio = "9:16" | "16:9" | "1:1";

export type CampaignStatus =
  | "draft"
  | "script_pending"
  | "script_ready"
  | "generating"
  | "rendering"
  | "qc_pending"
  | "qc_failed"
  | "ready_for_review"
  | "approved"
  | "scheduled"
  | "publishing"
  | "completed"
  | "failed"
  | "cancelled";

export type CampaignRow = {
  id: string;
  workspace_id: string;
  name: string;
  objective: string | null;
  product_name: string | null;
  product_description: string | null;
  target_audience: string | null;
  language: string;
  tone: string;
  presenter_id: string | null;
  brand_template_id: string | null;
  style: string | null;
  duration_seconds: number;
  aspect_ratio: AspectRatio;
  quality_profile: QualityProfile;
  cta: string | null;
  landing_url: string | null;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  target_channel_keys: string[];
  publish_to_all_connected: boolean;
  status: CampaignStatus;
  scheduled_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  total_estimated_cost: number | null;
  total_actual_cost: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignAssetType =
  | "presenter_image"
  | "reference_image"
  | "script"
  | "voice"
  | "raw_video"
  | "final_video"
  | "thumbnail"
  | "logo"
  | "caption"
  | "subtitle"
  | "email_html"
  | "whatsapp_template";

export type CampaignAssetRow = {
  id: string;
  campaign_id: string;
  asset_type: CampaignAssetType;
  scene_index: number | null;
  storage_path: string | null;
  public_url: string | null;
  metadata: Record<string, unknown>;
  provider: string | null;
  provider_job_id: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  created_at: string;
  updated_at: string;
}

export type AIJobType =
  | "script"
  | "presenter_image"
  | "video"
  | "voice"
  | "subtitle"
  | "thumbnail"
  | "caption"
  | "translation"
  | "render"
  | "qc";

export type AIJobStatus = "queued" | "processing" | "completed" | "failed" | "retrying" | "cancelled" | "needs_review";

export type AIGenerationJobRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  job_type: AIJobType;
  provider: string | null;
  model: string | null;
  external_job_id: string | null;
  idempotency_key: string;
  status: AIJobStatus;
  attempt: number;
  max_attempts: number;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  error_message: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PublisherTier = "native_api" | "third_party" | "manual";

export type PlatformCapabilities = {
  text: boolean;
  image: boolean;
  video: boolean;
  stories: boolean;
  reels: boolean;
  shorts: boolean;
  scheduled: boolean;
  direct_publish: boolean;
}

export type PlatformCatalogRow = {
  platform_key: string;
  display_name: string;
  publisher_tier: PublisherTier;
  capabilities: PlatformCapabilities;
  oauth_supported: boolean;
  docs_url: string | null;
  sort_order: number;
}

export type SocialAccountStatus = "connected" | "disconnected" | "reauthorization_required" | "error";

export type SocialAccountRow = {
  id: string;
  workspace_id: string;
  platform_key: string;
  account_name: string | null;
  account_handle: string | null;
  account_type: string | null;
  connection_type: "oauth" | "third_party" | "manual";
  credential_ref: string | null;
  status: SocialAccountStatus;
  capabilities: Record<string, unknown>;
  last_health_check: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PublishJobStatus =
  | "draft"
  | "ready"
  | "queued"
  | "uploading"
  | "processing"
  | "published"
  | "failed"
  | "retrying"
  | "blocked"
  | "needs_approval"
  | "cancelled";

export type SocialPublishJobRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  asset_id: string | null;
  social_account_id: string;
  publisher_type: PublisherTier extends string ? "native_api" | "third_party" | "manual" : never;
  idempotency_key: string;
  status: PublishJobStatus;
  caption: string | null;
  hashtags: string[];
  scheduled_at: string | null;
  external_post_id: string | null;
  external_url: string | null;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SocialPostMetricsRow = {
  id: string;
  publish_job_id: string;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  followers_gained: number | null;
  watch_time_seconds: number | null;
  completion_rate: number | null;
  fetched_at: string;
  raw_payload: Record<string, unknown>;
}

export type WhatsAppCampaignRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  phone_list: unknown[];
  template_name: string | null;
  language: string | null;
  media_url: string | null;
  status: "draft" | "queued" | "sending" | "sent" | "partially_failed" | "failed";
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  external_campaign_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailCampaignRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  recipient_list: unknown[];
  subject: string | null;
  html_asset_id: string | null;
  status: "draft" | "queued" | "sending" | "sent" | "partially_failed" | "failed";
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  external_campaign_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalTaskStatus = "pending" | "in_review" | "approved" | "rejected" | "published";

export type ApprovalTaskRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  publish_job_id: string | null;
  channel: string | null;
  asset_url: string | null;
  caption: string | null;
  reason: string;
  category: string;
  status: ApprovalTaskStatus;
  assigned_to: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AICostLedgerRow = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  job_id: string | null;
  provider: string;
  model: string | null;
  operation: string;
  units: number | null;
  unit_type: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  currency: string;
  created_at: string;
}

export type AuditLogRow = {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ABTestVariantRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  variant_label: "A" | "B" | "C" | "D";
  variable_changed: "hook" | "presenter" | "cta" | "voice" | "thumbnail" | "caption";
  variant_value: Record<string, unknown>;
  performance_summary: Record<string, unknown>;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      workspaces: Table<WorkspaceRow>;
      workspace_members: Table<WorkspaceMemberRow>;
      automation_settings: Table<AutomationSettingsRow>;
      ai_providers: Table<AIProviderRow>;
      ai_provider_credentials: Table<AIProviderCredentialRow>;
      ai_models: Table<AIModelRow>;
      presenters: Table<PresenterRow>;
      voice_profiles: Table<VoiceProfileRow>;
      brand_templates: Table<BrandTemplateRow>;
      campaigns: Table<CampaignRow>;
      campaign_assets: Table<CampaignAssetRow>;
      ai_generation_jobs: Table<AIGenerationJobRow>;
      platform_catalog: Table<PlatformCatalogRow>;
      social_accounts: Table<SocialAccountRow>;
      social_publish_jobs: Table<SocialPublishJobRow>;
      social_post_metrics: Table<SocialPostMetricsRow>;
      whatsapp_campaigns: Table<WhatsAppCampaignRow>;
      email_campaigns: Table<EmailCampaignRow>;
      approval_tasks: Table<ApprovalTaskRow>;
      ai_cost_ledger: Table<AICostLedgerRow>;
      audit_logs: Table<AuditLogRow>;
      ab_test_variants: Table<ABTestVariantRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      workspace_role: WorkspaceRole;
    };
  };
}
