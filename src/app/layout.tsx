import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { AppStateProvider } from "@/components/providers/app-state-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "SERENE",
  description: "Base do app SERENE criada para desenvolvimento incremental.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-theme="system">
      <body className="antialiased">
        <AppStateProvider>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
