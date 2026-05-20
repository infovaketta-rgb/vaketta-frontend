// src/app/layout.tsx

import "./globals.css";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <SpeedInsights />
        {/* Facebook JS SDK — loaded once globally for WhatsApp and Instagram connect flows */}
        <Script id="fb-sdk-init" strategy="afterInteractive">{`
          window.fbAsyncInit = function() {
            FB.init({
              appId:            '${process.env.NEXT_PUBLIC_META_APP_ID}',
              autoLogAppEvents: true,
              xfbml:            true,
              version:          'v25.0'
            });
          };
        `}</Script>
        <Script
          id="facebook-jssdk"
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}