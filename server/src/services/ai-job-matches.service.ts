import { prisma } from "@/config/db";
import { Prisma } from "@/generated/prisma/client";
import { AIJobMatcherService } from "@/services/ai-job-matcher.service";
import { AIJobMatchResult } from "@/types/ai-job-match.type";
import { AppError } from "@/utils/app-error";

const aiJobMatcher = new AIJobMatcherService();

export class AIJobMatchService {
  async analyzeApplication(id: string) {
    const applicationId = this.parseId(id);

    const application = await prisma.applications.findUnique({
      where: {
        id: applicationId,
      },

      include: {
        candidates: {
          include: {
            candidate_skills: {
              include: {
                skills: true,
              },
            },

            candidate_experiences: {
              orderBy: {
                start_date: "desc",
              },
            },

            candidate_educations: {
              orderBy: {
                end_year: "desc",
              },
            },

            candidate_languages: true,

            candidate_certificates: true,
          },
        },

        jobs: {
          include: {
            job_skills: {
              include: {
                skills: true,
              },
            },
          },
        },

        resumes: {
          include: {
            ai_resume_results: true,
          },
        },

        pipeline_stages: true,
      },
    });

    if (!application) {
      throw new AppError("ไม่พบใบสมัครงาน", 404);
    }

    if (!application.resumes) {
      throw new AppError("ใบสมัครนี้ยังไม่มี Resume", 409);
    }

    if (!application.resumes.ai_resume_results) {
      throw new AppError("Resume ยังไม่ได้ถูกวิเคราะห์ด้วย AI", 409);
    }

    const jobInput = {
      title: application.jobs.title,

      description: application.jobs.description,

      requirements: application.jobs.requirements,

      employment_type: application.jobs.employment_type,

      minimum_experience_years:
        application.jobs.minimum_experience_years.toNumber(),

      skills: application.jobs.job_skills.map((item) => ({
        name: item.skills.name,

        is_required: item.is_required,

        weight: item.weight.toNumber(),
      })),
    };

    const candidateInput = {
      full_name: application.candidates.full_name,

      current_position: application.candidates.current_position,

      total_experience_years:
        application.candidates.total_experience_years.toNumber(),

      skills: application.candidates.candidate_skills.map((item) => ({
        name: item.skills.name,

        experience_years: item.experience_years?.toNumber() ?? null,

        proficiency: item.proficiency ?? null,
      })),

      experiences: application.candidates.candidate_experiences,

      educations: application.candidates.candidate_educations,

      languages: application.candidates.candidate_languages,

      certificates: application.candidates.candidate_certificates,

      resume_summary: application.resumes.ai_resume_results.summary,
    };

    /*
     * เรียก Gemini นอก Transaction
     * เพราะ network request อาจใช้เวลานาน
     */
    const result = await aiJobMatcher.match({
      job: jobInput,
      candidate: candidateInput,
    });

    /*
     * Transaction ใช้เฉพาะตอนเขียน DB
     * เพื่อให้ transaction สั้นที่สุด
     */
    const updatedApplication = await prisma.$transaction(
      async (transaction) => {
        return transaction.applications.update({
          where: {
            id: applicationId,
          },

          data: {
            ai_match_score: new Prisma.Decimal(result.overall_score),

            ai_match_summary: JSON.stringify(result),
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

            pipeline_stages: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      },
    );

    return {
      application: {
        id: updatedApplication.id,

        candidate: updatedApplication.candidates,

        job: updatedApplication.jobs,

        current_stage: updatedApplication.pipeline_stages,

        ai_match_score: updatedApplication.ai_match_score,
      },

      match: result,
    };
  }

  async getApplicationMatch(id: string) {
    const applicationId = this.parseId(id);

    const application = await prisma.applications.findUnique({
      where: {
        id: applicationId,
      },

      select: {
        id: true,
        ai_match_score: true,
        ai_match_summary: true,

        candidates: {
          select: {
            id: true,
            full_name: true,
            email: true,
            current_position: true,
          },
        },

        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },

        resumes: {
          select: {
            id: true,
            original_file_name: true,
            parse_status: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError("ไม่พบใบสมัครงาน", 404);
    }

    if (application.ai_match_score === null || !application.ai_match_summary) {
      throw new AppError("ใบสมัครนี้ยังไม่ได้วิเคราะห์ความเหมาะสม", 404);
    }

    let match: AIJobMatchResult | null = null;

    try {
      match = JSON.parse(application.ai_match_summary) as AIJobMatchResult;
    } catch {
      throw new AppError("ข้อมูลผลวิเคราะห์ไม่ถูกต้อง", 500);
    }

    return {
      application: {
        id: application.id,
        candidate: application.candidates,
        job: application.jobs,
        resume: application.resumes,
        ai_match_score: application.ai_match_score,
      },

      match,
    };
  }

  private parseId(id: string): bigint {
    if (!id || !/^\d+$/.test(id)) {
      throw new AppError("รหัสใบสมัครไม่ถูกต้อง", 400);
    }

    const applicationId = BigInt(id);

    if (applicationId <= 0n) {
      throw new AppError("รหัสใบสมัครไม่ถูกต้อง", 400);
    }

    return applicationId;
  }
}
