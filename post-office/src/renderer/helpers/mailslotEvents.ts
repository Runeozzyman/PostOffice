import { invalidateMailslotListCache } from "./mailslotListCache";

export const MAILSLOTS_CHANGED_EVENT = "postoffice:mailslots-changed";

export function notifyMailslotsChanged() {
  invalidateMailslotListCache();
  window.dispatchEvent(new Event(MAILSLOTS_CHANGED_EVENT));
}
