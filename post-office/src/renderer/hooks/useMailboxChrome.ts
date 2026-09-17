import { useCallback, useEffect, useState } from "react";
import {
  readMailboxChromeCollapsed,
  storeMailboxChromeCollapsed,
} from "../helpers/mailboxChrome";

export function useMailboxSearchSlot() {
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null);

  return {
    setSearchSlot,
    searchPortalEl: searchSlot,
  };
}

export function useMailboxChrome() {
  const search = useMailboxSearchSlot();
  const [collapsed, setCollapsed] = useState(readMailboxChromeCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current);
  }, []);

  useEffect(() => {
    storeMailboxChromeCollapsed(collapsed);
  }, [collapsed]);

  return {
    collapsed,
    toggleCollapsed,
    ...search,
  };
}
