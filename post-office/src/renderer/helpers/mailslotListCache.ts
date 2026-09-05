import type { EmailPage } from "../../types/email";

const pages = new Map<string, EmailPage>();

export function mailslotListCacheKey(
  mailslotId: string,
  page: number,
  pageSize: number,
  query: string
) {
  return `${mailslotId}:${page}:${pageSize}:${query}`;
}

export function readMailslotListCache(
  mailslotId: string,
  page: number,
  pageSize: number,
  query: string
): EmailPage | undefined {
  return pages.get(mailslotListCacheKey(mailslotId, page, pageSize, query));
}

export function writeMailslotListCache(
  mailslotId: string,
  result: EmailPage,
  query: string
) {
  pages.set(
    mailslotListCacheKey(mailslotId, result.page, result.pageSize, query),
    result
  );
}

export function invalidateMailslotListCache() {
  pages.clear();
}
