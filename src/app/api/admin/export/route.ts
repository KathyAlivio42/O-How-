import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const first = rows[0];
  if (!first) return "";
  const headers = Object.keys(first);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const supabase = createAdminClient();

  let csv = "";
  let filename = "export.csv";

  if (type === "orders") {
    const { data } = await supabase
      .from("orders")
      .select("order_number, created_at, customer_name, customer_mobile, fulfillment_type, status, payment_method, payment_status, subtotal, delivery_fee, total")
      .order("created_at", { ascending: false })
      .limit(5000);
    csv = toCsv(data ?? []);
    filename = "orders.csv";
  } else if (type === "sales") {
    const { data } = await supabase
      .from("sales_daily")
      .select("*")
      .order("sales_date", { ascending: false })
      .limit(3650);
    csv = toCsv(data ?? []);
    filename = "sales.csv";
  } else if (type === "customers") {
    const { data } = await supabase
      .from("customers")
      .select("full_name, mobile_number, order_count, total_spent, last_order_at, created_at")
      .order("total_spent", { ascending: false })
      .limit(5000);
    csv = toCsv(data ?? []);
    filename = "customers.csv";
  } else {
    return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
