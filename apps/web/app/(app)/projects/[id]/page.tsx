export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-content-default">Project {params.id}</h1>
    </div>
  )
}
