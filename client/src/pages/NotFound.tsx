import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
        <Compass className="h-7 w-7 text-[var(--color-primary)]" />
      </div>
      <div>
        <p className="text-lg font-semibold text-[var(--color-ink)]">Page not found</p>
        <p className="mt-1 text-sm text-[var(--color-ink)]/55">The page you're looking for doesn't exist or has moved.</p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
