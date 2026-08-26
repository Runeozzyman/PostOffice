export const EMAILS_CHANGED_EVENT = "postoffice:emails-changed";
export const EMAIL_HIDDEN_EVENT = "postoffice:email-hidden";

export function notifyEmailsChanged() {
  window.dispatchEvent(new Event(EMAILS_CHANGED_EVENT));
}

export function notifyEmailHidden(emailId: string) {
  window.dispatchEvent(
    new CustomEvent(EMAIL_HIDDEN_EVENT, { detail: { emailId } })
  );
}

