import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYNTAX IDE — Beyond the Code",
  description: "A local-first development environment for builders. Discover SYNTAX IDE by Ekop Designz Hub.",
  applicationName: "SYNTAX IDE",
  openGraph: { title: "SYNTAX IDE — Beyond the Code", description: "A considered development environment for people who turn ideas into working software.", type: "website" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (<html lang="en"><body>{children}</body></html>);
}
