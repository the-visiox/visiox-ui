import React from 'react';
import DatasetDetailClient from './DatasetDetailClient';

export default async function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DatasetDetailClient id={id} />;
}
