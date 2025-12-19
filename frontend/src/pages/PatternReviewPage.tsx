import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Save, Edit2, Check, X, ChevronLeft, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle, Loader2, GripVertical, Repeat, Plus, Trash2
} from 'lucide-react';
import { Button, Card, Text, Heading, Badge, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import KnittingGlossary from '@/components/pattern/KnittingGlossary';

interface PatternRow {
  row_number: number;
  row_label?: string;
  instruction: string;
  stitch_counts?: string;
  notes?: string;
  instruction_type?: string;
  // Repeat fields
  is_repeat_start?: boolean;
  is_repeat_end?: boolean;
  repeat_count?: number;
  repeat_group_id?: string;
}

interface PatternSection {
  name: string;
  section_type: string;
  display_order: number;
  rows: PatternRow[];
}

interface ParsedPattern {
  title: string;
  description?: string;
  designer?: string; // Original pattern designer/creator (e.g., "petiteknits")
  craft_type: string;
  garment_type?: string;
  difficulty?: string;
  gauge?: {
    stitches_per_10cm?: number;
    rows_per_10cm?: number;
    needle_size_mm?: number;
    yarn_weight?: string;
  };
  sizes: Array<{ name: string; display_order: number; measurements: Record<string, string> }>;
  sizingChart?: {
    measurements: Array<{ label: string; key: string }>;
    sizes: Record<string, Record<string, string>>;
  };
  sections: PatternSection[];
  parsing_confidence?: number;
  // Source and purchase information
  purchase_url?: string;
  shop_name?: string;
  store_name?: string;
  source_platform?: string;
  ravelry_pattern_id?: number;
  etsy_listing_id?: string;
  // Copyright and redistribution rights
  has_copyright_protection?: boolean;
  copyright_text?: string;
}

// Calculate total rows including repeats
function calculateTotalRows(rows: PatternRow[]): number {
  let total = 0;
  let inRepeatGroup = false;
  let repeatGroupRows: PatternRow[] = [];
  let repeatCount = 1;

  for (const row of rows) {
    if (row.is_repeat_start) {
      inRepeatGroup = true;
      repeatGroupRows = [row];
      repeatCount = row.repeat_count || 1;
    } else if (row.is_repeat_end && inRepeatGroup) {
      repeatGroupRows.push(row);
      total += repeatGroupRows.length * repeatCount;
      inRepeatGroup = false;
      repeatGroupRows = [];
    } else if (inRepeatGroup) {
      repeatGroupRows.push(row);
    } else {
      total += 1;
    }
  }

  // Handle case where repeat group doesn't have an end marker
  if (inRepeatGroup && repeatGroupRows.length > 0) {
    total += repeatGroupRows.length * repeatCount;
  }

  return total;
}

// Sortable Section Component
function SortableSection({
  section,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  isEditing,
}: {
  section: PatternSection;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<PatternSection>) => void;
  onDelete: () => void;
  isEditing: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingSectionName, setEditingSectionName] = useState(false);
  const [sectionName, setSectionName] = useState(section.name);
  const [showRepeatDialog, setShowRepeatDialog] = useState<number | null>(null);
  const [repeatCount, setRepeatCount] = useState<number>(1);

  const totalRows = calculateTotalRows(section.rows);
  
  // Get repeat group info for display
  const getRepeatGroupInfo = (rowIndex: number) => {
    const row = section.rows[rowIndex];
    if (!row.repeat_group_id) return null;
    
    const groupRows = section.rows.filter(r => r.repeat_group_id === row.repeat_group_id);
    const startRow = groupRows.find(r => r.is_repeat_start);
    const repeatCount = startRow?.repeat_count || 1;
    const rowLabels = groupRows.map(r => r.row_label || `Row ${section.rows.findIndex(row => row === r) + 1}`);
    
    return {
      rowLabels,
      repeatCount,
      groupId: row.repeat_group_id,
      isStart: row.is_repeat_start,
    };
  };

  const handleUpdateRow = (rowIndex: number, updates: Partial<PatternRow>) => {
    const newRows = [...section.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], ...updates };
    onUpdate({ rows: newRows });
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newRows = section.rows.filter((_, i) => i !== rowIndex);
    onUpdate({ rows: newRows });
  };

  const handleSetRepeat = (startIndex: number, endIndex: number, count: number) => {
    const newRows = [...section.rows];
    const groupId = `repeat-${section.name}-${Date.now()}`;
    
    // Mark start row
    newRows[startIndex] = {
      ...newRows[startIndex],
      is_repeat_start: true,
      repeat_count: count,
      repeat_group_id: groupId,
    };
    
    // Mark end row
    newRows[endIndex] = {
      ...newRows[endIndex],
      is_repeat_end: true,
      repeat_count: count,
      repeat_group_id: groupId,
    };
    
    // Mark all rows in between
    for (let i = startIndex + 1; i < endIndex; i++) {
      newRows[i] = {
        ...newRows[i],
        repeat_group_id: groupId,
      };
    }
    
    onUpdate({ rows: newRows });
    setShowRepeatDialog(null);
  };

  const handleRemoveRepeat = (groupId: string) => {
    const newRows = section.rows.map(row => {
      if (row.repeat_group_id === groupId) {
        const { is_repeat_start, is_repeat_end, repeat_count, repeat_group_id, ...rest } = row;
        return rest;
      }
      return row;
    });
    onUpdate({ rows: newRows });
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-border-default rounded-lg overflow-hidden bg-surface">
      <div className="flex items-center gap-2 p-4 hover:bg-background-subtle transition-colors">
        {isEditing && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-content-muted hover:text-content-default">
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-background-muted flex items-center justify-center">
              <Text variant="label-xs">{index + 1}</Text>
            </div>
            {editingSectionName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  onBlur={() => {
                    onUpdate({ name: sectionName });
                    setEditingSectionName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onUpdate({ name: sectionName });
                      setEditingSectionName(false);
                    }
                    if (e.key === 'Escape') {
                      setSectionName(section.name);
                      setEditingSectionName(false);
                    }
                  }}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onUpdate({ name: sectionName });
                    setEditingSectionName(false);
                  }}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text variant="body-sm" className="font-medium">{section.name}</Text>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSectionName(true);
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Text variant="body-xs" color="muted">
                  {totalRows} rows • {section.section_type}
                </Text>
              </div>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-content-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-content-muted" />
          )}
        </button>

        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-status-error hover:text-status-error hover:bg-status-error-subtle"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto"
        >
          {(() => {
            // Group rows by repeat groups
            const rendered: number[] = [];
            const rows: JSX.Element[] = [];
            
            section.rows.forEach((row, rowIdx) => {
              if (rendered.includes(rowIdx)) return;
              
              const repeatInfo = getRepeatGroupInfo(rowIdx);
              
              if (repeatInfo && row.is_repeat_start) {
                // This is a repeat group - render all rows in the group together
                const groupRows = section.rows.filter(r => r.repeat_group_id === row.repeat_group_id);
                const startIdx = section.rows.findIndex(r => r.repeat_group_id === row.repeat_group_id);
                
                rows.push(
                  <div key={`repeat-group-${repeatInfo.groupId}`} className="space-y-2">
                    {/* Repeat Group Header */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-coral-50 dark:bg-coral-950/20 rounded-lg border-2 border-coral-300 dark:border-coral-700">
                      <Repeat className="w-4 h-4 text-coral-600 dark:text-coral-400 flex-shrink-0" />
                      <Text variant="label-sm" className="text-coral-700 dark:text-coral-300 font-medium">
                        {section.name} {repeatInfo.rowLabels.join(' ')} (repeat {repeatInfo.repeatCount}×)
                      </Text>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRepeat(repeatInfo.groupId)}
                          className="ml-auto text-status-error hover:text-status-error p-0 h-auto"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Grouped Rows - all rows in the repeat group */}
                    <div className="pl-4 space-y-2 border-l-2 border-coral-300 dark:border-coral-700">
                      {groupRows.map((groupRow, groupRowIdx) => {
                        const actualIdx = section.rows.findIndex(r => r === groupRow);
                        rendered.push(actualIdx);
                        
                        return (
                          <EditableRow
                            key={actualIdx}
                            row={groupRow}
                            rowIndex={actualIdx}
                            onUpdate={(updates) => handleUpdateRow(actualIdx, updates)}
                            onDelete={() => handleDeleteRow(actualIdx)}
                            isEditing={isEditing}
                            isInRepeatGroup={true}
                            isRepeatStart={groupRow.is_repeat_start}
                            isRepeatEnd={groupRow.is_repeat_end}
                            repeatCount={groupRow.repeat_count}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              } else {
                // Regular row - render individually
                rendered.push(rowIdx);
                rows.push(
                  <EditableRow
                    key={rowIdx}
                    row={row}
                    rowIndex={rowIdx}
                    onUpdate={(updates) => handleUpdateRow(rowIdx, updates)}
                    onDelete={() => handleDeleteRow(rowIdx)}
                    isEditing={isEditing}
                    onSetRepeatStart={() => {
                      setShowRepeatDialog(rowIdx);
                      setRepeatCount(1);
                    }}
                    isInRepeatGroup={false}
                    isRepeatStart={false}
                    isRepeatEnd={false}
                    repeatCount={undefined}
                  />
                );
              }
            });
            
            return rows;
          })()}

          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              fullWidth
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                const newRow: PatternRow = {
                  row_number: section.rows.length + 1,
                  row_label: `Row ${section.rows.length + 1}`,
                  instruction: '',
                };
                onUpdate({ rows: [...section.rows, newRow] });
              }}
            >
              Add Row
            </Button>
          )}

          {showRepeatDialog !== null && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRepeatDialog(null)}>
              <Card variant="elevated" padding="lg" className="w-80" onClick={(e) => e.stopPropagation()}>
                <Heading level={3} variant="heading-md" className="mb-4">Set Repeat</Heading>
                <Text variant="body-sm" color="muted" className="mb-4">
                  Select the end row and enter repeat count
                </Text>
                <div className="space-y-4">
                  <div>
                    <Text variant="label-sm" className="mb-2">Repeat Count</Text>
                    <Input
                      type="number"
                      min="1"
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {section.rows.slice(showRepeatDialog + 1).map((row, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSetRepeat(showRepeatDialog, showRepeatDialog + idx + 1, repeatCount)}
                        className="w-full text-left p-2 rounded-lg hover:bg-background-subtle border border-border-default"
                      >
                        <Text variant="body-xs">
                          {row.row_label || `Row ${row.row_number}`}: {row.instruction.slice(0, 50)}...
                        </Text>
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" onClick={() => setShowRepeatDialog(null)} fullWidth>
                    Cancel
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Editable Row Component
function EditableRow({
  row,
  rowIndex,
  onUpdate,
  onDelete,
  isEditing,
  onSetRepeatStart,
  isInRepeatGroup,
  isRepeatStart,
  isRepeatEnd,
  repeatCount,
}: {
  row: PatternRow;
  rowIndex: number;
  onUpdate: (updates: Partial<PatternRow>) => void;
  onDelete: () => void;
  isEditing: boolean;
  onSetRepeatStart?: () => void;
  isInRepeatGroup?: boolean;
  isRepeatStart?: boolean;
  isRepeatEnd?: boolean;
  repeatCount?: number;
}) {
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [rowData, setRowData] = useState(row);

  const handleSave = () => {
    onUpdate(rowData);
    setIsEditingRow(false);
  };

  if (isEditingRow) {
    return (
      <Card variant="filled" padding="sm" className="space-y-2">
        <Input
          label="Row Label"
          value={rowData.row_label || ''}
          onChange={(e) => setRowData({ ...rowData, row_label: e.target.value })}
          placeholder="e.g., Row 1, Rnd 3, Next row"
        />
        <textarea
          value={rowData.instruction}
          onChange={(e) => setRowData({ ...rowData, instruction: e.target.value })}
          placeholder="Instruction..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface text-content-default placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-coral-500 resize-none text-sm"
        />
        <Input
          label="Stitch Counts (optional)"
          value={rowData.stitch_counts || ''}
          onChange={(e) => setRowData({ ...rowData, stitch_counts: e.target.value })}
          placeholder="e.g., You should have 64 sts"
        />
        <Input
          label="Notes (optional)"
          value={rowData.notes || ''}
          onChange={(e) => setRowData({ ...rowData, notes: e.target.value })}
          placeholder="Additional notes..."
        />
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleSave}>
            <Check className="w-4 h-4 mr-1" /> Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setRowData(row);
            setIsEditingRow(false);
          }}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn(
      "p-3 bg-background-subtle rounded-lg border transition-all",
      isInRepeatGroup && "border-coral-200 dark:border-coral-800 bg-coral-50/30 dark:bg-coral-950/5",
      "group hover:bg-background-muted"
    )}>
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {row.row_label && (
              <Text variant="body-sm" className="font-mono font-medium text-content-default">
                {row.row_label}:
              </Text>
            )}
          </div>
          <Text variant="body-sm" color="subtle" className="leading-relaxed">
            {row.instruction}
          </Text>
          {row.stitch_counts && (
            <Text variant="body-xs" color="muted" className="italic mt-1">
              [Stitch count] {row.stitch_counts}
            </Text>
          )}
          {row.notes && (
            <Text variant="body-xs" color="muted" className="italic mt-1">
              [Note] {row.notes}
            </Text>
          )}
        </div>
        {isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingRow(true)}
              title="Edit row"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            {onSetRepeatStart && !isRepeatStart && !isInRepeatGroup && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSetRepeatStart}
                title="Set as repeat start"
              >
                <Repeat className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-status-error hover:text-status-error"
              title="Delete row"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatternReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialPattern = location.state?.pattern as ParsedPattern | undefined;

  if (!initialPattern) {
    navigate('/patterns/upload');
    return null;
  }

  const [pattern, setPattern] = useState<ParsedPattern>(initialPattern);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(pattern.sections.map(s => s.name))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPattern((prev) => {
        const oldIndex = prev.sections.findIndex((s) => s.name === active.id);
        const newIndex = prev.sections.findIndex((s) => s.name === over.id);

        const newSections = arrayMove(prev.sections, oldIndex, newIndex);
        // Update display_order
        newSections.forEach((section, idx) => {
          section.display_order = idx;
        });

        return { ...prev, sections: newSections };
      });
    }
  };

  const handleUpdateSection = (sectionName: string, updates: Partial<PatternSection>) => {
    setPattern((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.name === sectionName ? { ...s, ...updates } : s
      ),
    }));
  };

  const handleDeleteSection = (sectionName: string) => {
    setPattern((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.name !== sectionName),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const { patternApi } = await import('@/lib/api');
      console.log('Saving pattern:', { 
        title: pattern.title, 
        sections: pattern.sections.length,
        totalRows: pattern.sections.reduce((sum, s) => sum + s.rows.length, 0),
        isEdited: isEditing // If user was in edit mode, mark as edited
      });
      
      // Mark pattern as edited if user made any changes
      const patternToSave = {
        ...pattern,
        _isEdited: isEditing // Internal flag to indicate user made edits
      };
      
      const result = await patternApi.saveParsedPattern(patternToSave);
      
      console.log('Pattern saved successfully:', result);
      
      navigate('/patterns', {
        state: { message: 'Pattern saved successfully!', patternId: result.id },
      });
    } catch (err: any) {
      console.error('Save error details:', err);
      const errorMessage = err?.message || err?.data?.message || 'Failed to save pattern. Please check the console for details.';
      setSaveError(errorMessage);
      
      // Log full error for debugging
      if (err?.status) {
        console.error('API Error Status:', err.status);
        console.error('API Error Data:', err.data);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen-safe bg-background px-4 py-6 pb-safe">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ChevronLeft className="w-5 h-5" />}
          onClick={() => navigate('/patterns/upload')}
        >
          Back
        </Button>
        <Heading level={1} variant="display-xs" className="flex-1">
          Review Pattern
        </Heading>
        <Button
          variant={isEditing ? "outline" : "ghost"}
          size="sm"
          leftIcon={<Edit2 className="w-4 h-4" />}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Done Editing' : 'Edit'}
        </Button>
      </div>

      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card variant="success" padding="md" className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-status-success flex-shrink-0" />
          <div className="flex-1">
            <Text variant="body-sm" className="text-status-success font-medium">
              Pattern parsed successfully!
            </Text>
            {pattern.parsing_confidence && (
              <Text variant="body-xs" className="text-status-success/80 mt-1">
                Confidence: {(pattern.parsing_confidence * 100).toFixed(0)}%
              </Text>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Save Error */}
      {saveError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card variant="error" padding="md" className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-status-error flex-shrink-0" />
            <Text variant="body-sm" className="text-status-error">{saveError}</Text>
          </Card>
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <Card variant="elevated" padding="lg">
          <div className="mb-4">
            <Heading level={2} variant="heading-lg" className="mb-1">
              {pattern.title}
              {pattern.designer && (
                <Text variant="body-md" color="muted" className="mt-1">
                  by {pattern.designer}
                </Text>
              )}
            </Heading>
            {isEditing && (
              <div className="mt-3">
                <Input
                  label="Designer/Creator"
                  value={pattern.designer || ''}
                  onChange={(e) => setPattern(prev => ({ ...prev, designer: e.target.value }))}
                  placeholder="e.g., petiteknits, Tin Can Knits"
                />
                
                {/* Purchase and Source Information */}
                <div className="mt-4 space-y-3 pt-4 border-t border-border-default">
                  <Text variant="label-sm" className="font-medium">Purchase & Source Information</Text>
                  
                  <Input
                    label="Purchase URL"
                    type="url"
                    placeholder="https://www.ravelry.com/patterns/library/..."
                    value={pattern.purchase_url || ''}
                    onChange={(e) => setPattern(prev => ({ ...prev, purchase_url: e.target.value }))}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Shop Name"
                      placeholder="e.g., Ravelry, Etsy"
                      value={pattern.shop_name || ''}
                      onChange={(e) => setPattern(prev => ({ ...prev, shop_name: e.target.value }))}
                    />
                    <Input
                      label="Store Name"
                      placeholder="Alternative store identifier"
                      value={pattern.store_name || ''}
                      onChange={(e) => setPattern(prev => ({ ...prev, store_name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Source Platform"
                      placeholder="ravelry, etsy, lovecrafts"
                      value={pattern.source_platform || ''}
                      onChange={(e) => setPattern(prev => ({ ...prev, source_platform: e.target.value }))}
                    />
                    <Input
                      label="Ravelry Pattern ID"
                      type="number"
                      placeholder="123456"
                      value={pattern.ravelry_pattern_id || ''}
                      onChange={(e) => setPattern(prev => ({ ...prev, ravelry_pattern_id: e.target.value ? parseInt(e.target.value) : undefined }))}
                    />
                  </div>
                  
                  <Input
                    label="Etsy Listing ID"
                    placeholder="1234567890"
                    value={pattern.etsy_listing_id || ''}
                    onChange={(e) => setPattern(prev => ({ ...prev, etsy_listing_id: e.target.value }))}
                  />
                  
                  {/* Copyright Protection Status */}
                  {pattern.has_copyright_protection !== undefined && (
                    <div className={cn(
                      "p-3 rounded-lg border mt-3",
                      pattern.has_copyright_protection 
                        ? "bg-status-warning-subtle border-status-warning" 
                        : "bg-status-success-subtle border-status-success"
                    )}>
                      <div className="flex items-start gap-2">
                        {pattern.has_copyright_protection ? (
                          <>
                            <AlertCircle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <Text variant="label-sm" className="text-status-warning font-medium">
                                Copyright Protection Detected
                              </Text>
                              <Text variant="body-xs" color="muted" className="mt-1">
                                This pattern cannot be made public due to copyright restrictions.
                              </Text>
                              {pattern.copyright_text && (
                                <Text variant="body-xs" color="muted" className="mt-2 italic">
                                  "{pattern.copyright_text.substring(0, 150)}..."
                                </Text>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <Text variant="label-sm" className="text-status-success font-medium">
                                No Copyright Protection Detected
                              </Text>
                              <Text variant="body-xs" color="muted" className="mt-1">
                                This pattern can be made public since no copyright restrictions were found.
                              </Text>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {pattern.description && (
            <Text variant="body-sm" color="subtle" className="mb-4">
              {pattern.description}
            </Text>
          )}
          <div className="flex flex-wrap gap-2">
            {pattern.difficulty && <Badge variant="warning">{pattern.difficulty}</Badge>}
            {pattern.garment_type && <Badge variant="default">{pattern.garment_type}</Badge>}
            {pattern.craft_type && <Badge variant="default">{pattern.craft_type}</Badge>}
          </div>
        </Card>

        {/* Sizing Chart */}
        {pattern.sizingChart && pattern.sizingChart.measurements && pattern.sizingChart.measurements.length > 0 && (
          <Card variant="elevated" padding="lg">
            <Heading level={2} variant="heading-lg" className="mb-4">Sizing Chart</Heading>
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="bg-background-muted border-b border-border">
                    <th className="sticky left-0 bg-background-muted px-3 py-2 text-left z-10">
                      <Text variant="label-xs" color="muted">Measurement</Text>
                    </th>
                    {Object.keys(pattern.sizingChart.sizes).map((size) => (
                      <th key={size} className="px-2 py-2 text-center min-w-[60px]">
                        <Text variant="label-xs" className="text-content-muted font-bold">{size}</Text>
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
                          <td key={size} className="px-2 py-2 text-center">
                            <Text variant="body-sm" className="text-content-default">
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
          </Card>
        )}

        {/* Knitting Glossary */}
        <KnittingGlossary 
          patternText={pattern.sections.map(s => 
            s.rows.map(r => r.instruction).join(' ')
          ).join(' ')}
        />

        {/* Gauge Info */}
        {pattern.gauge && (
          <Card variant="elevated" padding="lg">
            <Heading level={2} variant="heading-lg" className="mb-4">Gauge</Heading>
            <div className="space-y-2">
              {pattern.gauge.stitches_per_10cm && pattern.gauge.rows_per_10cm && (
                <Text variant="body-sm">
                  {pattern.gauge.stitches_per_10cm} sts × {pattern.gauge.rows_per_10cm} rows = 10cm
                </Text>
              )}
              {pattern.gauge.needle_size_mm && (
                <Text variant="body-sm" color="muted">
                  Needle size: {pattern.gauge.needle_size_mm}mm
                </Text>
              )}
              {pattern.gauge.yarn_weight && (
                <Text variant="body-sm" color="muted">
                  Yarn weight: {pattern.gauge.yarn_weight}
                </Text>
              )}
            </div>
          </Card>
        )}

        {/* Sections with Drag and Drop */}
        {pattern.sections && pattern.sections.length > 0 && (
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <Heading level={2} variant="heading-lg">Pattern Sections</Heading>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    const newSection: PatternSection = {
                      name: `Section ${pattern.sections.length + 1}`,
                      section_type: 'other',
                      display_order: pattern.sections.length,
                      rows: [],
                    };
                    setPattern((prev) => ({
                      ...prev,
                      sections: [...prev.sections, newSection],
                    }));
                    setExpandedSections((prev) => new Set([...prev, newSection.name]));
                  }}
                >
                  Add Section
                </Button>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pattern.sections.map((s) => s.name)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {pattern.sections.map((section, idx) => (
                    <SortableSection
                      key={section.name}
                      section={section}
                      index={idx}
                      isExpanded={expandedSections.has(section.name)}
                      onToggle={() => toggleSection(section.name)}
                      onUpdate={(updates) => handleUpdateSection(section.name, updates)}
                      onDelete={() => handleDeleteSection(section.name)}
                      isEditing={isEditing}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </Card>
        )}

        {/* Actions */}
        <div className="sticky bottom-0 bg-background pt-4 pb-safe border-t border-border-default">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/patterns/upload')}
              fullWidth
            >
              Upload Another
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={isSaving}
              disabled={isSaving}
              fullWidth
              leftIcon={isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            >
              {isSaving ? 'Saving...' : 'Save to Library'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
