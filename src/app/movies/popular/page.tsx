'use client';
import { SectionPage } from '@/components/SectionPage';
import { Film } from 'lucide-react';
export default function MoviesPopularPage() {
  return <SectionPage title="Films Populaires" endpoint="/movie/popular" icon={<Film className="w-5 h-5 text-primary" />} />;
}
