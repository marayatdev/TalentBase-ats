import { Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-xl border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
            <Clock3 className="h-8 w-8 text-[var(--color-primary)]" />
          </div>

          <Badge variant="secondary" className="mb-4">
            Under Development
          </Badge>

          <h1 className="text-4xl font-bold">Coming Soon</h1>

          <p className="mt-4 text-muted-foreground">
            This dashboard is currently under development.
            Exciting features and analytics will be available soon.
          </p>


        </CardContent>
      </Card>
    </div>
  );
}