import { useState } from "react";
import { toast } from "sonner";
import { Globe, CheckCircle2, XCircle, Loader2, Share2, Link2, Sparkles, Briefcase, UploadCloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/api/axios";

const API_BASE_URL = "http://localhost:3000/api";

const steps = [
  { icon: Share2, text: "Open Facebook or LinkedIn" },
  { icon: Link2, text: "Highlight the candidate post text" },
  { icon: Globe, text: "Open the HR Candidate Importer extension" },
  { icon: Sparkles, text: "Review AI extracted information" },
  { icon: Briefcase, text: "Select a job" },
  { icon: UploadCloud, text: "Import candidate" },
];

export default function BrowserExtensionPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "checking" | "connected" | "failed">("idle");

  async function testConnection() {
    setStatus("checking");
    try {
      await api.get("/health", { timeout: 4000 });
      setStatus("connected");
      toast.success("Connected to the backend API");
    } catch {
      setStatus("failed");
      toast.error("Could not reach the backend API");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Browser Extension" description="Connect the HR Candidate Importer Chrome extension to this account." />

      <Card>
        <CardHeader>
          <CardTitle>Connection status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center justify-between rounded-lg border border-black/[0.06] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-surface-muted)]"><Globe className="h-5 w-5 text-[var(--color-primary)]" /></div>
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">HR Candidate Importer extension</p>
                <p className="text-xs text-[var(--color-ink)]/50">Detects installation status when opened from Chrome</p>
              </div>
            </div>
            <Badge variant="muted">Not detected</Badge>
          </div>

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-black/[0.015] p-3">
              <dt className="text-xs text-[var(--color-ink)]/50">Backend API URL</dt>
              <dd className="mt-0.5 font-mono text-xs text-[var(--color-ink)]">{API_BASE_URL}</dd>
            </div>
            <div className="rounded-lg bg-black/[0.015] p-3">
              <dt className="text-xs text-[var(--color-ink)]/50">Logged-in HR account</dt>
              <dd className="mt-0.5 text-[var(--color-ink)]">{user?.name} ({user?.email})</dd>
            </div>
          </dl>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={testConnection} disabled={status === "checking"}>
              {status === "checking" && <Loader2 className="h-4 w-4 animate-spin" />}
              Test connection
            </Button>
            {status === "connected" && <span className="flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Backend reachable</span>}
            {status === "failed" && <span className="flex items-center gap-1 text-sm text-red-600"><XCircle className="h-4 w-4" /> Backend unreachable</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install the Chrome extension</CardTitle>
          <CardDescription>The extension lets HR staff import candidates directly from a highlighted post — no bulk scraping.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-sm text-[var(--color-ink)]/75">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Download the extension package from your admin-provided link.</li>
            <li>Open <span className="font-mono text-xs">chrome://extensions</span> and enable Developer mode.</li>
            <li>Click "Load unpacked" and select the extension folder.</li>
            <li>Sign in with your HR account when prompted.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example workflow</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-xs font-semibold text-[var(--color-primary)]">{i + 1}</span>
                <s.icon className="h-4 w-4 text-[var(--color-ink)]/40" />
                <span className="text-sm text-[var(--color-ink)]/80">{s.text}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
