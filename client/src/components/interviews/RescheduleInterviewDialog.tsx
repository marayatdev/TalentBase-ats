import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

import { useUpdateInterview } from "@/hooks/useInterviews";
import { normalizeError } from "@/api/axios";

import type { Interview } from "@/types/domain";

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

        if (start <= new Date()) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["date"],
                message: "Interview time must be in the future",
            });
        }
    });

type FormValues = z.infer<typeof schema>;

interface RescheduleInterviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;

    applicationId: string;
    interview: Interview | null;
}

function formatDateInput(
    value: string,
    timeZone: string,
): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(value));
}

function formatTimeInput(
    value: string,
    timeZone: string,
): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(value));
}

export function RescheduleInterviewDialog({
    open,
    onOpenChange,
    applicationId,
    interview,
}: RescheduleInterviewDialogProps) {
    const updateInterview =
        useUpdateInterview(applicationId);

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
            title: "",
            description: "",
            date: "",
            start_time: "",
            end_time: "",
            interviewer_emails: "",
        },
    });

    useEffect(() => {
        if (!open || !interview) {
            return;
        }

        reset({
            title: interview.title,

            description:
                interview.description ??
                "",

            date: formatDateInput(
                interview.start_at,
                interview.timezone,
            ),

            start_time: formatTimeInput(
                interview.start_at,
                interview.timezone,
            ),

            end_time: formatTimeInput(
                interview.end_at,
                interview.timezone,
            ),

            interviewer_emails:
                interview.interviewer_emails.join(", "),
        });
    }, [
        open,
        interview,
        reset,
    ]);

    function onSubmit(
        values: FormValues,
    ): void {
        if (!interview) {
            return;
        }

        const interviewerEmails =
            values.interviewer_emails
                .split(/[\n,]/)
                .map((email) =>
                    email.trim(),
                )
                .filter(Boolean);

        updateInterview.mutate(
            {
                interviewId:
                    interview.id,

                payload: {
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
                        interview.timezone ||
                        "Asia/Bangkok",

                    interviewer_emails:
                        interviewerEmails,
                },
            },
            {
                onSuccess: () => {
                    toast.success(
                        "Interview rescheduled",
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
                        Reschedule interview
                    </DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="reschedule-title">
                            Title
                        </Label>

                        <Input
                            id="reschedule-title"
                            {...register("title")}
                        />

                        {errors.title && (
                            <p className="text-xs text-red-600">
                                {errors.title.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="reschedule-description">
                            Description
                        </Label>

                        <Input
                            id="reschedule-description"
                            {...register("description")}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="reschedule-date">
                                Date
                            </Label>

                            <Input
                                id="reschedule-date"
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
                            <Label htmlFor="reschedule-start-time">
                                Start
                            </Label>

                            <Input
                                id="reschedule-start-time"
                                type="time"
                                {...register("start_time")}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="reschedule-end-time">
                                End
                            </Label>

                            <Input
                                id="reschedule-end-time"
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
                        <Label htmlFor="reschedule-interviewer-emails">
                            Interviewer emails
                        </Label>

                        <Input
                            id="reschedule-interviewer-emails"
                            placeholder="hr@example.com, techlead@example.com"
                            {...register(
                                "interviewer_emails",
                            )}
                        />

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
                                updateInterview.isPending
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                updateInterview.isPending
                            }
                        >
                            {updateInterview.isPending && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}

                            Save new time
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}