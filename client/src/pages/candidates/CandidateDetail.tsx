import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import {
  Pencil, Trash2, Mail, Phone, Link2, Briefcase, Clock, FileText,
  Download, Trash, GraduationCap, Languages as LanguagesIcon, Award,
  ExternalLink, Sparkles, FileClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SourceIcon } from "@/components/shared/SourceIcon";
import { ResumeUpload } from "@/components/shared/ResumeUpload";
import { ParseStatusBadge, ApplicationStatusBadge } from "@/components/shared/StatusBadges";
import { useCandidate, useDeleteCandidate } from "@/hooks/useCandidates";
import { useDeleteResume } from "@/hooks/useResumes";
import { useApplications } from "@/hooks/useApplications";
import { formatDate, formatDateTime, initials, humanizeEnum } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AIJobMatchPanel } from "@/components/shared/AIJobMatchPanel";

function bytesToSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getResumeFileUrl(fileUrl: string): string {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  const apiOrigin =
    import.meta.env.VITE_API_ORIGIN ?? "http://localhost:8000";

  return `${apiOrigin.replace(/\/$/, "")}/${fileUrl.replace(/^\//, "")}`;
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Hooks ต้องถูกเรียกทุกครั้งและอยู่ก่อน conditional return ทั้งหมด
  const {
    data: candidate,
    isLoading,
    isError,
    refetch,
  } = useCandidate(id);

  const { data: applications } = useApplications({
    page: 1,
    page_size: 100,
    candidate_id: id,
  });

  const deleteCandidate = useDeleteCandidate();
  const deleteResume = useDeleteResume(id ?? "");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError || !candidate) {
    return (
      <ErrorState
        onRetry={() => {
          void refetch();
        }}
        message="Could not load this candidate."
      />
    );
  }

  const resumes = candidate.resumes ?? [];

  const candidateApplications = (applications?.items ?? []).filter(
    (application) => application.candidate.id === candidate.id,
  );

  const timelineEvents = [
    {
      label: "Candidate profile created",
      date: candidate.created_at,
    },

    ...resumes.map((resume) => ({
      label: `Resume uploaded: ${resume.original_file_name}`,
      date: resume.uploaded_at,
    })),

    ...candidateApplications.map((application) => ({
      label: `Applied to ${application.job.title}`,
      date: application.applied_at,
    })),
  ].sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime(),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={candidate.full_name}
        description={candidate.current_position ?? undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/candidates/${id}/edit`)}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14"><AvatarFallback className="text-base">{initials(candidate.full_name)}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--color-ink)]">{candidate.full_name}</p>
                <span className="flex items-center gap-1 text-xs text-[var(--color-ink)]/55">
                  <SourceIcon source={candidate.source} className="h-3.5 w-3.5" /> {humanizeEnum(candidate.source)}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-[var(--color-ink)]/75">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-[var(--color-ink)]/40" /> {candidate.email ?? "-"}</p>
              {candidate.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[var(--color-ink)]/40" /> {candidate.phone}</p>}
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--color-primary)] hover:underline">
                  <Link2 className="h-4 w-4" /> LinkedIn profile <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {candidate.current_position && <p className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-[var(--color-ink)]/40" /> {candidate.current_position}</p>}
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-[var(--color-ink)]/40" /> {candidate.total_experience_years ?? 0} years experience</p>
              {candidate.source_url && (
                <a href={candidate.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--color-primary)] hover:underline">
                  Source link <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="experience">Work Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="languages">Languages</TabsTrigger>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                  <div><p className="text-xl font-semibold text-[var(--color-ink)]">{candidate.resume_count ?? resumes.length}</p><p className="text-xs text-[var(--color-ink)]/50">Resumes</p></div>
                  <div><p className="text-xl font-semibold text-[var(--color-ink)]">{candidate.application_count ?? candidateApplications.length}</p><p className="text-xs text-[var(--color-ink)]/50">Applications</p></div>
                  <div><p className="text-xl font-semibold text-[var(--color-ink)]">{candidate.skills_count ?? candidate.skills?.length ?? 0}</p><p className="text-xs text-[var(--color-ink)]/50">Skills</p></div>
                  <div><p className="text-xl font-semibold text-[var(--color-ink)]">{formatDate(candidate.created_at)}</p><p className="text-xs text-[var(--color-ink)]/50">Added</p></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resume" className="space-y-4">
              <ResumeUpload
                candidateId={candidate.id}
                onUploaded={() => {
                  void refetch();
                }}
              />

              {resumes.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No resumes uploaded"
                  description="Upload a PDF or DOCX resume for AI parsing."
                />
              ) : (
                <div className="space-y-2">
                  {resumes.map((resume) => (
                    <div
                      key={resume.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.06] bg-white p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                            {resume.original_file_name}
                          </p>

                          <p className="text-xs text-[var(--color-ink)]/50">
                            {bytesToSize(resume.file_size ?? 0)}
                            {" · "}
                            Uploaded {formatDate(resume.uploaded_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ParseStatusBadge status={resume.parse_status} />

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(`/ai-analysis?resumeId=${resume.id}`)
                          }
                          title="View AI analysis"
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>

                        {resume.file_url && (
                          <a
                            href={getResumeFileUrl(resume.file_url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Open file"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setResumeToDelete(resume.id)}
                          title="Delete resume"
                        >
                          <Trash className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="skills">
              <Card>
                <CardContent className="p-5">
                  {candidate.skills && candidate.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((s, i) => (
                        <Badge key={i} variant="secondary">{s.name}{s.level ? ` · ${s.level}` : ""}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-ink)]/50">No skills recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="experience">
              <Card>
                <CardContent className="p-5">
                  {candidate.work_experiences && candidate.work_experiences.length > 0 ? (
                    <ol className="relative space-y-6 border-l border-black/10 pl-5">
                      {candidate.work_experiences.map((exp, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                          <p className="text-sm font-medium text-[var(--color-ink)]">{exp.position}</p>
                          <p className="text-xs text-[var(--color-ink)]/60">{exp.company}</p>
                          <p className="mt-0.5 text-xs text-[var(--color-ink)]/45">
                            {formatDate(exp.start_date)} – {exp.is_current ? "Present" : formatDate(exp.end_date)}
                          </p>
                          {exp.description && <p className="mt-1.5 text-sm text-[var(--color-ink)]/70">{exp.description}</p>}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-[var(--color-ink)]/50">No work experience recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="education">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {candidate.education && candidate.education.length > 0 ? (
                  candidate.education.map((ed, i) => (
                    <Card key={i}>
                      <CardContent className="flex gap-3 p-4">
                        <GraduationCap className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-ink)]">{ed.degree}</p>
                          <p className="text-xs text-[var(--color-ink)]/60">{ed.institution}</p>
                          {ed.field_of_study && <p className="text-xs text-[var(--color-ink)]/45">{ed.field_of_study}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-ink)]/50">No education recorded yet.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="languages">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {candidate.languages && candidate.languages.length > 0 ? (
                  candidate.languages.map((lang, i) => (
                    <Card key={i}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <LanguagesIcon className="h-5 w-5 text-[var(--color-primary)]" />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-ink)]">{lang.name}</p>
                          {lang.proficiency && <p className="text-xs text-[var(--color-ink)]/50">{lang.proficiency}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-ink)]/50">No languages recorded yet.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="certificates">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {candidate.certificates && candidate.certificates.length > 0 ? (
                  candidate.certificates.map((cert, i) => (
                    <Card key={i}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Award className="h-5 w-5 text-[var(--color-primary)]" />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-ink)]">{cert.name}</p>
                          {cert.issuer && <p className="text-xs text-[var(--color-ink)]/50">{cert.issuer}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-ink)]/50">No certificates recorded yet.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="applications">
              <Card>
                <CardContent className="p-0">
                  {candidateApplications.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applied</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidateApplications.map((a) => (
                          <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/applications/${a.id}`)}>
                            <TableCell className="font-medium text-[var(--color-ink)]">{a.job.title}</TableCell>
                            <TableCell className="text-[var(--color-ink)]/70">{a.current_stage?.name ?? "-"}</TableCell>
                            <TableCell><ApplicationStatusBadge status={a.status} /></TableCell>
                            <TableCell className="text-[var(--color-ink)]/70">{formatDate(a.applied_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-5"><p className="text-sm text-[var(--color-ink)]/50">No applications yet.</p></div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardContent className="p-5">
                  {timelineEvents.length > 0 ? (
                    <ol className="relative space-y-5 border-l border-black/10 pl-5">
                      {timelineEvents.map((e, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
                            <FileClock className="h-2.5 w-2.5 text-[var(--color-primary)]" />
                          </span>
                          <p className="text-sm text-[var(--color-ink)]">{e.label}</p>
                          <p className="text-xs text-[var(--color-ink)]/45">{formatDateTime(e.date)}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-[var(--color-ink)]/50">No activity recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </div>

      <div className="lg:col-span-2">
        <AIJobMatchPanel applicationId={id!} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this candidate?"
        description="This will permanently remove the candidate's profile, resumes, and application history."
        destructive
        confirmLabel="Delete candidate"
        isLoading={deleteCandidate.isPending}
        onConfirm={() =>
          deleteCandidate.mutate(id as string, {
            onSuccess: () => {
              toast.success("Candidate deleted");
              navigate("/candidates");
            },
          })
        }
      />

      <ConfirmDialog
        open={!!resumeToDelete}
        onOpenChange={(o) => !o && setResumeToDelete(null)}
        title="Delete this resume?"
        destructive
        confirmLabel="Delete resume"
        isLoading={deleteResume.isPending}
        onConfirm={() => {
          if (!resumeToDelete) return;
          deleteResume.mutate(resumeToDelete, {
            onSuccess: () => {
              toast.success("Resume deleted");
              setResumeToDelete(null);
              void refetch();
            },
          });
        }}
      />
    </div>
  );
}