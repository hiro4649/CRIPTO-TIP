import type { ReactNode } from "react";
import "./style.css";

export const metadata = {
  title: "IRIS Web Companion",
  description: "IRIS Web Companion for YouTube LIVE Crypto Tip"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
