import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Super Admin Portal | Ev Sale Pos",
  description: "Platform Administration and Tenant Management",
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}

