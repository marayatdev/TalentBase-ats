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

interface ExtensionUser {
    id: string;
    name: string | null;
    email: string;
    role?: string;
}

interface AuthSession {
    isAuthenticated: boolean;
    user: ExtensionUser | null;
}

/*
 * Fixed credentials สำหรับใช้งานภายใน / ทดสอบเท่านั้น
 * เปลี่ยนค่า 2 ตัวนี้ให้ตรงกับ User จริงในระบบ
 */
const FIXED_EMAIL = "test@gmail.com";
const FIXED_PASSWORD = "Test123456";

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

    const [
        searchQueries,
        setSearchQueries,
    ] = useState<string[]>([]);

    const [
        isGeneratingQueries,
        setIsGeneratingQueries,
    ] = useState(false);

    const [
        isAuthenticated,
        setIsAuthenticated,
    ] = useState(false);

    const [
        currentUser,
        setCurrentUser,
    ] = useState<ExtensionUser | null>(null);

    const [
        isLoggingIn,
        setIsLoggingIn,
    ] = useState(false);

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
        void initializePopup();
    }, []);

    async function initializePopup(): Promise<void> {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const response =
                (await chrome.runtime.sendMessage({
                    type: "GET_AUTH_SESSION",
                })) as ExtensionResponse<AuthSession> | undefined;

            if (
                !response ||
                !response.success ||
                !response.data?.isAuthenticated
            ) {
                setIsAuthenticated(false);
                setCurrentUser(null);
                return;
            }

            setIsAuthenticated(false);
            setCurrentUser(null);
        } catch (error) {
            setIsAuthenticated(false);
            setCurrentUser(null);

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not load extension session",
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function handleLogin(): Promise<void> {
        setIsLoggingIn(true);
        setErrorMessage("");

        try {
            const response =
                (await chrome.runtime.sendMessage({
                    type: "EXTENSION_LOGIN",

                    payload: {
                        email: FIXED_EMAIL,
                        password: FIXED_PASSWORD,
                    },
                })) as ExtensionResponse<ExtensionUser> | undefined;

            if (
                !response ||
                !response.success ||
                !response.data
            ) {
                throw new Error(
                    response?.message ??
                    "Extension background did not respond",
                );
            }

            setIsAuthenticated(true);
            setCurrentUser(response.data);

            await loadPopupData();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not login",
            );
        } finally {
            setIsLoggingIn(false);
        }
    }

    async function handleLogout(): Promise<void> {
        setErrorMessage("");

        try {
            const response =
                (await chrome.runtime.sendMessage({
                    type: "EXTENSION_LOGOUT",
                })) as ExtensionResponse<null> | undefined;

            if (
                !response ||
                !response.success
            ) {
                throw new Error(
                    response?.message ??
                    "Extension background did not respond",
                );
            }

            setIsAuthenticated(false);
            setCurrentUser(null);
            setJobs([]);
            setSelectedJobId("");
            setSearchQueries([]);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not logout",
            );
        }
    }

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

    if (!isAuthenticated) {
        return (
            <main
                style={{
                    width: 380,
                    boxSizing: "border-box",
                    fontFamily:
                        "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                    color: "#20261F",
                    background: "#F7F3E9",
                }}
            >
                <header
                    style={{
                        padding: "18px 18px 16px",
                        background: "#1F4A3A",
                        color: "#FFFFFF",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                display: "grid",
                                placeItems: "center",
                                borderRadius: 10,
                                background:
                                    "rgba(255,255,255,0.14)",
                                fontSize: 18,
                            }}
                        >
                            ◎
                        </div>

                        <div>
                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: 17,
                                    lineHeight: 1.2,
                                    fontWeight: 700,
                                }}
                            >
                                HR ATS Scanner
                            </h1>

                            <p
                                style={{
                                    margin: "4px 0 0",
                                    fontSize: 11,
                                    lineHeight: 1.4,
                                    opacity: 0.72,
                                }}
                            >
                                Sign in to TalentBase ATS
                            </p>
                        </div>
                    </div>
                </header>

                <div
                    style={{
                        padding: 16,
                    }}
                >
                    <section
                        style={{
                            borderRadius: 12,
                            padding: 14,
                            background: "#FFFFFF",
                            border:
                                "1px solid rgba(32,38,31,0.08)",
                            boxShadow:
                                "0 2px 8px rgba(32,38,31,0.04)",
                        }}
                    >
                        <div
                            style={{
                                marginBottom: 12,
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 13,
                                    fontWeight: 700,
                                }}
                            >
                                Login
                            </p>

                            <p
                                style={{
                                    margin: "4px 0 0",
                                    fontSize: 10.5,
                                    lineHeight: 1.45,
                                    opacity: 0.52,
                                }}
                            >
                                Credentials are fixed for this
                                extension.
                            </p>
                        </div>

                        <label
                            htmlFor="fixed-email"
                            style={{
                                display: "block",
                                marginBottom: 5,
                                fontSize: 10.5,
                                fontWeight: 650,
                            }}
                        >
                            Email
                        </label>

                        <input
                            id="fixed-email"
                            type="email"
                            value={FIXED_EMAIL}
                            readOnly
                            style={{
                                width: "100%",
                                minHeight: 40,
                                boxSizing: "border-box",
                                borderRadius: 9,
                                border:
                                    "1px solid rgba(32,38,31,0.12)",
                                padding: "0 11px",
                                background: "#F5F5F2",
                                color: "#20261F",
                                fontSize: 12,
                                cursor: "default",
                            }}
                        />

                        <label
                            htmlFor="fixed-password"
                            style={{
                                display: "block",
                                marginTop: 10,
                                marginBottom: 5,
                                fontSize: 10.5,
                                fontWeight: 650,
                            }}
                        >
                            Password
                        </label>

                        <input
                            id="fixed-password"
                            type="password"
                            value={FIXED_PASSWORD}
                            readOnly
                            style={{
                                width: "100%",
                                minHeight: 40,
                                boxSizing: "border-box",
                                borderRadius: 9,
                                border:
                                    "1px solid rgba(32,38,31,0.12)",
                                padding: "0 11px",
                                background: "#F5F5F2",
                                color: "#20261F",
                                fontSize: 12,
                                cursor: "default",
                            }}
                        />

                        {errorMessage && (
                            <div
                                style={{
                                    marginTop: 10,
                                    borderRadius: 9,
                                    padding: "9px 10px",
                                    background: "#FDECEC",
                                    color: "#9F1D1D",
                                    fontSize: 11,
                                    lineHeight: 1.45,
                                }}
                            >
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                void handleLogin();
                            }}
                            disabled={
                                isLoggingIn ||
                                isLoading
                            }
                            style={{
                                width: "100%",
                                minHeight: 42,
                                marginTop: 12,
                                border: 0,
                                borderRadius: 9,
                                background:
                                    isLoggingIn
                                        ? "#789187"
                                        : "#1F4A3A",
                                color: "#FFFFFF",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor:
                                    isLoggingIn
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            {isLoggingIn
                                ? "Signing in..."
                                : "Sign in"}
                        </button>
                    </section>

                    <p
                        style={{
                            margin: "10px 0 0",
                            textAlign: "center",
                            fontSize: 9.5,
                            lineHeight: 1.4,
                            opacity: 0.38,
                        }}
                    >
                        Internal testing mode
                    </p>
                </div>
            </main>
        );
    }

    const canUseJob =
        Boolean(selectedJob) &&
        !isLoading &&
        !isSaving;

    return (
        <main
            style={{
                width: 380,
                maxHeight: 600,
                overflowY: "auto",
                boxSizing: "border-box",
                fontFamily:
                    "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                color: "#20261F",
                background: "#F7F3E9",
            }}
        >
            <header
                style={{
                    padding: "18px 18px 16px",
                    background: "#1F4A3A",
                    color: "#FFFFFF",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.14)",
                            fontSize: 18,
                        }}
                    >
                        ◎
                    </div>

                    <div>
                        <h1 style={{ margin: 0, fontSize: 17, lineHeight: 1.2, fontWeight: 700 }}>
                            HR ATS Scanner
                        </h1>
                        <p style={{ margin: "4px 0 0", fontSize: 11, lineHeight: 1.4, opacity: 0.72 }}>
                            Facebook Candidate Scraper
                        </p>
                    </div>
                </div>

                {currentUser && (
                    <div
                        style={{
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop:
                                "1px solid rgba(255,255,255,0.14)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                                "space-between",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                minWidth: 0,
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    overflow: "hidden",
                                    textOverflow:
                                        "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {currentUser.name ??
                                    currentUser.email}
                            </p>

                            <p
                                style={{
                                    margin: "2px 0 0",
                                    fontSize: 9.5,
                                    opacity: 0.62,
                                }}
                            >
                                {currentUser.email}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                void handleLogout();
                            }}
                            style={{
                                flexShrink: 0,
                                border:
                                    "1px solid rgba(255,255,255,0.22)",
                                borderRadius: 7,
                                padding: "5px 8px",
                                background:
                                    "rgba(255,255,255,0.08)",
                                color: "#FFFFFF",
                                fontSize: 9.5,
                                fontWeight: 650,
                                cursor: "pointer",
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </header>

            <div style={{ padding: 16, display: "grid", gap: 12 }}>
                <section
                    style={{
                        borderRadius: 12,
                        padding: 14,
                        background: "#FFFFFF",
                        border: "1px solid rgba(32,38,31,0.08)",
                        boxShadow: "0 2px 8px rgba(32,38,31,0.04)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            marginBottom: 10,
                        }}
                    >
                        <div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>
                                Target job
                            </p>
                            <p style={{ margin: "3px 0 0", fontSize: 10.5, opacity: 0.52 }}>
                                Choose the role used for candidate matching
                            </p>
                        </div>

                        {selectedJob && (
                            <span
                                style={{
                                    flexShrink: 0,
                                    padding: "4px 7px",
                                    borderRadius: 999,
                                    background: "#EAF3EE",
                                    color: "#1F6A4A",
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                }}
                            >
                                SELECTED
                            </span>
                        )}
                    </div>

                    {isLoading ? (
                        <div
                            style={{
                                padding: "11px 12px",
                                borderRadius: 9,
                                background: "#F7F7F4",
                                fontSize: 12,
                                opacity: 0.6,
                            }}
                        >
                            Loading jobs...
                        </div>
                    ) : (
                        <select
                            id="selected-job"
                            value={selectedJobId}
                            onChange={(event) => {
                                setSelectedJobId(event.target.value);
                                setSearchQueries([]);
                            }}
                            disabled={isSaving || jobs.length === 0}
                            style={{
                                width: "100%",
                                minHeight: 42,
                                boxSizing: "border-box",
                                borderRadius: 9,
                                border: "1px solid rgba(32,38,31,0.14)",
                                padding: "0 11px",
                                outline: "none",
                                background: "#FFFFFF",
                                color: "#20261F",
                                fontSize: 12,
                            }}
                        >
                            <option value="">Select a job</option>
                            {jobs.map((job) => (
                                <option key={job.id} value={job.id}>
                                    {job.title}
                                </option>
                            ))}
                        </select>
                    )}

                    {!isLoading && jobs.length === 0 && !errorMessage && (
                        <div
                            style={{
                                marginTop: 10,
                                borderRadius: 9,
                                padding: 10,
                                fontSize: 11,
                                lineHeight: 1.45,
                                color: "#8A5A00",
                                background: "#FFF6DE",
                            }}
                        >
                            No open jobs were found in the ATS.
                        </div>
                    )}

                    {selectedJob && (
                        <div
                            style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: "1px solid rgba(32,38,31,0.08)",
                            }}
                        >
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                                {selectedJob.title}
                            </p>

                            {selectedJob.description && (
                                <p
                                    style={{
                                        margin: "6px 0 0",
                                        fontSize: 11,
                                        lineHeight: 1.5,
                                        opacity: 0.62,
                                    }}
                                >
                                    {selectedJob.description.slice(0, 160)}
                                    {selectedJob.description.length > 160 ? "..." : ""}
                                </p>
                            )}

                            <div
                                style={{
                                    marginTop: 10,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 6,
                                }}
                            >
                                <span
                                    style={{
                                        padding: "5px 8px",
                                        borderRadius: 7,
                                        background: "#F3F1EB",
                                        fontSize: 10,
                                        fontWeight: 600,
                                    }}
                                >
                                    {selectedJob.minimum_experience_years} yrs exp.
                                </span>

                                <span
                                    style={{
                                        padding: "5px 8px",
                                        borderRadius: 7,
                                        background: "#F3F1EB",
                                        fontSize: 10,
                                        fontWeight: 600,
                                        textTransform: "capitalize",
                                    }}
                                >
                                    {selectedJob.employment_type.replace("_", " ")}
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                {errorMessage && (
                    <div
                        style={{
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: 11,
                            lineHeight: 1.45,
                            color: "#9F1D1D",
                            background: "#FDECEC",
                            border: "1px solid rgba(159,29,29,0.08)",
                        }}
                    >
                        {errorMessage}
                    </div>
                )}

                {selectedJob && (
                    <section
                        style={{
                            borderRadius: 12,
                            padding: 14,
                            background: "#FFFFFF",
                            border: "1px solid rgba(32,38,31,0.08)",
                            boxShadow: "0 2px 8px rgba(32,38,31,0.04)",
                        }}
                    >
                        <div style={{ marginBottom: 10 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>
                                Candidate search
                            </p>
                            <p style={{ margin: "3px 0 0", fontSize: 10.5, opacity: 0.52 }}>
                                Generate Facebook searches from this JD
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void generateSearchQueries()}
                            disabled={isGeneratingQueries}
                            style={{
                                width: "100%",
                                minHeight: 40,
                                border: 0,
                                borderRadius: 9,
                                padding: "0 12px",
                                background: isGeneratingQueries ? "#D8B29C" : "#E2793D",
                                color: "#FFFFFF",
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: isGeneratingQueries ? "not-allowed" : "pointer",
                            }}
                        >
                            {isGeneratingQueries
                                ? "Generating searches..."
                                : "Generate Search Queries"}
                        </button>

                        {searchQueries.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 7,
                                    }}
                                >
                                    <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, opacity: 0.65 }}>
                                        Suggested searches
                                    </p>
                                    <span style={{ fontSize: 9.5, opacity: 0.45 }}>
                                        {searchQueries.length} queries
                                    </span>
                                </div>

                                <div style={{ display: "grid", gap: 6 }}>
                                    {searchQueries.map((query, index) => (
                                        <button
                                            key={`${query}-${index}`}
                                            type="button"
                                            onClick={() => void openFacebookSearch(query)}
                                            title={query}
                                            style={{
                                                width: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                border: "1px solid rgba(32,38,31,0.09)",
                                                borderRadius: 8,
                                                padding: "8px 9px",
                                                background: "#FBFAF7",
                                                color: "#20261F",
                                                fontSize: 10.5,
                                                lineHeight: 1.35,
                                                textAlign: "left",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <span style={{ flexShrink: 0, opacity: 0.65 }}>
                                                🔎
                                            </span>
                                            <span
                                                style={{
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {query}
                                            </span>
                                            <span
                                                style={{
                                                    marginLeft: "auto",
                                                    flexShrink: 0,
                                                    opacity: 0.35,
                                                }}
                                            >
                                                ↗
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                <section
                    style={{
                        display: "grid",
                        gridTemplateColumns: selectedJobId ? "96px 1fr" : "1fr",
                        gap: 8,
                    }}
                >
                    {selectedJobId && (
                        <button
                            type="button"
                            onClick={() => void clearSelectedJob()}
                            disabled={isSaving}
                            style={{
                                minHeight: 42,
                                borderRadius: 9,
                                border: "1px solid rgba(32,38,31,0.14)",
                                padding: "0 12px",
                                background: "#FFFFFF",
                                color: "#20261F",
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: isSaving ? "not-allowed" : "pointer",
                            }}
                        >
                            Clear
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => void saveSelectedJob()}
                        disabled={!canUseJob}
                        style={{
                            minHeight: 42,
                            borderRadius: 9,
                            border: 0,
                            padding: "0 14px",
                            background: canUseJob ? "#1F4A3A" : "#AAB3AE",
                            color: "#FFFFFF",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: canUseJob ? "pointer" : "not-allowed",
                        }}
                    >
                        {isSaving ? "Saving..." : "Use this job"}
                    </button>
                </section>

                <p
                    style={{
                        margin: "-2px 0 0",
                        textAlign: "center",
                        fontSize: 9.5,
                        lineHeight: 1.4,
                        opacity: 0.38,
                    }}
                >
                    Select a job, generate a search, then scan Facebook posts.
                </p>
            </div>
        </main>
    );
}