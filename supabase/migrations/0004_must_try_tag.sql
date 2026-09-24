-- Adds a second, distinct merchandising tag. Bestseller and Must Try are
-- independent flags (a product could theoretically carry both, though the
-- admin UI treats them as mutually exclusive at a glance since only one
-- pill shows per card, matching the Grab-style menu card design).
--
-- SAFE TO RE-RUN — see the header note in 0001_init.sql.
alter table products add column if not exists is_must_try boolean not null default false;
