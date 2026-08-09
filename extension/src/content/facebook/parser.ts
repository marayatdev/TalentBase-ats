import type { FacebookPost } from "../../types/facebook-post";

/*
 * Facebook เปลี่ยน DOM / URL อยู่เรื่อย ๆ
 *
 * เป้าหมายของ parser ตัวนี้คือ:
 * 1. หา text ของ post
 * 2. หา URL "โพสต์จริง" ไม่ใช่ URL หน้า Group
 * 3. รองรับ URL ที่ Facebook ใช้แบบ multi_permalinks
 * 4. ถ้าเจอ URL แบบ query ให้แปลงเป็น canonical:
 *
 *    /groups/{groupId}/posts/{postId}/
 */

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getPostText(article: HTMLElement): string {
  const messageElements = Array.from(
    article.querySelectorAll<HTMLElement>(
      [
        '[data-ad-preview="message"]',
        '[data-ad-comet-preview="message"]',
      ].join(","),
    ),
  );

  if (messageElements.length > 0) {
    const text = messageElements
      .map((element) => normalizeText(element.innerText))
      .filter(Boolean)
      .join("\n");

    if (text) {
      return text;
    }
  }

  return normalizeText(article.innerText);
}

/*
 * ตรวจว่า hostname เป็น Facebook
 */
function isFacebookHostname(hostname: string): boolean {
  return (
    hostname === "facebook.com" ||
    hostname === "www.facebook.com" ||
    hostname === "m.facebook.com" ||
    hostname.endsWith(".facebook.com")
  );
}

/*
 * ดึง group id จาก pathname
 *
 * /groups/903759658143626/
 * /groups/903759658143626/posts/123/
 */
function extractGroupId(pathname: string): string | null {
  const match = pathname.match(
    /^\/groups\/([^/?#]+)/,
  );

  return match?.[1] ?? null;
}

/*
 * Facebook บางครั้งใช้ URL แบบ:
 *
 * /groups/{groupId}/?multi_permalinks={postId}
 *
 * แทน:
 *
 * /groups/{groupId}/posts/{postId}/
 *
 * เราจะแปลงให้เป็น canonical URL
 */
function canonicalizeGroupQueryPost(
  url: URL,
): string | null {
  const groupId =
    extractGroupId(url.pathname);

  if (!groupId) {
    return null;
  }

  const multiPermalink =
    url.searchParams.get(
      "multi_permalinks",
    );

  if (
    multiPermalink &&
    /^\d+$/.test(multiPermalink)
  ) {
    return `https://www.facebook.com/groups/${groupId}/posts/${multiPermalink}/`;
  }

  /*
   * บางรูปแบบอาจใช้ post_id
   */
  const postId =
    url.searchParams.get(
      "post_id",
    );

  if (
    postId &&
    /^\d+$/.test(postId)
  ) {
    return `https://www.facebook.com/groups/${groupId}/posts/${postId}/`;
  }

  return null;
}

/*
 * Legacy URL:
 *
 * permalink.php?story_fbid={postId}&id={ownerId}
 */
function canonicalizeLegacyPost(
  url: URL,
): string | null {
  const storyFbid =
    url.searchParams.get(
      "story_fbid",
    );

  if (!storyFbid) {
    return null;
  }

  const id =
    url.searchParams.get(
      "id",
    );

  const legacy =
    new URL(
      "https://www.facebook.com/permalink.php",
    );

  legacy.searchParams.set(
    "story_fbid",
    storyFbid,
  );

  if (id) {
    legacy.searchParams.set(
      "id",
      id,
    );
  }

  return legacy.toString();
}

/*
 * รับ href จาก DOM แล้วคืนเฉพาะ URL ของโพสต์จริง
 *
 * ถ้าเป็น:
 * https://www.facebook.com/groups/903759658143626/
 *
 * จะ return null
 */
function normalizeFacebookPostUrl(
  href: string,
): string | null {
  try {
    const url = new URL(
      href,
      window.location.origin,
    );

    if (
      !isFacebookHostname(
        url.hostname,
      )
    ) {
      return null;
    }

    url.hash = "";

    /*
     * Case 1:
     *
     * /groups/{groupId}/?multi_permalinks={postId}
     */
    const groupQueryPost =
      canonicalizeGroupQueryPost(
        url,
      );

    if (groupQueryPost) {
      return groupQueryPost;
    }

    /*
     * Case 2:
     *
     * /groups/{groupId}/posts/{postId}/
     */
    const groupPostMatch =
      url.pathname.match(
        /^\/groups\/([^/]+)\/posts\/([^/?#]+)/,
      );

    if (groupPostMatch) {
      const [
        ,
        groupId,
        postId,
      ] = groupPostMatch;

      return `https://www.facebook.com/groups/${groupId}/posts/${postId}/`;
    }

    /*
     * Case 3:
     *
     * /groups/{groupId}/permalink/{postId}/
     */
    const groupPermalinkMatch =
      url.pathname.match(
        /^\/groups\/([^/]+)\/permalink\/([^/?#]+)/,
      );

    if (groupPermalinkMatch) {
      const [
        ,
        groupId,
        postId,
      ] = groupPermalinkMatch;

      return `https://www.facebook.com/groups/${groupId}/posts/${postId}/`;
    }

    /*
     * Case 4:
     *
     * /{username}/posts/{postId}/
     */
    const normalPostMatch =
      url.pathname.match(
        /^\/([^/]+)\/posts\/([^/?#]+)/,
      );

    if (normalPostMatch) {
      url.search = "";

      return url.toString();
    }

    /*
     * Case 5:
     *
     * permalink.php?story_fbid=...
     */
    const legacyPost =
      canonicalizeLegacyPost(
        url,
      );

    if (legacyPost) {
      return legacyPost;
    }

    /*
     * Group root หรือ link อื่น ไม่ถือเป็น post
     */
    return null;
  } catch {
    return null;
  }
}

/*
 * ให้คะแนน URL candidate
 *
 * Timestamp/permalink จริงควรถูกเลือกก่อน link อื่น
 */
function getPostUrlScore(
  link: HTMLAnchorElement,
  normalizedUrl: string,
): number {
  let score = 0;

  if (
    normalizedUrl.includes(
      "/groups/",
    ) &&
    normalizedUrl.includes(
      "/posts/",
    )
  ) {
    score += 100;
  }

  if (
    normalizedUrl.includes(
      "/posts/",
    )
  ) {
    score += 50;
  }

  if (
    normalizedUrl.includes(
      "story_fbid=",
    )
  ) {
    score += 40;
  }

  /*
   * Timestamp link มักมี aria-label / title / text สั้น ๆ
   */
  if (
    link.getAttribute(
      "aria-label",
    )
  ) {
    score += 10;
  }

  if (
    link.getAttribute(
      "title",
    )
  ) {
    score += 10;
  }

  const text =
    link.innerText?.trim();

  if (
    text &&
    text.length > 0 &&
    text.length <= 50
  ) {
    score += 5;
  }

  return score;
}

function getPostUrl(
  article: HTMLElement,
): string | null {
  const links = Array.from(
    article.querySelectorAll<HTMLAnchorElement>(
      "a[href]",
    ),
  );

  const candidates = links
    .map((link) => {
      /*
       * ใช้ raw href ก่อน
       * เพราะบางครั้ง link.href ที่ browser normalize แล้ว
       * อาจทำให้ query บางตัวอ่านยากขึ้น
       */
      const rawHref =
        link.getAttribute(
          "href",
        ) ??
        link.href;

      const normalizedUrl =
        normalizeFacebookPostUrl(
          rawHref,
        );

      if (!normalizedUrl) {
        return null;
      }

      return {
        url:
          normalizedUrl,
        score:
          getPostUrlScore(
            link,
            normalizedUrl,
          ),
      };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        url: string;
        score: number;
      } =>
        candidate !== null,
    )
    .sort(
      (
        first,
        second,
      ) =>
        second.score -
        first.score,
    );

  if (
    candidates.length ===
    0
  ) {
    return null;
  }

  return candidates[0].url;
}

function getAuthor(
  article: HTMLElement,
): string | null {
  const selectors = [
    'h2 a[role="link"]',
    'h3 a[role="link"]',
    'h4 a[role="link"]',
    '[role="heading"] a[role="link"]',
    '[data-ad-rendering-role="profile_name"]',
  ];

  for (
    const selector
    of selectors
  ) {
    const element =
      article.querySelector<HTMLElement>(
        selector,
      );

    const value =
      element?.innerText?.trim();

    if (value) {
      return value;
    }
  }

  const headings = Array.from(
    article.querySelectorAll<HTMLElement>(
      'h2, h3, h4, [role="heading"]',
    ),
  );

  for (
    const heading
    of headings
  ) {
    const value =
      heading.innerText?.trim();

    if (
      value &&
      value.length <= 100 &&
      !value.includes(
        "ความคิดเห็น",
      ) &&
      !value.includes(
        "Comment",
      )
    ) {
      return value;
    }
  }

  return null;
}

function getCreatedAt(
  article: HTMLElement,
): string | null {
  const links = Array.from(
    article.querySelectorAll<HTMLAnchorElement>(
      "a[href]",
    ),
  );

  /*
   * อ่านวันที่จาก link ที่สามารถ normalize
   * เป็น post URL จริงเท่านั้น
   */
  for (
    const link
    of links
  ) {
    const rawHref =
      link.getAttribute(
        "href",
      ) ??
      link.href;

    const postUrl =
      normalizeFacebookPostUrl(
        rawHref,
      );

    if (!postUrl) {
      continue;
    }

    const ariaLabel =
      link
        .getAttribute(
          "aria-label",
        )
        ?.trim();

    if (ariaLabel) {
      return ariaLabel;
    }

    const title =
      link
        .getAttribute(
          "title",
        )
        ?.trim();

    if (title) {
      return title;
    }

    const text =
      link.innerText?.trim();

    if (
      text &&
      text.length <= 50
    ) {
      return text;
    }
  }

  const timeElement =
    article.querySelector<HTMLTimeElement>(
      "time",
    );

  if (timeElement) {
    const datetime =
      timeElement
        .getAttribute(
          "datetime",
        )
        ?.trim();

    if (datetime) {
      return datetime;
    }

    const text =
      timeElement
        .innerText
        .trim();

    if (text) {
      return text;
    }
  }

  return null;
}

function createPostId(
  article: HTMLElement,
  postUrl: string | null,
  text: string,
): string {
  /*
   * ถ้ามี permalink ให้ใช้เป็น ID
   */
  if (postUrl) {
    return postUrl;
  }

  const existingId =
    article.dataset
      .hrAtsPostId;

  if (existingId) {
    return existingId;
  }

  /*
   * fallback:
   * กรณี Facebook ไม่ expose permalink
   */
  let hash = 0;

  const source =
    text.slice(
      0,
      300,
    );

  for (
    let index = 0;
    index <
    source.length;
    index += 1
  ) {
    hash =
      (
        hash *
        31 +
        source.charCodeAt(
          index,
        )
      ) >>>
      0;
  }

  const id =
    `facebook-post-${hash}`;

  article.dataset.hrAtsPostId =
    id;

  return id;
}

export function parsePost(
  article: HTMLElement,
): FacebookPost | null {
  const text =
    getPostText(
      article,
    );

  if (
    text.length <
    20
  ) {
    return null;
  }

  const url =
    getPostUrl(
      article,
    );

  /*
   * Debug ชั่วคราว
   *
   * ช่วยดูว่า parser ได้ URL จริงหรือยัง
   */
  if (!url) {
    console.debug(
      "[HR ATS Extension] Post URL not found",
      {
        author:
          getAuthor(
            article,
          ),
        preview:
          text.slice(
            0,
            80,
          ),
      },
    );
  }

  return {
    id:
      createPostId(
        article,
        url,
        text,
      ),

    author:
      getAuthor(
        article,
      ),

    text,

    url,

    createdAt:
      getCreatedAt(
        article,
      ),
  };
}