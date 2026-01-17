-- SIY Database Schema for Supabase
-- Run this in the Supabase SQL Editor to set up your tables

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
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


-- Clothing Items table

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
    price DECIMAL(10, 2),
    source_url TEXT,
    ownership TEXT DEFAULT 'owned' CHECK (ownership IN ('owned', 'wishlist')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clothing_items
CREATE INDEX idx_clothing_items_user_id ON public.clothing_items(user_id);
CREATE INDEX idx_clothing_items_category ON public.clothing_items(category_l1, category_l2);

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


-- Outfits table

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


-- Outfit Items (join table)

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


-- Storage Buckets
-- Create these buckets in Supabase Storage:
-- 1. 'clothing-images' - for user uploaded clothing images
-- 2. 'user-photos' - for user full-body photos (for try-on)
-- 3. 'generated-images' - for AI-generated try-on images