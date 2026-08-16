'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Genre } from '@/types/media';
import { HamburgerMenu } from '@/components/ui/HamburgerMenu';

interface NavbarProps {
  genres: Genre[];
  onSearch: (query: string) => void;
  onGenreSelect: (genreId: string, genreName: string) => void;
  onAIClick: () => void;
}

export function Navbar({ genres, onSearch, onGenreSelect, onAIClick }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.3)]' 
          : 'bg-background/40 backdrop-blur-xl border-b border-white/[0.03]'
      }`}>
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/">
            <Logo />
          </Link>

          <HamburgerMenu genres={genres} onGenreSelect={onGenreSelect} onAIClick={onAIClick} />
        </div>
      </nav>

      <div className="h-16" />
    </>
  );
}
