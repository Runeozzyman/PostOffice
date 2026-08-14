import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/google";
import type { Email } from "../types/email";

function getHeader(
    headers: { name?: string | null; value?: string | null }[],
    name: string
): string {
    return (
        headers.find(
            (header) =>
                header.name?.toLowerCase() === name.toLowerCase()
        )?.value ?? ""
    );
}

export async function fetchRecentEmails(): Promise<Email[]> {
    const auth = await getAuthenticatedClient();

    if (!auth) {
        throw new Error("User is not authenticated.");
    }

    const gmail = google.gmail({
        version: "v1",
        auth,
    });

    const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
    });

    const messages = response.data.messages ?? [];

    console.log(`Found ${messages.length} messages.`);

    const emails: Email[] = [];

    for (const message of messages) {
        if (!message.id) {
            continue;
        }

        const response = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
        });

        const data = response.data;
        const headers = data.payload?.headers ?? [];

        const email: Email = {
            id: data.id ?? "",
            threadId: data.threadId ?? "",
            from: getHeader(headers, "From"),
            to: getHeader(headers, "To"),
            subject: getHeader(headers, "Subject"),
            date: getHeader(headers, "Date"),
            snippet: data.snippet ?? "",
        };

        emails.push(email);
    }

    console.log(emails);

    return emails;
}