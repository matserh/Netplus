'use client';
import { SectionPage } from '@/components/SectionPage';
import { Star } from 'lucide-react';
export default function TVTopRatedPage() {
  return <SectionPage title="Séries Mieux Notées" endpoint="/tv/top_rated" icon={<Star className="w-5 h-5 text-primary" />} />;
}
