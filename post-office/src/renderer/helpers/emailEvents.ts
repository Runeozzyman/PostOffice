import { invalidateMailslotListCache } from "./mailslotListCache";
import type { Email } from "../../types/email";

export const EMAILS_CHANGED_EVENT = "postoffice:emails-changed";
export const EMAIL_HIDDEN_EVENT = "postoffice:email-hidden";
export const EMAIL_MUTATED_EVENT = "postoffice:email-mutated";

export function notifyEmailsChanged() {
  invalidateMailslotListCache();
  window.dispatchEvent(new Event(EMAILS_CHANGED_EVENT));
}

export function notifyEmailHidden(emailId: string) {
  window.dispatchEvent(
    new CustomEvent(EMAIL_HIDDEN_EVENT, { detail: { emailId } })
  );
}

export function notifyEmailMutated(email: Email) {
  window.dispatchEvent(
    new CustomEvent(EMAIL_MUTATED_EVENT, { detail: { email } })
  );
}

