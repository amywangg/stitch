'use client'

interface CraftStageProps {
  onSelectCraft: (craft: 'knitting' | 'crochet') => void
}

export default function CraftStage({ onSelectCraft }: CraftStageProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-content-default">Find your next project</h1>
        <p className="text-content-secondary">What are you in the mood for?</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <button
          onClick={() => onSelectCraft('knitting')}
          className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-surface border border-border-default hover:border-coral-500 hover:bg-coral-500/5 transition-all"
        >
          <span className="text-4xl">🧶</span>
          <span className="font-semibold text-content-default">Knitting</span>
        </button>
        <button
          onClick={() => onSelectCraft('crochet')}
          className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-surface border border-border-default hover:border-teal-500 hover:bg-teal-500/5 transition-all"
        >
          <span className="text-4xl">🪝</span>
          <span className="font-semibold text-content-default">Crochet</span>
        </button>
      </div>
    </div>
  )
}
