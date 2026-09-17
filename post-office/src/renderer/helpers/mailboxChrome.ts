const STORAGE_KEY = "postoffice.mailboxChromeCollapsed";

export function readMailboxChromeCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function storeMailboxChromeCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "on" : "off");
  } catch {
    // Ignore private-mode / quota failures.
  }
}
