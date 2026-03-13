export default function PatternDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-content-default">Pattern {params.id}</h1>
    </div>
  )
}
