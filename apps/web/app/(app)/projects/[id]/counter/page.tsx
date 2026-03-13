export default function CounterPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-content-default">Counter — Project {params.id}</h1>
    </div>
  )
}
