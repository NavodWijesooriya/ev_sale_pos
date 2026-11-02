import { Roboto } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster } from "@/components/ui/sonner"

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
})

export const metadata = {
  title: "EV Sale POS - Code GN",
  description: "Multi-Tenant EV Dealership ERP",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
