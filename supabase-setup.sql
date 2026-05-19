-- ============================================================
-- SHALLU E-BOOKS: Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. BOOKS TABLE
CREATE TABLE IF NOT EXISTS public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  cover_url TEXT,
  download_url TEXT,
  category TEXT DEFAULT 'General',
  total_pages INTEGER,
  language TEXT DEFAULT 'English',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  book_title TEXT NOT NULL,
  book_author TEXT NOT NULL,
  book_cover_url TEXT,
  download_url TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- BOOKS policies (public read, admin write)
CREATE POLICY "Anyone can view active books" ON public.books
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can do all on books" ON public.books
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- RATINGS policies
CREATE POLICY "Anyone can view ratings" ON public.ratings
  FOR SELECT USING (TRUE);
CREATE POLICY "Logged in users can insert ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON public.ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- ORDERS policies
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- View: books with average rating
CREATE OR REPLACE VIEW public.books_with_ratings AS
SELECT
  b.*,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COUNT(r.id) AS rating_count
FROM public.books b
LEFT JOIN public.ratings r ON b.id = r.book_id
GROUP BY b.id;

-- ============================================================
-- SAMPLE DATA (optional - for testing)
-- ============================================================
INSERT INTO public.books (title, author, description, price, cover_url, download_url, category, total_pages, language) VALUES
  ('The Art of Clean Code', 'Robert C. Martin', 'A handbook of agile software craftsmanship that every developer must read. Learn how to write code that is readable, maintainable, and elegant.', 299, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80', '#', 'Technology', 464, 'English'),
  ('Atomic Habits', 'James Clear', 'An easy and proven way to build good habits and break bad ones. Tiny changes, remarkable results with a practical framework.', 349, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', '#', 'Self-Help', 320, 'English'),
  ('Deep Work', 'Cal Newport', 'Rules for focused success in a distracted world. How to achieve peak productivity and perform at your absolute best.', 279, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', '#', 'Productivity', 296, 'English'),
  ('Zero to One', 'Peter Thiel', 'Notes on startups, or how to build the future. Every moment in business happens only once - learn how to create something truly new.', 399, 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&q=80', '#', 'Business', 224, 'English'),
  ('Sapiens', 'Yuval Noah Harari', 'A brief history of humankind from the Stone Age to the present day. How Homo sapiens came to dominate the world.', 449, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80', '#', 'History', 443, 'English'),
  ('The Psychology of Money', 'Morgan Housel', 'Timeless lessons on wealth, greed, and happiness. How to think about money, investments, and financial decisions.', 329, 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&q=80', '#', 'Finance', 256, 'English');

-- ============================================================
-- MAKE YOURSELF AN ADMIN (run after signing up)
-- Replace 'your-email@example.com' with your actual email
-- ============================================================
-- UPDATE public.profiles 
-- SET is_admin = TRUE 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
