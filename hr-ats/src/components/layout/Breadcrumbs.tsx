import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { humanizeEnum } from "@/lib/utils";

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--color-ink)]/50">
      <Link to="/jobs" className="hover:text-[var(--color-ink)]">
        Home
      </Link>
      {segments.map((seg, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const isId = /^[0-9a-fA-F-]+$/.test(seg) && seg.length > 0 && /\d/.test(seg) && segments[i - 1] !== "settings";
        const label = isId ? `#${seg}` : humanizeEnum(seg);
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="font-medium text-[var(--color-ink)]">{label}</span>
            ) : (
              <Link to={`${path}`} className="hover:text-[var(--color-ink)]">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
