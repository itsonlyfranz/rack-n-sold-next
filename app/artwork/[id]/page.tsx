import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { ArtworkDetail } from '../../artwork/artwork-detail';
import { Metadata } from 'next';

type ArtworkPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata(props: ArtworkPageProps): Promise<Metadata> {
  // Use Promise.resolve to ensure we have an async boundary
  const params = await Promise.resolve(props.params);
  const id = params.id;
  
  return {
    title: `Artwork ${id} - Rack N Sold`,
    description: 'View artwork details',
  };
}

export default async function ArtworkPage(props: ArtworkPageProps) {
  // Use Promise.resolve to ensure we have an async boundary
  const params = await Promise.resolve(props.params);
  const id = params.id;
  
  if (!id) {
    return notFound();
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <ArtworkDetail id={id} />
      </div>
    </MainLayout>
  );
} 