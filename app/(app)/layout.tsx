import Navbar from "@/app/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
