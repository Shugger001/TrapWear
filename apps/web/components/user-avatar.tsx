import { avatarTone, getAvatarInitials } from "@/lib/avatar";

export function UserAvatar(props: {
  name: string | null;
  email: string;
  size?: "sm" | "md";
}) {
  const initials = getAvatarInitials(props.name, props.email);
  const tone = avatarTone(props.email);
  const sizeClass = props.size === "sm" ? "h-8 w-8 text-xs" : "h-14 w-14 text-base";

  return (
    <span
      aria-label={`Profile avatar for ${props.email}`}
      className={`inline-flex ${sizeClass} items-center justify-center rounded-full border border-white/70 font-semibold shadow-sm ${tone}`}
    >
      {initials}
    </span>
  );
}
