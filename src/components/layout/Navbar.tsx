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
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#000000]/95 backdrop-blur-2xl' 
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
      }`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between h-12 px-4">
          <Link href="/">
            <Logo />
          </Link>

          <HamburgerMenu genres={genres} onGenreSelect={onGenreSelect} onAIClick={onAIClick} />
        </div>
      </nav>

      <div className="h-12" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }} />
    </>
  );
}
