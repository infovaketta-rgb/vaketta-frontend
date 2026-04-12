// src/app/layout.tsx

import "./globals.css";

export const metadata = {
  title: "Vaketta — AI-Powered Business Automation",
  description: "Automate guest communication, manage bookings, and run your operations from one unified platform. Built for hotels and service businesses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
