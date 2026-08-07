import {
    CalendarDays,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useConnectGoogle } from "@/hooks/useGoogleAuth";
import { normalizeError } from "@/api/axios";

interface GoogleConnectDialogProps {
    open: boolean;
    onOpenChange: (
        open: boolean,
    ) => void;
}

export function GoogleConnectDialog({
    open,
    onOpenChange,
}: GoogleConnectDialogProps) {
    const {
        connect,
        isPending,
        error,
        reset,
    } = useConnectGoogle();

    function handleConnect(): void {
        /*
         * เก็บ path ปัจจุบันไว้
         * เพื่อให้ Backend หรือหน้า callback
         * สามารถพากลับมาหน้าเดิมได้ภายหลัง
         */
        sessionStorage.setItem(
            "google_oauth_return_to",
            `${window.location.pathname}${window.location.search}`,
        );

        connect();
    }

    function handleOpenChange(
        nextOpen: boolean,
    ): void {
        if (isPending) {
            return;
        }

        if (!nextOpen) {
            reset();
        }

        onOpenChange(nextOpen);
    }

    return (
        <Dialog
            open={open}
            onOpenChange={
                handleOpenChange
            }
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                        <CalendarDays className="h-5 w-5 text-[var(--color-primary)]" />
                    </div>

                    <DialogTitle>
                        Connect Google Calendar
                    </DialogTitle>

                    <DialogDescription>
                        Connect your Google account before creating
                        an interview. The system will use Google
                        Calendar to create the event, generate a
                        Google Meet link, and send invitations.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {
                            normalizeError(
                                error,
                            ).message
                        }
                    </div>
                )}

                <div className="rounded-lg border border-black/[0.06] bg-black/[0.02] p-4">
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                        Google Calendar access is required for:
                    </p>

                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-ink)]/65">
                        <li>
                            • Creating interview events
                        </li>

                        <li>
                            • Generating Google Meet links
                        </li>

                        <li>
                            • Sending invitations to candidates and interviewers
                        </li>

                        <li>
                            • Rescheduling or cancelling events
                        </li>
                    </ul>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            handleOpenChange(
                                false,
                            );
                        }}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        onClick={
                            handleConnect
                        }
                        disabled={isPending}
                    >
                        {isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}

                        Connect Google
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}