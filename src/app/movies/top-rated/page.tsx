'use client';
import { SectionPage } from '@/components/SectionPage';
import { Award } from 'lucide-react';
export default function MoviesTopRatedPage() {
  return <SectionPage title="Films Mieux Notés" endpoint="/movie/top_rated" icon={<Award className="w-5 h-5 text-primary" />} />;
}
