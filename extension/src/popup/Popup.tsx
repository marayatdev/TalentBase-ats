import {
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    ExtensionJob,
} from "../types/job";

interface ExtensionResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

export default function Popup() {
    const [
        jobs,
        setJobs,
    ] = useState<ExtensionJob[]>([]);

    const [
        selectedJobId,
        setSelectedJobId,
    ] = useState("");

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const selectedJob =
        useMemo(
            () =>
                jobs.find(
                    (job) =>
                        job.id === selectedJobId,
                ) ?? null,
            [
                jobs,
                selectedJobId,
            ],
        );

    useEffect(() => {
        void loadPopupData();
    }, []);

    async function loadPopupData(): Promise<void> {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const [
                jobsResponse,
                selectedJobResponse,
            ] = await Promise.all([
                chrome.runtime.sendMessage({
                    type: "GET_OPEN_JOBS",
                }) as Promise<
                    ExtensionResponse<ExtensionJob[]>
                >,

                chrome.runtime.sendMessage({
                    type: "GET_SELECTED_JOB",
                }) as Promise<
                    ExtensionResponse<ExtensionJob | null>
                >,
            ]);

            if (
                !jobsResponse.success ||
                !jobsResponse.data
            ) {
                throw new Error(
                    jobsResponse.message ??
                    "Could not load jobs",
                );
            }

            setJobs(
                jobsResponse.data,
            );

            if (
                selectedJobResponse.success &&
                selectedJobResponse.data
            ) {
                const storedJob =
                    selectedJobResponse.data;

                const stillAvailable =
                    jobsResponse.data.some(
                        (job) =>
                            job.id ===
                            storedJob.id,
                    );

                if (stillAvailable) {
                    setSelectedJobId(
                        storedJob.id,
                    );
                } else {
                    setSelectedJobId("");
                }
            } else {
                setSelectedJobId("");
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not load extension data",
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function saveSelectedJob(): Promise<void> {
        if (!selectedJob) {
            setErrorMessage(
                "Please select a job",
            );

            return;
        }

        setIsSaving(true);
        setErrorMessage("");

        try {
            const response =
                (await chrome.runtime.sendMessage({
                    type: "SET_SELECTED_JOB",

                    payload: {
                        job: selectedJob,
                    },
                })) as ExtensionResponse<null>;

            if (!response.success) {
                throw new Error(
                    response.message ??
                    "Could not save selected job",
                );
            }

            /*
             * แจ้ง content script ว่า Job เปลี่ยน
             */
            const tabs =
                await chrome.tabs.query({
                    active: true,
                    currentWindow: true,
                });

            const activeTab =
                tabs[0];

            if (
                activeTab?.id &&
                activeTab.url?.includes(
                    "facebook.com",
                )
            ) {
                try {
                    await chrome.tabs.sendMessage(
                        activeTab.id,
                        {
                            type:
                                "SELECTED_JOB_CHANGED",

                            payload: {
                                job: selectedJob,
                            },
                        },
                    );
                } catch {
                    /*
                     * ถ้า content script ยังไม่ถูก inject
                     * ให้ reload หน้า Facebook แล้วลองใหม่
                     */
                }
            }

            window.close();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not save selected job",
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function clearSelectedJob(): Promise<void> {
        setIsSaving(true);
        setErrorMessage("");

        try {
            const response =
                (await chrome.runtime.sendMessage({
                    type: "SET_SELECTED_JOB",

                    payload: {
                        job: null,
                    },
                })) as ExtensionResponse<null>;

            if (!response.success) {
                throw new Error(
                    response.message ??
                    "Could not clear selected job",
                );
            }

            setSelectedJobId("");

            const tabs =
                await chrome.tabs.query({
                    active: true,
                    currentWindow: true,
                });

            const activeTab =
                tabs[0];

            if (
                activeTab?.id &&
                activeTab.url?.includes(
                    "facebook.com",
                )
            ) {
                try {
                    await chrome.tabs.sendMessage(
                        activeTab.id,
                        {
                            type:
                                "SELECTED_JOB_CHANGED",

                            payload: {
                                job: null,
                            },
                        },
                    );
                } catch {
                    // Content script อาจยังไม่พร้อม
                }
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not clear selected job",
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <main
            style={{
                width: 360,
                padding: 16,
                fontFamily:
                    "Inter, system-ui, sans-serif",
                color: "#20261F",
                background: "#FAF6EC",
            }}
        >
            <header>
                <h1
                    style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 700,
                    }}
                >
                    HR ATS Scanner
                </h1>

                <p
                    style={{
                        marginTop: 6,
                        marginBottom: 0,
                        fontSize: 12,
                        lineHeight: 1.5,
                        opacity: 0.65,
                    }}
                >
                    Select the job used to evaluate
                    Facebook candidate posts.
                </p>
            </header>

            <section
                style={{
                    marginTop: 16,
                }}
            >
                <label
                    htmlFor="selected-job"
                    style={{
                        display: "block",
                        marginBottom: 6,
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    Target job
                </label>

                {isLoading ? (
                    <p
                        style={{
                            fontSize: 13,
                            opacity: 0.6,
                        }}
                    >
                        Loading jobs...
                    </p>
                ) : (
                    <select
                        id="selected-job"
                        value={selectedJobId}
                        onChange={(event) => {
                            setSelectedJobId(
                                event.target.value,
                            );
                        }}
                        disabled={
                            isSaving ||
                            jobs.length === 0
                        }
                        style={{
                            width: "100%",
                            minHeight: 40,
                            borderRadius: 8,
                            border:
                                "1px solid rgba(32,38,31,0.15)",
                            padding:
                                "0 10px",
                            background: "white",
                            color: "#20261F",
                        }}
                    >
                        <option value="">
                            Select a job
                        </option>

                        {jobs.map((job) => (
                            <option
                                key={job.id}
                                value={job.id}
                            >
                                {job.title}
                            </option>
                        ))}
                    </select>
                )}
            </section>

            {!isLoading &&
                jobs.length === 0 &&
                !errorMessage && (
                    <div
                        style={{
                            marginTop: 12,
                            borderRadius: 8,
                            padding: 10,
                            fontSize: 12,
                            color: "#8A5A00",
                            background:
                                "rgba(239,230,211,0.8)",
                        }}
                    >
                        No open jobs were found in the
                        ATS.
                    </div>
                )}

            {selectedJob && (
                <section
                    style={{
                        marginTop: 14,
                        borderRadius: 10,
                        border:
                            "1px solid rgba(32,38,31,0.08)",
                        padding: 12,
                        background: "white",
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 700,
                        }}
                    >
                        {selectedJob.title}
                    </p>

                    {selectedJob.description && (
                        <p
                            style={{
                                marginTop: 6,
                                marginBottom: 0,
                                fontSize: 12,
                                lineHeight: 1.45,
                                opacity: 0.7,
                            }}
                        >
                            {selectedJob.description.slice(
                                0,
                                180,
                            )}
                        </p>
                    )}

                    <dl
                        style={{
                            marginTop: 10,
                            marginBottom: 0,
                            display: "grid",
                            gap: 5,
                            fontSize: 11,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                gap: 12,
                            }}
                        >
                            <dt
                                style={{
                                    opacity: 0.55,
                                }}
                            >
                                Experience
                            </dt>

                            <dd
                                style={{
                                    margin: 0,
                                    fontWeight: 600,
                                }}
                            >
                                {
                                    selectedJob.minimum_experience_years
                                }{" "}
                                years
                            </dd>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                gap: 12,
                            }}
                        >
                            <dt
                                style={{
                                    opacity: 0.55,
                                }}
                            >
                                Employment
                            </dt>

                            <dd
                                style={{
                                    margin: 0,
                                    fontWeight: 600,
                                }}
                            >
                                {selectedJob.employment_type.replace(
                                    "_",
                                    " ",
                                )}
                            </dd>
                        </div>
                    </dl>
                </section>
            )}

            {errorMessage && (
                <div
                    style={{
                        marginTop: 12,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        color: "#9F1D1D",
                        background: "#FDECEC",
                    }}
                >
                    {errorMessage}
                </div>
            )}

            <div
                style={{
                    marginTop: 16,
                    display: "flex",
                    justifyContent:
                        "flex-end",
                    gap: 8,
                }}
            >
                {selectedJobId && (
                    <button
                        type="button"
                        onClick={() => {
                            void clearSelectedJob();
                        }}
                        disabled={isSaving}
                        style={{
                            minHeight: 38,
                            borderRadius: 8,
                            border:
                                "1px solid rgba(32,38,31,0.15)",
                            padding: "0 12px",
                            background: "white",
                            cursor: "pointer",
                        }}
                    >
                        Clear
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => {
                        void saveSelectedJob();
                    }}
                    disabled={
                        !selectedJob ||
                        isLoading ||
                        isSaving
                    }
                    style={{
                        minHeight: 38,
                        borderRadius: 8,
                        border: 0,
                        padding: "0 14px",
                        background:
                            !selectedJob ||
                                isSaving
                                ? "#AAB3AE"
                                : "#1F4A3A",
                        color: "white",
                        fontWeight: 600,
                        cursor:
                            !selectedJob ||
                                isSaving
                                ? "not-allowed"
                                : "pointer",
                    }}
                >
                    {isSaving
                        ? "Saving..."
                        : "Use this job"}
                </button>
            </div>
        </main>
    );
}