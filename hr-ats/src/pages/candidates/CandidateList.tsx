import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Users,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
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
import { SourceIcon } from "@/components/shared/SourceIcon";

import {
  useCandidates,
  useDeleteCandidate,
} from "@/hooks/useCandidates";
import { useDebounce } from "@/hooks/useDebounce";
import { humanizeEnum, initials } from "@/lib/utils";

export default function CandidateListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(
    params.get("search") ?? "",
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search);

  const page = Number(params.get("page")) || 1;
  const source = params.get("source") ?? undefined;

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useCandidates({
    page,
    page_size: 10,
    search: debouncedSearch,
    source,
  });

  const deleteCandidate = useDeleteCandidate();

  const candidates = data?.candidates ?? [];
  const pagination = data?.pagination;

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
        title="Candidates"
        description="Search and manage every candidate in your talent pool."
        actions={
          <Button onClick={() => navigate("/candidates/new")}>
            <Plus className="h-4 w-4" />
            Add candidate
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            updateParam(
              "search",
              value || undefined,
            );
          }}
          placeholder="Search by name, email, phone, or position…"
          className="sm:max-w-sm"
        />

        <Select
          value={source ?? "all"}
          onValueChange={(value) =>
            updateParam(
              "source",
              value === "all" ? undefined : value,
            )
          }
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Source" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All sources
            </SelectItem>
            <SelectItem value="manual">
              Manual
            </SelectItem>
            <SelectItem value="website">
              Website
            </SelectItem>
            <SelectItem value="email">
              Email
            </SelectItem>
            <SelectItem value="linkedin">
              LinkedIn
            </SelectItem>
            <SelectItem value="facebook">
              Facebook
            </SelectItem>
            <SelectItem value="referral">
              Referral
            </SelectItem>
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

        {!isLoading &&
          !isError &&
          candidates.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title="No candidates found"
                description="Try adjusting your search or filters."
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate("/candidates/new")
                    }
                  >
                    Add candidate
                  </Button>
                }
              />
            </div>
          )}

        {!isLoading &&
          !isError &&
          candidates.length > 0 && (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Resumes</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {candidates.map((candidate) => (
                      <TableRow
                        key={candidate.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(
                            `/candidates/${candidate.id}`,
                          )
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {initials(
                                  candidate.full_name,
                                )}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--color-ink)]">
                                {candidate.full_name}
                              </p>

                              <p className="truncate text-xs text-[var(--color-ink)]/50">
                                {candidate.email ?? "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {candidate.current_position ?? "-"}
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {candidate.total_experience_years ?? 0}{" "}
                          yrs
                        </TableCell>

                        <TableCell>
                          <span className="flex items-center gap-1.5 text-[var(--color-ink)]/70">
                            <SourceIcon
                              source={candidate.source}
                            />
                            {humanizeEnum(
                              candidate.source,
                            )}
                          </span>
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {candidate.resume_count ?? 0}
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {candidate.application_count ?? 0}
                        </TableCell>

                        <TableCell className="text-[var(--color-ink)]/70">
                          {candidate.skills_count ?? 0}
                        </TableCell>

                        <TableCell
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(
                                    `/candidates/${candidate.id}`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                                View profile
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(
                                    `/candidates/${candidate.id}/edit`,
                                  )
                                }
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  setDeleteId(candidate.id)
                                }
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
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="cursor-pointer rounded-lg border border-black/[0.06] p-3"
                    onClick={() =>
                      navigate(
                        `/candidates/${candidate.id}`,
                      )
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>
                          {initials(candidate.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--color-ink)]">
                          {candidate.full_name}
                        </p>

                        <p className="truncate text-xs text-[var(--color-ink)]/50">
                          {candidate.current_position ?? "-"}
                        </p>
                      </div>

                      <span className="flex items-center gap-1 text-xs text-[var(--color-ink)]/60">
                        <SourceIcon
                          source={candidate.source}
                          className="h-3.5 w-3.5"
                        />
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[var(--color-ink)]/50">
                      {candidate.total_experience_years ?? 0}{" "}
                      yrs exp
                      {" · "}
                      {candidate.application_count ?? 0}{" "}
                      applications
                    </p>
                  </div>
                ))}
              </div>

              {pagination && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  pageSize={pagination.limit}
                  onPageChange={(nextPage) =>
                    updateParam(
                      "page",
                      String(nextPage),
                    )
                  }
                />
              )}
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
        title="Delete this candidate?"
        description="This will permanently remove the candidate's profile, resumes, and application history."
        destructive
        confirmLabel="Delete candidate"
        isLoading={deleteCandidate.isPending}
        onConfirm={() => {
          if (!deleteId) {
            return;
          }

          deleteCandidate.mutate(deleteId, {
            onSuccess: () => {
              toast.success("Candidate deleted");
              setDeleteId(null);
            },
            onError: () => {
              toast.error("Could not delete candidate");
            },
          });
        }}
      />
    </div>
  );
}