import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Counter from '@/components/counter/Counter';
import { useCounterStore } from '@/stores/counterStore';

// Mock data - replace with API
const getMockSection = (projectId: string, sectionId?: string) => ({
  projectId,
  projectTitle: 'Cozy Cable Cardigan',
  sectionId: sectionId || '2',
  sectionName: 'Body',
  currentRow: 45,
  totalRows: 120,
  instructions: [
    { row: 45, text: 'K2, *p2, k2; rep from * to end' },
    { row: 46, text: 'P2, *k2, p2; rep from * to end' },
    { row: 47, text: 'K2, *p2, k2; rep from * to end' },
  ],
});

export default function CounterPage() {
  const { id: projectId, sectionId } = useParams<{ id: string; sectionId?: string }>();
  const { setCurrentRow, setTotalRows, setInstructions, setActiveSection } = useCounterStore();

  useEffect(() => {
    if (!projectId) return;

    // Load section data
    const section = getMockSection(projectId, sectionId);
    
    setActiveSection(section.sectionId);
    setCurrentRow(section.currentRow);
    setTotalRows(section.totalRows);
    
    // Set current instruction
    const currentInstruction = section.instructions.find(
      (i) => i.row === section.currentRow
    );
    const nextInstruction = section.instructions.find(
      (i) => i.row === section.currentRow + 1
    );
    
    setInstructions(
      currentInstruction?.text || null,
      nextInstruction?.text || null
    );
  }, [projectId, sectionId, setActiveSection, setCurrentRow, setTotalRows, setInstructions]);

  if (!projectId) return null;

  const section = getMockSection(projectId, sectionId);

  return (
    <Counter
      projectId={projectId}
      projectTitle={section.projectTitle}
      sectionName={section.sectionName}
    />
  );
}


