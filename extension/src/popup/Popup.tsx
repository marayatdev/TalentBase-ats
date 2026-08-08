import {
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    ExtensionJob,
} from "../types/job";

import type {
    PostAgeFilter,
} from "../types/facebook-post";

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

    const [
        searchQueries,
        setSearchQueries,
    ] = useState<string[]>([]);

    const [
        isGeneratingQueries,
        setIsGeneratingQueries,
    ] = useState(false);

    const [
        postAgeFilter,
        setPostAgeFilter,
    ] = useState<PostAgeFilter>("any");

    async function loadPopupData(): Promise<void> {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const [
                jobsResponse,
                selectedJobResponse,
                postFilterStorage,
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

                chrome.storage.local.get(
                    "postMaxAgeDays",
                ),
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

            const storedDays =
                postFilterStorage.postMaxAgeDays;

            if (
                storedDays === null ||
                storedDays === undefined
            ) {
                setPostAgeFilter("any");
            } else {
                const normalized =
                    String(storedDays);

                if (
                    [
                        "1",
                        "3",
                        "7",
                        "14",
                        "30",
                    ].includes(normalized)
                ) {
                    setPostAgeFilter(
                        normalized as PostAgeFilter,
                    );
                } else {
                    setPostAgeFilter("any");
                }
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

            setSearchQueries([]);
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
            setSearchQueries([]);

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

    async function handlePostAgeChange(
        value: PostAgeFilter,
    ): Promise<void> {
        setPostAgeFilter(value);
        setErrorMessage("");

        const maxAgeDays =
            value === "any"
                ? null
                : Number(value);

        try {
            await chrome.storage.local.set({
                postMaxAgeDays:
                    maxAgeDays,
            });

            const tabs =
                await chrome.tabs.query({
                    url: [
                        "*://*.facebook.com/*",
                    ],
                });

            for (const tab of tabs) {
                if (!tab.id) {
                    continue;
                }

                try {
                    await chrome.tabs.sendMessage(
                        tab.id,
                        {
                            type:
                                "POST_AGE_FILTER_CHANGED",

                            payload: {
                                maxAgeDays,
                            },
                        },
                    );
                } catch {
                    /*
                     * Content script อาจยังไม่ถูก inject
                     * การบันทึกใน storage ยังสำเร็จอยู่
                     */
                }
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not save post age filter",
            );
        }
    }

    async function generateSearchQueries(): Promise<void> {
        if (!selectedJob) {
            setErrorMessage(
                "Please select a job first",
            );

            return;
        }

        setIsGeneratingQueries(
            true,
        );

        setErrorMessage("");

        try {
            const response =
                (await chrome.runtime.sendMessage({
                    type:
                        "GENERATE_SEARCH_QUERIES",

                    payload: {
                        jobId:
                            selectedJob.id,
                    },
                })) as ExtensionResponse<{
                    job_id: string;
                    job_title: string;
                    queries: string[];
                }>;

            if (
                !response.success ||
                !response.data
            ) {
                throw new Error(
                    response.message ??
                    "Could not generate search queries",
                );
            }

            setSearchQueries(
                response.data.queries,
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not generate search queries",
            );
        } finally {
            setIsGeneratingQueries(
                false,
            );
        }
    }

    async function openFacebookSearch(
        query: string,
    ): Promise<void> {
        const url =
            `https://www.facebook.com/search/posts/?q=${encodeURIComponent(query)}`;

        await chrome.tabs.create({
            url,
        });
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

                            setSearchQueries([]);
                            setErrorMessage("");
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

            <section
                style={{
                    marginTop: 14,
                }}
            >
                <label
                    htmlFor="post-age-filter"
                    style={{
                        display: "block",
                        marginBottom: 6,
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    Post age
                </label>

                <select
                    id="post-age-filter"
                    value={postAgeFilter}
                    onChange={(event) => {
                        void handlePostAgeChange(
                            event.target.value as PostAgeFilter,
                        );
                    }}
                    style={{
                        width: "100%",
                        minHeight: 40,
                        borderRadius: 8,
                        border:
                            "1px solid rgba(32,38,31,0.15)",
                        padding: "0 10px",
                        background: "white",
                        color: "#20261F",
                    }}
                >
                    <option value="any">
                        Any time
                    </option>

                    <option value="1">
                        Last 1 day
                    </option>

                    <option value="3">
                        Last 3 days
                    </option>

                    <option value="7">
                        Last 7 days
                    </option>

                    <option value="14">
                        Last 14 days
                    </option>

                    <option value="30">
                        Last 30 days
                    </option>
                </select>

                <p
                    style={{
                        marginTop: 6,
                        marginBottom: 0,
                        fontSize: 11,
                        lineHeight: 1.4,
                        opacity: 0.55,
                    }}
                >
                    Only posts within this age range
                    will be sent for AI analysis.
                </p>
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

            {selectedJob && (
                <section
                    style={{
                        marginTop: 14,
                    }}
                >
                    <button
                        type="button"
                        onClick={() => {
                            void generateSearchQueries();
                        }}
                        disabled={
                            isGeneratingQueries
                        }
                        style={{
                            width: "100%",
                            minHeight: 40,
                            border: 0,
                            borderRadius: 8,
                            background:
                                "#E2793D",
                            color:
                                "#FFFFFF",
                            fontWeight: 600,
                            cursor:
                                isGeneratingQueries
                                    ? "not-allowed"
                                    : "pointer",
                        }}
                    >
                        {isGeneratingQueries
                            ? "Generating..."
                            : "Generate Search Queries"}
                    </button>
                </section>
            )}

            {searchQueries.length > 0 && (
                <section
                    style={{
                        marginTop: 16,
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            marginBottom: 8,
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                    >
                        Suggested searches
                    </p>

                    <div
                        style={{
                            display: "grid",
                            gap: 8,
                        }}
                    >
                        {searchQueries.map(
                            (
                                query,
                                index,
                            ) => (
                                <button
                                    key={`${query}-${index}`}
                                    type="button"
                                    onClick={() => {
                                        void openFacebookSearch(
                                            query,
                                        );
                                    }}
                                    style={{
                                        width: "100%",
                                        border:
                                            "1px solid rgba(32,38,31,0.1)",
                                        borderRadius: 8,
                                        padding: "9px 10px",
                                        background: "#FFFFFF",
                                        color: "#20261F",
                                        fontSize: 12,
                                        textAlign: "left",
                                        lineHeight: 1.45,
                                        cursor: "pointer",
                                    }}
                                >
                                    🔎 {query}
                                </button>
                            ),
                        )}
                    </div>
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