import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfilePhotos } from '@/lib/profile-photo-store';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string;
  name: string;
  fallbackAvatar?: string;
  className?: string;
  fallbackClassName?: string;
}

export default function UserAvatar({ userId, name, fallbackAvatar, className, fallbackClassName }: UserAvatarProps) {
  const { getPhoto } = useProfilePhotos();
  const photo = getPhoto(userId);
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <Avatar className={cn('shrink-0', className)}>
      <AvatarImage src={photo || fallbackAvatar} className="object-cover" />
      <AvatarFallback className={cn('text-[9px] font-semibold', fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
