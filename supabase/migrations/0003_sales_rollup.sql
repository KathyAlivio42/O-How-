-- =========================================================
-- Keeps sales_daily in sync automatically when an order's status changes
-- to 'completed'. Only counts each order once (guards on the OLD status
-- not already being 'completed') and never double-counts cancellations.
-- =========================================================

create or replace function sync_sales_daily()
returns trigger as $$
declare
  v_date date;
  v_items_sold int;
begin
  -- Only act on the transition INTO 'completed'.
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    v_date := (new.created_at at time zone 'Asia/Manila')::date;

    select coalesce(sum(quantity), 0) into v_items_sold
    from order_items where order_id = new.id;

    insert into sales_daily (
      sales_date, gross_sales, order_count, items_sold,
      pickup_revenue, delivery_revenue, cash_revenue, gcash_revenue, card_revenue
    ) values (
      v_date,
      new.total,
      1,
      v_items_sold,
      case when new.fulfillment_type = 'pickup' then new.total else 0 end,
      case when new.fulfillment_type = 'delivery' then new.total else 0 end,
      case when new.payment_method = 'cash' then new.total else 0 end,
      case when new.payment_method = 'gcash' then new.total else 0 end,
      case when new.payment_method = 'card' then new.total else 0 end
    )
    on conflict (sales_date) do update set
      gross_sales = sales_daily.gross_sales + excluded.gross_sales,
      order_count = sales_daily.order_count + excluded.order_count,
      items_sold = sales_daily.items_sold + excluded.items_sold,
      pickup_revenue = sales_daily.pickup_revenue + excluded.pickup_revenue,
      delivery_revenue = sales_daily.delivery_revenue + excluded.delivery_revenue,
      cash_revenue = sales_daily.cash_revenue + excluded.cash_revenue,
      gcash_revenue = sales_daily.gcash_revenue + excluded.gcash_revenue,
      card_revenue = sales_daily.card_revenue + excluded.card_revenue,
      updated_at = now();
  end if;

  -- If a previously-completed order is later cancelled/refunded, back it out.
  if old.status = 'completed' and new.status in ('cancelled') then
    v_date := (new.created_at at time zone 'Asia/Manila')::date;

    select coalesce(sum(quantity), 0) into v_items_sold
    from order_items where order_id = new.id;

    update sales_daily set
      gross_sales = gross_sales - new.total,
      order_count = greatest(order_count - 1, 0),
      items_sold = greatest(items_sold - v_items_sold, 0),
      pickup_revenue = pickup_revenue - case when new.fulfillment_type = 'pickup' then new.total else 0 end,
      delivery_revenue = delivery_revenue - case when new.fulfillment_type = 'delivery' then new.total else 0 end,
      cash_revenue = cash_revenue - case when new.payment_method = 'cash' then new.total else 0 end,
      gcash_revenue = gcash_revenue - case when new.payment_method = 'gcash' then new.total else 0 end,
      card_revenue = card_revenue - case when new.payment_method = 'card' then new.total else 0 end,
      updated_at = now()
    where sales_date = v_date;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_sync_sales_daily
  after update on orders
  for each row execute function sync_sales_daily();
