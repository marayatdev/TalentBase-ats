import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
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
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useCandidate,
  useCreateCandidateWithResume,
  useUpdateCandidate,
} from "@/hooks/useCandidates";
import { useJobs } from "@/hooks/useJobs";
import { normalizeError } from "@/api/axios";

const MAX_RESUME_SIZE =
  10 * 1024 * 1024;

const ALLOWED_RESUME_EXTENSIONS = [
  ".pdf",
  ".docx",
];

const schema = z
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

    linkedin_url: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .optional()
      .or(z.literal("")),

    current_position: z
      .string()
      .trim()
      .optional(),

    total_experience_years: z.coerce
      .number()
      .min(
        0,
        "Experience cannot be negative",
      )
      .optional(),

    source: z.enum([
      "manual",
      "website",
      "email",
      "linkedin",
      "facebook",
      "referral",
    ]),

    source_url: z
      .string()
      .trim()
      .optional(),

    /*
     * ถ้าไม่เลือก Job:
     * จะสร้าง Candidate เข้า Talent Pool อย่างเดียว
     */
    job_id: z
      .string()
      .trim()
      .optional(),
  })
  .superRefine(
    (
      values,
      context,
    ) => {
      const email =
        values.email?.trim();

      const phone =
        values.phone?.trim();

      if (!email && !phone) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "email",
          ],

          message:
            "Enter an email or phone number",
        });
      }

      if (
        email &&
        !z
          .string()
          .email()
          .safeParse(
            email,
          ).success
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "email",
          ],

          message:
            "Enter a valid email address",
        });
      }
    },
  );

type FormValues =
  z.infer<typeof schema>;

const defaults: FormValues = {
  full_name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  current_position: "",
  total_experience_years: 0,
  source: "manual",
  source_url: "",
  job_id: "",
};

function getFileExtension(
  fileName: string,
): string {
  const dotIndex =
    fileName.lastIndexOf(".");

  if (dotIndex < 0) {
    return "";
  }

  return fileName
    .slice(dotIndex)
    .toLowerCase();
}

function validateResumeFile(
  file: File,
): string | null {
  const extension =
    getFileExtension(file.name);

  if (
    !ALLOWED_RESUME_EXTENSIONS.includes(
      extension,
    )
  ) {
    return "Resume must be a PDF or DOCX file";
  }

  if (file.size === 0) {
    return "The selected file is empty";
  }

  if (
    file.size >
    MAX_RESUME_SIZE
  ) {
    return "Resume must not exceed 10 MB";
  }

  return null;
}

function formatFileSize(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default function CandidateFormPage() {
  const {
    id,
  } =
    useParams<{
      id: string;
    }>();

  const isEdit =
    Boolean(id);

  const navigate =
    useNavigate();

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  /*
   * Hooks ต้องเรียกก่อน conditional return ทุกตัว
   */
  const {
    data: candidate,
    isLoading:
    isCandidateLoading,
  } =
    useCandidate(id);

  const {
    data: jobsData,
    isLoading:
    isJobsLoading,
  } = useJobs({
    page: 1,
    page_size: 100,
    status: "open",
  });

  const createCandidateWithResume =
    useCreateCandidateWithResume();

  const updateCandidate =
    useUpdateCandidate(
      id ?? "",
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    isDragging,
    setIsDragging,
  ] =
    useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: {
      errors,
    },
  } =
    useForm<FormValues>({
      resolver:
        zodResolver(
          schema,
        ),

      defaultValues:
        defaults,
    });

  const jobs =
    jobsData?.jobs ?? [];

  useEffect(() => {
    if (!candidate) {
      return;
    }

    reset({
      full_name:
        candidate.full_name,

      email:
        candidate.email ??
        "",

      phone:
        candidate.phone ??
        "",

      linkedin_url:
        candidate.linkedin_url ??
        "",

      current_position:
        candidate.current_position ??
        "",

      total_experience_years:
        candidate.total_experience_years ??
        0,

      source:
        candidate.source,

      source_url:
        candidate.source_url ??
        "",

      /*
       * หน้า Edit ไม่สร้าง Application ใหม่
       */
      job_id: "",
    });
  }, [
    candidate,
    reset,
  ]);

  function handleSelectedFile(
    file: File,
  ): void {
    const validationError =
      validateResumeFile(file);

    if (validationError) {
      setSelectedFile(
        null,
      );

      toast.error(
        validationError,
      );

      return;
    }

    setSelectedFile(
      file,
    );
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file =
      event.target.files?.[0];

    if (file) {
      handleSelectedFile(
        file,
      );
    }

    /*
     * ทำให้เลือกไฟล์เดิมซ้ำได้
     */
    event.target.value =
      "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
  ): void {
    event.preventDefault();

    setIsDragging(
      false,
    );

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      handleSelectedFile(
        file,
      );
    }
  }

  function clearSelectedFile(): void {
    setSelectedFile(
      null,
    );
  }

  function onSubmit(
    values: FormValues,
  ): void {
    if (
      isEdit &&
      id
    ) {
      updateCandidate.mutate(
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
            values.total_experience_years ??
            0,

          source:
            values.source,

          source_url:
            values.source_url?.trim() ||
            null,
        },
        {
          onSuccess: (
            updatedCandidate,
          ) => {
            toast.success(
              "Candidate updated",
            );

            navigate(
              `/candidates/${updatedCandidate.id}`,
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

      return;
    }

    createCandidateWithResume.mutate(
      {
        full_name:
          values.full_name.trim(),

        email:
          values.email?.trim() ||
          undefined,

        phone:
          values.phone?.trim() ||
          undefined,

        linkedin_url:
          values.linkedin_url?.trim() ||
          undefined,

        current_position:
          values.current_position?.trim() ||
          undefined,

        total_experience_years:
          values.total_experience_years ??
          0,

        source:
          values.source,

        source_url:
          values.source_url?.trim() ||
          undefined,

        job_id:
          values.job_id ||
          undefined,

        resume:
          selectedFile ??
          undefined,
      },
      {
        onSuccess: (
          result,
        ) => {
          if (
            result.application
          ) {
            toast.success(
              result.resume
                ? "Candidate, resume, and application created"
                : "Candidate and application created",
            );

            navigate(
              `/applications/${result.application.id}`,
            );

            return;
          }

          toast.success(
            result.resume
              ? "Candidate and resume created"
              : "Candidate created",
          );

          navigate(
            `/candidates/${result.candidate.id}`,
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

  if (
    isEdit &&
    isCandidateLoading
  ) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />

        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const isSaving =
    createCandidateWithResume.isPending ||
    updateCandidate.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title={
          isEdit
            ? "Edit candidate"
            : "Add candidate"
        }
        description={
          isEdit
            ? "Update this candidate's profile."
            : "Add a candidate to the talent pool and optionally attach a resume or job application."
        }
      />

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit(
              onSubmit,
              (validationErrors) => {
                console.error(
                  "Candidate form validation errors:",
                  validationErrors,
                );

                const firstMessage =
                  Object.values(validationErrors)
                    .map((fieldError) => fieldError?.message)
                    .find(
                      (message): message is string =>
                        typeof message === "string",
                    );

                toast.error(
                  firstMessage ??
                  "Please check the invalid fields",
                );
              },
            )}
            className="space-y-6"
            noValidate
          >
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                  Candidate information
                </h2>

                <p className="text-xs text-[var(--color-ink)]/50">
                  Provide the candidate's basic contact and professional information.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">
                    Full name
                  </Label>

                  <Input
                    id="full_name"
                    placeholder="Somchai Developer"
                    {...register(
                      "full_name",
                    )}
                  />

                  {errors.full_name && (
                    <p className="text-xs text-red-600">
                      {
                        errors
                          .full_name
                          .message
                      }
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    Email
                  </Label>

                  <Input
                    id="email"
                    type="email"
                    placeholder="somchai@example.com"
                    {...register(
                      "email",
                    )}
                  />

                  {errors.email && (
                    <p className="text-xs text-red-600">
                      {
                        errors.email
                          .message
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Phone
                  </Label>

                  <Input
                    id="phone"
                    placeholder="0812345678"
                    {...register(
                      "phone",
                    )}
                  />

                  {errors.phone && (
                    <p className="text-xs text-red-600">
                      {
                        errors.phone
                          .message
                      }
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="linkedin_url">
                    LinkedIn URL
                  </Label>

                  <Input
                    id="linkedin_url"
                    placeholder="https://linkedin.com/in/username"
                    {...register(
                      "linkedin_url",
                    )}
                  />

                  {errors.linkedin_url && (
                    <p className="text-xs text-red-600">
                      {
                        errors
                          .linkedin_url
                          .message
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="current_position">
                    Current position
                  </Label>

                  <Input
                    id="current_position"
                    placeholder="Backend Developer"
                    {...register(
                      "current_position",
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="total_experience_years">
                    Total experience
                    (years)
                  </Label>

                  <Input
                    id="total_experience_years"
                    type="number"
                    min={0}
                    step="0.5"
                    {...register(
                      "total_experience_years",
                    )}
                  />

                  {errors.total_experience_years && (
                    <p className="text-xs text-red-600">
                      {
                        errors
                          .total_experience_years
                          .message
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Source
                  </Label>

                  <Controller
                    control={
                      control
                    }
                    name="source"
                    render={({
                      field,
                    }) => (
                      <Select
                        value={
                          field.value
                        }
                        onValueChange={
                          field.onChange
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
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
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="source_url">
                    Source URL
                  </Label>

                  <Input
                    id="source_url"
                    placeholder="https://…"
                    {...register(
                      "source_url",
                    )}
                  />
                </div>
              </div>
            </section>

            {!isEdit && (
              <>
                <div className="border-t border-black/[0.06]" />

                <section className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                      Resume / CV
                      {/* <span className="ml-1 font-normal text-[var(--color-ink)]/45">
                        Optional
                      </span> */}
                    </h2>

                    <p className="text-xs text-[var(--color-ink)]/50">
                      Attach a PDF or DOCX resume. It can be analyzed by AI after creation.
                    </p>
                  </div>

                  {!selectedFile ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        inputRef.current?.click()
                      }
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                          "Enter" ||
                          event.key ===
                          " "
                        ) {
                          event.preventDefault();

                          inputRef.current?.click();
                        }
                      }}
                      onDragEnter={(
                        event,
                      ) => {
                        event.preventDefault();

                        setIsDragging(
                          true,
                        );
                      }}
                      onDragOver={(
                        event,
                      ) => {
                        event.preventDefault();

                        setIsDragging(
                          true,
                        );
                      }}
                      onDragLeave={(
                        event,
                      ) => {
                        event.preventDefault();

                        setIsDragging(
                          false,
                        );
                      }}
                      onDrop={
                        handleDrop
                      }
                      className={[
                        "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl",
                        "border-2 border-dashed px-6 py-8 text-center transition-colors",
                        isDragging
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "border-black/10 hover:border-[var(--color-primary)]/40 hover:bg-black/[0.015]",
                      ].join(" ")}
                    >
                      <input
                        ref={
                          inputRef
                        }
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={
                          handleFileChange
                        }
                      />

                      <div className="rounded-full bg-[var(--color-primary)]/10 p-3">
                        <UploadCloud className="h-6 w-6 text-[var(--color-primary)]" />
                      </div>

                      <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
                        Drop a resume here or click to browse
                      </p>

                      <p className="mt-1 text-xs text-[var(--color-ink)]/50">
                        PDF or DOCX, maximum 10 MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] bg-white p-3">
                      <div className="rounded-md bg-black/[0.04] p-2">
                        <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          title={
                            selectedFile.name
                          }
                          className="truncate text-sm font-medium text-[var(--color-ink)]"
                        >
                          {
                            selectedFile.name
                          }
                        </p>

                        <p className="text-xs text-[var(--color-ink)]/50">
                          {formatFileSize(
                            selectedFile.size,
                          )}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={
                          clearSelectedFile
                        }
                        disabled={
                          isSaving
                        }
                        aria-label="Remove resume"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </section>

                <div className="border-t border-black/[0.06]" />

                <section className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                      Job application
                      {/* <span className="ml-1 font-normal text-[var(--color-ink)]/45">
                        Optional
                      </span> */}
                    </h2>

                    <p className="text-xs text-[var(--color-ink)]/50">
                      Select a job to create an application and place the candidate in its first pipeline stage.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Apply to job
                    </Label>

                    <Controller
                      control={
                        control
                      }
                      name="job_id"
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
                            isJobsLoading
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isJobsLoading
                                  ? "Loading jobs..."
                                  : "Do not create an application"
                              }
                            />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="none">
                              Talent pool only
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

                    {jobs.length ===
                      0 &&
                      !isJobsLoading && (
                        <p className="text-xs text-amber-700">
                          There are no open jobs. The candidate will be added to the talent pool only.
                        </p>
                      )}
                  </div>
                </section>
              </>
            )}

            <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(-1)
                }
                disabled={
                  isSaving
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  isSaving
                }
              >
                {isSaving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {isEdit
                  ? "Save changes"
                  : selectedFile
                    ? "Create candidate"
                    : "Add candidate"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}