export async function generateStaticParams() {
  // Support IDs 1 through 4 from the main datasets page, and a few common IDs
  return [
    { id: "1" },
    { id: "2" },
    { id: "3" },
    { id: "4" },
    { id: "Industrial-Defect-v2" },
    { id: "Safety-PPE-Monitor" },
  ];
}
