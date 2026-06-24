export async function generateStaticParams() {
  const datasetIds = ["1", "2", "3", "4"];
  const imageIds = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

  const params = [];
  for (const id of datasetIds) {
    for (const imageId of imageIds) {
      params.push({ id, imageId });
    }
  }
  return params;
}
