import { useEffect, useMemo, useState } from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";
import {
    Controller,
    useForm,
} from "react-hook-form";
import {
    zodResolver,
} from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    ArrowLeft,
    BriefcaseBusiness,
    CheckCircle2,
    ExternalLink,
    // Facebook,
    // Linkedin,
    Loader2,
    Mail,
    Phone,
    Save,
    Sparkles,
    UserRound,
    XCircle,
    Copy,
    AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import {
    useCandidateLead,
    useConvertCandidateLead,
    useUpdateCandidateLead,
} from "@/hooks/useCandidateLeads";
import { useJobs } from "@/hooks/useJobs";

import { normalizeError } from "@/api/axios";
import {
    formatDateTime,
    humanizeEnum,
} from "@/lib/utils";

import type {
    CandidateLeadSource,
    CandidateLeadStatus,
} from "@/types/domain";

const leadSchema = z
    .object({
        detected_name: z
            .string()
            .trim()
            .optional(),

        detected_email: z
            .string()
            .trim()
            .optional(),

        detected_phone: z
            .string()
            .trim()
            .optional(),

        detected_position: z
            .string()
            .trim()
            .optional(),

        skills_text: z
            .string()
            .optional(),

        target_job_id: z
            .string()
            .optional(),
    })
    .superRefine((values, context) => {
        const email = values.detected_email?.trim();

        if (
            email &&
            !z.string().email().safeParse(email).success
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["detected_email"],
                message: "Enter a valid email address",
            });
        }
    });

const convertSchema = z
    .object({
        full_name: z
            .string()
            .trim()
            .min(
                2,
                "Enter the candidate's full name",
            ),

        email: z
            .string()
            .trim()
            .optional(),

        phone: z
            .string()
            .trim()
            .optional(),

        current_position: z
            .string()
            .trim()
            .optional(),

        linkedin_url: z
            .string()
            .trim()
            .url("Enter a valid LinkedIn URL")
            .optional()
            .or(z.literal("")),

        total_experience_years: z.coerce
            .number()
            .min(
                0,
                "Experience cannot be negative",
            ),

        create_application: z.boolean(),

        job_id: z
            .string()
            .optional(),
    })
    .superRefine((values, context) => {
        const email = values.email?.trim();
        const phone = values.phone?.trim();

        if (!email && !phone) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["email"],
                message:
                    "Enter an email or phone number before converting",
            });
        }

        if (
            email &&
            !z.string().email().safeParse(email).success
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["email"],
                message: "Enter a valid email address",
            });
        }

        if (
            values.create_application &&
            !values.job_id
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["job_id"],
                message:
                    "Select a job to create an application",
            });
        }
    });

type LeadFormValues = z.infer<
    typeof leadSchema
>;

type ConvertFormValues = z.infer<
    typeof convertSchema
>;

function splitSkills(
    value: string,
): string[] {
    const uniqueSkills =
        new Map<string, string>();

    for (const item of value.split(/[\n,]/)) {
        const skill = item.trim();

        if (!skill) {
            continue;
        }

        const key = skill.toLowerCase();

        if (!uniqueSkills.has(key)) {
            uniqueSkills.set(key, skill);
        }
    }

    return [
        ...uniqueSkills.values(),
    ];
}

function LeadStatusBadge({
    status,
}: {
    status: CandidateLeadStatus;
}) {
    const variants: Record<
        CandidateLeadStatus,
        | "muted"
        | "info"
        | "success"
        | "danger"
        | "secondary"
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

function SourceBadge({
    source,
}: {
    source: CandidateLeadSource;
}) {
    const icon =
        source === "facebook" ? (
            <ExternalLink className="h-3.5 w-3.5" />
        ) : source === "linkedin" ? (
            <ExternalLink className="h-3.5 w-3.5" />
        ) : (
            <UserRound className="h-3.5 w-3.5" />
        );

    return (
        <Badge
            variant="outline"
            className="gap-1.5"
        >
            {icon}
            {humanizeEnum(source)}
        </Badge>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.05] py-2.5 last:border-none">
            <span className="text-xs text-[var(--color-ink)]/50">
                {label}
            </span>

            <div className="max-w-[70%] text-right text-sm text-[var(--color-ink)]/75">
                {value}
            </div>
        </div>
    );
}

export default function CandidateLeadDetailPage() {
    const {
        id,
    } = useParams<{
        id: string;
    }>();

    const navigate = useNavigate();

    const {
        data: lead,
        isLoading,
        isError,
        refetch,
    } = useCandidateLead(id);

    const {
        data: jobsData,
        isLoading: isJobsLoading,
    } = useJobs({
        page: 1,
        page_size: 100,
        status: "open",
    });

    const updateLead =
        useUpdateCandidateLead(
            id ?? "",
        );

    const convertLead =
        useConvertCandidateLead(
            id ?? "",
        );

    const [
        convertDialogOpen,
        setConvertDialogOpen,
    ] = useState(false);

    const [
        rejectDialogOpen,
        setRejectDialogOpen,
    ] = useState(false);

    const [
        duplicateDialogOpen,
        setDuplicateDialogOpen,
    ] = useState(false);

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: {
            errors,
            isDirty,
        },
    } =
        useForm<LeadFormValues>({
            resolver:
                zodResolver(
                    leadSchema,
                ),

            defaultValues: {
                detected_name: "",
                detected_email: "",
                detected_phone: "",
                detected_position: "",
                skills_text: "",
                target_job_id: "",
            },
        });

    const {
        register:
        registerConvert,
        control:
        convertControl,
        handleSubmit:
        handleConvertSubmit,
        reset:
        resetConvert,
        watch:
        watchConvert,
        formState: {
            errors:
            convertErrors,
        },
    } =
        useForm<ConvertFormValues>({
            resolver:
                zodResolver(
                    convertSchema,
                ),

            defaultValues: {
                full_name: "",
                email: "",
                phone: "",
                current_position: "",
                linkedin_url: "",
                total_experience_years: 0,
                create_application: true,
                job_id: "",
            },
        });

    const createApplication =
        watchConvert(
            "create_application",
        );

    const jobs =
        jobsData?.jobs ?? [];

    const isLocked =
        lead?.status ===
        "converted" ||
        lead?.status ===
        "rejected";

    useEffect(() => {
        if (!lead) {
            return;
        }

        reset({
            detected_name:
                lead.detected_name ??
                "",

            detected_email:
                lead.detected_email ??
                "",

            detected_phone:
                lead.detected_phone ??
                "",

            detected_position:
                lead.detected_position ??
                "",

            skills_text:
                lead.skills.join(", "),

            target_job_id:
                lead.target_job_id ??
                "",
        });
    }, [
        lead,
        reset,
    ]);

    useEffect(() => {
        if (
            !lead ||
            !convertDialogOpen
        ) {
            return;
        }

        resetConvert({
            full_name:
                lead.detected_name ??
                "",

            email:
                lead.detected_email ??
                "",

            phone:
                lead.detected_phone ??
                "",

            current_position:
                lead.detected_position ??
                "",

            linkedin_url:
                lead.source ===
                    "linkedin"
                    ? lead.source_url ??
                    ""
                    : "",

            total_experience_years:
                0,

            create_application:
                Boolean(
                    lead.target_job_id,
                ),

            job_id:
                lead.target_job_id ??
                "",
        });
    }, [
        convertDialogOpen,
        lead,
        resetConvert,
    ]);

    const confidenceTone =
        useMemo(() => {
            const score =
                lead?.ai_confidence ??
                0;

            if (score >= 90) {
                return "text-emerald-700 bg-emerald-50";
            }

            if (score >= 70) {
                return "text-amber-700 bg-amber-50";
            }

            return "text-red-700 bg-red-50";
        }, [
            lead?.ai_confidence,
        ]);

    function onSaveLead(
        values: LeadFormValues,
    ): void {
        updateLead.mutate(
            {
                detected_name:
                    values.detected_name?.trim() ||
                    null,

                detected_email:
                    values.detected_email?.trim() ||
                    null,

                detected_phone:
                    values.detected_phone?.trim() ||
                    null,

                detected_position:
                    values.detected_position?.trim() ||
                    null,

                skills:
                    splitSkills(
                        values.skills_text ??
                        "",
                    ),

                target_job_id:
                    values.target_job_id ||
                    null,

                status:
                    lead?.status === "new"
                        ? "reviewing"
                        : undefined,
            },
            {
                onSuccess: () => {
                    toast.success(
                        "Candidate lead updated",
                    );
                },

                onError: (
                    error,
                ) => {
                    toast.error(
                        normalizeError(
                            error,
                        ).message,
                    );
                },
            },
        );
    }

    function updateStatus(
        status: CandidateLeadStatus,
    ): void {
        updateLead.mutate(
            {
                status,
            },
            {
                onSuccess: () => {
                    toast.success(
                        `Lead marked as ${humanizeEnum(
                            status,
                        )}`,
                    );

                    setRejectDialogOpen(
                        false,
                    );

                    setDuplicateDialogOpen(
                        false,
                    );
                },

                onError: (
                    error,
                ) => {
                    toast.error(
                        normalizeError(
                            error,
                        ).message,
                    );
                },
            },
        );
    }

    function onConvert(
        values: ConvertFormValues,
    ): void {
        convertLead.mutate(
            {
                full_name:
                    values.full_name.trim(),

                email:
                    values.email?.trim() ||
                    null,

                phone:
                    values.phone?.trim() ||
                    null,

                linkedin_url:
                    values.linkedin_url?.trim() ||
                    null,

                current_position:
                    values.current_position?.trim() ||
                    null,

                total_experience_years:
                    values.total_experience_years,

                create_application:
                    values.create_application,

                job_id:
                    values.create_application
                        ? values.job_id ||
                        null
                        : null,
            },
            {
                onSuccess: (
                    result,
                ) => {
                    toast.success(
                        result.application_id
                            ? "Candidate and application created"
                            : "Candidate created",
                    );

                    setConvertDialogOpen(
                        false,
                    );

                    if (
                        result.application_id
                    ) {
                        navigate(
                            `/applications/${result.application_id}`,
                        );

                        return;
                    }

                    navigate(
                        `/candidates/${result.candidate_id}`,
                    );
                },

                onError: (
                    error,
                ) => {
                    toast.error(
                        normalizeError(
                            error,
                        ).message,
                    );
                },
            },
        );
    }

    async function copySourceUrl(): Promise<void> {
        if (!lead?.source_url) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                lead.source_url,
            );

            toast.success(
                "Source URL copied",
            );
        } catch {
            toast.error(
                "Could not copy source URL",
            );
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-9 w-72" />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Skeleton className="h-80 rounded-xl" />

                    <Skeleton className="h-[520px] rounded-xl lg:col-span-2" />
                </div>
            </div>
        );
    }

    if (
        isError ||
        !lead
    ) {
        return (
            <ErrorState
                message="Could not load this candidate lead."
                onRetry={() => {
                    void refetch();
                }}
            />
        );
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title={
                    lead.detected_name ??
                    "Unknown candidate"
                }
                description={
                    lead.detected_position ??
                    "Candidate lead review"
                }
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                navigate(
                                    "/candidate-leads",
                                )
                            }
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>

                        {!isLocked && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setDuplicateDialogOpen(
                                            true,
                                        )
                                    }
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    Duplicate
                                </Button>

                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() =>
                                        setRejectDialogOpen(
                                            true,
                                        )
                                    }
                                >
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() =>
                                        setConvertDialogOpen(
                                            true,
                                        )
                                    }
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Convert candidate
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            {lead.status ===
                "converted" && (
                    <Card className="border-emerald-200 bg-emerald-50/60">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-700" />

                                <div>
                                    <p className="text-sm font-medium text-emerald-900">
                                        This lead has been converted
                                    </p>

                                    <p className="text-xs text-emerald-800/70">
                                        Candidate and application records are now managed separately.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {lead.converted_candidate_id && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            navigate(
                                                `/candidates/${lead.converted_candidate_id}`,
                                            )
                                        }
                                    >
                                        View candidate
                                    </Button>
                                )}

                                {lead.converted_application_id && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                            navigate(
                                                `/applications/${lead.converted_application_id}`,
                                            )
                                        }
                                    >
                                        View application
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Lead overview
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <SourceBadge
                                    source={
                                        lead.source
                                    }
                                />

                                <LeadStatusBadge
                                    status={
                                        lead.status
                                    }
                                />
                            </div>

                            <InfoRow
                                label="Saved"
                                value={formatDateTime(
                                    lead.created_at,
                                )}
                            />

                            <InfoRow
                                label="Reviewed"
                                value={
                                    lead.reviewed_at
                                        ? formatDateTime(
                                            lead.reviewed_at,
                                        )
                                        : "-"
                                }
                            />

                            <InfoRow
                                label="Reviewer"
                                value={
                                    lead.reviewer?.name ??
                                    "-"
                                }
                            />

                            <InfoRow
                                label="Target job"
                                value={
                                    lead.job?.title ??
                                    "Not selected"
                                }
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                                AI analysis
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div
                                className={`flex items-center justify-between rounded-lg p-3 ${confidenceTone}`}
                            >
                                <span className="text-sm font-medium">
                                    Confidence
                                </span>

                                <span className="text-xl font-semibold">
                                    {lead.ai_confidence !==
                                        null
                                        ? `${Math.round(
                                            lead.ai_confidence,
                                        )}%`
                                        : "-"}
                                </span>
                            </div>

                            <div>
                                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">
                                    Reason
                                </p>

                                <p className="text-sm leading-6 text-[var(--color-ink)]/70">
                                    {lead.ai_reason ??
                                        "No AI reason recorded."}
                                </p>
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">
                                    Detected skills
                                </p>

                                {lead.skills.length >
                                    0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {lead.skills.map(
                                            (
                                                skill,
                                            ) => (
                                                <Badge
                                                    key={
                                                        skill
                                                    }
                                                    variant="secondary"
                                                >
                                                    {
                                                        skill
                                                    }
                                                </Badge>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--color-ink)]/45">
                                        No skills detected.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-base">
                                Candidate information
                            </CardTitle>

                            {!isLocked && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSubmit(
                                        onSaveLead,
                                    )}
                                    disabled={
                                        updateLead.isPending ||
                                        !isDirty
                                    }
                                >
                                    {updateLead.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}

                                    Save changes
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent>
                            <form
                                onSubmit={handleSubmit(
                                    onSaveLead,
                                )}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="detected_name">
                                            Full name
                                        </Label>

                                        <div className="relative">
                                            <UserRound className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-ink)]/35" />

                                            <Input
                                                id="detected_name"
                                                className="pl-9"
                                                disabled={
                                                    isLocked
                                                }
                                                {...register(
                                                    "detected_name",
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="detected_position">
                                            Current position
                                        </Label>

                                        <div className="relative">
                                            <BriefcaseBusiness className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-ink)]/35" />

                                            <Input
                                                id="detected_position"
                                                className="pl-9"
                                                disabled={
                                                    isLocked
                                                }
                                                {...register(
                                                    "detected_position",
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="detected_email">
                                            Email
                                        </Label>

                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-ink)]/35" />

                                            <Input
                                                id="detected_email"
                                                type="email"
                                                className="pl-9"
                                                disabled={
                                                    isLocked
                                                }
                                                {...register(
                                                    "detected_email",
                                                )}
                                            />
                                        </div>

                                        {errors.detected_email && (
                                            <p className="text-xs text-red-600">
                                                {
                                                    errors
                                                        .detected_email
                                                        .message
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="detected_phone">
                                            Phone
                                        </Label>

                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-ink)]/35" />

                                            <Input
                                                id="detected_phone"
                                                className="pl-9"
                                                disabled={
                                                    isLocked
                                                }
                                                {...register(
                                                    "detected_phone",
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="skills_text">
                                        Skills
                                    </Label>

                                    <Input
                                        id="skills_text"
                                        placeholder="Python, Docker, Machine Learning"
                                        disabled={
                                            isLocked
                                        }
                                        {...register(
                                            "skills_text",
                                        )}
                                    />

                                    <p className="text-xs text-[var(--color-ink)]/45">
                                        Separate each skill with a comma.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>
                                        Target job
                                    </Label>

                                    <Controller
                                        control={
                                            control
                                        }
                                        name="target_job_id"
                                        render={({
                                            field,
                                        }) => (
                                            <Select
                                                value={
                                                    field.value ||
                                                    "none"
                                                }
                                                onValueChange={(
                                                    value,
                                                ) =>
                                                    field.onChange(
                                                        value ===
                                                            "none"
                                                            ? ""
                                                            : value,
                                                    )
                                                }
                                                disabled={
                                                    isLocked ||
                                                    isJobsLoading
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder="Select a target job"
                                                    />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        No target job
                                                    </SelectItem>

                                                    {jobs.map(
                                                        (
                                                            job,
                                                        ) => (
                                                            <SelectItem
                                                                key={
                                                                    job.id
                                                                }
                                                                value={
                                                                    job.id
                                                                }
                                                            >
                                                                {
                                                                    job.title
                                                                }
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-base">
                                Source post
                            </CardTitle>

                            {lead.source_url && (
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            void copySourceUrl();
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copy URL
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            window.open(
                                                lead.source_url!,
                                                "_blank",
                                                "noopener,noreferrer",
                                            )
                                        }
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Open post
                                    </Button>
                                </div>
                            )}
                        </CardHeader>

                        <CardContent>
                            <pre className="max-h-[460px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/[0.025] p-4 font-sans text-sm leading-6 text-[var(--color-ink)]/75">
                                {lead.raw_text}
                            </pre>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog
                open={convertDialogOpen}
                onOpenChange={
                    setConvertDialogOpen
                }
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            Convert to candidate
                        </DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={handleConvertSubmit(
                            onConvert,
                        )}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="convert-full-name">
                                    Full name
                                </Label>

                                <Input
                                    id="convert-full-name"
                                    {...registerConvert(
                                        "full_name",
                                    )}
                                />

                                {convertErrors.full_name && (
                                    <p className="text-xs text-red-600">
                                        {
                                            convertErrors
                                                .full_name
                                                .message
                                        }
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="convert-position">
                                    Current position
                                </Label>

                                <Input
                                    id="convert-position"
                                    {...registerConvert(
                                        "current_position",
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="convert-email">
                                    Email
                                </Label>

                                <Input
                                    id="convert-email"
                                    type="email"
                                    {...registerConvert(
                                        "email",
                                    )}
                                />

                                {convertErrors.email && (
                                    <p className="text-xs text-red-600">
                                        {
                                            convertErrors.email
                                                .message
                                        }
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="convert-phone">
                                    Phone
                                </Label>

                                <Input
                                    id="convert-phone"
                                    {...registerConvert(
                                        "phone",
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="convert-linkedin">
                                    LinkedIn URL
                                </Label>

                                <Input
                                    id="convert-linkedin"
                                    {...registerConvert(
                                        "linkedin_url",
                                    )}
                                />

                                {convertErrors.linkedin_url && (
                                    <p className="text-xs text-red-600">
                                        {
                                            convertErrors
                                                .linkedin_url
                                                .message
                                        }
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="convert-experience">
                                    Experience (years)
                                </Label>

                                <Input
                                    id="convert-experience"
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    {...registerConvert(
                                        "total_experience_years",
                                    )}
                                />

                                {convertErrors.total_experience_years && (
                                    <p className="text-xs text-red-600">
                                        {
                                            convertErrors
                                                .total_experience_years
                                                .message
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>
                                Create application
                            </Label>

                            <Controller
                                control={
                                    convertControl
                                }
                                name="create_application"
                                render={({
                                    field,
                                }) => (
                                    <Select
                                        value={
                                            field.value
                                                ? "yes"
                                                : "no"
                                        }
                                        onValueChange={(
                                            value,
                                        ) =>
                                            field.onChange(
                                                value ===
                                                "yes",
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="yes">
                                                Yes, create an application
                                            </SelectItem>

                                            <SelectItem value="no">
                                                No, add to talent pool only
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {createApplication && (
                            <div className="space-y-1.5">
                                <Label>
                                    Apply to job
                                </Label>

                                <Controller
                                    control={
                                        convertControl
                                    }
                                    name="job_id"
                                    render={({
                                        field,
                                    }) => (
                                        <Select
                                            value={
                                                field.value ||
                                                ""
                                            }
                                            onValueChange={
                                                field.onChange
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a job" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {jobs.map(
                                                    (
                                                        job,
                                                    ) => (
                                                        <SelectItem
                                                            key={
                                                                job.id
                                                            }
                                                            value={
                                                                job.id
                                                            }
                                                        >
                                                            {
                                                                job.title
                                                            }
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />

                                {convertErrors.job_id && (
                                    <p className="text-xs text-red-600">
                                        {
                                            convertErrors.job_id
                                                .message
                                        }
                                    </p>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setConvertDialogOpen(
                                        false,
                                    )
                                }
                                disabled={
                                    convertLead.isPending
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={
                                    convertLead.isPending
                                }
                            >
                                {convertLead.isPending && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}

                                Convert candidate
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={rejectDialogOpen}
                onOpenChange={
                    setRejectDialogOpen
                }
                title="Reject this lead?"
                description="The lead will remain in the sourcing history, but it cannot be converted unless its status is changed later."
                confirmLabel="Reject lead"
                destructive
                isLoading={
                    updateLead.isPending
                }
                onConfirm={() =>
                    updateStatus(
                        "rejected",
                    )
                }
            />

            <ConfirmDialog
                open={duplicateDialogOpen}
                onOpenChange={
                    setDuplicateDialogOpen
                }
                title="Mark as duplicate?"
                description="Use this when the person or source post already exists in the ATS."
                confirmLabel="Mark duplicate"
                isLoading={
                    updateLead.isPending
                }
                onConfirm={() =>
                    updateStatus(
                        "duplicate",
                    )
                }
            />
        </div>
    );
}