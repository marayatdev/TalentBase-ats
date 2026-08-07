import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useForm,
  Controller,
} from "react-hook-form";
import {
  zodResolver,
} from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sparkles,
  CheckCircle2,
  History,
  Loader2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Label,
} from "@/components/ui/label";
import {
  Textarea,
} from "@/components/ui/textarea";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  PageHeader,
} from "@/components/shared/PageHeader";
import {
  useJobs,
} from "@/hooks/useJobs";
import {
  useImportCandidate,
  useParseCandidateText,
} from "@/hooks/useCandidateImports";
import {
  normalizeError,
} from "@/api/axios";
import type {
  ImportSource,
  ParsedCandidateText,
} from "@/types/domain";

const importSchema = z
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

    source: z.enum([
      "linkedin",
      "facebook",
      "manual",
    ]),

    source_url: z
      .string()
      .trim()
      .optional(),

    raw_text: z
      .string()
      .trim()
      .optional(),

    job_id: z
      .string()
      .min(
        1,
        "Select a job",
      ),
  })
  .superRefine(
    (
      value,
      context,
    ) => {
      const email =
        value.email?.trim();

      const phone =
        value.phone?.trim();

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
        !z.string()
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

type ImportFormValues =
  z.infer<
    typeof importSchema
  >;

interface ImportResult {
  candidate_id: string;
  application_id: string;
  import_id: string;
  is_duplicate: boolean;
}

export default function CandidateImportPage() {
  const navigate =
    useNavigate();

  const {
    data: jobsData,
    isLoading:
    isJobsLoading,
  } = useJobs({
    page_size: 100,
    status: "open",
  });

  const jobs =
    jobsData?.jobs ?? [];

  /*
   * Section A:
   * Parse candidate text
   */
  const [
    parseSource,
    setParseSource,
  ] =
    useState<ImportSource>(
      "facebook",
    );

  const [
    parseSourceUrl,
    setParseSourceUrl,
  ] = useState("");

  const [
    rawText,
    setRawText,
  ] = useState("");

  const [
    parsed,
    setParsed,
  ] =
    useState<
      ParsedCandidateText | null
    >(null);

  const parseText =
    useParseCandidateText();

  /*
   * Section B:
   * Import candidate
   */
  const importCandidate =
    useImportCandidate();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: {
      errors,
    },
  } =
    useForm<ImportFormValues>({
      resolver:
        zodResolver(
          importSchema,
        ),

      defaultValues: {
        full_name: "",
        email: "",
        phone: "",
        current_position:
          "",
        source: "manual",
        source_url: "",
        raw_text: "",
        job_id: "",
      },
    });

  const [
    importResult,
    setImportResult,
  ] =
    useState<
      ImportResult | null
    >(null);

  function handleAnalyze(): void {
    const normalizedText =
      rawText.trim();

    if (!normalizedText) {
      toast.error(
        "Paste the candidate post content first",
      );

      return;
    }

    parseText.mutate(
      {
        source:
          parseSource,

        source_url:
          parseSourceUrl.trim() ||
          undefined,

        raw_text:
          normalizedText,
      },
      {
        onSuccess: (
          data,
        ) => {
          setParsed(
            data,
          );

          /*
           * AI อาจหา current_position ไม่เจอ
           * แต่หา target_position ได้
           */
          reset({
            full_name:
              data.full_name ??
              "",

            email:
              data.email ??
              "",

            phone:
              data.phone ??
              "",

            current_position:
              data.current_position ??
              data.target_position ??
              "",

            source:
              parseSource,

            source_url:
              parseSourceUrl.trim(),

            raw_text:
              normalizedText,

            job_id: "",
          });

          setImportResult(
            null,
          );

          toast.success(
            "AI extracted candidate details below",
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

  function onImport(
    values: ImportFormValues,
  ): void {
    importCandidate.mutate(
      {
        full_name:
          values.full_name.trim(),

        email:
          values.email?.trim() ||
          undefined,

        phone:
          values.phone?.trim() ||
          undefined,

        current_position:
          values.current_position
            ?.trim() ||
          undefined,

        source:
          values.source,

        source_url:
          values.source_url
            ?.trim() ||
          undefined,

        raw_text:
          values.raw_text
            ?.trim() ||
          undefined,

        /*
         * จุดนี้คือการบอกว่า
         * Candidate สมัคร Job ไหน
         */
        job_id:
          values.job_id,
      },
      {
        onSuccess: (
          result,
        ) => {
          setImportResult(
            result,
          );

          toast.success(
            result.is_duplicate
              ? "Candidate linked with existing data"
              : "Candidate imported successfully",
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidate Import"
        description="Bring in candidates found on Facebook, LinkedIn, or entered manually."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(
                "/imports/history",
              )
            }
          >
            <History className="h-4 w-4" />
            Import history
          </Button>
        }
      />

      {/* Section A: AI Parse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            Parse text with AI
          </CardTitle>

          <CardDescription>
            Paste a candidate's
            post or message
            content to extract
            structured details.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Source
              </Label>

              <Select
                value={
                  parseSource
                }
                onValueChange={(
                  value,
                ) =>
                  setParseSource(
                    value as ImportSource,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="linkedin">
                    LinkedIn
                  </SelectItem>

                  <SelectItem value="facebook">
                    Facebook
                  </SelectItem>

                  <SelectItem value="manual">
                    Manual
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Source URL
              </Label>

              <Input
                value={
                  parseSourceUrl
                }
                onChange={(
                  event,
                ) =>
                  setParseSourceUrl(
                    event.target.value,
                  )
                }
                placeholder="https://facebook.com/example"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Raw text
            </Label>

            <Textarea
              rows={5}
              value={
                rawText
              }
              onChange={(
                event,
              ) =>
                setRawText(
                  event.target.value,
                )
              }
              placeholder="Paste the candidate's post content here…"
            />
          </div>

          <Button
            type="button"
            onClick={
              handleAnalyze
            }
            disabled={
              parseText.isPending
            }
          >
            {parseText.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}

            {parseText.isPending
              ? "Analyzing..."
              : "Analyze text with AI"}
          </Button>

          {parsed && (
            <div className="rounded-lg border border-black/[0.06] bg-black/[0.015] p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/45">
                AI extracted result
                — review and edit
                below before
                importing
              </p>

              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--color-ink)]/50">
                    Full name
                  </dt>

                  <dd className="text-[var(--color-ink)]">
                    {parsed.full_name ??
                      "-"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[var(--color-ink)]/50">
                    Email
                  </dt>

                  <dd className="text-[var(--color-ink)]">
                    {parsed.email ??
                      "-"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[var(--color-ink)]/50">
                    Phone
                  </dt>

                  <dd className="text-[var(--color-ink)]">
                    {parsed.phone ??
                      "-"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[var(--color-ink)]/50">
                    Current position
                  </dt>

                  <dd className="text-[var(--color-ink)]">
                    {parsed.current_position ??
                      "-"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[var(--color-ink)]/50">
                    Target position
                  </dt>

                  <dd className="text-[var(--color-ink)]">
                    {parsed.target_position ??
                      "-"}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-[var(--color-ink)]/50">
                    Summary
                  </dt>

                  <dd className="text-[var(--color-ink)]">
                    {parsed.summary ??
                      "-"}
                  </dd>
                </div>
              </dl>

              {parsed.skills &&
                parsed.skills
                  .length >
                0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {parsed.skills.map(
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
                )}

              <p className="mt-3 text-xs text-[var(--color-ink)]/50">
                These fields have
                been pre-filled in
                the import form
                below. Review and
                edit them before
                importing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B: Import */}
      <Card>
        <CardHeader>
          <CardTitle>
            Import candidate
          </CardTitle>

          <CardDescription>
            Confirm the
            candidate's details
            and select a job to
            create an application
            in the first pipeline
            stage.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <form
            onSubmit={handleSubmit(
              onImport,
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">
                  Full name
                </Label>

                <Input
                  id="full_name"
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
                  {...register(
                    "email",
                  )}
                />

                {errors.email && (
                  <p className="text-xs text-red-600">
                    {
                      errors
                        .email
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
                  {...register(
                    "phone",
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="current_position">
                  Current or target
                  position
                </Label>

                <Input
                  id="current_position"
                  {...register(
                    "current_position",
                  )}
                />
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
                        <SelectItem value="linkedin">
                          LinkedIn
                        </SelectItem>

                        <SelectItem value="facebook">
                          Facebook
                        </SelectItem>

                        <SelectItem value="manual">
                          Manual
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
                  {...register(
                    "source_url",
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="raw_text">
                Original post
                content
              </Label>

              <Textarea
                id="raw_text"
                rows={3}
                {...register(
                  "raw_text",
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Job
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
                      field.value
                    }
                    onValueChange={
                      field.onChange
                    }
                    disabled={
                      isJobsLoading ||
                      jobs.length ===
                      0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isJobsLoading
                            ? "Loading jobs..."
                            : jobs.length ===
                              0
                              ? "No open jobs"
                              : "Select a job to apply this candidate to"
                        }
                      />
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

              {errors.job_id && (
                <p className="text-xs text-red-600">
                  {
                    errors
                      .job_id
                      .message
                  }
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={
                importCandidate.isPending ||
                isJobsLoading ||
                jobs.length ===
                0
              }
            >
              {importCandidate.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {importCandidate.isPending
                ? "Importing..."
                : "Import candidate"}
            </Button>
          </form>

          {importResult && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Candidate imported
                successfully
              </p>

              <dl className="mt-2 space-y-1 text-xs">
                <div>
                  Candidate ID:{" "}
                  {
                    importResult.candidate_id
                  }
                </div>

                <div>
                  Application ID:{" "}
                  {
                    importResult.application_id
                  }
                </div>

                <div>
                  Import ID:{" "}
                  {
                    importResult.import_id
                  }
                </div>
              </dl>

              {importResult.is_duplicate && (
                <p className="mt-2 text-xs">
                  Existing candidate
                  found. The system
                  linked this import
                  with existing
                  candidate data.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/candidates/${importResult.candidate_id}`,
                    )
                  }
                >
                  View candidate
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/applications/${importResult.application_id}`,
                    )
                  }
                >
                  View application
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    navigate(
                      "/pipeline",
                    )
                  }
                >
                  View pipeline
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}