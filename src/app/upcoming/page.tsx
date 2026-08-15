'use client';
import { SectionPage } from '@/components/SectionPage';
import { Calendar } from 'lucide-react';
export default function UpcomingPage() {
  return <SectionPage title="Prochainement" endpoint="/movie/upcoming?region=FR" icon={<Calendar className="w-5 h-5 text-primary" />} />;
}
