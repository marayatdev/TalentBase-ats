import type { FacebookPost } from "../../types/facebook-post";

const POST_URL_PATTERNS = ["/posts/", "/permalink/", "story_fbid=", "/groups/"];

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getPostText(article: HTMLElement): string {
  const messageElements = Array.from(
    article.querySelectorAll<HTMLElement>(
      ['[data-ad-preview="message"]', '[data-ad-comet-preview="message"]'].join(
        ",",
      ),
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

function normalizeFacebookUrl(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);

    const isFacebook =
      url.hostname === "facebook.com" ||
      url.hostname === "www.facebook.com" ||
      url.hostname.endsWith(".facebook.com");

    if (!isFacebook) {
      return null;
    }

    url.hash = "";

    const shouldKeepQuery =
      url.searchParams.has("story_fbid") || url.searchParams.has("id");

    if (!shouldKeepQuery) {
      url.search = "";
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isLikelyPostUrl(href: string): boolean {
  return POST_URL_PATTERNS.some((pattern) => href.includes(pattern));
}

function getPostUrl(article: HTMLElement): string | null {
  const links = Array.from(
    article.querySelectorAll<HTMLAnchorElement>("a[href]"),
  );

  const candidates = links
    .map((link) => link.href)
    .filter(Boolean)
    .filter(isLikelyPostUrl)
    .map(normalizeFacebookUrl)
    .filter((url): url is string => Boolean(url));

  if (candidates.length === 0) {
    return null;
  }

  return (
    candidates.find((url) => url.includes("/posts/")) ??
    candidates.find((url) => url.includes("/permalink/")) ??
    candidates.find((url) => url.includes("story_fbid=")) ??
    candidates[0]
  );
}

function getAuthor(article: HTMLElement): string | null {
  const selectors = [
    'h2 a[role="link"]',
    'h3 a[role="link"]',
    'h4 a[role="link"]',
    '[role="heading"] a[role="link"]',
    '[data-ad-rendering-role="profile_name"]',
  ];

  for (const selector of selectors) {
    const element = article.querySelector<HTMLElement>(selector);

    const value = element?.innerText?.trim();

    if (value) {
      return value;
    }
  }

  const headings = Array.from(
    article.querySelectorAll<HTMLElement>('h2, h3, h4, [role="heading"]'),
  );

  for (const heading of headings) {
    const value = heading.innerText?.trim();

    if (
      value &&
      value.length <= 100 &&
      !value.includes("ความคิดเห็น") &&
      !value.includes("Comment")
    ) {
      return value;
    }
  }

  return null;
}

function getCreatedAt(article: HTMLElement): string | null {
  const links = Array.from(
    article.querySelectorAll<HTMLAnchorElement>("a[href]"),
  );

  for (const link of links) {
    if (!isLikelyPostUrl(link.href)) {
      continue;
    }

    const ariaLabel = link.getAttribute("aria-label")?.trim();

    if (ariaLabel) {
      return ariaLabel;
    }

    const title = link.getAttribute("title")?.trim();

    if (title) {
      return title;
    }

    const text = link.innerText?.trim();

    if (text && text.length <= 50) {
      return text;
    }
  }

  const timeElement = article.querySelector<HTMLElement>("time");

  if (timeElement) {
    return (
      timeElement.getAttribute("datetime") ??
      timeElement.innerText.trim() ??
      null
    );
  }

  return null;
}

function createPostId(
  article: HTMLElement,
  postUrl: string | null,
  text: string,
): string {
  if (postUrl) {
    return postUrl;
  }

  const existingId = article.dataset.hrAtsPostId;

  if (existingId) {
    return existingId;
  }

  let hash = 0;

  const source = text.slice(0, 300);

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  const id = `facebook-post-${hash}`;

  article.dataset.hrAtsPostId = id;

  return id;
}

export function parsePost(article: HTMLElement): FacebookPost | null {
  const text = getPostText(article);

  if (text.length < 20) {
    return null;
  }

  const url = getPostUrl(article);

  return {
    id: createPostId(article, url, text),

    author: getAuthor(article),

    text,

    url,

    createdAt: getCreatedAt(article),
  };
}
