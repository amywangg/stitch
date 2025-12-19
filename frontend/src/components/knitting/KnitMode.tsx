import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Settings, CheckCircle, 
  ChevronDown, ChevronUp, Info, Repeat
} from 'lucide-react';
import { Button, Card, Text, Heading, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, IconButton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui';
import { cn } from '@/lib/utils';
import KnittingGlossary from '@/components/pattern/KnittingGlossary';

interface PatternRow {
  row_number: number;
  row_label?: string;
  instruction: string;
  stitch_counts?: string;
  notes?: string;
  is_repeat_start?: boolean;
  is_repeat_end?: boolean;
  repeat_count?: number;
  repeat_group_id?: string;
  size_id?: string; // Optional: if row is size-specific
}

interface PatternSection {
  name: string;
  section_type: string;
  display_order: number;
  rows: PatternRow[];
  size_specific_rows?: Record<string, PatternRow[]>; // Optional: size-specific row variants
}

interface PatternSize {
  name: string;
  display_order: number;
  measurements: Record<string, string>;
}

interface SizingChart {
  measurements: Array<{ label: string; key: string }>;
  sizes: Record<string, Record<string, string>>;
}

interface KnitModeProps {
  pattern: {
    id: string;
    title: string;
    sizes: PatternSize[];
    sizingChart?: SizingChart;
    sections: PatternSection[];
  };
  projectId?: string;
  onBack?: () => void;
}

// Calculate total rows including repeats
const calculateTotalRows = (sections: PatternSection[]): number => {
  let total = 0;
  for (const section of sections) {
    let i = 0;
    while (i < section.rows.length) {
      const row = section.rows[i];
      if (row.is_repeat_start && row.repeat_group_id && row.repeat_count) {
        const repeatEndIndex = section.rows.findIndex(
          (r, idx) => idx >= i && r.is_repeat_end && r.repeat_group_id === row.repeat_group_id
        );
        if (repeatEndIndex !== -1) {
          const repeatGroupLength = repeatEndIndex - i + 1;
          total += repeatGroupLength * row.repeat_count;
          i = repeatEndIndex + 1;
          continue;
        }
      }
      total += 1;
      i += 1;
    }
  }
  return total;
};

// Get current row instruction based on section progress
const getCurrentRowInstruction = (
  section: PatternSection,
  currentRowInSection: number
): PatternRow | null => {
  let rowIndex = 0;
  let actualRowCount = 0;

  while (rowIndex < section.rows.length) {
    const row = section.rows[rowIndex];
    
    if (row.is_repeat_start && row.repeat_group_id && row.repeat_count) {
      const repeatEndIndex = section.rows.findIndex(
        (r, idx) => idx >= rowIndex && r.is_repeat_end && r.repeat_group_id === row.repeat_group_id
      );
      if (repeatEndIndex !== -1) {
        const repeatGroupLength = repeatEndIndex - rowIndex + 1;
        const totalRepeatRows = repeatGroupLength * row.repeat_count;
        
        if (actualRowCount + totalRepeatRows >= currentRowInSection) {
          // Current row is within this repeat group
          const rowInRepeat = currentRowInSection - actualRowCount;
          const repeatNumber = Math.floor((rowInRepeat - 1) / repeatGroupLength) + 1;
          const rowInGroup = ((rowInRepeat - 1) % repeatGroupLength);
          return section.rows[rowIndex + rowInGroup];
        }
        
        actualRowCount += totalRepeatRows;
        rowIndex = repeatEndIndex + 1;
        continue;
      }
    }
    
    actualRowCount += 1;
    if (actualRowCount === currentRowInSection) {
      return row;
    }
    rowIndex += 1;
  }
  
  return null;
};

export default function KnitMode({ pattern, projectId, onBack }: KnitModeProps) {
  const [selectedSize, setSelectedSize] = useState<string>(pattern.sizes[0]?.name || '');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentRowInSection, setCurrentRowInSection] = useState(1);
  const [showSizingChart, setShowSizingChart] = useState(false);
  const [showSectionList, setShowSectionList] = useState(false);

  // Get current section with size-specific rows filtered
  const currentSection = useMemo(() => {
    const section = pattern.sections[currentSectionIndex];
    if (!section) return null;
    
    // If section has size-specific rows, use those; otherwise use default rows
    if (section.size_specific_rows && section.size_specific_rows[selectedSize]) {
      return {
        ...section,
        rows: section.size_specific_rows[selectedSize],
      };
    }
    
    // Filter rows by size_id if present, or use all rows if no size filtering
    const filteredRows = section.rows.filter(
      row => !row.size_id || row.size_id === selectedSize
    );
    
    return {
      ...section,
      rows: filteredRows,
    };
  }, [pattern.sections, currentSectionIndex, selectedSize]);
  
  const totalPatternRows = useMemo(() => {
    // Recalculate total rows based on current size selection
    return pattern.sections.reduce((total, section) => {
      let sectionRows = section.rows;
      
      // Use size-specific rows if available
      if (section.size_specific_rows && section.size_specific_rows[selectedSize]) {
        sectionRows = section.size_specific_rows[selectedSize];
      } else {
        // Filter by size_id
        sectionRows = section.rows.filter(
          row => !row.size_id || row.size_id === selectedSize
        );
      }
      
      return total + calculateTotalRows([{ ...section, rows: sectionRows }]);
    }, 0);
  }, [pattern.sections, selectedSize]);
  
  // Calculate total rows completed across all sections
  const totalRowsCompleted = useMemo(() => {
    let total = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      total += calculateTotalRows([pattern.sections[i]]);
    }
    total += currentRowInSection - 1;
    return total;
  }, [currentSectionIndex, currentRowInSection, pattern.sections]);

  // Get current row instruction
  const currentRowInstruction = useMemo(() => {
    if (!currentSection) return null;
    return getCurrentRowInstruction(currentSection, currentRowInSection);
  }, [currentSection, currentRowInSection]);

  // Calculate section total rows
  const sectionTotalRows = useMemo(() => {
    if (!currentSection) return 0;
    return calculateTotalRows([currentSection]);
  }, [currentSection]);

  // Auto-advance to next section when current section is complete
  useEffect(() => {
    if (currentSection && currentRowInSection > sectionTotalRows) {
      if (currentSectionIndex < pattern.sections.length - 1) {
        // Move to next section
        setCurrentSectionIndex(prev => prev + 1);
        setCurrentRowInSection(1);
      }
    }
  }, [currentRowInSection, sectionTotalRows, currentSectionIndex, pattern.sections.length, currentSection]);

  const handleIncrement = useCallback(() => {
    if (!currentSection) return;
    
    if (currentRowInSection < sectionTotalRows) {
      setCurrentRowInSection(prev => prev + 1);
    } else if (currentSectionIndex < pattern.sections.length - 1) {
      // Move to next section
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentRowInSection(1);
    }
  }, [currentSection, currentRowInSection, sectionTotalRows, currentSectionIndex, pattern.sections.length]);

  const handleDecrement = useCallback(() => {
    if (currentRowInSection > 1) {
      setCurrentRowInSection(prev => prev - 1);
    } else if (currentSectionIndex > 0) {
      // Move to previous section
      const prevSection = pattern.sections[currentSectionIndex - 1];
      const prevSectionTotal = calculateTotalRows([prevSection]);
      setCurrentSectionIndex(prev => prev - 1);
      setCurrentRowInSection(prevSectionTotal);
    }
  }, [currentRowInSection, currentSectionIndex, pattern.sections]);

  const handleSectionSelect = useCallback((sectionIndex: number) => {
    setCurrentSectionIndex(sectionIndex);
    setCurrentRowInSection(1);
    setShowSectionList(false);
  }, []);

  const progressPercentage = totalPatternRows > 0 
    ? Math.min((totalRowsCompleted / totalPatternRows) * 100, 100) 
    : 0;

  const isComplete = totalRowsCompleted >= totalPatternRows;

  return (
    <div className="h-screen-safe flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 pt-safe border-b border-border-default bg-surface">
        {onBack ? (
          <IconButton
            icon={<ChevronLeft className="w-5 h-5" />}
            aria-label="Back"
            variant="ghost"
            onClick={onBack}
          />
        ) : (
          <div />
        )}

        <div className="flex-1 text-center">
          <Text variant="label-sm" color="muted" className="truncate">{pattern.title}</Text>
          <Text variant="body-xs" color="muted">{currentSection?.name || 'No section'}</Text>
        </div>

        <div className="flex items-center gap-1">
          {pattern.sizingChart && (
            <IconButton
              icon={<Info className="w-5 h-5" />}
              aria-label="Show sizing chart"
              variant="ghost"
              onClick={() => setShowSizingChart(true)}
            />
          )}
          <IconButton
            icon={<Settings className="w-5 h-5" />}
            aria-label="Settings"
            variant="ghost"
            onClick={() => setShowSectionList(true)}
          />
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-background-subtle border-b border-border-default">
        <div className="flex items-center justify-between mb-1">
          <Text variant="label-xs" color="muted">
            Row {totalRowsCompleted + 1} of {totalPatternRows}
          </Text>
          <Text variant="label-xs" className="text-coral-600 dark:text-coral-400 font-semibold">
            {progressPercentage.toFixed(0)}%
          </Text>
        </div>
        <div className="w-full bg-background-muted rounded-full h-2">
          <motion.div
            className="bg-coral-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Content - Current Instruction */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Knitting Glossary - Collapsible */}
        <div className="mb-4">
          <KnittingGlossary 
            patternText={pattern.sections.map(s => 
              s.rows.map(r => r.instruction).join(' ')
            ).join(' ')}
          />
        </div>
        {currentRowInstruction ? (
          <motion.div
            key={`${currentSectionIndex}-${currentRowInSection}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card variant="elevated" padding="lg" className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="primary" size="md">
                  {currentRowInstruction.row_label || `Row ${currentRowInSection}`}
                </Badge>
                {currentRowInstruction.is_repeat_start && currentRowInstruction.repeat_count && (
                  <Badge variant="secondary" size="sm">
                    <Repeat className="w-3 h-3 mr-1" />
                    {currentRowInstruction.repeat_count}×
                  </Badge>
                )}
              </div>
              
              <Text variant="body-lg" className="mb-3 leading-relaxed">
                {currentRowInstruction.instruction}
              </Text>

              {currentRowInstruction.stitch_counts && (
                <div className="mt-3 pt-3 border-t border-border-default">
                  <Text variant="body-sm" color="muted" className="italic">
                    {currentRowInstruction.stitch_counts}
                  </Text>
                </div>
              )}

              {currentRowInstruction.notes && (
                <div className="mt-3 pt-3 border-t border-border-default">
                  <Text variant="body-sm" color="muted">
                    💡 {currentRowInstruction.notes}
                  </Text>
                </div>
              )}
            </Card>

            {/* Section Progress */}
            <Card variant="filled" padding="md" className="mb-4">
              <div className="flex items-center justify-between">
                <Text variant="body-sm" color="muted">
                  {currentSection?.name} Progress
                </Text>
                <Text variant="body-sm" className="font-semibold">
                  {currentRowInSection} / {sectionTotalRows}
                </Text>
              </div>
              <div className="w-full bg-background-muted rounded-full h-1.5 mt-2">
                <div
                  className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((currentRowInSection / sectionTotalRows) * 100, 100)}%` }}
                />
              </div>
            </Card>

            {/* Next Section Preview */}
            {currentSectionIndex < pattern.sections.length - 1 && 
             currentRowInSection >= sectionTotalRows - 2 && (
              <Card variant="secondary" padding="md">
                <Text variant="body-sm" color="muted" className="mb-1">
                  Next: {pattern.sections[currentSectionIndex + 1]?.name}
                </Text>
                <Text variant="body-xs" color="muted">
                  {pattern.sections[currentSectionIndex + 1]?.rows[0]?.instruction || 'Starting soon...'}
                </Text>
              </Card>
            )}
          </motion.div>
        ) : (
          <Card variant="elevated" padding="lg">
            <Text variant="body-sm" color="muted" className="text-center">
              {isComplete ? 'Pattern complete! 🎉' : 'No instruction available'}
            </Text>
          </Card>
        )}
      </div>

      {/* Counter Controls */}
      <div className="px-4 py-4 pb-safe border-t border-border-default bg-surface">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="xl"
            onClick={handleDecrement}
            disabled={currentRowInSection === 1 && currentSectionIndex === 0}
            leftIcon={<ChevronLeft className="w-6 h-6" />}
          >
            Previous
          </Button>

          <div className="flex flex-col items-center">
            <Text variant="heading-lg" className="font-mono">
              {currentRowInSection}
            </Text>
            <Text variant="label-xs" color="muted">
              of {sectionTotalRows}
            </Text>
          </div>

          <Button
            variant="primary"
            size="xl"
            onClick={handleIncrement}
            disabled={isComplete}
            rightIcon={<ChevronRight className="w-6 h-6" />}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Sizing Chart Dialog */}
      {pattern.sizingChart && (
        <Dialog open={showSizingChart} onOpenChange={setShowSizingChart}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sizing Chart</DialogTitle>
              <DialogDescription>
                Select your size to see measurements
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 mb-4">
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {pattern.sizes.map((size) => (
                    <SelectItem key={size.name} value={size.name}>
                      {size.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="bg-background-muted border-b border-border">
                    <th className="sticky left-0 bg-background-muted px-3 py-2 text-left z-10">
                      <Text variant="label-xs" color="muted">Measurement</Text>
                    </th>
                    {Object.keys(pattern.sizingChart.sizes).map((size) => (
                      <th
                        key={size}
                        className={cn(
                          'px-2 py-2 text-center min-w-[60px]',
                          selectedSize === size && 'bg-coral-50 dark:bg-coral-950'
                        )}
                      >
                        <Text
                          variant="label-xs"
                          className={selectedSize === size ? 'text-coral-600 dark:text-coral-400 font-bold' : 'text-content-muted'}
                        >
                          {size}
                        </Text>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pattern.sizingChart.measurements.map((measurement) => {
                    const hasValue = Object.values(pattern.sizingChart!.sizes).some(
                      (sizeData) => sizeData[measurement.key]
                    );
                    if (!hasValue) return null;

                    return (
                      <tr key={measurement.key} className="hover:bg-background-subtle transition-colors">
                        <td className="sticky left-0 bg-surface px-3 py-2 z-10">
                          <Text variant="body-sm" color="subtle">{measurement.label}</Text>
                        </td>
                        {Object.keys(pattern.sizingChart!.sizes).map((size) => (
                          <td
                            key={size}
                            className={cn(
                              'px-2 py-2 text-center',
                              selectedSize === size && 'bg-coral-50 dark:bg-coral-950'
                            )}
                          >
                            <Text
                              variant="body-sm"
                              className={cn(
                                selectedSize === size ? 'text-coral-600 dark:text-coral-400 font-semibold' : 'text-content-default'
                              )}
                            >
                              {pattern.sizingChart!.sizes[size]?.[measurement.key] || '-'}
                            </Text>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Section List Dialog */}
      <Dialog open={showSectionList} onOpenChange={setShowSectionList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pattern Sections</DialogTitle>
            <DialogDescription>
              Jump to any section
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {pattern.sections.map((section, idx) => {
              const sectionTotal = calculateTotalRows([section]);
              const isCurrent = idx === currentSectionIndex;
              
              return (
                <button
                  key={section.name}
                  onClick={() => handleSectionSelect(idx)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    isCurrent
                      ? 'border-coral-500 bg-coral-50 dark:bg-coral-950/20'
                      : 'border-border-default hover:bg-background-subtle'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Text variant="body-sm" className={isCurrent ? 'font-semibold text-coral-600 dark:text-coral-400' : ''}>
                        {section.name}
                      </Text>
                      <Text variant="body-xs" color="muted">
                        {sectionTotal} rows
                      </Text>
                    </div>
                    {isCurrent && <CheckCircle className="w-5 h-5 text-coral-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

