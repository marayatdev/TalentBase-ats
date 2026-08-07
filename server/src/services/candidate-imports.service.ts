import { prisma } from "@/config/db";
import {
  applications_status,
  candidate_imports_import_status,
  candidate_imports_source,
  candidates_source,
  Prisma,
} from "@/generated/prisma/client";
import {
  GetImportHistoryQuery,
  ManualCandidateImportDto,
  ManualCandidateImportResult,
} from "@/types/candidate-import.type";
import { AppError } from "@/utils/app-error";

export class CandidateImportService {
  async importManual(
    data: ManualCandidateImportDto,
  ): Promise<ManualCandidateImportResult> {
    const fullName = data.full_name?.trim();

    if (!fullName) {
      throw new AppError("กรุณาระบุชื่อผู้สมัคร", 400);
    }

    const email = this.normalizeEmail(data.email);

    const phone = this.normalizePhone(data.phone);

    if (email && !this.isValidEmail(email)) {
      throw new AppError("รูปแบบอีเมลไม่ถูกต้อง", 400);
    }

    if (!email && !phone) {
      throw new AppError("กรุณาระบุอีเมลหรือเบอร์โทรอย่างน้อยหนึ่งรายการ", 400);
    }

    const job = await prisma.jobs.findUnique({
      where: {
        id: data.job_id,
      },

      select: {
        id: true,
        title: true,
        status: true,

        pipeline_stages: {
          orderBy: {
            stage_order: "asc",
          },

          take: 1,

          select: {
            id: true,
            name: true,
            stage_order: true,
          },
        },
      },
    });

    if (!job) {
      throw new AppError("ไม่พบตำแหน่งงาน", 404);
    }

    if (job.status === "closed") {
      throw new AppError("ตำแหน่งงานนี้ปิดรับสมัครแล้ว", 409);
    }

    const firstStage = job.pipeline_stages[0];

    if (!firstStage) {
      throw new AppError("ตำแหน่งงานนี้ยังไม่มี Pipeline Stage", 409);
    }

    const duplicateCandidate = await this.findDuplicateCandidate(email, phone);

    return prisma.$transaction(
      async (transaction) => {
        let candidateId: bigint;
        let candidateWasDuplicate = false;

        if (duplicateCandidate) {
          candidateId = duplicateCandidate.id;

          candidateWasDuplicate = true;

          await transaction.candidates.update({
            where: {
              id: candidateId,
            },

            data: {
              email: duplicateCandidate.email ?? email,

              phone: duplicateCandidate.phone ?? phone,

              current_position:
                duplicateCandidate.current_position ??
                data.current_position?.trim() ??
                undefined,

              source_url:
                duplicateCandidate.source_url ??
                data.source_url?.trim() ??
                undefined,
            },
          });
        } else {
          const candidate = await transaction.candidates.create({
            data: {
              full_name: fullName,
              email,
              phone,

              current_position: data.current_position?.trim() || null,

              total_experience_years: 0,

              source: this.mapCandidateSource(data.source),

              source_url: data.source_url?.trim() || null,
            },
          });

          candidateId = candidate.id;
        }

        const existingApplication = await transaction.applications.findFirst({
          where: {
            candidate_id: candidateId,

            job_id: data.job_id,
          },

          select: {
            id: true,
          },
        });

        if (existingApplication) {
          const importRecord = await transaction.candidate_imports.create({
            data: {
              candidate_id: candidateId,

              application_id: existingApplication.id,

              job_id: data.job_id,

              imported_by: data.imported_by,

              source: data.source,

              source_url: data.source_url?.trim() || null,

              raw_text: data.raw_text?.trim() || null,

              raw_data: {
                full_name: fullName,

                email: email ?? null,

                phone: phone ?? null,

                current_position: data.current_position?.trim() ?? null,
              },

              import_status: candidate_imports_import_status.duplicate,

              error_message: "ผู้สมัครมีใบสมัครในตำแหน่งนี้อยู่แล้ว",
            },
          });

          return {
            candidate_id: candidateId,

            application_id: existingApplication.id,

            import_id: importRecord.id,

            is_duplicate: true,
          };
        }

        const latestResume = await transaction.resumes.findFirst({
          where: {
            candidate_id: candidateId,
          },

          orderBy: {
            uploaded_at: "desc",
          },

          select: {
            id: true,
          },
        });

        const application = await transaction.applications.create({
          data: {
            candidate_id: candidateId,

            job_id: data.job_id,

            resume_id: latestResume?.id ?? null,

            current_stage_id: firstStage.id,

            assigned_hr_id: data.imported_by,

            status: applications_status.active,
          },
        });

        await transaction.application_stage_histories.create({
          data: {
            application_id: application.id,

            from_stage_id: null,

            to_stage_id: firstStage.id,

            changed_by: data.imported_by,

            note: "สร้างใบสมัครจาก Candidate Import",
          },
        });

        const importRecord = await transaction.candidate_imports.create({
          data: {
            candidate_id: candidateId,

            application_id: application.id,

            job_id: data.job_id,

            imported_by: data.imported_by,

            source: data.source,

            source_url: data.source_url?.trim() || null,

            raw_text: data.raw_text?.trim() || null,

            raw_data: {
              full_name: fullName,

              email: email ?? null,

              phone: phone ?? null,

              current_position: data.current_position?.trim() ?? null,
            },

            import_status: candidate_imports_import_status.completed,

            error_message: candidateWasDuplicate
              ? "เชื่อมกับ Candidate เดิมในระบบ"
              : null,
          },
        });

        return {
          candidate_id: candidateId,

          application_id: application.id,

          import_id: importRecord.id,

          is_duplicate: candidateWasDuplicate,
        };
      },
      {
        maxWait: 5_000,
        timeout: 15_000,
      },
    );
  }

  async getHistory(query: GetImportHistoryQuery = {}) {
    const page = Math.max(query.page ?? 1, 1);

    const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);

    const skip = (page - 1) * limit;

    const where: Prisma.candidate_importsWhereInput = {
      source: query.source,

      import_status: query.import_status,
    };

    const [importRecords, total] = await Promise.all([
      prisma.candidate_imports.findMany({
        where,
        skip,
        take: limit,

        orderBy: {
          created_at: "desc",
        },

        include: {
          candidates: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },

          jobs: {
            select: {
              id: true,
              title: true,
            },
          },

          applications: {
            select: {
              id: true,
              status: true,
            },
          },

          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),

      prisma.candidate_imports.count({
        where,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const imports = importRecords.map((record) => ({
      id: record.id,

      candidate_id: record.candidate_id,

      application_id: record.application_id,

      job_id: record.job_id,

      source: record.source,

      source_url: record.source_url,

      raw_text: record.raw_text,

      import_status: record.import_status,

      error_message: record.error_message,

      candidate: record.candidates,

      job: record.jobs,

      application: record.applications,

      imported_by: record.users,

      created_at: record.created_at,

      updated_at: record.updated_at,
    }));

    return {
      imports,

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage: page < totalPages,

        hasPreviousPage: page > 1,
      },
    };
  }

  private async findDuplicateCandidate(email?: string, phone?: string) {
    if (!email && !phone) {
      return null;
    }

    return prisma.candidates.findFirst({
      where: {
        OR: [
          ...(email
            ? [
                {
                  email,
                },
              ]
            : []),

          ...(phone
            ? [
                {
                  phone,
                },
              ]
            : []),
        ],
      },

      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        current_position: true,
        source_url: true,
      },
    });
  }

  private mapCandidateSource(
    source: candidate_imports_source,
  ): candidates_source {
    switch (source) {
      case candidate_imports_source.linkedin:
        return candidates_source.linkedin;

      case candidate_imports_source.facebook:
        return candidates_source.facebook;

      default:
        return candidates_source.manual;
    }
  }

  private normalizeEmail(email?: string): string | undefined {
    const normalized = email?.trim().toLowerCase();

    return normalized || undefined;
  }

  private normalizePhone(phone?: string): string | undefined {
    if (!phone) {
      return undefined;
    }

    const normalized = phone.trim().replace(/[\s()-]/g, "");

    if (normalized.startsWith("+66")) {
      return `0${normalized.slice(3)}`;
    }

    return normalized || undefined;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
