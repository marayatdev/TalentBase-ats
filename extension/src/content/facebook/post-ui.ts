import type {
  CandidatePostAnalysis,
  FacebookPostMatch,
} from "../../types/facebook-post";

import type {
  ExtensionJob,
} from "../../types/job";

const TOOLBAR_ATTRIBUTE =
  "data-hr-ats-toolbar";

const MATCHED_ATTRIBUTE =
  "data-hr-ats-matched";

function createButton(
  label: string,
  options: {
    background: string;
    color: string;
    onClick: () => void;
  },
): HTMLButtonElement {
  const button =
    document.createElement(
      "button",
    );

  button.type =
    "button";

  button.textContent =
    label;

  Object.assign(
    button.style,
    {
      border:
        "none",

      borderRadius:
        "8px",

      padding:
        "8px 12px",

      cursor:
        "pointer",

      fontSize:
        "12px",

      fontWeight:
        "600",

      lineHeight:
        "1.2",

      background:
        options.background,

      color:
        options.color,
    },
  );

  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      options.onClick();
    },
  );

  return button;
}

function createText(
  value: string,
  styles: Partial<
    CSSStyleDeclaration
  > = {},
): HTMLSpanElement {
  const element =
    document.createElement(
      "span",
    );

  element.textContent =
    value;

  Object.assign(
    element.style,
    styles,
  );

  return element;
}

async function copyPostUrl(
  post: FacebookPostMatch,
  button: HTMLButtonElement,
): Promise<void> {
  if (!post.url) {
    button.textContent =
      "URL not found";

    window.setTimeout(
      () => {
        button.textContent =
          "Copy URL";
      },
      1_500,
    );

    return;
  }

  try {
    await navigator.clipboard.writeText(
      post.url,
    );

    button.textContent =
      "Copied";

    window.setTimeout(
      () => {
        button.textContent =
          "Copy URL";
      },
      1_500,
    );
  } catch (error) {
    console.error(
      "[HR ATS Extension] Could not copy post URL",
      error,
    );

    button.textContent =
      "Copy failed";

    window.setTimeout(
      () => {
        button.textContent =
          "Copy URL";
      },
      1_500,
    );
  }
}

async function getSelectedJob(): Promise<
  ExtensionJob | null
> {
  try {
    const stored =
      await chrome.storage.local.get(
        "selectedJob",
      );

    return (
      stored.selectedJob as
      | ExtensionJob
      | undefined
    ) ?? null;
  } catch {
    return null;
  }
}

export function removePostMatchUI(
  article: HTMLElement,
): void {
  article.removeAttribute(
    MATCHED_ATTRIBUTE,
  );

  article.style.removeProperty(
    "outline",
  );

  article.style.removeProperty(
    "outline-offset",
  );

  article.style.removeProperty(
    "border-radius",
  );

  article
    .querySelector(
      `[${TOOLBAR_ATTRIBUTE}]`,
    )
    ?.remove();
}

export function renderPostMatchUI(
  article: HTMLElement,
  post: FacebookPostMatch,
  analysis: CandidatePostAnalysis,
): void {
  if (
    article.getAttribute(
      MATCHED_ATTRIBUTE,
    ) === "true" ||
    article.querySelector(
      `[${TOOLBAR_ATTRIBUTE}]`,
    )
  ) {
    return;
  }

  article.setAttribute(
    MATCHED_ATTRIBUTE,
    "true",
  );

  article.style.outline =
    "3px solid #1F4A3A";

  article.style.outlineOffset =
    "4px";

  article.style.borderRadius =
    "12px";

  const toolbar =
    document.createElement(
      "div",
    );

  toolbar.setAttribute(
    TOOLBAR_ATTRIBUTE,
    "true",
  );

  Object.assign(
    toolbar.style,
    {
      position:
        "relative",

      zIndex:
        "20",

      display:
        "flex",

      flexDirection:
        "column",

      gap:
        "8px",

      margin:
        "10px",

      padding:
        "12px",

      border:
        "1px solid rgba(31, 74, 58, 0.2)",

      borderRadius:
        "10px",

      background:
        "#FAF6EC",

      color:
        "#20261F",

      fontFamily:
        "Arial, sans-serif",

      boxShadow:
        "0 4px 14px rgba(0, 0, 0, 0.12)",
    },
  );

  const topRow =
    document.createElement(
      "div",
    );

  Object.assign(
    topRow.style,
    {
      display:
        "flex",

      flexWrap:
        "wrap",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      gap:
        "8px",
    },
  );

  const titleGroup =
    document.createElement(
      "div",
    );

  Object.assign(
    titleGroup.style,
    {
      display:
        "flex",

      flexDirection:
        "column",

      gap:
        "2px",
    },
  );

  const title =
    createText(
      `AI Match ${analysis.confidence}%`,
      {
        fontSize:
          "13px",

        fontWeight:
          "700",

        color:
          "#1F4A3A",
      },
    );

  const position =
    createText(
      analysis.detected_position ??
      analysis.target_position,
      {
        fontSize:
          "12px",

        color:
          "rgba(32, 38, 31, 0.65)",
      },
    );

  titleGroup.append(
    title,
    position,
  );

  const badge =
    createText(
      "Job seeker",
      {
        display:
          "inline-flex",

        alignItems:
          "center",

        borderRadius:
          "999px",

        padding:
          "4px 8px",

        background:
          "#DFF3E7",

        color:
          "#17663A",

        fontSize:
          "11px",

        fontWeight:
          "700",
      },
    );

  topRow.append(
    titleGroup,
    badge,
  );

  const reason =
    createText(
      analysis.reason,
      {
        fontSize:
          "12px",

        lineHeight:
          "1.5",

        color:
          "rgba(32, 38, 31, 0.75)",
      },
    );

  const skillsRow =
    document.createElement(
      "div",
    );

  Object.assign(
    skillsRow.style,
    {
      display:
        "flex",

      flexWrap:
        "wrap",

      gap:
        "6px",
    },
  );

  for (
    const skill
    of analysis.skills.slice(
      0,
      8,
    )
  ) {
    const skillBadge =
      createText(
        skill,
        {
          borderRadius:
            "999px",

          padding:
            "4px 8px",

          background:
            "#EFE6D3",

          color:
            "#20261F",

          fontSize:
            "11px",
        },
      );

    skillsRow.append(
      skillBadge,
    );
  }

  const actions =
    document.createElement(
      "div",
    );

  Object.assign(
    actions.style,
    {
      display:
        "flex",

      flexWrap:
        "wrap",

      gap:
        "8px",

      justifyContent:
        "flex-end",
    },
  );

  const copyButton =
    createButton(
      "Copy URL",
      {
        background:
          "#EFE6D3",

        color:
          "#20261F",

        onClick: () => {
          void copyPostUrl(
            post,
            copyButton,
          );
        },
      },
    );

  const importButton =
    createButton(
      "Save to ATS",
      {
        background:
          "#1F4A3A",

        color:
          "#FFFFFF",

        onClick: () => {
          void saveCandidateLead();
        },
      },
    );

  async function saveCandidateLead(): Promise<void> {
    importButton.disabled =
      true;

    importButton.textContent =
      "Saving...";

    try {
      const selectedJob =
        await getSelectedJob();

      if (!selectedJob?.id) {
        throw new Error(
          "No job selected. Please select a job from the extension popup.",
        );
      }

      if (!post.url) {
        throw new Error(
          "Facebook post URL was not found",
        );
      }

      console.log(
        "[HR ATS Extension] Saving candidate lead",
        {
          postId:
            post.id,

          jobId:
            selectedJob.id,

          jobTitle:
            selectedJob.title,
        },
      );

      const response =
        await chrome.runtime.sendMessage({
          type:
            "SAVE_CANDIDATE_LEAD",

          payload: {
            source:
              "facebook",

            source_url:
              post.url,

            raw_text:
              post.text,

            detected_name:
              analysis.full_name ??
              post.author ??
              null,

            detected_email:
              analysis.email,

            detected_phone:
              analysis.phone,

            detected_position:
              analysis.detected_position,

            skills:
              analysis.skills,

            ai_confidence:
              analysis.confidence,

            ai_reason:
              analysis.reason,

            /*
             * สำคัญ:
             * ใช้ Job ที่ HR เลือกจริง
             */
            target_job_id:
              selectedJob.id,
          },
        });

      console.log(
        "[HR ATS Extension] Save lead response",
        response,
      );

      if (
        !response?.success
      ) {
        throw new Error(
          response?.message ??
          "Could not save candidate lead",
        );
      }

      importButton.disabled =
        true;

      importButton.textContent =
        "Saved";

      importButton.style.background =
        "#6B7280";

      console.log(
        "[HR ATS Extension] Candidate lead saved",
        response.data,
      );
    } catch (error) {
      importButton.disabled =
        false;

      importButton.textContent =
        "Save to ATS";

      console.error(
        "[HR ATS Extension] Save lead failed",
        error,
      );
    }
  }

  actions.append(
    copyButton,
    importButton,
  );

  toolbar.append(
    topRow,
    reason,
    skillsRow,
    actions,
  );

  article.prepend(
    toolbar,
  );
}