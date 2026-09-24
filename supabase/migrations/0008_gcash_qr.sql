-- Stores the shop's GCash QR code image (uploaded via Storage, same pattern
-- as product photos) so customers can scan-and-pay at checkout, and admins
-- can replace it any time payment details change.
--
-- SAFE TO RE-RUN — see the header note in 0001_init.sql.
alter table business_settings add column if not exists gcash_qr_url text;
