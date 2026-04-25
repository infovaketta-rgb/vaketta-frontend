// src/app/layout.tsx

import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "Vaketta Chat — AI-Powered Business Automation",
  description: "Automate guest communication, manage bookings, and run your operations from one unified platform. Built for hotels and service businesses.",
  icons: {
    icon: "/vchat icon.png",
    shortcut: "/vchat icon.png",
    apple: "/vchat icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}