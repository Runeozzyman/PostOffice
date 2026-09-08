# What is PostOffice?

PostOffice is a desktop mail client built with Electron that gives users a more customizable way to organize their email through user-defined mailboxes called Mailslots.

The goal of PostOffice is not to replace Gmail or reinvent the traditional email client. Instead, it focuses on providing a flexible interface for organizing email around the way individual users actually work.

Rather than relying entirely on folders, labels, and search, users can create Mailslots with their own filtering rules and have incoming messages automatically organized into the appropriate slots.

PostOffice is being developed with a focus on three core ideas:

- Customization: Users can define how their email is organized rather than relying on a fixed structure, and have the ability to customize their PostOffice's appearance.
- Local-first performance: Emails are stored locally so previously retrieved messages can be accessed without repeatedly making expensive API requests. This also means any sensitive information is not exposed.
- Desktop experience: A dedicated application provides a more controlled, convenient, and customizable environment than a traditional web-based mail client.

# How It Works

PostOffice uses the official Gmail API and services to connect with your personal Gmail account. Upon successful connection, PostOffice begins incrementally fetching emails in batches, and storing them in a local
SQLite database. Subsequent interactions can then query from the local database rather than making repeated API requests from the Gmail API.

This approach provides several benefits:

- Faster retrieval of previously synchronized messages
- Reduced reliance on repeated Gmail API requests
- Local querying and filtering of large mailboxes
- A foundation for more advanced organization and search features

New emails are fetched from the associated inbox every 20s, or upon a manual refresh by the user. For performance and low latency fetching, the associated inbox is only searched beginning from the index of the most
recently stored email, to avoid searching through potentially thousands of already stored emails.

## Screenshots

<p align="center">
  <img src="docs/p1.png" alt="Login" width="480" />
</p>
<p align="center"><em>Sign-in uses Google OAuth 2.0.</em></p>

---

<p align="center">
  <img src="docs/p2.png" alt="Mailslots" width="480" />
</p>
<p align="center"><em>Mailslots are custom mailboxes, each with its own color.</em></p>

---

<p align="center">
  <img src="docs/p3.png" alt="Create a mailslot" width="480" />
</p>
<p align="center"><em>Pick any RGB color and an icon when you create one.</em></p>

---

<p align="center">
  <img src="docs/p4_BLURTHIS.png" alt="Inbox" width="480" />
</p>
<p align="center"><em>Inbox mail is fetched from Gmail, ordered by arrival, and color-coded by mailslot. Open a mailslot to see only that mail.</em></p>

---

<p align="center">
  <img src="docs/p5.png" alt="Settings" width="480" />
</p>
<p align="center"><em>Themes, typography, and other preferences.</em></p>

## Tech Used

<p align="center">
  <img src="https://skillicons.dev/icons?i=ts,react,electron,sqlite,nodejs,tailwind,gmail" alt="TypeScript, React, Electron, SQLite, Tailwind CSS, and Gmail" />
</p>
