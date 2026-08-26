import type { IconType } from "react-icons";
import {
  FiBox,
  FiBriefcase,
  FiBookmark,
  FiHeart,
  FiHome,
  FiSend,
  FiStar,
  FiTag,
} from "react-icons/fi";
import type { MailslotIcon } from "../../types/mailslot";

export const MAILSLOT_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0d9488",
  "#0891b2",
  "#4f46e5",
  "#57534e",
  "#1f2937",
];

export const MAILSLOT_ICONS: { id: MailslotIcon; icon: IconType }[] = [
  { id: "box", icon: FiBox },
  { id: "briefcase", icon: FiBriefcase },
  { id: "home", icon: FiHome },
  { id: "heart", icon: FiHeart },
  { id: "star", icon: FiStar },
  { id: "tag", icon: FiTag },
  { id: "send", icon: FiSend },
  { id: "bookmark", icon: FiBookmark },
];

export function mailslotIcon(id: MailslotIcon) {
  return MAILSLOT_ICONS.find((item) => item.id === id)?.icon ?? FiBox;
}
