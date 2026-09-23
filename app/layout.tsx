import type { Metadata } from "next";
import { Anton, Caprasimo, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Caprasimo is the display face cafebinocle.com uses (it's on Google Fonts).
// Its body face is Founders Grotesk, which is a commercial Klim licence, so
// Space Grotesk stands in for it here rather than copying their font files.
const caprasimo = Caprasimo({
  subsets: ["latin"],
  variable: "--font-caprasimo",
  display: "swap",
  weight: "400",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

// Heavy condensed face for the oversized wordmark, which gets the wave
// distortion applied on top (their wordmark uses a custom font, "Cimo").
const anton = Anton({
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
  weight: "400",
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
    <html
      lang="en"
      className={`h-full ${caprasimo.variable} ${grotesk.variable} ${anton.variable}`}
    >
      <head>
        <noscript>
          {/* Reveal animations start hidden; without JS they must still show. */}
          <style>{`[data-reveal-item],[data-reveal-text]{opacity:1!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
