import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "./providers"
import { Sidebar } from "@/components/sidebar"

export const metadata: Metadata = {
  title: "FNDRS Lead Engine",
  description: "Internal lead management and analysis tool",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-[#08080a] text-zinc-100 antialiased">
        <Providers>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
