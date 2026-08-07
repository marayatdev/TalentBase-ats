import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Kanban,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { JobStatusBadge } from "@/components/shared/StatusBadges";

import { useJobs, useDeleteJob } from "@/hooks/useJobs";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency, formatDate, humanizeEnum } from "@/lib/utils";
import { toast } from "sonner";

function formatSalaryRange(
  salaryMin: number | null,
  salaryMax: number | null,
): string {
  if (salaryMin === null && salaryMax === null) {
    return "Not specified";
  }

  if (salaryMin !== null && salaryMax === null) {
    return `From ฿${formatCurrency(salaryMin)}`;
  }

  if (salaryMin === null && salaryMax !== null) {
    return `Up to ฿${formatCurrency(salaryMax)}`;
  }

  return `฿${formatCurrency(salaryMin!)} – ฿${formatCurrency(salaryMax!)}`;
}

export default function JobListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search);

  const page = Number(params.get("page")) || 1;
  const status = params.get("status") ?? undefined;
  const employmentType = params.get("employment_type") ?? undefined;

  const { data, isLoading, isError, refetch } = useJobs({
    page,
    page_size: 10,
    search: debouncedSearch,
    status,
    employment_type: employmentType,
  });

  const deleteJob = useDeleteJob();

  function updateParam(key: string, value?: string) {
    const next = new URLSearchParams(params);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    if (key !== "page") {
      next.set("page", "1");
    }

    setParams(next);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jobs"
        description="Manage open roles and track applicant volume."
        actions={
          <Button onClick={() => navigate("/jobs/new")}>
            <Plus className="h-4 w-4" />
            Create job
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            updateParam("search", value || undefined);
          }}
          placeholder="Search jobs by title…"
          className="sm:max-w-xs"
        />

        <Select
          value={status ?? "all"}
          onValueChange={(value) =>
            updateParam("status", value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={employmentType ?? "all"}
          onValueChange={(value) =>
            updateParam(
              "employment_type",
              value === "all" ? undefined : value,
            )
          }
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Employment type" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All employment types</SelectItem>
            <SelectItem value="full_time">Full time</SelectItem>
            <SelectItem value="part_time">Part time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {isLoading && <SkeletonTable />}

        {isError && (
          <div className="p-4">
            <ErrorState onRetry={() => refetch()} />
          </div>
        )}

        {data && data.jobs.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={Briefcase}
              title="No jobs found"
              description="Try adjusting your filters, or create a new job posting."
              action={
                <Button size="sm" onClick={() => navigate("/jobs/new")}>
                  Create job
                </Button>
              }
            />
          </div>
        )}

        {data && data.jobs.length > 0 && (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Salary range</TableHead>
                    <TableHead>Applicants</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data.jobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <TableCell className="font-medium text-[var(--color-ink)]">
                        {job.title}
                      </TableCell>

                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>

                      <TableCell className="text-[var(--color-ink)]/70">
                        {humanizeEnum(job.employment_type)}
                      </TableCell>

                      <TableCell className="text-[var(--color-ink)]/70">
                        {formatSalaryRange(job.salary_min, job.salary_max)}
                      </TableCell>

                      <TableCell className="text-[var(--color-ink)]/70">
                        {job.applicant_count}
                      </TableCell>

                      <TableCell className="text-[var(--color-ink)]/70">
                        {formatDate(job.created_at)}
                      </TableCell>

                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/jobs/${job.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                              View details
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => navigate(`/jobs/${job.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/jobs/${job.id}/pipeline`)
                              }
                            >
                              <Kanban className="h-4 w-4" />
                              Pipeline
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(job.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {data.jobs.map((job) => (
                <div
                  key={job.id}
                  className="cursor-pointer rounded-lg border border-black/[0.06] p-3"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[var(--color-ink)]">
                      {job.title}
                    </p>

                    <JobStatusBadge status={job.status} />
                  </div>

                  <p className="mt-1 text-xs text-[var(--color-ink)]/60">
                    {humanizeEnum(job.employment_type)}
                    {" · "}
                    {formatSalaryRange(job.salary_min, job.salary_max)}
                  </p>

                  <p className="mt-1 text-xs text-[var(--color-ink)]/50">
                    {job.applicant_count} applicants
                    {" · "}
                    {formatDate(job.created_at)}
                  </p>
                </div>
              ))}
            </div>

            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              pageSize={data.pagination.limit}
              onPageChange={(nextPage) =>
                updateParam("page", String(nextPage))
              }
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
          }
        }}
        title="Delete this job posting?"
        description="This action cannot be undone. Applications linked to this job will remain but no longer reference an active posting."
        confirmLabel="Delete job"
        destructive
        isLoading={deleteJob.isPending}
        onConfirm={() => {
          if (!deleteId) {
            return;
          }

          deleteJob.mutate(deleteId, {
            onSuccess: () => {
              toast.success("Job deleted");
              setDeleteId(null);
            },
            onError: () => {
              toast.error("Could not delete job");
            },
          });
        }}
      />
    </div>
  );
}