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

  // Netflix-style: header is FIXED at top, full black background,
  // extends under the native status bar via safe-area padding.
  // The status bar stays black (theme-color=#000000) so it's invisible.
  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-[#000000] transition-all duration-300"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          minHeight: 'calc(env(safe-area-inset-top, 0px) + 48px)',
        }}
      >
        {/* Subtle bottom border that appears on scroll — like Netflix */}
        <div className={`absolute bottom-0 left-0 right-0 h-px bg-white/10 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`} />
        <div className="flex items-center justify-between h-12 px-4">
          <Link href="/">
            <Logo />
          </Link>

          <HamburgerMenu genres={genres} onGenreSelect={onGenreSelect} onAIClick={onAIClick} />
        </div>
      </nav>

      {/* Spacer — must match the nav height so content starts below */}
      <div style={{ height: 'calc(env(safe-area-inset-top, 0px) + 48px)' }} />
    </>
  );
}
