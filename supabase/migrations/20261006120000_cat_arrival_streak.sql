-- The streak shown on a cat's card can be set when the cat arrives (for example, cats added by hand for a demo).
-- When empty, the card keeps counting the passed daily challenges up to the arrival day.
alter table public.cat_unlocks add column if not exists arrival_streak smallint check (arrival_streak between 1 and 365);
