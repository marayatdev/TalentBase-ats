import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Pagination } from "@/components/shared/Pagination";
import { SourceIcon } from "@/components/shared/SourceIcon";
import { ApplicationStatusBadge } from "@/components/shared/StatusBadges";
import type { ApplicationStatus } from "@/types/domain";
import { useApplications } from "@/hooks/useApplications";
import { useJobs } from "@/hooks/useJobs";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/utils";

export default function ApplicationListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(
    params.get("search") ?? "",
  );

  const debouncedSearch = useDebounce(search);

  const page = Number(params.get("page")) || 1;
  const jobId = params.get("job_id") ?? undefined;


  const rawStatus = params.get("status");

  const status: ApplicationStatus | undefined =
    rawStatus === "active" ||
      rawStatus === "hired" ||
      rawStatus === "rejected" ||
      rawStatus === "withdrawn"
      ? rawStatus
      : undefined;

  const {
    data: jobsData,
    isLoading: isJobsLoading,
  } = useJobs({
    page: 1,
    page_size: 100,
  });

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useApplications({
    page,
    page_size: 10,
    search: debouncedSearch,
    job_id: jobId,
    status,
  });

  const jobs = jobsData?.jobs ?? [];
  const applications = data?.items ?? [];

  function updateParam(
    key: string,
    value: string | undefined,
  ) {
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
        title="Applications"
        description="Track every candidate application across all jobs."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            updateParam(
              "search",
              value || undefined,
            );
          }}
          placeholder="Search by candidate name…"
          className="sm:max-w-xs"
        />

        <Select
          value={jobId ?? "all"}
          onValueChange={(value) =>
            updateParam(
              "job_id",
              value === "all" ? undefined : value,
            )
          }
          disabled={isJobsLoading}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Job" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All jobs
            </SelectItem>

            {jobs.map((job) => (
              <SelectItem
                key={job.id}
                value={job.id}
              >
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status ?? "all"}
          onValueChange={(value) =>
            updateParam(
              "status",
              value === "all" ? undefined : value,
            )
          }
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All statuses
            </SelectItem>
            <SelectItem value="active">
              Active
            </SelectItem>
            <SelectItem value="hired">
              Hired
            </SelectItem>
            <SelectItem value="rejected">
              Rejected
            </SelectItem>
            <SelectItem value="withdrawn">
              Withdrawn
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {isLoading && <SkeletonTable cols={8} />}

        {isError && (
          <div className="p-4">
            <ErrorState onRetry={() => refetch()} />
          </div>
        )}

        {!isLoading &&
          !isError &&
          applications.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon={FileText}
                title="No applications found"
                description="Try adjusting your filters."
              />
            </div>
          )}

        {!isLoading &&
          !isError &&
          applications.length > 0 && (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>AI Score</TableHead>
                      <TableHead>Assigned HR</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Applied</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {applications.map((application) => (
                      <TableRow
                        key={application.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(
                            `/applications/${application.id}`,
                          )
                        }
                      >
                        <TableCell className="font-medium text-[var(--color-ink)]">
                          {application.candidate.full_name}
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {application.job.title}
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {application.current_stage?.name ??
                            "Not assigned"}
                        </TableCell>

                        <TableCell>
                          <ApplicationStatusBadge
                            status={application.status}
                          />
                        </TableCell>

                        <TableCell>
                          {application.ai_match_score !== null ? (
                            <Badge variant="outline">
                              {application.ai_match_score}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[var(--color-ink)]/40">
                              Pending
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {application.assigned_hr?.name ??
                            "Unassigned"}
                        </TableCell>

                        <TableCell>
                          <SourceIcon
                            source={
                              application.candidate.source
                            }
                          />
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {formatDate(
                            application.applied_at,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {applications.map((application) => (
                  <div
                    key={application.id}
                    className="cursor-pointer rounded-lg border border-black/[0.06] p-3"
                    onClick={() =>
                      navigate(
                        `/applications/${application.id}`,
                      )
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--color-ink)]">
                          {application.candidate.full_name}
                        </p>

                        <p className="text-xs text-[var(--color-ink)]/55">
                          {application.job.title}
                        </p>
                      </div>

                      <ApplicationStatusBadge
                        status={application.status}
                      />
                    </div>

                    <p className="mt-1 text-xs text-[var(--color-ink)]/50">
                      {application.current_stage?.name ??
                        "Not assigned"}
                      {" · "}
                      Applied{" "}
                      {formatDate(application.applied_at)}
                    </p>
                  </div>
                ))}
              </div>

              {data && (
                <Pagination
                  page={data.page}
                  totalPages={data.total_pages}
                  total={data.total}
                  pageSize={data.page_size}
                  onPageChange={(nextPage) =>
                    updateParam("page", String(nextPage))
                  }
                />
              )}
            </>
          )}
      </Card>
    </div>
  );
}