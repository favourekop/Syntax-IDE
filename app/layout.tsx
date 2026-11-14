import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYNTAX IDE — Beyond the Code",
  description: "A powerful desktop-first development environment by Ekop Designz Hub.",
  applicationName: "SYNTAX IDE"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
