from supabase import create_client, Client
from app.config import get_settings

settings = get_settings()

# Public client (uses anon key, respects RLS)
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_key
)

# Admin client (uses service role key, bypasses RLS)
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_key
)


def get_supabase() -> Client:
    """Get the public Supabase client."""
    return supabase


def get_supabase_admin() -> Client:
    """Get the admin Supabase client (bypasses RLS)."""
    return supabase_admin