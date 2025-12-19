import { motion } from 'framer-motion';
import { Card, Text, Badge } from '@/components/ui';

interface InstructionCardProps {
  instruction: string;
  rowNumber: number;
  rowLabel?: string;
}

export default function InstructionCard({
  instruction,
  rowNumber,
  rowLabel,
}: InstructionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card variant="elevated" padding="md">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                {rowLabel || `Row ${rowNumber}`}
              </Badge>
            </div>
            <Text variant="body-sm" color="subtle">
              {instruction}
            </Text>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
