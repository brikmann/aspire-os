import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { Toaster } from "sonner";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-midnight">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-midnight-light)',
              border: '1px solid var(--color-midnight-edge)',
              color: 'var(--color-silver-bright)',
              borderRadius: '16px',
            },
          }}
        />
      </body>
    </html>
  );
}
