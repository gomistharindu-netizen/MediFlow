import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MediFlowProvider } from "@/context/MediFlowContext";
import { ToastProvider } from "@/components/ui/Toast";

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
  description: "MediFlow Clinic & Patient Management System by TM Digital Solution",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F4F9F8] text-[#243746]">
        <ToastProvider>
          <MediFlowProvider>
            {children}
          </MediFlowProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
