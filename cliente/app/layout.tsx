import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Sidebar } from "@/components/sidebar"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

export const metadata: Metadata = {
  title: "FNDRS Lead Engine",
  description: "Internal lead management and analysis tool",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-zinc-950 text-zinc-100 antialiased">
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
