import { ProfileType } from '@/contexts/ProfileContext';

// Profile image mapping — shared across navbar, sidebar, bottom nav, etc.
export const PROFILE_IMAGES: Record<ProfileType, string> = {
  JEUNESSE: '/profiles/jeunesse.png',
  FRENESIE: '/profiles/frenesie.png',
  NOCTURNE: '/profiles/nocturne.png',
};

// Small avatar component for sidebar/header reuse
export function SmallProfileAvatar({ type, className }: { type: ProfileType; className?: string }) {
  const imgSrc = PROFILE_IMAGES[type];
  return (
    <div className={`relative overflow-hidden rounded-lg ${className || 'w-7 h-7'}`}>
      <img src={imgSrc} alt="" className="w-full h-full object-cover" />
    </div>
  );
}
