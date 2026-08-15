'use client';
import { SectionPage } from '@/components/SectionPage';
import { Tv } from 'lucide-react';
export default function TVPopularPage() {
  return <SectionPage title="Séries Populaires" endpoint="/tv/popular" icon={<Tv className="w-5 h-5 text-primary" />} />;
}
