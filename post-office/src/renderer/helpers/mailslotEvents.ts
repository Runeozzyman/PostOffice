export const MAILSLOTS_CHANGED_EVENT = "postoffice:mailslots-changed";

export function notifyMailslotsChanged() {
  window.dispatchEvent(new Event(MAILSLOTS_CHANGED_EVENT));
}
