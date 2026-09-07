-- SIY Database Schema for Supabase
-- Run this in the Supabase SQL Editor to set up your tables

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users table (extends Supabase auth.users)
-- ============================================
-- Note: Supabase Auth already creates auth.users
-- This table stores additional profile data

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- Clothing Items table
-- ============================================

CREATE TABLE IF NOT EXISTS public.clothing_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT,
    
    -- Color data
    color_hex TEXT NOT NULL,
    color_hsl JSONB NOT NULL DEFAULT '{"h": 0, "s": 0, "l": 0}',
    color_name TEXT NOT NULL,
    is_neutral BOOLEAN DEFAULT FALSE,
    
    -- Category
    category_l1 TEXT NOT NULL CHECK (category_l1 IN ('Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear', 'Full Body')),
    category_l2 TEXT NOT NULL,
    
    -- Style attributes
    formality FLOAT NOT NULL CHECK (formality >= 1.0 AND formality <= 5.0),
    aesthetics TEXT[] DEFAULT '{}',
    
    -- Optional metadata
    brand TEXT,
    sizing JSONB,
    price DECIMAL(10, 2),
    source_url TEXT,
    ownership TEXT DEFAULT 'owned' CHECK (ownership IN ('owned', 'wishlist')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clothing_items
CREATE INDEX idx_clothing_items_user_id ON public.clothing_items(user_id);
CREATE INDEX idx_clothing_items_category ON public.clothing_items(category_l1, category_l2);

-- Sizing backfill migration
ALTER TABLE public.clothing_items
    ADD COLUMN IF NOT EXISTS sizing JSONB;


-- Enable RLS
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clothing_items
CREATE POLICY "Users can view own items" 
    ON public.clothing_items FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own items" 
    ON public.clothing_items FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" 
    ON public.clothing_items FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" 
    ON public.clothing_items FOR DELETE 
    USING (auth.uid() = user_id);


-- ============================================
-- Outfits table
-- ============================================

CREATE TABLE IF NOT EXISTS public.outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    generated_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for outfits
CREATE INDEX idx_outfits_user_id ON public.outfits(user_id);

-- Enable RLS
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outfits
CREATE POLICY "Users can view own outfits" 
    ON public.outfits FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own outfits" 
    ON public.outfits FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outfits" 
    ON public.outfits FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outfits" 
    ON public.outfits FOR DELETE 
    USING (auth.uid() = user_id);


-- ============================================
-- Outfit Items (join table)
-- ============================================

CREATE TABLE IF NOT EXISTS public.outfit_items (
    outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE,
    clothing_item_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (outfit_id, clothing_item_id)
);

-- Indexes for outfit_items
CREATE INDEX idx_outfit_items_outfit_id ON public.outfit_items(outfit_id);
CREATE INDEX idx_outfit_items_clothing_item_id ON public.outfit_items(clothing_item_id);

-- Enable RLS
ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outfit_items (join through outfit ownership)
CREATE POLICY "Users can view own outfit items" 
    ON public.outfit_items FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.outfits 
            WHERE outfits.id = outfit_items.outfit_id 
            AND outfits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own outfit items" 
    ON public.outfit_items FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.outfits 
            WHERE outfits.id = outfit_items.outfit_id 
            AND outfits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own outfit items" 
    ON public.outfit_items FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.outfits 
            WHERE outfits.id = outfit_items.outfit_id 
            AND outfits.user_id = auth.uid()
        )
    );


-- ============================================
-- Storage Buckets (run in Supabase Dashboard)
-- ============================================
-- Create these buckets in Supabase Storage:
-- 1. 'clothing-images' - for user uploaded clothing images
-- 2. 'user-photos' - for user full-body photos (for try-on)
-- 3. 'generated-images' - for AI-generated try-on images

-- Example storage policies (add via Dashboard):
-- 
-- clothing-images bucket:5

--   - SELECT: auth.uid() = owner
--   - INSERT: auth.uid() = owner
--   - DELETE: auth.uid() = owner
--
-- generated-images bucket:
--   - SELECT: true (public read for generated images)
--   - INSERT: service_role only (API inserts)


-- ============================================
-- Rate limiting counters
-- ============================================
-- Shared across Cloud Run instances. The app previously kept try-on counters
-- in a per-process dict, so the effective limit was multiplied by the instance
-- count and reset on every cold start (--min-instances 0 means that is often).
-- This table is the single source of truth; see app/services/rate_limit.py.

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
    bucket_key   TEXT        NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count        INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket_key, window_start)
);

-- Deny-all: no policies are defined, and RLS blocks every role except
-- service_role (which bypasses RLS). Only the backend touches this table.
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Fixed-window counter. Returns the decision for ONE request and records it.
--
-- Fixed rather than sliding: a sliding window needs a row per request, turning
-- one write into many. The tradeoff is that a caller can spend a full budget
-- at the end of one window and again at the start of the next (up to 2x the
-- nominal rate across a boundary). Limits are set with that in mind.
DROP FUNCTION IF EXISTS public.consume_rate_limit(TEXT, INTEGER, INTEGER);

CREATE FUNCTION public.consume_rate_limit(
    p_key            TEXT,
    p_limit          INTEGER,
    p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count        INTEGER;
BEGIN
    -- Floor now() onto a window boundary so every instance agrees on the bucket.
    v_window_start := to_timestamp(
        floor(extract(EPOCH FROM now()) / p_window_seconds) * p_window_seconds
    );

    -- Atomic read-modify-write: concurrent callers on different instances
    -- serialize on the primary key rather than racing.
    INSERT INTO public.rate_limit_counters AS c (bucket_key, window_start, count)
    VALUES (p_key, v_window_start, 1)
    ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET count = c.count + 1
    RETURNING c.count INTO v_count;

    -- Keep the table bounded without pg_cron: each write clears its own key's
    -- expired windows.
    DELETE FROM public.rate_limit_counters
    WHERE bucket_key = p_key AND window_start < v_window_start;

    allowed   := v_count <= p_limit;
    remaining := greatest(0, p_limit - v_count);
    retry_after := CASE
        WHEN v_count <= p_limit THEN 0
        ELSE greatest(1, ceil(extract(
            EPOCH FROM (v_window_start + make_interval(secs => p_window_seconds)) - now()
        ))::INTEGER)
    END;
    RETURN NEXT;
END;
$$;

-- Only the backend's service role may consume budget. A leaked anon key must
-- not be able to burn another user's allowance or reset its own.
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
    FROM PUBLIC, anon, authenticated;
