import { brand } from "@/config/brand";

import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: brand.displayName, template: `%s | ${brand.displayName}` },
  description: brand.description,
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
