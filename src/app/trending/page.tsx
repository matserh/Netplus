'use client';
import { SectionPage } from '@/components/SectionPage';
import { TrendingUp } from 'lucide-react';
export default function TrendingPage() {
  return <SectionPage title="Tendances" endpoint="/trending/all/week" icon={<TrendingUp className="w-5 h-5 text-primary" />} />;
}
