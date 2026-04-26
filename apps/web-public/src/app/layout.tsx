import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CommunitySidebar } from "@/components/layout/CommunitySidebar";
import { CommunityTopbar } from "@/components/layout/CommunityTopbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SCR-Mesh Community Portal",
  description: "Smart Crisis Response — Neighborhood Safety",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0c10]`}>
        <div className="flex min-h-screen">
          <CommunitySidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <CommunityTopbar />
            <main className="flex-1 overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
