import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { PageHeader } from "@/components/shared/PageHeader";
import { useJob, useCreateJob, useUpdateJob } from "@/hooks/useJobs";
import { normalizeError } from "@/api/axios";

/**
 * แปลงค่าจาก input:
 * ""        -> null
 * null      -> null
 * undefined -> null
 * "30000"   -> 30000
 * 30000     -> 30000
 */
// const nullableNumberSchema = z.preprocess(
//   (value) => {
//     if (value === "" || value === null || value === undefined) {
//       return null;
//     }

//     return Number(value);
//   },
//   z
//     .number({
//       error: "Enter a valid number",
//     })
//     .min(0, "Must be 0 or more")
//     .nullable(),
// );

const schema = z
  .object({
    title: z.string().trim().min(2, "Enter a job title"),

    description: z
      .string()
      .trim()
      .min(10, "Description should be at least 10 characters"),

    requirements: z
      .string()
      .trim()
      .min(3, "List the role's requirements"),

    employment_type: z.enum([
      "full_time",
      "part_time",
      "contract",
      "internship",
    ]),

    minimum_experience_years: z.coerce
      .number()
      .min(0, "Must be 0 or more"),

    salary_min: z
      .number()
      .min(0, "Must be 0 or more")
      .nullable(),

    salary_max: z
      .number()
      .min(0, "Must be 0 or more")
      .nullable(),

    number_of_positions: z.coerce
      .number()
      .int("Number of positions must be a whole number")
      .min(1, "At least 1 position"),

    status: z.enum(["draft", "open", "closed"]),
  })
  .superRefine((values, context) => {
    if (
      values.salary_min !== null &&
      values.salary_max !== null &&
      values.salary_max < values.salary_min
    ) {
      context.addIssue({
        code: "custom",
        path: ["salary_max"],
        message:
          "Maximum salary must be greater than or equal to the minimum",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const defaults: FormValues = {
  title: "",
  description: "",
  requirements: "",
  employment_type: "full_time",
  minimum_experience_years: 0,
  salary_min: null,
  salary_max: null,
  number_of_positions: 1,
  status: "draft",
};

export default function JobFormPage() {
  const { id } = useParams<{ id: string }>();

  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const {
    data: job,
    isLoading,
    isError,
    refetch,
  } = useJob(id);

  const createJob = useCreateJob();
  const updateJob = useUpdateJob(id ?? "");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!job) {
      return;
    }

    reset({
      title: job.title,
      description: job.description ?? "",
      requirements: job.requirements ?? "",
      employment_type: job.employment_type,
      minimum_experience_years: job.minimum_experience_years,

      // ห้ามใช้ Number(null) เพราะจะกลายเป็น 0
      salary_min: job.salary_min,
      salary_max: job.salary_max,

      number_of_positions: job.number_of_positions,
      status: job.status,
    });
  }, [job, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      requirements: values.requirements.trim(),
    };

    if (isEdit && id) {
      updateJob.mutate(payload, {
        onSuccess: () => {
          toast.success("Job updated");
          navigate(`/jobs/${id}/pipeline`);
        },
        onError: (error) => {
          toast.error(normalizeError(error).message);
        },
      });

      return;
    }

    createJob.mutate(payload, {
      onSuccess: (createdJob) => {
        toast.success("Job created");
        navigate(`/jobs/${createdJob.id}`);
      },
      onError: (error) => {
        toast.error(normalizeError(error).message);
      },
    });
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isEdit && isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <PageHeader
          title="Could not load job"
          description="An error occurred while loading this job posting."
        />

        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <p className="text-sm text-muted-foreground">
              Please try loading the job again.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/jobs")}>
                Back to jobs
              </Button>

              <Button onClick={() => refetch()}>Try again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSaving = createJob.isPending || updateJob.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={isEdit ? "Edit job" : "Create job"}
        description={
          isEdit ? "Update this job posting." : "Post a new open role."
        }
      />

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Job title</Label>

              <Input
                id="title"
                placeholder="Backend Developer"
                disabled={isSaving}
                {...register("title")}
              />

              {errors.title && (
                <p className="text-xs text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>

              <Textarea
                id="description"
                rows={4}
                placeholder="Develop and maintain backend APIs"
                disabled={isSaving}
                {...register("description")}
              />

              {errors.description && (
                <p className="text-xs text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requirements">Requirements</Label>

              <Textarea
                id="requirements"
                rows={3}
                placeholder="Node.js, TypeScript, Express, Prisma, MySQL"
                disabled={isSaving}
                {...register("requirements")}
              />

              {errors.requirements && (
                <p className="text-xs text-red-600">
                  {errors.requirements.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="employment_type">Employment type</Label>

                <Controller
                  control={control}
                  name="employment_type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSaving}
                    >
                      <SelectTrigger id="employment_type">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="full_time">
                          Full time
                        </SelectItem>
                        <SelectItem value="part_time">
                          Part time
                        </SelectItem>
                        <SelectItem value="contract">
                          Contract
                        </SelectItem>
                        <SelectItem value="internship">
                          Internship
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />

                {errors.employment_type && (
                  <p className="text-xs text-red-600">
                    {errors.employment_type.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>

                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSaving}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />

                {errors.status && (
                  <p className="text-xs text-red-600">
                    {errors.status.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="minimum_experience_years">
                  Minimum experience (years)
                </Label>

                <Input
                  id="minimum_experience_years"
                  type="number"
                  min={0}
                  step={0.1}
                  disabled={isSaving}
                  {...register("minimum_experience_years")}
                />

                {errors.minimum_experience_years && (
                  <p className="text-xs text-red-600">
                    {errors.minimum_experience_years.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="number_of_positions">
                  Number of positions
                </Label>

                <Input
                  id="number_of_positions"
                  type="number"
                  min={1}
                  step={1}
                  disabled={isSaving}
                  {...register("number_of_positions")}
                />

                {errors.number_of_positions && (
                  <p className="text-xs text-red-600">
                    {errors.number_of_positions.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="salary_min">
                  Minimum salary (฿)
                </Label>

                <Controller
                  control={control}
                  name="salary_min"
                  render={({ field }) => (
                    <Input
                      id="salary_min"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Not specified"
                      disabled={isSaving}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        field.onChange(
                          value === "" ? null : Number(value),
                        );
                      }}
                    />
                  )}
                />

                {errors.salary_min && (
                  <p className="text-xs text-red-600">
                    {errors.salary_min.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="salary_max">
                  Maximum salary (฿)
                </Label>

                <Controller
                  control={control}
                  name="salary_max"
                  render={({ field }) => (
                    <Input
                      id="salary_max"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Not specified"
                      disabled={isSaving}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        field.onChange(
                          value === "" ? null : Number(value),
                        );
                      }}
                    />
                  )}
                />

                {errors.salary_max && (
                  <p className="text-xs text-red-600">
                    {errors.salary_max.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isSaving}>
                {isSaving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {isEdit ? "Save changes" : "Create job"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}