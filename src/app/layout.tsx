// src/app/layout.tsx

import "./globals.css";

export const metadata = {
  title: "Vaketta PMS",
  description: "Hotel Automation System",
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
