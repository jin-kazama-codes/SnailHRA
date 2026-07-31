-- SQL migration script to create the workspace seating layouts, rooms, and room bookings tables in Supabase

-- 1. seat_layouts table
CREATE TABLE IF NOT EXISTS public.seat_layouts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sections JSONB DEFAULT '[]'::jsonb,
    seats JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Index for layout lookup by company_id
CREATE INDEX IF NOT EXISTS idx_seat_layouts_company_id ON public.seat_layouts(company_id);

-- 2. rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 6,
    amenities JSONB DEFAULT '[]'::jsonb,
    floor TEXT,
    branch TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rooms lookup by company_id
CREATE INDEX IF NOT EXISTS idx_rooms_company_id ON public.rooms(company_id);

-- 3. room_bookings table
CREATE TABLE IF NOT EXISTS public.room_bookings (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    room_name TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    requested_by_name TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    purpose TEXT,
    attendees JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'Pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for room bookings
CREATE INDEX IF NOT EXISTS idx_room_bookings_company_id ON public.room_bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON public.room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_date ON public.room_bookings(date);

-- 4. custom_amenities table
CREATE TABLE IF NOT EXISTS public.custom_amenities (
    id SERIAL PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for dynamic amenities lookup by company_id
CREATE INDEX IF NOT EXISTS idx_custom_amenities_company_id ON public.custom_amenities(company_id);
