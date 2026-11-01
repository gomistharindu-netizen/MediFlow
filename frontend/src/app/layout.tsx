import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClinicProvider } from "@/contexts/ClinicContext";
import { IdleTimeoutTracker } from "@/components/IdleTimeoutTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediFlow — Clinic & Patient Management System",
  description: "Modern, high-performance outpatient clinic management system for Sri Lankan general practices and specialist clinics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F4F9F8] text-[#243746]">
        <ClinicProvider>
          {children}
          <IdleTimeoutTracker timeoutMinutes={15} warningSeconds={60} />
        </ClinicProvider>
      </body>
    </html>
  );
}
