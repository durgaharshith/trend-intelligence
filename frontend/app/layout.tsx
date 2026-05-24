import type { Metadata } from "next";
import { Inter } from "next/font/google";
// @ts-ignore
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Trend Intelligence", template: "%s | Trend Intelligence" },
  description: "Real-time developer trend intelligence and community insights from monitored technical networks, open-source repositories, and publication feeds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
