export const DRAFTS_CHANGED_EVENT = "postoffice:drafts-changed";

export function notifyDraftsChanged() {
  window.dispatchEvent(new Event(DRAFTS_CHANGED_EVENT));
}
