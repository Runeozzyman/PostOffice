import { google } from "googleapis";
import { getAuthenticatedClient } from "../auth/google";

export async function fetchRecentEmails() {
    const auth = await getAuthenticatedClient();

    if (!auth) {
        throw new Error("User is not authenticated.");
    }

    const gmail = google.gmail({ //create Gmail API client
        version: "v1",
        auth,
    });

    const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
    });

    const messages = response.data.messages ?? [];

    console.log(`Found ${messages.length} messages.`);

    for (const message of messages) {
        console.log(message);
    }

    return messages;
}