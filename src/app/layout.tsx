import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { VersionLog } from "@/components/VersionLog";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "著色圖魔法屋",
  description: "把照片變成好玩的著色圖！",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.className} antialiased`}>
        <VersionLog />
        {children}
      </body>
    </html>
  );
}
