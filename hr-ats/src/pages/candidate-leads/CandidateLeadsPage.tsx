import {
    useEffect,
    useState,
} from "react";
import {
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import {
    ExternalLink,
    Search,
    UserSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Pagination } from "@/components/shared/Pagination";
import { SourceIcon } from "@/components/shared/SourceIcon";

import { useCandidateLeads } from "@/hooks/useCandidateLeads";

import {
    formatDateTime,
    humanizeEnum,
} from "@/lib/utils";

import type {
    CandidateLeadSource,
    CandidateLeadStatus,
    CandidateSource,
} from "@/types/domain";

function LeadStatusBadge({
    status,
}: {
    status: CandidateLeadStatus;
}) {
    const variants: Record<
        CandidateLeadStatus,
        "muted" | "info" | "success" | "danger" | "secondary"
    > = {
        new: "info",
        reviewing: "secondary",
        approved: "success",
        rejected: "danger",
        duplicate: "muted",
        converted: "success",
    };

    return (
        <Badge variant={variants[status]}>
            {humanizeEnum(status)}
        </Badge>
    );
}

export default function CandidateLeadsPage() {
    const navigate = useNavigate();

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    const page =
        Math.max(
            Number(
                searchParams.get("page"),
            ) || 1,
            1,
        );

    const source =
        (searchParams.get(
            "source",
        ) as CandidateLeadSource | null) ??
        undefined;

    const status =
        (searchParams.get(
            "status",
        ) as CandidateLeadStatus | null) ??
        undefined;

    const search =
        searchParams.get("search") ??
        "";

    const [
        searchInput,
        setSearchInput,
    ] = useState(search);

    const {
        data,
        isLoading,
        isError,
        refetch,
    } = useCandidateLeads({
        page,
        limit: 10,
        search: search || undefined,
        source,
        status,
    });

    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    function updateParams(
        values: Record<
            string,
            string | undefined
        >,
    ): void {
        const next =
            new URLSearchParams(
                searchParams,
            );

        Object.entries(values).forEach(
            ([key, value]) => {
                if (!value) {
                    next.delete(key);
                } else {
                    next.set(key, value);
                }
            },
        );

        setSearchParams(next);
    }

    function submitSearch(): void {
        updateParams({
            search:
                searchInput.trim() ||
                undefined,

            page: "1",
        });
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Candidate leads"
                description="Review potential candidates collected from Facebook, LinkedIn, and other sourcing channels."
            />

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row">
                        <div className="flex flex-1 gap-2">
                            <Input
                                value={searchInput}
                                onChange={(event) =>
                                    setSearchInput(
                                        event.target.value,
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter"
                                    ) {
                                        submitSearch();
                                    }
                                }}
                                placeholder="Search name, email, position, or post text"
                            />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={submitSearch}
                            >
                                <Search className="h-4 w-4" />
                                Search
                            </Button>
                        </div>

                        <Select
                            value={source ?? "all"}
                            onValueChange={(value) =>
                                updateParams({
                                    source:
                                        value === "all"
                                            ? undefined
                                            : value,

                                    page: "1",
                                })
                            }
                        >
                            <SelectTrigger className="w-full md:w-44">
                                <SelectValue placeholder="All sources" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">
                                    All sources
                                </SelectItem>

                                <SelectItem value="facebook">
                                    Facebook
                                </SelectItem>

                                <SelectItem value="linkedin">
                                    LinkedIn
                                </SelectItem>

                                <SelectItem value="manual">
                                    Manual
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={status ?? "all"}
                            onValueChange={(value) =>
                                updateParams({
                                    status:
                                        value === "all"
                                            ? undefined
                                            : value,

                                    page: "1",
                                })
                            }
                        >
                            <SelectTrigger className="w-full md:w-44">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">
                                    All statuses
                                </SelectItem>

                                <SelectItem value="new">
                                    New
                                </SelectItem>

                                <SelectItem value="reviewing">
                                    Reviewing
                                </SelectItem>

                                <SelectItem value="approved">
                                    Approved
                                </SelectItem>

                                <SelectItem value="rejected">
                                    Rejected
                                </SelectItem>

                                <SelectItem value="duplicate">
                                    Duplicate
                                </SelectItem>

                                <SelectItem value="converted">
                                    Converted
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                {isLoading && (
                    <SkeletonTable cols={7} />
                )}

                {isError && (
                    <div className="p-4">
                        <ErrorState
                            message="Could not load candidate leads."
                            onRetry={() => {
                                void refetch();
                            }}
                        />
                    </div>
                )}

                {data &&
                    data.items.length === 0 && (
                        <CardContent className="p-4">
                            <EmptyState
                                icon={UserSearch}
                                title="No candidate leads"
                                description="Potential candidates saved from the browser extension will appear here."
                            />
                        </CardContent>
                    )}

                {data &&
                    data.items.length > 0 && (
                        <>
                            <div className="hidden overflow-x-auto lg:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                Candidate
                                            </TableHead>

                                            <TableHead>
                                                Position
                                            </TableHead>

                                            <TableHead>
                                                Source
                                            </TableHead>

                                            <TableHead>
                                                AI confidence
                                            </TableHead>

                                            <TableHead>
                                                Status
                                            </TableHead>

                                            <TableHead>
                                                Saved
                                            </TableHead>

                                            <TableHead className="text-right">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {data.items.map(
                                            (lead) => (
                                                <TableRow
                                                    key={lead.id}
                                                    className="cursor-pointer"
                                                    onClick={() =>
                                                        navigate(
                                                            `/candidate-leads/${lead.id}`,
                                                        )
                                                    }
                                                >
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-[var(--color-ink)]">
                                                                {lead.detected_name ??
                                                                    "Unknown candidate"}
                                                            </p>

                                                            <p className="text-xs text-[var(--color-ink)]/50">
                                                                {lead.detected_email ??
                                                                    lead.detected_phone ??
                                                                    "No contact information"}
                                                            </p>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-[var(--color-ink)]/70">
                                                        {lead.detected_position ??
                                                            "-"}
                                                    </TableCell>

                                                    <TableCell>
                                                        <span className="flex items-center gap-1.5 text-[var(--color-ink)]/70">
                                                            <SourceIcon
                                                                source={
                                                                    lead.source as CandidateSource
                                                                }
                                                            />

                                                            {humanizeEnum(
                                                                lead.source,
                                                            )}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell>
                                                        {lead.ai_confidence !==
                                                            null ? (
                                                            <Badge variant="outline">
                                                                {Math.round(
                                                                    lead.ai_confidence,
                                                                )}
                                                                %
                                                            </Badge>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <LeadStatusBadge
                                                            status={
                                                                lead.status
                                                            }
                                                        />
                                                    </TableCell>

                                                    <TableCell className="text-[var(--color-ink)]/60">
                                                        {formatDateTime(
                                                            lead.created_at,
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {lead.source_url && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Open source post"
                                                                    onClick={(
                                                                        event,
                                                                    ) => {
                                                                        event.stopPropagation();

                                                                        window.open(
                                                                            lead.source_url!,
                                                                            "_blank",
                                                                            "noopener,noreferrer",
                                                                        );
                                                                    }}
                                                                >
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={(
                                                                    event,
                                                                ) => {
                                                                    event.stopPropagation();

                                                                    navigate(
                                                                        `/candidate-leads/${lead.id}`,
                                                                    );
                                                                }}
                                                            >
                                                                Review
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="space-y-3 p-3 lg:hidden">
                                {data.items.map(
                                    (lead) => (
                                        <button
                                            key={lead.id}
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/candidate-leads/${lead.id}`,
                                                )
                                            }
                                            className="block w-full rounded-lg border border-black/[0.06] p-3 text-left"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-[var(--color-ink)]">
                                                        {lead.detected_name ??
                                                            "Unknown candidate"}
                                                    </p>

                                                    <p className="text-xs text-[var(--color-ink)]/50">
                                                        {lead.detected_position ??
                                                            "Unknown position"}
                                                    </p>
                                                </div>

                                                <LeadStatusBadge
                                                    status={lead.status}
                                                />
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ink)]/55">
                                                <span className="flex items-center gap-1">
                                                    <SourceIcon
                                                        source={
                                                            lead.source as CandidateSource
                                                        }
                                                    />

                                                    {humanizeEnum(
                                                        lead.source,
                                                    )}
                                                </span>

                                                <span>
                                                    {lead.ai_confidence !==
                                                        null
                                                        ? `${Math.round(
                                                            lead.ai_confidence,
                                                        )}% match`
                                                        : "No AI score"}
                                                </span>
                                            </div>
                                        </button>
                                    ),
                                )}
                            </div>

                            <Pagination
                                page={
                                    data.pagination.page
                                }
                                totalPages={
                                    data.pagination
                                        .totalPages
                                }
                                total={
                                    data.pagination.total
                                }
                                pageSize={
                                    data.pagination.limit
                                }
                                onPageChange={(
                                    nextPage,
                                ) =>
                                    updateParams({
                                        page: String(
                                            nextPage,
                                        ),
                                    })
                                }
                            />
                        </>
                    )}
            </Card>
        </div>
    );
}