import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "dev-api-dashboard (learning demo)",
  description: "Learning project: developer API dashboard with a mocked backend.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header className="site">
          <Link className="brand" href="/">dev-api-dashboard</Link>
          <Nav />
        </header>
        <p className="banner" role="note">
          Learning demo: all data is mocked and seeded in memory. No real API, billing or users.
        </p>
        <main id="main" tabIndex={-1}>{children}</main>
      </body>
    </html>
  );
}
