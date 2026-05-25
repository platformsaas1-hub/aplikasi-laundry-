import React from 'react';

interface UserAvatarProps {
  name: string;
  photoURL?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ name, photoURL, className = '', size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl'
  };

  const getInitials = (n: string) => {
    if (!n) return '??';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (n: string) => {
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-rose-600',
      'from-purple-500 to-pink-600',
      'from-fuchsia-500 to-violet-600',
      'from-sky-400 to-blue-600',
      'from-amber-500 to-orange-600',
      'from-indigo-500 to-purple-605'
    ];
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  if (photoURL && (photoURL.startsWith('http://') || photoURL.startsWith('https://') || photoURL.startsWith('data:'))) {
    return (
      <img 
        id={`avatar-img-${name.replace(/\s+/g, '-').toLowerCase()}`}
        src={photoURL} 
        alt={name} 
        referrerPolicy="no-referrer"
        className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200/60 shadow-xs flex-shrink-0 ${className}`}
      />
    );
  }

  const gradient = getAvatarGradient(name);
  const initials = getInitials(name);

  return (
    <div 
      id={`avatar-initials-${name.replace(/\s+/g, '-').toLowerCase()}`}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-extrabold text-white bg-gradient-to-tr ${gradient} shadow-xs border border-white/20 flex-shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
}
