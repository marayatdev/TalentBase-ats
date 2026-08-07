import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ExternalLink,
  UploadCloud,
} from "lucide-react";

import {
  Card,
} from "@/components/ui/card";
import {
  Button,
} from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  PageHeader,
} from "@/components/shared/PageHeader";
import {
  SkeletonTable,
} from "@/components/shared/SkeletonTable";
import {
  EmptyState,
} from "@/components/shared/EmptyState";
import {
  ErrorState,
} from "@/components/shared/ErrorState";
import {
  Pagination,
} from "@/components/shared/Pagination";
import {
  SourceIcon,
} from "@/components/shared/SourceIcon";
import {
  ImportStatusBadge,
} from "@/components/shared/StatusBadges";

import {
  useImportHistory,
} from "@/hooks/useCandidateImports";
import {
  formatDateTime,
  humanizeEnum,
} from "@/lib/utils";

export default function ImportHistoryPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const page = Math.max(
    Number(
      searchParams.get("page"),
    ) || 1,
    1,
  );

  const limit = 10;

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useImportHistory({
    page,
    limit: 10,
  });

  const imports =
    data?.imports ?? [];

  const pagination =
    data?.pagination;

  function handlePageChange(
    nextPage: number,
  ): void {
    const nextParams =
      new URLSearchParams(
        searchParams,
      );

    nextParams.set(
      "page",
      String(nextPage),
    );

    setSearchParams(
      nextParams,
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Candidate import history"
        description="Every attempted candidate import, including duplicates and failed imports."
        actions={
          <Button
            type="button"
            onClick={() =>
              navigate(
                "/imports",
              )
            }
          >
            New import
          </Button>
        }
      />

      <Card>
        {isLoading && (
          <SkeletonTable
            cols={8}
          />
        )}

        {!isLoading &&
          isError && (
            <div className="p-4">
              <ErrorState
                message={
                  error instanceof Error
                    ? error.message
                    : undefined
                }
                onRetry={() => {
                  void refetch();
                }}
              />
            </div>
          )}

        {!isLoading &&
          !isError &&
          imports.length ===
          0 && (
            <div className="p-4">
              <EmptyState
                icon={
                  UploadCloud
                }
                title="No imports yet"
                description="Imports from Facebook, LinkedIn, or manual entry will appear here."
                action={
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      navigate(
                        "/imports",
                      )
                    }
                  >
                    Import candidate
                  </Button>
                }
              />
            </div>
          )}

        {!isLoading &&
          !isError &&
          imports.length >
          0 && (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Source
                      </TableHead>

                      <TableHead>
                        Candidate
                      </TableHead>

                      <TableHead>
                        Job
                      </TableHead>

                      <TableHead>
                        Application
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <TableHead>
                        Imported by
                      </TableHead>

                      <TableHead>
                        Source URL
                      </TableHead>

                      <TableHead>
                        Created
                      </TableHead>

                      <TableHead>
                        Error
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {imports.map(
                      (
                        importRecord,
                      ) => (
                        <TableRow
                          key={
                            importRecord.id
                          }
                        >
                          <TableCell>
                            <span className="flex items-center gap-1.5 text-[var(--color-ink)]/70">
                              <SourceIcon
                                source={
                                  importRecord.source
                                }
                              />

                              {humanizeEnum(
                                importRecord.source,
                              )}
                            </span>
                          </TableCell>

                          <TableCell className="font-medium text-[var(--color-ink)]">
                            {importRecord.candidate ? (
                              <button
                                type="button"
                                className="text-left hover:underline"
                                onClick={() =>
                                  navigate(
                                    `/candidates/${importRecord.candidate?.id}`,
                                  )
                                }
                              >
                                {
                                  importRecord
                                    .candidate
                                    .full_name
                                }
                              </button>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell className="text-[var(--color-ink)]/70">
                            {importRecord
                              .job
                              ?.title ??
                              "-"}
                          </TableCell>

                          <TableCell>
                            {importRecord.application_id ? (
                              <button
                                type="button"
                                className="text-[var(--color-primary)] hover:underline"
                                onClick={() =>
                                  navigate(
                                    `/applications/${importRecord.application_id}`,
                                  )
                                }
                              >
                                #
                                {
                                  importRecord.application_id
                                }
                              </button>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell>
                            <ImportStatusBadge
                              status={
                                importRecord.import_status
                              }
                            />
                          </TableCell>

                          <TableCell className="text-[var(--color-ink)]/70">
                            {importRecord
                              .imported_by
                              ?.name ??
                              "-"}
                          </TableCell>

                          <TableCell className="max-w-[180px]">
                            {importRecord.source_url ? (
                              <a
                                href={
                                  importRecord.source_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                title={
                                  importRecord.source_url
                                }
                                className="flex items-center gap-1 truncate text-[var(--color-ink)]/50 hover:text-[var(--color-primary)] hover:underline"
                              >
                                <span className="truncate">
                                  {
                                    importRecord.source_url
                                  }
                                </span>

                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-[var(--color-ink)]/70">
                            {formatDateTime(
                              importRecord.created_at,
                            )}
                          </TableCell>

                          <TableCell className="max-w-[220px]">
                            {importRecord.error_message ? (
                              <span
                                title={
                                  importRecord.error_message
                                }
                                className="block truncate text-xs text-red-600"
                              >
                                {
                                  importRecord.error_message
                                }
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 p-3 lg:hidden">
                {imports.map(
                  (
                    importRecord,
                  ) => (
                    <div
                      key={
                        importRecord.id
                      }
                      className="rounded-lg border border-black/[0.06] bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-1.5 text-left text-sm font-medium text-[var(--color-ink)] hover:underline disabled:no-underline"
                          disabled={
                            !importRecord.candidate
                          }
                          onClick={() => {
                            if (
                              importRecord.candidate
                            ) {
                              navigate(
                                `/candidates/${importRecord.candidate.id}`,
                              );
                            }
                          }}
                        >
                          <SourceIcon
                            source={
                              importRecord.source
                            }
                          />

                          <span className="truncate">
                            {importRecord
                              .candidate
                              ?.full_name ??
                              "Unknown candidate"}
                          </span>
                        </button>

                        <ImportStatusBadge
                          status={
                            importRecord.import_status
                          }
                        />
                      </div>

                      <p className="mt-2 text-xs text-[var(--color-ink)]/55">
                        {importRecord
                          .job
                          ?.title ??
                          "No job"}
                      </p>

                      <p className="mt-1 text-xs text-[var(--color-ink)]/45">
                        {formatDateTime(
                          importRecord.created_at,
                        )}
                      </p>

                      {importRecord.imported_by && (
                        <p className="mt-1 text-xs text-[var(--color-ink)]/45">
                          Imported by{" "}
                          {
                            importRecord
                              .imported_by
                              .name
                          }
                        </p>
                      )}

                      {importRecord.error_message && (
                        <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-600">
                          {
                            importRecord.error_message
                          }
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {importRecord.application_id && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/applications/${importRecord.application_id}`,
                              )
                            }
                          >
                            View application
                          </Button>
                        )}

                        {importRecord.source_url && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <a
                              href={
                                importRecord.source_url
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Source
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              {pagination &&
                pagination.totalPages >
                0 && (
                  <Pagination
                    page={
                      pagination.page
                    }
                    totalPages={
                      pagination.totalPages
                    }
                    total={
                      pagination.total
                    }
                    pageSize={
                      pagination.limit
                    }
                    onPageChange={
                      handlePageChange
                    }
                  />
                )}
            </>
          )}
      </Card>
    </div>
  );
}