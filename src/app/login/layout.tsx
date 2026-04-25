import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Vaketta Chat",
  description: "Sign in to your Vaketta hotel management dashboard.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
