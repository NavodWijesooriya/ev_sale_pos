import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function SuperAdminLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Skeleton */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Title row */}
        <div className="space-y-2 pb-2 border-b">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="size-8 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-44" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Big Table Card */}
        <Card className="border-border/80">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
