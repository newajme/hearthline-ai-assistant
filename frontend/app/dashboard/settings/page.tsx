import { fetchJson, type Business, type Page } from "../lib";
import SettingsTabs from "./SettingsTabs";
import type { UserProfile } from "./UserProfileForm";

const EMPTY_BUSINESS: Business = {
  id: 0,
  name: "",
  slug: "",
  trade: "general",
  timezone: "UTC",
  currency: "USD",
  phone_number: "",
  voice_persona: "Demi",
  knowledge_base: "",
  llm_provider: "anthropic",
  anthropic_api_key: "",
  openai_api_key: "",
  gemini_api_key: "",
  groq_api_key: "",
  vapi_api_key: "",
  vapi_phone_number_id: "",
  twilio_account_sid: "",
  twilio_auth_token: "",
  twilio_from_number: "",
  whatsapp_access_token: "",
  whatsapp_phone_number_id: "",
  whatsapp_verify_token: "",
  has_anthropic_key: false,
  has_openai_key: false,
  has_gemini_key: false,
  has_groq_key: false,
  has_vapi_key: false,
  has_twilio_creds: false,
  has_whatsapp_creds: false,
  channels: [],
};

const EMPTY_PROFILE: UserProfile = {
  id: 0,
  username: "",
  display_name: "",
  email: "",
  avatar_url: "",
  initials: "U",
  avatar_storage: "external_url_only",
};

export default async function SettingsPage() {
  const [data, profileData] = await Promise.all([
    fetchJson<Page<Business>>("/businesses/"),
    fetchJson<{ profile: UserProfile }>("/auth/profile/"),
  ]);
  const biz = data?.results?.[0] ?? EMPTY_BUSINESS;
  const profile = profileData?.profile ?? EMPTY_PROFILE;
  const isNew = biz.id === 0;

  return (
    <>
      <div className="app-pagebar">
        <div>
          <h1>Settings</h1>
          <p>Business profile, channels, and integrations.</p>
        </div>
        <div className="app-pagebar-actions" />
      </div>

      <div className="app-content">
        {isNew && (
          <div className="settings-onboarding-banner">
            <strong>No business configured yet.</strong>
            <span>Fill in the profile below and hit save to create one.</span>
          </div>
        )}
        <SettingsTabs business={biz} profile={profile} />
      </div>
    </>
  );
}
