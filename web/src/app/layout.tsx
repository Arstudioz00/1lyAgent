import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "1ly Agent Commerce Demo",
  description: "Live dashboard for sovereign agent commerce"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
