-- =============================================================
-- نبض الجزيرة – قاعدة البيانات (Supabase / Postgres)
-- تُشغَّل مرة واحدة في SQL Editor لمشروع Supabase جديد.
-- قبل التشغيل: غيّر البريد في آخر الملف إلى بريد مدير الموقع.
-- =============================================================

-- الأقسام
create table if not exists public.categories (
  id    serial primary key,
  name  text not null unique,
  sort  int  not null default 0
);

-- الأخبار
create table if not exists public.posts (
  id           bigint generated always as identity primary key,
  title        text not null check (char_length(title) between 3 and 300),
  excerpt      text,
  content      text not null default '',
  image_url    text,
  category_id  int references public.categories(id) on delete set null,
  author       text,
  is_breaking  boolean not null default false,
  is_featured  boolean not null default false,
  published    boolean not null default false,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  views        int not null default 0
);
create index if not exists posts_pub_idx  on public.posts (published, published_at desc);
create index if not exists posts_cat_idx  on public.posts (category_id, published_at desc);

-- المحررون المسموح لهم بالنشر (يُطابَق ببريد حساب الدخول)
create table if not exists public.editors (
  email      text primary key check (email = lower(email)),
  name       text,
  role       text not null default 'editor' check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

-- دوال الصلاحيات
create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.editors e where e.email = lower(coalesce(auth.jwt() ->> 'email','')));
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.editors e where e.email = lower(coalesce(auth.jwt() ->> 'email','')) and e.role = 'admin');
$$;
revoke execute on function public.is_editor() from public, anon;
revoke execute on function public.is_admin()  from public, anon;
grant  execute on function public.is_editor() to authenticated;
grant  execute on function public.is_admin()  to authenticated;

-- تحديث وقت التعديل تلقائياً
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();

-- عدّاد القراءات (يستدعيه الموقع والتطبيق؛ لا يتيح أي تعديل آخر)
create or replace function public.increment_views(post_id bigint) returns void
language sql security definer set search_path = '' as $$
  update public.posts set views = views + 1 where id = post_id and published;
$$;
grant execute on function public.increment_views(bigint) to anon, authenticated;

-- ---------------- سياسات الأمان (RLS) ----------------
alter table public.categories enable row level security;
alter table public.posts      enable row level security;
alter table public.editors    enable row level security;

drop policy if exists "categories read"  on public.categories;
drop policy if exists "categories admin" on public.categories;
create policy "categories read"  on public.categories for select to anon, authenticated using (true);
create policy "categories admin" on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "posts read published" on public.posts;
drop policy if exists "posts editors read"   on public.posts;
drop policy if exists "posts editors insert" on public.posts;
drop policy if exists "posts editors update" on public.posts;
drop policy if exists "posts editors delete" on public.posts;
create policy "posts read published" on public.posts for select to anon using (published and published_at <= now());
create policy "posts editors read"   on public.posts for select to authenticated using ((published and published_at <= now()) or (select public.is_editor()));
create policy "posts editors insert" on public.posts for insert to authenticated with check ((select public.is_editor()));
create policy "posts editors update" on public.posts for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy "posts editors delete" on public.posts for delete to authenticated using ((select public.is_editor()));

drop policy if exists "editors read"  on public.editors;
drop policy if exists "editors admin" on public.editors;
create policy "editors read"  on public.editors for select to authenticated using ((select public.is_editor()));
create policy "editors admin" on public.editors for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- القارئ (anon) لا يرى عدد القراءات فقط عبر select، ولا يكتب أي شيء
revoke insert, update, delete on public.posts, public.categories, public.editors from anon;

-- ---------------- تخزين الصور ----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "images editors select" on storage.objects;
drop policy if exists "images editors insert" on storage.objects;
drop policy if exists "images editors update" on storage.objects;
drop policy if exists "images editors delete" on storage.objects;
create policy "images editors select" on storage.objects for select to authenticated using (bucket_id = 'images' and (select public.is_editor()));
create policy "images editors insert" on storage.objects for insert to authenticated with check (bucket_id = 'images' and (select public.is_editor()));
create policy "images editors update" on storage.objects for update to authenticated using (bucket_id = 'images' and (select public.is_editor()));
create policy "images editors delete" on storage.objects for delete to authenticated using (bucket_id = 'images' and (select public.is_editor()));

-- ---------------- بيانات أولية ----------------
insert into public.categories (name, sort) values
  ('أخبار الولاية',1), ('المحليات',2), ('مشروع الجزيرة والزراعة',3), ('اقتصاد',4),
  ('صحة',5), ('تعليم',6), ('رياضة',7), ('مقالات الرأي',8), ('ثقافة ومجتمع',9)
on conflict (name) do nothing;

-- ⚠️ غيّر هذا البريد إلى بريد مدير الموقع (بحروف صغيرة)
insert into public.editors (email, name, role) values ('admin@example.com', 'مدير الموقع', 'admin')
on conflict (email) do update set role = 'admin';
