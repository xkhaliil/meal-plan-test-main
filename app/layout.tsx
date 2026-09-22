import type { Metadata } from "next";
import ClientChaosShell from "@/app/components/ClientChaosShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chef",
  description: "AI-powered meal planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <ClientChaosShell>{children}</ClientChaosShell>
      </body>
    </html>
  );
}
