import type {
  FacebookPost,
} from "../../types/facebook-post";

const POST_URL_PATTERNS = [
  "/posts/",
  "/permalink/",
  "story_fbid=",
  "/groups/",
];

const THAI_MONTHS: Record<
  string,
  number
> = {
  มกราคม: 0,
  กุมภาพันธ์: 1,
  มีนาคม: 2,
  เมษายน: 3,
  พฤษภาคม: 4,
  มิถุนายน: 5,
  กรกฎาคม: 6,
  สิงหาคม: 7,
  กันยายน: 8,
  ตุลาคม: 9,
  พฤศจิกายน: 10,
  ธันวาคม: 11,

  "ม.ค.": 0,
  "ก.พ.": 1,
  "มี.ค.": 2,
  "เม.ย.": 3,
  "พ.ค.": 4,
  "มิ.ย.": 5,
  "ก.ค.": 6,
  "ส.ค.": 7,
  "ก.ย.": 8,
  "ต.ค.": 9,
  "พ.ย.": 10,
  "ธ.ค.": 11,
};

function normalizeText(
  value: string,
): string {
  return value
    .replace(
      /\u00a0/g,
      " ",
    )
    .replace(
      /\n{3,}/g,
      "\n\n",
    )
    .trim();
}

function getPostText(
  article: HTMLElement,
): string {
  const messageElements =
    Array.from(
      article.querySelectorAll<HTMLElement>(
        [
          '[data-ad-preview="message"]',
          '[data-ad-comet-preview="message"]',
        ].join(","),
      ),
    );

  if (
    messageElements.length >
    0
  ) {
    const text =
      messageElements
        .map(
          (
            element,
          ) =>
            normalizeText(
              element.innerText,
            ),
        )
        .filter(
          Boolean,
        )
        .join("\n");

    if (text) {
      return text;
    }
  }

  return normalizeText(
    article.innerText,
  );
}

function normalizeFacebookUrl(
  href: string,
): string | null {
  try {
    const url =
      new URL(
        href,
        window.location.origin,
      );

    const isFacebook =
      url.hostname ===
      "facebook.com" ||
      url.hostname ===
      "www.facebook.com" ||
      url.hostname.endsWith(
        ".facebook.com",
      );

    if (!isFacebook) {
      return null;
    }

    url.hash = "";

    const shouldKeepQuery =
      url.searchParams.has(
        "story_fbid",
      ) ||
      url.searchParams.has(
        "id",
      );

    if (
      !shouldKeepQuery
    ) {
      url.search = "";
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isLikelyPostUrl(
  href: string,
): boolean {
  return POST_URL_PATTERNS.some(
    (
      pattern,
    ) =>
      href.includes(
        pattern,
      ),
  );
}

function getPostUrl(
  article: HTMLElement,
): string | null {
  const links =
    Array.from(
      article.querySelectorAll<
        HTMLAnchorElement
      >("a[href]"),
    );

  const candidates =
    links
      .map(
        (
          link,
        ) =>
          link.href,
      )
      .filter(
        Boolean,
      )
      .filter(
        isLikelyPostUrl,
      )
      .map(
        normalizeFacebookUrl,
      )
      .filter(
        (
          url,
        ): url is string =>
          Boolean(url),
      );

  if (
    candidates.length ===
    0
  ) {
    return null;
  }

  return (
    candidates.find(
      (
        url,
      ) =>
        url.includes(
          "/posts/",
        ),
    ) ??
    candidates.find(
      (
        url,
      ) =>
        url.includes(
          "/permalink/",
        ),
    ) ??
    candidates.find(
      (
        url,
      ) =>
        url.includes(
          "story_fbid=",
        ),
    ) ??
    candidates[0]
  );
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

  const headings =
    Array.from(
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
      value.length <=
      100 &&
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

/*
 * พยายามอ่านค่าที่ Facebook แสดง เช่น
 *
 * 5 นาที
 * 2 ชม.
 * 3 วัน
 * 1 สัปดาห์
 * 5 สิงหาคม เวลา 14:30
 *
 * หรือ datetime จาก <time>
 */
function getCreatedAt(
  article: HTMLElement,
): string | null {
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
        ?.trim();

    if (text) {
      return text;
    }
  }

  const links =
    Array.from(
      article.querySelectorAll<
        HTMLAnchorElement
      >("a[href]"),
    );

  for (
    const link
    of links
  ) {
    if (
      !isLikelyPostUrl(
        link.href,
      )
    ) {
      continue;
    }

    const ariaLabel =
      link
        .getAttribute(
          "aria-label",
        )
        ?.trim();

    if (
      ariaLabel &&
      isLikelyDateText(
        ariaLabel,
      )
    ) {
      return ariaLabel;
    }

    const title =
      link
        .getAttribute(
          "title",
        )
        ?.trim();

    if (
      title &&
      isLikelyDateText(
        title,
      )
    ) {
      return title;
    }

    const text =
      link
        .innerText
        ?.trim();

    if (
      text &&
      text.length <=
      80 &&
      isLikelyDateText(
        text,
      )
    ) {
      return text;
    }
  }

  return null;
}

function isLikelyDateText(
  value: string,
): boolean {
  const normalized =
    value
      .toLowerCase()
      .trim();

  if (!normalized) {
    return false;
  }

  return (
    /\d+\s*(นาที|min|mins|minute|minutes)/i.test(
      normalized,
    ) ||
    /\d+\s*(ชม\.?|ชั่วโมง|hr|hrs|hour|hours)/i.test(
      normalized,
    ) ||
    /\d+\s*(วัน|day|days)/i.test(
      normalized,
    ) ||
    /\d+\s*(สัปดาห์|อาทิตย์|week|weeks)/i.test(
      normalized,
    ) ||
    /\d+\s*(เดือน|month|months)/i.test(
      normalized,
    ) ||
    Object.keys(
      THAI_MONTHS,
    ).some(
      (
        month,
      ) =>
        normalized.includes(
          month.toLowerCase(),
        ),
    ) ||
    !Number.isNaN(
      new Date(
        value,
      ).getTime(),
    )
  );
}

function parseFacebookCreatedAt(
  value: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  const normalized =
    value
      .replace(
        /\u00a0/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  const lower =
    normalized.toLowerCase();

  const now =
    new Date();

  /*
   * just now / เมื่อสักครู่
   */
  if (
    lower.includes(
      "เมื่อสักครู่",
    ) ||
    lower.includes(
      "just now",
    )
  ) {
    return now;
  }

  /*
   * นาที
   */
  const minuteMatch =
    lower.match(
      /(\d+)\s*(นาที|min|mins|minute|minutes)/i,
    );

  if (minuteMatch) {
    return new Date(
      now.getTime() -
      Number(
        minuteMatch[1],
      ) *
      60 *
      1000,
    );
  }

  /*
   * ชั่วโมง
   */
  const hourMatch =
    lower.match(
      /(\d+)\s*(ชม\.?|ชั่วโมง|hr|hrs|hour|hours)/i,
    );

  if (hourMatch) {
    return new Date(
      now.getTime() -
      Number(
        hourMatch[1],
      ) *
      60 *
      60 *
      1000,
    );
  }

  /*
   * วัน
   */
  const dayMatch =
    lower.match(
      /(\d+)\s*(วัน|day|days)/i,
    );

  if (dayMatch) {
    return new Date(
      now.getTime() -
      Number(
        dayMatch[1],
      ) *
      24 *
      60 *
      60 *
      1000,
    );
  }

  /*
   * สัปดาห์
   */
  const weekMatch =
    lower.match(
      /(\d+)\s*(สัปดาห์|อาทิตย์|week|weeks)/i,
    );

  if (weekMatch) {
    return new Date(
      now.getTime() -
      Number(
        weekMatch[1],
      ) *
      7 *
      24 *
      60 *
      60 *
      1000,
    );
  }

  /*
   * เดือน
   *
   * ใช้ประมาณ 30 วัน
   * สำหรับ filtering เท่านั้น
   */
  const monthMatch =
    lower.match(
      /(\d+)\s*(เดือน|month|months)/i,
    );

  if (monthMatch) {
    return new Date(
      now.getTime() -
      Number(
        monthMatch[1],
      ) *
      30 *
      24 *
      60 *
      60 *
      1000,
    );
  }

  /*
   * รูปแบบไทย เช่น
   *
   * 5 สิงหาคม เวลา 14:30
   * 5 สิงหาคม 14:30
   * 5 ส.ค. เวลา 14:30
   * 5 สิงหาคม 2026 เวลา 14:30
   * 5 สิงหาคม 2569 เวลา 14:30
   */
  const thaiDate =
    parseThaiDate(
      normalized,
      now,
    );

  if (thaiDate) {
    return thaiDate;
  }

  /*
   * ISO หรือ date string มาตรฐาน
   */
  const parsed =
    new Date(
      normalized,
    );

  if (
    !Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return parsed;
  }

  return null;
}

function parseThaiDate(
  value: string,
  now: Date,
): Date | null {
  const escapedMonths =
    Object.keys(
      THAI_MONTHS,
    )
      .sort(
        (
          first,
          second,
        ) =>
          second.length -
          first.length,
      )
      .map(
        escapeRegExp,
      )
      .join("|");

  const regex =
    new RegExp(
      `(\\d{1,2})\\s+(${escapedMonths})(?:\\s+(\\d{4}))?(?:\\s*(?:เวลา)?\\s*(\\d{1,2})[:.]?(\\d{2})?)?`,
      "i",
    );

  const match =
    value.match(
      regex,
    );

  if (!match) {
    return null;
  }

  const day =
    Number(
      match[1],
    );

  const monthName =
    match[2];

  const month =
    getThaiMonthIndex(
      monthName,
    );

  if (
    month === null ||
    !Number.isInteger(
      day,
    ) ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  let year =
    match[3]
      ? Number(
        match[3],
      )
      : now.getFullYear();

  /*
   * พ.ศ. → ค.ศ.
   */
  if (
    year >
    2400
  ) {
    year -= 543;
  }

  const hour =
    match[4]
      ? Number(
        match[4],
      )
      : 0;

  const minute =
    match[5]
      ? Number(
        match[5],
      )
      : 0;

  let result =
    new Date(
      year,
      month,
      day,
      hour,
      minute,
      0,
      0,
    );

  /*
   * Facebook บางครั้งไม่แสดงปี
   *
   * เช่นวันนี้ต้นปี แต่โพสต์เป็น
   * "31 ธันวาคม"
   *
   * ถ้า parse แล้วกลายเป็นอนาคตเกิน 7 วัน
   * ให้ถือว่าเป็นปีที่แล้ว
   */
  if (
    !match[3] &&
    result.getTime() >
    now.getTime() +
    7 *
    24 *
    60 *
    60 *
    1000
  ) {
    result =
      new Date(
        year - 1,
        month,
        day,
        hour,
        minute,
        0,
        0,
      );
  }

  if (
    Number.isNaN(
      result.getTime(),
    )
  ) {
    return null;
  }

  return result;
}

function getThaiMonthIndex(
  value: string,
): number | null {
  const normalized =
    value.trim();

  const direct =
    THAI_MONTHS[
    normalized
    ];

  if (
    direct !==
    undefined
  ) {
    return direct;
  }

  const key =
    Object.keys(
      THAI_MONTHS,
    ).find(
      (
        month,
      ) =>
        month.toLowerCase() ===
        normalized.toLowerCase(),
    );

  if (!key) {
    return null;
  }

  return THAI_MONTHS[
    key
  ];
}

function escapeRegExp(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function createPostId(
  article: HTMLElement,
  postUrl: string | null,
  text: string,
): string {
  if (postUrl) {
    return postUrl;
  }

  const existingId =
    article.dataset
      .hrAtsPostId;

  if (existingId) {
    return existingId;
  }

  let hash =
    0;

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

  const createdAt =
    getCreatedAt(
      article,
    );

  const parsedCreatedAt =
    parseFacebookCreatedAt(
      createdAt,
    );

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

    /*
     * ค่าดิบจาก Facebook
     *
     * เช่น "3 วัน"
     */
    createdAt,

    /*
     * ค่า normalized สำหรับ filtering
     *
     * เช่น
     * 2026-08-05T14:00:00.000Z
     */
    createdAtDate:
      parsedCreatedAt
        ? parsedCreatedAt.toISOString()
        : null,
  };
}