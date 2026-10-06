import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ARRIVAL_SCRIPT } from "@/lib/arrival";
import { cn } from "@/lib/utils";
import AuthHydrator from "@/app/components/AuthHydrator";
import FruitTransition from "@/app/components/motion/FruitTransition";
import PageTransition from "@/app/components/motion/PageTransition";
import SmoothScroll from "@/app/components/motion/SmoothScroll";
import Toaster from "@/app/components/Toaster";

// The type pairing from faceiqlabs.com: Playfair Display for headlines,
// Manrope for everything else. Both are open-source Google Fonts.
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MealPlan Pro",
  description:
    "Keep your recipes in one place, plan the week in minutes, and let the Recipe Bot fill the gaps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the head script below may add a class to
    // <html> before React hydrates it.
    <html
      lang="en"
      className={cn("h-full", playfair.variable, manrope.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Before the first paint: a page opened by the sign-in transition
            starts under that transition's dark panel (see lib/arrival.ts). */}
        <script dangerouslySetInnerHTML={{ __html: ARRIVAL_SCRIPT }} />
        <noscript>
          {/* Reveal animations start hidden; without JS they must still show. */}
          <style>{`[data-reveal-item],[data-reveal-text]{opacity:1!important}.fruit-intro,.plate-stage{display:none!important}`}</style>
        </noscript>
      </head>
      {/* Extensions (ColorZilla, Grammarly and friends) add attributes to
          <body> before React hydrates. This silences the attribute diff on
          this element only — children are still checked as normal. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <a href="#main" className="skip-link btn btn-primary">
          Skip to content
        </a>
        <AuthHydrator />
        <SmoothScroll />
        <PageTransition>{children}</PageTransition>
        {/* Outside PageTransition: it carries the visitor across a route
            change and must not fade with the page it leaves. */}
        <FruitTransition />
        <Toaster />
      </body>
    </html>
  );
}
