import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Job } from "@/types/domain";
import type { JobPayload } from "@/api/jobs.api";

const schema = z
  .object({
    title: z.string().min(2, "Title is required"),
    description: z.string().min(10, "Description should be at least 10 characters"),
    requirements: z.string().min(3, "Requirements are required"),
    employment_type: z.enum(["full_time", "part_time", "contract", "internship"]),
    minimum_experience_years: z.coerce.number().min(0, "Must be 0 or more"),
    salary_min: z.coerce.number().min(0, "Must be 0 or more"),
    salary_max: z.coerce.number().min(0, "Must be 0 or more"),
    number_of_positions: z.coerce.number().min(1, "At least 1 position"),
    status: z.enum(["draft", "open", "closed"]),
  })
  .refine((data) => data.salary_max >= data.salary_min, {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["salary_max"],
  });

export type JobFormValues = z.infer<typeof schema>;

interface JobFormProps {
  defaultValues?: Partial<Job>;
  onSubmit: (values: JobPayload) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function JobForm({ defaultValues, onSubmit, isSubmitting, submitLabel = "Save job" }: JobFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      requirements: defaultValues?.requirements ?? "",
      employment_type: defaultValues?.employment_type ?? "full_time",
      minimum_experience_years: defaultValues?.minimum_experience_years ?? 0,
      salary_min: Number(defaultValues?.salary_min ?? 0),
      salary_max: Number(defaultValues?.salary_max ?? 0),
      number_of_positions: defaultValues?.number_of_positions ?? 1,
      status: defaultValues?.status ?? "draft",
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="title">Job title</Label>
          <Input id="title" placeholder="Backend Developer" {...register("title")} />
          {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={4} placeholder="Develop and maintain backend APIs" {...register("description")} />
          {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="requirements">Requirements</Label>
          <Textarea id="requirements" rows={3} placeholder="Node.js, TypeScript, Express, Prisma, MySQL" {...register("requirements")} />
          {errors.requirements && <p className="text-xs text-red-600">{errors.requirements.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Employment type</Label>
          <Controller
            control={control}
            name="employment_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full time</SelectItem>
                  <SelectItem value="part_time">Part time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="minimum_experience_years">Minimum experience (years)</Label>
          <Input id="minimum_experience_years" type="number" min={0} {...register("minimum_experience_years")} />
          {errors.minimum_experience_years && <p className="text-xs text-red-600">{errors.minimum_experience_years.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="number_of_positions">Number of positions</Label>
          <Input id="number_of_positions" type="number" min={1} {...register("number_of_positions")} />
          {errors.number_of_positions && <p className="text-xs text-red-600">{errors.number_of_positions.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="salary_min">Minimum salary</Label>
          <Input id="salary_min" type="number" min={0} {...register("salary_min")} />
          {errors.salary_min && <p className="text-xs text-red-600">{errors.salary_min.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="salary_max">Maximum salary</Label>
          <Input id="salary_max" type="number" min={0} {...register("salary_max")} />
          {errors.salary_max && <p className="text-xs text-red-600">{errors.salary_max.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
