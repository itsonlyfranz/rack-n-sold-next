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
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Edit Artwork</h1>
        <EditArtworkForm id={id} />
      </div>
    </MainLayout>
  );
} 