import { useRef, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useUploadResume } from "@/hooks/useResumes";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = [".pdf", ".docx"];

interface ResumeUploadProps {
  candidateId: string;
  onUploaded?: (resumeId: string) => void;
}

export function ResumeUpload({
  candidateId,
  onUploaded,
}: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const upload = useUploadResume(candidateId);

  function validate(file: File): string | null {
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;

    if (!ACCEPTED.includes(extension)) {
      return "Only PDF and DOCX files are supported.";
    }

    if (file.size > MAX_SIZE) {
      return "File size must be under 10 MB.";
    }

    if (file.size === 0) {
      return "The selected file is empty.";
    }

    return null;
  }

  function handleFile(file: File): void {
    const validationError = validate(file);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    upload.mutate(file, {
      onSuccess: (resume) => {
        toast.success("Resume uploaded");

        /*
         * แจ้งหน้าหลักให้อัปเดต Candidate Detail
         */
        onUploaded?.(resume.id);
      },

      onError: () => {
        toast.error("Could not upload resume. Please try again.");
      },
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        isDragging
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-black/15 bg-black/[0.015]",
        upload.isPending && "pointer-events-none opacity-70",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => {
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);

        if (upload.isPending) {
          return;
        }

        const file = event.dataTransfer.files?.[0];

        if (file) {
          handleFile(file);
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        disabled={upload.isPending}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            handleFile(file);
          }

          /*
           * ทำให้เลือกไฟล์เดิมซ้ำได้
           */
          event.target.value = "";
        }}
      />

      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
        {upload.isPending ? (
          <FileText className="h-5 w-5 text-[var(--color-primary)]" />
        ) : (
          <UploadCloud className="h-5 w-5 text-[var(--color-primary)]" />
        )}
      </div>

      <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
        {upload.isPending
          ? "Uploading resume…"
          : "Drag and drop a resume here"}
      </p>

      <p className="mt-1 text-xs text-[var(--color-ink)]/50">
        or{" "}
        <button
          type="button"
          disabled={upload.isPending}
          className="font-medium text-[var(--color-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => inputRef.current?.click()}
        >
          browse files
        </button>{" "}
        · PDF or DOCX, up to 10 MB
      </p>

      {upload.isPending && (
        <div className="mx-auto mt-4 max-w-xs">
          <Progress value={upload.progress} />

          <p className="mt-1 text-xs text-[var(--color-ink)]/50">
            {upload.progress}%
          </p>
        </div>
      )}
    </div>
  );
}