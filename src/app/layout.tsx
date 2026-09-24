import type { Metadata } from "next";
import { CartProvider } from "@/lib/cart-context";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "O, How? Coffee & Drinks",
  description: "Order ahead for pickup or delivery — no app required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
