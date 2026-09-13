"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Bike } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export default function WelcomePage() {
  const { setFulfillmentType } = useCart();

  return (
    <main className="min-h-screen flex flex-col justify-between px-6 pb-10 pt-14 max-w-md mx-auto">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative h-24 w-24 rounded-full overflow-hidden shadow-card transition-transform duration-300 ease-out hover:scale-110 cursor-pointer">
          <Image
            src="/images/brand/logo.jpg"
            alt="O, How? Coffee & Drinks"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div>
          <h1 className="font-headline text-3xl font-bold text-brand-dark">
            Welcome!
          </h1>
          <p className="mt-2 text-ink-muted">
            Good coffee, good drinks — thirst for more.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-10">
        <Link
          href="/menu"
          onClick={() => setFulfillmentType("pickup")}
          className="group flex items-center gap-4 rounded-2xl bg-brand text-cream px-5 py-4 shadow-card transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-card-hover"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream/15 transition-transform duration-300 ease-out group-hover:scale-110">
            <ShoppingBag size={20} />
          </span>
          <span className="text-left">
            <span className="block font-headline font-semibold text-base">Pick Up</span>
            <span className="block text-xs text-cream/80">Grab it yourself, no wait</span>
          </span>
        </Link>

        <Link
          href="/menu"
          onClick={() => setFulfillmentType("delivery")}
          className="group flex items-center gap-4 rounded-2xl bg-brand-light text-brand-dark px-5 py-4 shadow-card transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-card-hover"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 transition-transform duration-300 ease-out group-hover:scale-110">
            <Bike size={20} />
          </span>
          <span className="text-left">
            <span className="block font-headline font-semibold text-base">Delivery</span>
            <span className="block text-xs text-brand-dark/70">Straight to your door</span>
          </span>
        </Link>

        <p className="text-center text-xs text-ink-muted mt-2">
          No account needed — order as a guest.
        </p>
      </div>
    </main>
  );
}
