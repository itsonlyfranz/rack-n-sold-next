import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { EditArtworkForm } from '../../edit-artwork-form';
import { Metadata } from 'next';

type EditArtworkPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata(props: EditArtworkPageProps): Promise<Metadata> {
  // Use Promise.resolve to ensure we have an async boundary
  const params = await Promise.resolve(props.params);
  const id = params.id;
  
  return {
    title: `Edit Artwork ${id} - Rack N Sold`,
    description: 'Edit your artwork',
  };
}

export default async function EditArtworkPage(props: EditArtworkPageProps) {
  // Use Promise.resolve to ensure we have an async boundary
  const params = await Promise.resolve(props.params);
  const id = params.id;
  
  if (!id) {
    return notFound();
  }
  
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20">
        <div className="container mx-auto px-4 py-8 relative max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 bg-clip-text text-transparent">
              Edit Artwork
            </h1>
          </div>
          <EditArtworkForm id={id} />
        </div>
      </div>
    </MainLayout>
  );
} 