import https from "node:https";
import { google, type people_v1 } from "googleapis";
import { getAuthenticatedClient } from "../auth/gmailSession";

type PeopleClient = people_v1.People;
type AuthClient = NonNullable<Awaited<ReturnType<typeof getAuthenticatedClient>>>;

const photoCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const indexedUrls = new Map<string, string>();

let selfEmails: Set<string> | null = null;
let selfPhotoUrl: string | null | undefined;
let warmedUp = false;
let indexPromise: Promise<void> | null = null;
let indexComplete = false;

export function clearGmailPhotoCache() {
  photoCache.clear();
  inflight.clear();
  indexedUrls.clear();
  selfEmails = null;
  selfPhotoUrl = undefined;
  warmedUp = false;
  indexPromise = null;
  indexComplete = false;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isPlaceholderPhoto(url: string) {
  return /default-user|default[-_]profile|anonymous/i.test(url);
}

function photoUrlFromPerson(person: people_v1.Schema$Person | undefined) {
  const photos = person?.photos ?? [];
  const chosen =
    photos.find((photo) => photo.url && !isPlaceholderPhoto(photo.url)) ??
    photos.find((photo) => photo.url);

  if (!chosen?.url || isPlaceholderPhoto(chosen.url)) {
    return null;
  }

  return chosen.url;
}

function personEmails(person: people_v1.Schema$Person | undefined) {
  return (person?.emailAddresses ?? [])
    .map((entry) => normalizeEmail(entry.value ?? ""))
    .filter((email) => email.includes("@"));
}

function ingestPeople(people: people_v1.Schema$Person[] | undefined) {
  for (const person of people ?? []) {
    const url = photoUrlFromPerson(person);
    if (!url) {
      continue;
    }

    for (const email of personEmails(person)) {
      if (!indexedUrls.has(email)) {
        indexedUrls.set(email, url);
      }
    }
  }
}

function personFromSearch(
  results: people_v1.Schema$SearchResult[] | undefined
) {
  return (results ?? [])
    .map((result) => result.person)
    .filter((person): person is people_v1.Schema$Person => Boolean(person));
}

function matchPerson(people: people_v1.Schema$Person[], email: string) {
  return people.find((person) => personEmails(person).includes(email));
}

function profileResourceName(person: people_v1.Schema$Person | undefined) {
  const sources = person?.metadata?.sources ?? [];
  const profile = sources.find((source) => source.type === "PROFILE" && source.id);
  return profile?.id ? `people/${profile.id}` : null;
}

const PHOTO_HOST =
  /(^|\.)(googleusercontent\.com|ggpht\.com|google\.com|googleapis\.com)$/i;

function downloadPhoto(
  urlString: string,
  redirects = 0
): Promise<{ mime: string; bytes: Buffer }> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error("Too many photo redirects"));
      return;
    }

    let url: URL;
    try {
      url = new URL(urlString);
    } catch {
      reject(new Error("Invalid photo URL"));
      return;
    }

    if (url.protocol !== "https:" || !PHOTO_HOST.test(url.hostname)) {
      reject(new Error("Unexpected photo host"));
      return;
    }

    const request = https.get(
      url,
      {
        headers: { Accept: "image/*" },
        timeout: 10_000,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location) {
          response.resume();
          downloadPhoto(new URL(location, url).toString(), redirects + 1).then(
            resolve,
            reject
          );
          return;
        }

        if (status !== 200) {
          response.resume();
          reject(new Error(`Photo fetch failed (${status})`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk) => {
          chunks.push(chunk as Buffer);
        });
        response.on("end", () => {
          const mime = (
            response.headers["content-type"] ?? "image/jpeg"
          ).split(";")[0];
          resolve({ mime, bytes: Buffer.concat(chunks) });
        });
        response.on("error", reject);
      }
    );

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error("Photo fetch timed out"));
    });
  });
}

async function materializePhoto(url: string): Promise<string | null> {
  try {
    const { mime, bytes } = await downloadPhoto(url);
    if (!mime.startsWith("image/")) {
      return null;
    }
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch (error) {
    console.warn("Gmail photo: download failed", asErrorMessage(error));
    return null;
  }
}

async function warmupSearch(people: PeopleClient) {
  if (warmedUp) {
    return;
  }

  warmedUp = true;
  await Promise.allSettled([
    people.people.searchContacts({
      query: "",
      readMask: "names,emailAddresses",
    }),
    people.otherContacts.search({
      query: "",
      readMask: "names,emailAddresses",
    }),
  ]);
}

async function loadSelf(people: PeopleClient, auth: AuthClient) {
  if (selfEmails && selfPhotoUrl !== undefined) {
    return;
  }

  selfEmails = new Set();
  selfPhotoUrl = null;

  try {
    const oauth2 = google.oauth2({ version: "v2", auth });
    const userinfo = await oauth2.userinfo.get();
    if (userinfo.data.email) {
      selfEmails.add(normalizeEmail(userinfo.data.email));
    }
    if (userinfo.data.picture && !isPlaceholderPhoto(userinfo.data.picture)) {
      selfPhotoUrl = userinfo.data.picture;
    }
  } catch (error) {
    console.warn("Gmail photo: userinfo failed", asErrorMessage(error));
  }

  try {
    const me = await people.people.get({
      resourceName: "people/me",
      personFields: "emailAddresses,photos",
    });
    for (const email of personEmails(me.data)) {
      selfEmails.add(email);
    }
    selfPhotoUrl = photoUrlFromPerson(me.data) ?? selfPhotoUrl;
  } catch (error) {
    console.warn("Gmail photo: people/me failed", asErrorMessage(error));
  }
}

async function buildPhotoIndex(people: PeopleClient) {
  if (indexComplete) {
    return;
  }

  let pageToken: string | undefined;
  try {
    do {
      const page = await people.people.connections.list({
        resourceName: "people/me",
        personFields: "emailAddresses,photos",
        pageSize: 200,
        pageToken,
      });
      ingestPeople(page.data.connections);
      pageToken = page.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    console.warn("Gmail photo: connections.list failed", asErrorMessage(error));
  }

  pageToken = undefined;
  try {
    do {
      const page = await people.otherContacts.list({
        readMask: "emailAddresses,names,photos",
        sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"],
        pageSize: 200,
        pageToken,
      });
      ingestPeople(page.data.otherContacts);
      pageToken = page.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    console.warn(
      "Gmail photo: otherContacts.list failed",
      asErrorMessage(error)
    );

    try {
      pageToken = undefined;
      do {
        const page = await people.otherContacts.list({
          readMask: "emailAddresses,names,photos",
          pageSize: 200,
          pageToken,
        });
        ingestPeople(page.data.otherContacts);
        pageToken = page.data.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (fallbackError) {
      console.warn(
        "Gmail photo: otherContacts.list fallback failed",
        asErrorMessage(fallbackError)
      );
    }
  }

  indexComplete = true;
}

async function ensurePhotoIndex(people: PeopleClient) {
  if (indexComplete) {
    return;
  }

  if (!indexPromise) {
    indexPromise = buildPhotoIndex(people).finally(() => {
      indexPromise = null;
    });
  }

  await indexPromise;
}

async function lookupRemoteUrl(
  people: PeopleClient,
  auth: AuthClient,
  email: string
): Promise<string | null> {
  await loadSelf(people, auth);

  if (selfEmails?.has(email) && selfPhotoUrl) {
    return selfPhotoUrl;
  }

  const indexed = indexedUrls.get(email);
  if (indexed) {
    return indexed;
  }

  await warmupSearch(people);

  try {
    const contacts = await people.people.searchContacts({
      query: email,
      readMask: "emailAddresses,photos,metadata",
      pageSize: 10,
    });
    const match = matchPerson(personFromSearch(contacts.data.results), email);
    const url = photoUrlFromPerson(match);
    if (url) {
      indexedUrls.set(email, url);
      return url;
    }
  } catch (error) {
    console.warn("Gmail photo: searchContacts failed", asErrorMessage(error));
  }

  try {
    const directory = await people.people.searchDirectoryPeople({
      query: email,
      readMask: "emailAddresses,photos",
      sources: [
        "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE",
        "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT",
      ],
      pageSize: 10,
    });
    const match = matchPerson(
      (directory.data.people ?? []).filter(
        (person): person is people_v1.Schema$Person => Boolean(person)
      ),
      email
    );
    const url = photoUrlFromPerson(match);
    if (url) {
      indexedUrls.set(email, url);
      return url;
    }
  } catch {
    // Consumer Gmail accounts do not have directory access.
  }

  try {
    const others = await people.otherContacts.search({
      query: email,
      readMask: "emailAddresses,names,metadata",
      pageSize: 10,
    });
    const match = matchPerson(personFromSearch(others.data.results), email);
    const resourceName =
      match?.resourceName?.startsWith("people/")
        ? match.resourceName
        : profileResourceName(match);

    if (resourceName) {
      const person = await people.people.get({
        resourceName,
        personFields: "emailAddresses,photos",
      });
      const url = photoUrlFromPerson(person.data);
      if (url) {
        indexedUrls.set(email, url);
        return url;
      }
    }
  } catch (error) {
    console.warn(
      "Gmail photo: otherContacts.search failed",
      asErrorMessage(error)
    );
  }

  await ensurePhotoIndex(people);
  return indexedUrls.get(email) ?? null;
}

function asErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

async function photoForEmail(email: string): Promise<string | null> {
  const cached = photoCache.get(email);
  if (cached !== undefined) {
    return cached;
  }

  const existing = inflight.get(email);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    try {
      const auth = await getAuthenticatedClient();
      if (!auth) {
        photoCache.set(email, null);
        return null;
      }

      const people = google.people({ version: "v1", auth });
      const url = await lookupRemoteUrl(people, auth, email);
      if (!url) {
        photoCache.set(email, null);
        return null;
      }

      const materialized = await materializePhoto(url);
      photoCache.set(email, materialized);
      return materialized;
    } catch (error) {
      console.warn("Gmail photo: lookup failed", email, asErrorMessage(error));
      photoCache.set(email, null);
      return null;
    } finally {
      inflight.delete(email);
    }
  })();

  inflight.set(email, request);
  return request;
}

export async function getGmailProfilePhotos(
  emails: string[]
): Promise<Record<string, string | null>> {
  const unique = [
    ...new Set(
      emails.map(normalizeEmail).filter((email) => email.includes("@"))
    ),
  ];

  const entries = await Promise.all(
    unique.map(async (email) => [email, await photoForEmail(email)] as const)
  );

  return Object.fromEntries(entries);
}
