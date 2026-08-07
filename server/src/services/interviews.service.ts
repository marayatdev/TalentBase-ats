import { prisma } from "@/config/db";
import { interviews_status } from "@/generated/prisma/client";

import type {
  CreateInterviewDto,
  UpdateInterviewDto,
} from "@/types/interview.type";

import { GoogleCalendarService } from "@/services/google-calendar.service";
import { AppError } from "@/utils/app-error";

const googleCalendarService = new GoogleCalendarService();

export class InterviewService {
  async create(data: CreateInterviewDto) {
    const title = data.title.trim();
    const description = data.description?.trim() || null;
    const timezone = data.timezone.trim() || "Asia/Bangkok";

    if (!title) {
      throw new AppError(
        "กรุณาระบุหัวข้อการสัมภาษณ์",
        400,
      );
    }

    this.validateInterviewTime(
      data.start_at,
      data.end_at,
      true,
    );

    const interviewerEmails = this.normalizeEmails(
      data.interviewer_emails,
    );

    if (interviewerEmails.length === 0) {
      throw new AppError(
        "กรุณาระบุอีเมลผู้สัมภาษณ์อย่างน้อย 1 คน",
        400,
      );
    }

    const application = await prisma.applications.findUnique({
      where: {
        id: data.application_id,
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
            status: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError(
        "ไม่พบใบสมัครงาน",
        404,
      );
    }

    if (
      application.status === "rejected" ||
      application.status === "withdrawn"
    ) {
      throw new AppError(
        "ไม่สามารถนัดสัมภาษณ์ใบสมัครที่ถูกปฏิเสธหรือถอนแล้ว",
        409,
      );
    }

    const candidateEmail =
      application.candidates.email
        ?.trim()
        .toLowerCase();

    if (!candidateEmail) {
      throw new AppError(
        "Candidate ยังไม่มีอีเมล กรุณาเพิ่มอีเมลก่อนนัดสัมภาษณ์",
        400,
      );
    }

    if (!this.isValidEmail(candidateEmail)) {
      throw new AppError(
        "อีเมล Candidate ไม่ถูกต้อง",
        400,
      );
    }

    const scheduler = await prisma.users.findUnique({
      where: {
        id: data.scheduled_by,
      },

      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
      },
    });

    if (!scheduler || !scheduler.is_active) {
      throw new AppError(
        "ไม่พบผู้ใช้งานที่ทำรายการ หรือบัญชีถูกปิดใช้งาน",
        404,
      );
    }

    await this.checkScheduleConflict({
      candidateId: application.candidates.id,

      startAt: data.start_at,
      endAt: data.end_at,

      interviewerEmails,
    });

    const googleConflict =
      await googleCalendarService.checkScheduleConflict({
        user_id: data.scheduled_by,

        start_at: data.start_at,
        end_at: data.end_at,
      });

    if (googleConflict.has_conflict) {
      const conflict = googleConflict.conflicts[0];

      throw new AppError(
        `ช่วงเวลานี้ชนกับ Google Calendar${conflict?.title
          ? ` "${conflict.title}"`
          : ""
        } กรุณาเลือกเวลาอื่น`,
        409,
      );
    }

    const attendees = this.normalizeEmails([
      candidateEmail,
      ...interviewerEmails,
    ]);

    let googleEvent:
      | {
        calendar_id: string;
        event_id: string;
        event_url: string | null;
        meet_url: string | null;
      }
      | undefined;

    try {
      googleEvent =
        await googleCalendarService.createMeetEvent({
          user_id: data.scheduled_by,

          title,
          description,

          start_at: data.start_at,
          end_at: data.end_at,
          timezone,

          attendees,
        });

      return await prisma.$transaction(
        async (transaction) => {
          const interview =
            await transaction.interviews.create({
              data: {
                application_id: application.id,
                scheduled_by: data.scheduled_by,

                title,
                description,

                start_at: data.start_at,
                end_at: data.end_at,
                timezone,

                status: interviews_status.scheduled,

                candidate_email: candidateEmail,
                interviewer_emails: interviewerEmails,

                google_calendar_id:
                  googleEvent?.calendar_id,

                google_event_id:
                  googleEvent?.event_id,

                google_event_url:
                  googleEvent?.event_url,

                meet_url:
                  googleEvent?.meet_url,
              },
            });

          /*
           * หา Stage สำหรับการสัมภาษณ์ของ Job นี้
           *
           * รองรับชื่อ เช่น:
           * - First Interview
           * - Technical Interview
           * - Interview
           * - สัมภาษณ์
           */
          const interviewStage =
            await transaction.pipeline_stages.findFirst({
              where: {
                job_id: application.job_id,

                OR: [
                  {
                    name: {
                      contains: "Interview",
                    },
                  },
                  {
                    name: {
                      contains: "interview",
                    },
                  },
                  {
                    name: {
                      contains: "สัมภาษณ์",
                    },
                  },
                ],
              },

              orderBy: {
                stage_order: "asc",
              },

              select: {
                id: true,
                name: true,
              },
            });

          /*
           * ย้าย Application ไป Interview Stage อัตโนมัติ
           */
          if (
            interviewStage &&
            application.current_stage_id !==
            interviewStage.id
          ) {
            await transaction.applications.update({
              where: {
                id: application.id,
              },

              data: {
                current_stage_id:
                  interviewStage.id,
              },
            });

            await transaction.application_stage_histories.create({
              data: {
                application_id:
                  application.id,

                from_stage_id:
                  application.current_stage_id,

                to_stage_id:
                  interviewStage.id,

                changed_by:
                  data.scheduled_by,

                note:
                  `สร้างนัดสัมภาษณ์ "${title}" วันที่ ${data.start_at.toISOString()}`,
              },
            });
          }

          return transaction.interviews.findUniqueOrThrow({
            where: {
              id: interview.id,
            },

            include: this.getInterviewInclude(),
          });
        },
        {
          maxWait: 5_000,
          timeout: 15_000,
        },
      );
    } catch (error) {
      /*
       * กรณีสร้าง Google Event สำเร็จ
       * แต่ transaction ในฐานข้อมูลล้มเหลว
       * ให้ลบ Google Event เพื่อไม่ให้มี Event ค้าง
       */
      if (googleEvent) {
        try {
          await googleCalendarService.deleteEvent({
            user_id: data.scheduled_by,
            calendar_id: googleEvent.calendar_id,
            event_id: googleEvent.event_id,
          });
        } catch (cleanupError) {
          console.error(
            "[InterviewService] Could not rollback Google event:",
            cleanupError,
          );
        }
      }

      if (error instanceof AppError) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unknown interview creation error";

      throw new AppError(
        `สร้างนัดสัมภาษณ์ไม่สำเร็จ: ${message}`,
        502,
      );
    }
  }

  async update(
    id: bigint,
    userId: bigint,
    data: UpdateInterviewDto,
  ) {
    const interview = await prisma.interviews.findUnique({
      where: {
        id,
      },

      include: {
        applications: {
          select: {
            id: true,
            job_id: true,
            candidate_id: true,
            current_stage_id: true,
            status: true,

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
          },
        },
      },
    });

    if (!interview) {
      throw new AppError(
        "ไม่พบนัดสัมภาษณ์",
        404,
      );
    }

    if (interview.scheduled_by !== userId) {
      throw new AppError(
        "คุณไม่มีสิทธิ์แก้ไขนัดสัมภาษณ์นี้",
        403,
      );
    }

    if (
      interview.status ===
      interviews_status.cancelled
    ) {
      throw new AppError(
        "ไม่สามารถแก้ไขนัดสัมภาษณ์ที่ถูกยกเลิกแล้ว",
        409,
      );
    }

    if (
      interview.status ===
      interviews_status.completed
    ) {
      throw new AppError(
        "ไม่สามารถแก้ไขนัดสัมภาษณ์ที่เสร็จสิ้นแล้ว",
        409,
      );
    }

    if (
      interview.applications.status === "rejected" ||
      interview.applications.status === "withdrawn"
    ) {
      throw new AppError(
        "ไม่สามารถแก้ไขนัดของใบสมัครที่ถูกปฏิเสธหรือถอนแล้ว",
        409,
      );
    }

    this.validateInterviewTime(
      data.start_at,
      data.end_at,
      true,
    );

    const title =
      data.title?.trim() ||
      interview.title;

    const description =
      data.description === undefined
        ? interview.description
        : data.description?.trim() || null;

    const timezone =
      data.timezone?.trim() ||
      interview.timezone ||
      "Asia/Bangkok";

    const interviewerEmails = this.normalizeEmails(
      data.interviewer_emails,
    );

    if (interviewerEmails.length === 0) {
      throw new AppError(
        "กรุณาระบุอีเมลผู้สัมภาษณ์อย่างน้อย 1 คน",
        400,
      );
    }

    const candidateEmail =
      interview.applications.candidates.email
        ?.trim()
        .toLowerCase();

    if (!candidateEmail) {
      throw new AppError(
        "Candidate ยังไม่มีอีเมล กรุณาเพิ่มอีเมลก่อนแก้ไขนัด",
        400,
      );
    }

    if (!this.isValidEmail(candidateEmail)) {
      throw new AppError(
        "อีเมล Candidate ไม่ถูกต้อง",
        400,
      );
    }

    if (
      !interview.google_calendar_id ||
      !interview.google_event_id
    ) {
      throw new AppError(
        "นัดสัมภาษณ์นี้ไม่มีข้อมูล Google Calendar Event",
        409,
      );
    }

    await this.checkScheduleConflict({
      candidateId:
        interview.applications.candidates.id,

      startAt: data.start_at,
      endAt: data.end_at,

      interviewerEmails,

      excludeInterviewId:
        interview.id,
    });

    const googleConflict =
      await googleCalendarService.checkScheduleConflict({
        user_id:
          interview.scheduled_by,

        start_at:
          data.start_at,

        end_at:
          data.end_at,

        exclude_event_id:
          interview.google_event_id,
      });

    if (googleConflict.has_conflict) {
      const conflict = googleConflict.conflicts[0];

      throw new AppError(
        `ช่วงเวลานี้ชนกับ Google Calendar${conflict?.title
          ? ` "${conflict.title}"`
          : ""
        } กรุณาเลือกเวลาอื่น`,
        409,
      );
    }

    const attendees = this.normalizeEmails([
      candidateEmail,
      ...interviewerEmails,
    ]);

    let googleEvent: {
      calendar_id: string;
      event_id: string;
      event_url: string | null;
      meet_url: string | null;
    };

    try {
      googleEvent =
        await googleCalendarService.updateMeetEvent({
          user_id:
            interview.scheduled_by,

          calendar_id:
            interview.google_calendar_id,

          event_id:
            interview.google_event_id,

          title,
          description,

          start_at:
            data.start_at,

          end_at:
            data.end_at,

          timezone,

          attendees,
        });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unknown Google Calendar error";

      throw new AppError(
        `แก้ไข Google Calendar Event ไม่สำเร็จ: ${message}`,
        502,
      );
    }

    return prisma.$transaction(
      async (transaction) => {
        const updatedInterview =
          await transaction.interviews.update({
            where: {
              id: interview.id,
            },

            data: {
              title,
              description,

              start_at:
                data.start_at,

              end_at:
                data.end_at,

              timezone,

              interviewer_emails:
                interviewerEmails,

              status:
                interviews_status.rescheduled,

              google_calendar_id:
                googleEvent.calendar_id,

              google_event_id:
                googleEvent.event_id,

              google_event_url:
                googleEvent.event_url,

              meet_url:
                googleEvent.meet_url ??
                interview.meet_url,
            },
          });

        /*
         * Reschedule ไม่เปลี่ยน Stage
         * แต่เพิ่มประวัติไว้ใน Application Stage History
         */
        if (
          interview.applications.current_stage_id
        ) {
          await transaction.application_stage_histories.create({
            data: {
              application_id:
                interview.application_id,

              from_stage_id:
                interview.applications
                  .current_stage_id,

              to_stage_id:
                interview.applications
                  .current_stage_id,

              changed_by:
                userId,

              note:
                `เปลี่ยนเวลานัดสัมภาษณ์ "${title}" เป็น ${data.start_at.toISOString()}`,
            },
          });
        }

        return transaction.interviews.findUniqueOrThrow({
          where: {
            id: updatedInterview.id,
          },

          include: this.getInterviewInclude(),
        });
      },
      {
        maxWait: 5_000,
        timeout: 15_000,
      },
    );
  }

  async cancel(
    id: bigint,
    userId: bigint,
  ) {
    const interview = await prisma.interviews.findUnique({
      where: {
        id,
      },
    });

    if (!interview) {
      throw new AppError(
        "ไม่พบนัดสัมภาษณ์",
        404,
      );
    }

    if (interview.scheduled_by !== userId) {
      throw new AppError(
        "คุณไม่มีสิทธิ์ยกเลิกนัดสัมภาษณ์นี้",
        403,
      );
    }

    if (
      interview.status ===
      interviews_status.cancelled
    ) {
      throw new AppError(
        "นัดสัมภาษณ์นี้ถูกยกเลิกแล้ว",
        409,
      );
    }

    if (
      interview.status ===
      interviews_status.completed
    ) {
      throw new AppError(
        "ไม่สามารถยกเลิกนัดสัมภาษณ์ที่เสร็จสิ้นแล้ว",
        409,
      );
    }

    if (
      interview.google_event_id &&
      interview.google_calendar_id
    ) {
      try {
        await googleCalendarService.deleteEvent({
          user_id:
            interview.scheduled_by,

          calendar_id:
            interview.google_calendar_id,

          event_id:
            interview.google_event_id,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown Google Calendar error";

        throw new AppError(
          `ยกเลิก Google Calendar Event ไม่สำเร็จ: ${message}`,
          502,
        );
      }
    }

    return prisma.$transaction(
      async (transaction) => {
        const updatedInterview =
          await transaction.interviews.update({
            where: {
              id: interview.id,
            },

            data: {
              status:
                interviews_status.cancelled,

              meet_url:
                null,

              google_event_url:
                null,
            },
          });

        const application =
          await transaction.applications.findUnique({
            where: {
              id: interview.application_id,
            },

            select: {
              current_stage_id: true,
            },
          });

        /*
         * Cancel ไม่ย้อน Stage โดยอัตโนมัติ
         * เพราะอาจเป็นเพียงการรอนัดใหม่
         * แต่เก็บประวัติไว้
         */
        if (application?.current_stage_id) {
          await transaction.application_stage_histories.create({
            data: {
              application_id:
                interview.application_id,

              from_stage_id:
                application.current_stage_id,

              to_stage_id:
                application.current_stage_id,

              changed_by:
                userId,

              note:
                `ยกเลิกนัดสัมภาษณ์ "${interview.title}"`,
            },
          });
        }

        return transaction.interviews.findUniqueOrThrow({
          where: {
            id: updatedInterview.id,
          },

          include: this.getInterviewInclude(),
        });
      },
      {
        maxWait: 5_000,
        timeout: 15_000,
      },
    );
  }

  async findByApplicationId(
    applicationId: bigint,
  ) {
    const application =
      await prisma.applications.findUnique({
        where: {
          id: applicationId,
        },

        select: {
          id: true,
        },
      });

    if (!application) {
      throw new AppError(
        "ไม่พบใบสมัครงาน",
        404,
      );
    }

    return prisma.interviews.findMany({
      where: {
        application_id:
          applicationId,
      },

      orderBy: {
        start_at: "desc",
      },

      include:
        this.getInterviewInclude(),
    });
  }

  async findOne(id: bigint) {
    const interview =
      await prisma.interviews.findUnique({
        where: {
          id,
        },

        include:
          this.getInterviewInclude(),
      });

    if (!interview) {
      throw new AppError(
        "ไม่พบนัดสัมภาษณ์",
        404,
      );
    }

    return interview;
  }

  private async checkScheduleConflict(params: {
    candidateId: bigint;

    startAt: Date;
    endAt: Date;

    interviewerEmails: string[];

    excludeInterviewId?: bigint;
  }): Promise<void> {
    /*
     * ช่วงเวลาซ้อนเมื่อ:
     *
     * existing.start < new.end
     * และ
     * existing.end > new.start
     */
    const overlappingInterviews =
      await prisma.interviews.findMany({
        where: {
          id: params.excludeInterviewId
            ? {
              not:
                params.excludeInterviewId,
            }
            : undefined,

          status: {
            in: [
              interviews_status.scheduled,
              interviews_status.rescheduled,
            ],
          },

          start_at: {
            lt: params.endAt,
          },

          end_at: {
            gt: params.startAt,
          },
        },

        select: {
          id: true,
          title: true,
          start_at: true,
          end_at: true,
          interviewer_emails: true,

          applications: {
            select: {
              candidate_id: true,

              candidates: {
                select: {
                  full_name: true,
                },
              },
            },
          },
        },
      });

    const newInterviewerSet =
      new Set(
        params.interviewerEmails.map(
          (email) =>
            email.toLowerCase(),
        ),
      );

    for (const existing of overlappingInterviews) {
      /*
       * Candidate คนเดิมมีนัดซ้อน
       */
      if (
        existing.applications.candidate_id ===
        params.candidateId
      ) {
        throw new AppError(
          `Candidate ${existing.applications.candidates.full_name} มีนัดซ้อนกับ "${existing.title}"`,
          409,
        );
      }

      const existingInterviewers =
        this.parseJsonStringArray(
          existing.interviewer_emails,
        );

      const conflictingEmail =
        existingInterviewers.find(
          (email) =>
            newInterviewerSet.has(
              email.toLowerCase(),
            ),
        );

      /*
       * Interviewer คนเดิมมีนัดซ้อน
       */
      if (conflictingEmail) {
        throw new AppError(
          `ผู้สัมภาษณ์ ${conflictingEmail} มีนัดซ้อนกับ "${existing.title}"`,
          409,
        );
      }
    }
  }

  private validateInterviewTime(
    startAt: Date,
    endAt: Date,
    requireFuture: boolean,
  ): void {
    if (!this.isValidDate(startAt)) {
      throw new AppError(
        "เวลาเริ่มสัมภาษณ์ไม่ถูกต้อง",
        400,
      );
    }

    if (!this.isValidDate(endAt)) {
      throw new AppError(
        "เวลาสิ้นสุดสัมภาษณ์ไม่ถูกต้อง",
        400,
      );
    }

    if (endAt <= startAt) {
      throw new AppError(
        "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มสัมภาษณ์",
        400,
      );
    }

    if (
      requireFuture &&
      startAt <= new Date()
    ) {
      throw new AppError(
        "เวลาเริ่มสัมภาษณ์ต้องเป็นเวลาในอนาคต",
        400,
      );
    }

    /*
     * ป้องกันการกรอกเวลาผิดจนระยะเวลานานเกินไป
     */
    const durationMilliseconds =
      endAt.getTime() -
      startAt.getTime();

    const maximumDuration =
      12 * 60 * 60 * 1000;

    if (
      durationMilliseconds >
      maximumDuration
    ) {
      throw new AppError(
        "ระยะเวลาสัมภาษณ์ต้องไม่เกิน 12 ชั่วโมง",
        400,
      );
    }
  }

  private getInterviewInclude() {
    return {
      applications: {
        select: {
          id: true,
          status: true,
          applied_at: true,
          current_stage_id: true,

          candidates: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
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

          pipeline_stages: {
            select: {
              id: true,
              name: true,
              stage_order: true,
              stage_type: true,
            },
          },
        },
      },

      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    } as const;
  }

  private normalizeEmails(
    values: string[],
  ): string[] {
    const emailMap =
      new Map<string, string>();

    for (const value of values) {
      if (
        typeof value !== "string"
      ) {
        continue;
      }

      const email =
        value
          .trim()
          .toLowerCase();

      if (!email) {
        continue;
      }

      if (!this.isValidEmail(email)) {
        throw new AppError(
          `อีเมลไม่ถูกต้อง: ${value}`,
          400,
        );
      }

      if (!emailMap.has(email)) {
        emailMap.set(
          email,
          email,
        );
      }
    }

    return [
      ...emailMap.values(),
    ];
  }

  private parseJsonStringArray(
    value: unknown,
  ): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (item): item is string =>
        typeof item === "string",
    );
  }

  private isValidEmail(
    value: string,
  ): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value,
    );
  }

  private isValidDate(
    value: Date,
  ): boolean {
    return (
      value instanceof Date &&
      !Number.isNaN(
        value.getTime(),
      )
    );
  }
}