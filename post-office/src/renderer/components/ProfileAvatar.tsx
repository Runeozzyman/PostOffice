import { useEffect, useState } from "react";

interface ProfileAvatarProps {
  email: string;
  name: string;
  photoUrl?: string | null;
}

function initials(name: string, email: string) {
  const source =
    name.trim() && name.trim().toLowerCase() !== email.toLowerCase()
      ? name.trim()
      : email.split("@")[0] ?? "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase();
}

function hueForEmail(email: string) {
  let hash = 0;
  for (const character of email) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
}

export default function ProfileAvatar({
  email,
  name,
  photoUrl,
}: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  const showPhoto = Boolean(photoUrl) && !failed;
  const hue = hueForEmail(email.toLowerCase());

  return (
    <span
      className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: `hsl(${hue} 42% 42%)` }}
      title={email}
    >
      {showPhoto ? (
        <img
          src={photoUrl ?? undefined}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name, email)
      )}
    </span>
  );
}
