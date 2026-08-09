import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Kanban, Trash2, Users2, Calendar, Wallet, Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { JobStatusBadge } from "@/components/shared/StatusBadges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useJob, useDeleteJob } from "@/hooks/useJobs";
import { useApplications } from "@/hooks/useApplications";
import { formatCurrency, formatDate, humanizeEnum } from "@/lib/utils";
import { ApplicationStatusBadge } from "@/components/shared/StatusBadges";

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading, isError, refetch } = useJob(id);
  const { data: applications } = useApplications({ job_id: id, page_size: 5 });
  const deleteJob = useDeleteJob();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError || !job) {
    return <ErrorState onRetry={() => refetch()} message="Could not load this job." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={job.title}
        description={`Posted ${formatDate(job.created_at)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/jobs/${id}/pipeline`)}>
              <Kanban className="h-4 w-4" /> Pipeline
            </Button>
            <Button variant="outline" onClick={() => navigate(`/jobs/${id}/edit`)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Overview</CardTitle>
              <JobStatusBadge status={job.status} />
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">Description</p>
                <p className="mt-1 text-sm text-[var(--color-ink)]/80 whitespace-pre-line">{job.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">Requirements</p>
                <p className="mt-1 text-sm text-[var(--color-ink)]/80 whitespace-pre-line">{job.requirements}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent applicants</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {applications && applications.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>AI Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.items.map((a) => (
                      <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/applications/${a.id}`)}>
                        <TableCell className="font-medium text-[var(--color-ink)]">{a.candidate.full_name}</TableCell>
                        <TableCell className="text-[var(--color-ink)]/70">{a.current_stage?.name ?? "-"}</TableCell>
                        <TableCell><ApplicationStatusBadge status={a.status} /></TableCell>
                        <TableCell className="text-[var(--color-ink)]/70">{a.ai_match_score ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-[var(--color-ink)]/50">No applicants yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm">
              <div className="flex items-center gap-2 text-[var(--color-ink)]/70"><Layers className="h-4 w-4 text-[var(--color-primary)]" /> {humanizeEnum(job.employment_type)}</div>
              <div className="flex items-center gap-2 text-[var(--color-ink)]/70"><Wallet className="h-4 w-4 text-[var(--color-primary)]" /> ฿{formatCurrency(job.salary_min)} – ฿{formatCurrency(job.salary_max)}</div>
              <div className="flex items-center gap-2 text-[var(--color-ink)]/70"><Users2 className="h-4 w-4 text-[var(--color-primary)]" /> {job.number_of_positions} position(s) · min. {job.minimum_experience_years} yrs exp.</div>
              <div className="flex items-center gap-2 text-[var(--color-ink)]/70"><Calendar className="h-4 w-4 text-[var(--color-primary)]" /> Posted {formatDate(job.created_at)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Applicant volume</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <p className="text-3xl font-semibold text-[var(--color-ink)]">{job.applicant_count ?? 0}</p>
              <p className="text-xs text-[var(--color-ink)]/50">Total applicants to date</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this job posting?"
        description="This action cannot be undone."
        destructive
        confirmLabel="Delete job"
        isLoading={deleteJob.isPending}
        onConfirm={() =>
          deleteJob.mutate(id as string, {
            onSuccess: () => {
              toast.success("Job deleted");
              navigate("/jobs");
            },
            onError: () => toast.error("Could not delete job"),
          })
        }
      />
    </div>
  );
}
