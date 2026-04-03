import React from 'react';
import AnnotateClient from './AnnotateClient';

export default async function AnnotatePage({ params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  return <AnnotateClient id={id} imageId={imageId} />;
}
