import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "Aspire OS — The operating system for human optimization.",
  description:
    "4Foundations is a private AI coach for founders and ambitious people who won't let their body be the reason they fall short.",
  icons: {
    icon: "/favicon-trifoil.png",
    apple: "/favicon-trifoil.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-midnight">{children}</body>
    </html>
  );
}
