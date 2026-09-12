-- If the old (non-idempotent) seed file was ever run more than once, there
-- may already be duplicate (option_group_id, name) rows. Clean those up
-- first, keeping the earliest row of each duplicate set, so the constraint
-- below can actually be added.
delete from product_options a using product_options b
where a.option_group_id = b.option_group_id
  and a.name = b.name
  and a.id > b.id;

-- A product's option names must be unique within their group (e.g. you can't
-- have two "16oz" options under the same "Size" group). This was always true
-- in practice but wasn't enforced — enforcing it now gives the seed file a
-- stable conflict target so it can be re-run safely instead of erroring with
-- duplicate-key failures or silently duplicating rows every time the menu
-- changes.
alter table product_options
  add constraint product_options_group_name_unique unique (option_group_id, name);
