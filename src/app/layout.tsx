import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = localFont({ src: './fonts/GeistVF.woff', variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: "Jilite",
  description: "Un espacio para tus proyectos, ideas y próximos pasos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("dark font-sans", geist.variable)}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
