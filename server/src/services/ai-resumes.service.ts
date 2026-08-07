import { prisma } from "@/config/db";
import {
  candidate_skills_proficiency,
  Prisma,
  resumes_parse_status,
} from "@/generated/prisma/client";
import { AIResumeParserService } from "@/services/ai-resume-parser.service";
import {
  ParsedResumeData,
  ResumeCertificate,
  ResumeEducation,
  ResumeExperience,
  ResumeLanguage,
  ResumeSkill,
} from "@/types/ai-resume.type";
import { AppError } from "@/utils/app-error";
import { mapSkillProficiency } from "@/utils/skill-proficiency";
import { ResumeTextExtractor } from "@/utils/resume-text-extractor";

const resumeTextExtractor = new ResumeTextExtractor();
const aiResumeParser = new AIResumeParserService();

interface PreparedSkill {
  skillId: bigint;
  experienceYears: number | null;
  proficiency?: candidate_skills_proficiency;
}

export class AIResumeService {
  async parseResume(id: string) {
    const resumeId = this.parseId(id);

    const resume = await prisma.resumes.findUnique({
      where: {
        id: resumeId,
      },
      select: {
        id: true,
        candidate_id: true,
        original_file_name: true,
        file_url: true,
        mime_type: true,
        parse_status: true,
      },
    });

    if (!resume) {
      throw new AppError("ไม่พบ Resume", 404);
    }

    if (resume.parse_status === resumes_parse_status.processing) {
      throw new AppError("Resume กำลังถูกประมวลผลอยู่", 409);
    }

    await prisma.resumes.update({
      where: {
        id: resumeId,
      },
      data: {
        parse_status: resumes_parse_status.processing,
      },
    });

    try {
      /*
       * งานที่อาจใช้เวลานานต้องทำก่อนเข้า Transaction
       */
      const extractedText = await resumeTextExtractor.extract(
        resume.file_url,
        resume.mime_type,
      );

      const parsedData = await aiResumeParser.parseResume(extractedText);

      /*
       * เตรียม Skills และ Skill IDs ก่อนเข้า Transaction
       * เพื่อลดจำนวน Query และป้องกัน Transaction timeout
       */
      const preparedSkills = await this.prepareSkills(parsedData.skills);

      const aiResult = await prisma.$transaction(
        async (transaction) => {
          const result = await transaction.ai_resume_results.upsert({
            where: {
              resume_id: resumeId,
            },
            create: {
              resume_id: resumeId,
              extracted_text: extractedText,
              summary: parsedData.summary,
              parsed_data: parsedData as unknown as Prisma.InputJsonValue,
              model_name: this.getModelName(),
              processed_at: new Date(),
              error_message: null,
            },
            update: {
              extracted_text: extractedText,
              summary: parsedData.summary,
              parsed_data: parsedData as unknown as Prisma.InputJsonValue,
              model_name: this.getModelName(),
              processed_at: new Date(),
              error_message: null,
            },
          });

          await this.updateCandidateProfile(
            transaction,
            resume.candidate_id,
            parsedData,
          );

          await this.replaceCandidateSkills(
            transaction,
            resume.candidate_id,
            preparedSkills,
          );

          await this.replaceCandidateExperiences(
            transaction,
            resume.candidate_id,
            parsedData.experiences,
          );

          await this.replaceCandidateEducations(
            transaction,
            resume.candidate_id,
            parsedData.educations,
          );

          await this.replaceCandidateLanguages(
            transaction,
            resume.candidate_id,
            parsedData.languages,
          );

          await this.replaceCandidateCertificates(
            transaction,
            resume.candidate_id,
            parsedData.certificates,
          );

          await transaction.resumes.update({
            where: {
              id: resumeId,
            },
            data: {
              parse_status: resumes_parse_status.completed,
            },
          });

          return result;
        },
        {
          maxWait: 5_000,
          timeout: 20_000,
        },
      );

      const updatedCandidate = await this.getUpdatedCandidate(
        resume.candidate_id,
      );

      return {
        resume: {
          id: resume.id,
          original_file_name: resume.original_file_name,
          parse_status: resumes_parse_status.completed,
        },
        candidate: updatedCandidate,
        analysis: {
          summary: parsedData.summary,
          skills: parsedData.skills,
          experiences: parsedData.experiences,
          educations: parsedData.educations,
          languages: parsedData.languages,
          certificates: parsedData.certificates,
          model_name: aiResult.model_name,
          processed_at: aiResult.processed_at,
        },
      };
    } catch (error) {
      await this.markAsFailed(resumeId, error);

      throw error;
    }
  }

  async getResult(id: string) {
    const resumeId = this.parseId(id);

    const resume = await prisma.resumes.findUnique({
      where: {
        id: resumeId,
      },
      select: {
        id: true,
        candidate_id: true,
        original_file_name: true,
        file_url: true,
        mime_type: true,
        file_size: true,
        parse_status: true,
        uploaded_at: true,

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
            candidate_languages: {
              orderBy: {
                language: "asc",
              },
            },
            candidate_certificates: {
              orderBy: {
                issue_date: "desc",
              },
            },
          },
        },

        ai_resume_results: {
          select: {
            id: true,
            resume_id: true,
            summary: true,
            parsed_data: true,
            model_name: true,
            error_message: true,
            processed_at: true,
            created_at: true,
          },
        },
      },
    });

    if (!resume) {
      throw new AppError("ไม่พบ Resume", 404);
    }

    if (!resume.ai_resume_results) {
      throw new AppError("Resume นี้ยังไม่ได้ถูกวิเคราะห์ด้วย AI", 404);
    }

    return resume;
  }

  private async updateCandidateProfile(
    transaction: Prisma.TransactionClient,
    candidateId: bigint,
    parsedData: ParsedResumeData,
  ): Promise<void> {
    await transaction.candidates.update({
      where: {
        id: candidateId,
      },
      data: {
        /*
         * ถ้า AI คืน null จะไม่เขียนทับข้อมูลเดิม
         */
        full_name: parsedData.full_name ?? undefined,

        email: parsedData.email ?? undefined,

        phone: parsedData.phone ?? undefined,

        linkedin_url: parsedData.linkedin_url ?? undefined,

        current_position: parsedData.current_position ?? undefined,

        total_experience_years: parsedData.total_experience_years,
      },
    });
  }

  private async replaceCandidateSkills(
    transaction: Prisma.TransactionClient,
    candidateId: bigint,
    preparedSkills: PreparedSkill[],
  ): Promise<void> {
    await transaction.candidate_skills.deleteMany({
      where: {
        candidate_id: candidateId,
      },
    });

    if (preparedSkills.length === 0) {
      return;
    }

    await transaction.candidate_skills.createMany({
      data: preparedSkills.map((skill) => ({
        candidate_id: candidateId,
        skill_id: skill.skillId,
        experience_years: skill.experienceYears,
        proficiency: skill.proficiency,
      })),
      skipDuplicates: true,
    });
  }

  private async replaceCandidateExperiences(
    transaction: Prisma.TransactionClient,
    candidateId: bigint,
    experiences: ResumeExperience[],
  ): Promise<void> {
    await transaction.candidate_experiences.deleteMany({
      where: {
        candidate_id: candidateId,
      },
    });

    const validExperiences = experiences.filter(
      (experience) => experience.company.trim() && experience.position.trim(),
    );

    if (validExperiences.length === 0) {
      return;
    }

    await transaction.candidate_experiences.createMany({
      data: validExperiences.map((experience) => ({
        candidate_id: candidateId,
        company: experience.company.trim(),
        position: experience.position.trim(),
        start_date: experience.start_date,
        end_date: experience.end_date,
        is_current: experience.is_current,
        description: experience.description?.trim() || null,
      })),
    });
  }

  private async replaceCandidateEducations(
    transaction: Prisma.TransactionClient,
    candidateId: bigint,
    educations: ResumeEducation[],
  ): Promise<void> {
    await transaction.candidate_educations.deleteMany({
      where: {
        candidate_id: candidateId,
      },
    });

    const validEducations = educations.filter((education) =>
      education.institution.trim(),
    );

    if (validEducations.length === 0) {
      return;
    }

    await transaction.candidate_educations.createMany({
      data: validEducations.map((education) => ({
        candidate_id: candidateId,
        institution: education.institution.trim(),
        degree: education.degree?.trim() || null,
        field_of_study: education.field_of_study?.trim() || null,
        start_year: education.start_year,
        end_year: education.end_year,
      })),
    });
  }

  private async replaceCandidateLanguages(
    transaction: Prisma.TransactionClient,
    candidateId: bigint,
    languages: ResumeLanguage[],
  ): Promise<void> {
    await transaction.candidate_languages.deleteMany({
      where: {
        candidate_id: candidateId,
      },
    });

    const uniqueLanguages = new Map<string, ResumeLanguage>();

    for (const language of languages) {
      const languageName = language.name.trim();

      if (!languageName) {
        continue;
      }

      const key = languageName.toLowerCase();

      if (!uniqueLanguages.has(key)) {
        uniqueLanguages.set(key, {
          ...language,
          name: languageName,
        });
      }
    }

    const normalizedLanguages = Array.from(uniqueLanguages.values());

    if (normalizedLanguages.length === 0) {
      return;
    }

    await transaction.candidate_languages.createMany({
      data: normalizedLanguages.map((language) => ({
        candidate_id: candidateId,

        /*
         * ถ้า Prisma db pull ได้ชื่อ field เป็น name
         * ให้เปลี่ยน language เป็น name
         */
        language: language.name,

        level: language.level?.trim() || null,
      })),
      skipDuplicates: true,
    });
  }

  private async replaceCandidateCertificates(
    transaction: Prisma.TransactionClient,
    candidateId: bigint,
    certificates: ResumeCertificate[],
  ): Promise<void> {
    await transaction.candidate_certificates.deleteMany({
      where: {
        candidate_id: candidateId,
      },
    });

    const validCertificates = certificates.filter((certificate) =>
      certificate.name.trim(),
    );

    if (validCertificates.length === 0) {
      return;
    }

    await transaction.candidate_certificates.createMany({
      data: validCertificates.map((certificate) => ({
        candidate_id: candidateId,
        name: certificate.name.trim(),
        issuing_organization: certificate.issuing_organization?.trim() || null,
        issue_date: certificate.issue_date,
        expiration_date: certificate.expiration_date,
        credential_id: certificate.credential_id?.trim() || null,
        credential_url: certificate.credential_url?.trim() || null,
      })),
    });
  }

  private async prepareSkills(
    parsedSkills: ResumeSkill[],
  ): Promise<PreparedSkill[]> {
    const uniqueSkills = new Map<string, ResumeSkill>();

    for (const skill of parsedSkills) {
      const skillName = skill.name.trim();

      if (!skillName) {
        continue;
      }

      const key = skillName.toLowerCase();

      const existing = uniqueSkills.get(key);

      if (!existing) {
        uniqueSkills.set(key, {
          ...skill,
          name: skillName,
        });

        continue;
      }

      const existingYears = existing.experience_years ?? 0;

      const incomingYears = skill.experience_years ?? 0;

      if (incomingYears > existingYears) {
        uniqueSkills.set(key, {
          ...skill,
          name: skillName,
        });
      }
    }

    const normalizedSkills = Array.from(uniqueSkills.values());

    if (normalizedSkills.length === 0) {
      return [];
    }

    /*
     * สร้าง Skill ที่ยังไม่มีแบบ Batch
     */
    await prisma.skills.createMany({
      data: normalizedSkills.map((skill) => ({
        name: skill.name,
      })),
      skipDuplicates: true,
    });

    /*
     * ดึง Skill IDs กลับมาครั้งเดียว
     */
    const databaseSkills = await prisma.skills.findMany({
      where: {
        name: {
          in: normalizedSkills.map((skill) => skill.name),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const databaseSkillMap = new Map(
      databaseSkills.map((skill) => [skill.name.toLowerCase(), skill]),
    );

    const preparedSkills: PreparedSkill[] = [];

    for (const parsedSkill of normalizedSkills) {
      const databaseSkill = databaseSkillMap.get(
        parsedSkill.name.toLowerCase(),
      );

      if (!databaseSkill) {
        continue;
      }

      preparedSkills.push({
        skillId: databaseSkill.id,
        experienceYears: parsedSkill.experience_years,
        proficiency: mapSkillProficiency(parsedSkill.proficiency),
      });
    }

    return preparedSkills;
  }

  private async getUpdatedCandidate(candidateId: bigint) {
    return prisma.candidates.findUnique({
      where: {
        id: candidateId,
      },
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

        candidate_languages: {
          orderBy: {
            language: "asc",
          },
        },

        candidate_certificates: {
          orderBy: {
            issue_date: "desc",
          },
        },
      },
    });
  }

  private async markAsFailed(resumeId: bigint, error: unknown): Promise<void> {
    const message =
      error instanceof Error ? error.message : "Unknown resume parsing error";

    const safeMessage = message.slice(0, 5_000);

    try {
      await prisma.$transaction([
        prisma.resumes.update({
          where: {
            id: resumeId,
          },
          data: {
            parse_status: resumes_parse_status.failed,
          },
        }),

        prisma.ai_resume_results.upsert({
          where: {
            resume_id: resumeId,
          },
          create: {
            resume_id: resumeId,
            error_message: safeMessage,
            processed_at: new Date(),
            model_name: this.getModelName(),
          },
          update: {
            error_message: safeMessage,
            processed_at: new Date(),
            model_name: this.getModelName(),
          },
        }),
      ]);
    } catch {}
  }

  private getModelName(): string {
    return process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
  }

  private parseId(id: string): bigint {
    if (!id || !/^\d+$/.test(id)) {
      throw new AppError("รหัส Resume ไม่ถูกต้อง", 400);
    }

    const resumeId = BigInt(id);

    if (resumeId <= 0n) {
      throw new AppError("รหัส Resume ไม่ถูกต้อง", 400);
    }

    return resumeId;
  }
}
