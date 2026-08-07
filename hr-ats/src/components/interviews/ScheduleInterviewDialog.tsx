import { useEffect } from "react";
import {
    Controller,
    useForm,
} from "react-hook-form";
import {
    zodResolver,
} from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { normalizeError } from "@/api/axios";
import { useCreateInterview } from "@/hooks/useInterviews";

const schema = z
    .object({
        title: z
            .string()
            .trim()
            .min(2, "Enter interview title"),

        description: z
            .string()
            .trim()
            .optional(),

        date: z
            .string()
            .min(1, "Select interview date"),

        start_time: z
            .string()
            .min(1, "Select start time"),

        end_time: z
            .string()
            .min(1, "Select end time"),

        interviewer_emails: z
            .string()
            .trim()
            .min(
                1,
                "Enter at least one interviewer email",
            ),
    })
    .superRefine((values, context) => {
        const start = new Date(
            `${values.date}T${values.start_time}:00+07:00`,
        );

        const end = new Date(
            `${values.date}T${values.end_time}:00+07:00`,
        );

        if (end <= start) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["end_time"],
                message: "End time must be after start time",
            });
        }
    });

type FormValues = z.infer<typeof schema>;

interface ScheduleInterviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;

    applicationId: string;
    candidateName: string;
    jobTitle: string;
}

export function ScheduleInterviewDialog({
    open,
    onOpenChange,
    applicationId,
    candidateName,
    jobTitle,
}: ScheduleInterviewDialogProps) {
    const createInterview =
        useCreateInterview(applicationId);

    const {
        register,
        handleSubmit,
        reset,
        formState: {
            errors,
        },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),

        defaultValues: {
            title: `Technical Interview - ${jobTitle}`,
            description: "",
            date: "",
            start_time: "14:00",
            end_time: "15:00",
            interviewer_emails: "",
        },
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        reset({
            title: `Technical Interview - ${jobTitle}`,
            description: "",
            date: "",
            start_time: "14:00",
            end_time: "15:00",
            interviewer_emails: "",
        });
    }, [
        open,
        jobTitle,
        reset,
    ]);

    function onSubmit(
        values: FormValues,
    ): void {
        const interviewerEmails =
            values.interviewer_emails
                .split(/[\n,]/)
                .map((email) =>
                    email.trim(),
                )
                .filter(Boolean);

        createInterview.mutate(
            {
                application_id:
                    applicationId,

                title:
                    values.title.trim(),

                description:
                    values.description?.trim() ||
                    null,

                start_at:
                    `${values.date}T${values.start_time}:00+07:00`,

                end_at:
                    `${values.date}T${values.end_time}:00+07:00`,

                timezone:
                    "Asia/Bangkok",

                interviewer_emails:
                    interviewerEmails,
            },
            {
                onSuccess: () => {
                    toast.success(
                        "Interview and Google Meet created",
                    );

                    onOpenChange(false);
                },

                onError: (error) => {
                    toast.error(
                        normalizeError(error).message,
                    );
                },
            },
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        Schedule interview
                    </DialogTitle>
                </DialogHeader>

                <div className="rounded-lg bg-black/[0.025] p-3 text-sm">
                    <p className="font-medium">
                        {candidateName}
                    </p>

                    <p className="text-xs text-[var(--color-ink)]/50">
                        {jobTitle}
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="interview-title">
                            Title
                        </Label>

                        <Input
                            id="interview-title"
                            {...register("title")}
                        />

                        {errors.title && (
                            <p className="text-xs text-red-600">
                                {errors.title.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="interview-description">
                            Description
                        </Label>

                        <Input
                            id="interview-description"
                            placeholder="Topics or interview notes"
                            {...register("description")}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="interview-date">
                                Date
                            </Label>

                            <Input
                                id="interview-date"
                                type="date"
                                {...register("date")}
                            />

                            {errors.date && (
                                <p className="text-xs text-red-600">
                                    {errors.date.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="start-time">
                                Start
                            </Label>

                            <Input
                                id="start-time"
                                type="time"
                                {...register("start_time")}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="end-time">
                                End
                            </Label>

                            <Input
                                id="end-time"
                                type="time"
                                {...register("end_time")}
                            />

                            {errors.end_time && (
                                <p className="text-xs text-red-600">
                                    {errors.end_time.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="interviewer-emails">
                            Interviewer emails
                        </Label>

                        <Input
                            id="interviewer-emails"
                            placeholder="hr@example.com, techlead@example.com"
                            {...register(
                                "interviewer_emails",
                            )}
                        />

                        <p className="text-xs text-[var(--color-ink)]/45">
                            Separate multiple emails with commas.
                        </p>

                        {errors.interviewer_emails && (
                            <p className="text-xs text-red-600">
                                {
                                    errors
                                        .interviewer_emails
                                        .message
                                }
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                onOpenChange(false)
                            }
                            disabled={
                                createInterview.isPending
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                createInterview.isPending
                            }
                        >
                            {createInterview.isPending && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}

                            Create Google Meet
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}