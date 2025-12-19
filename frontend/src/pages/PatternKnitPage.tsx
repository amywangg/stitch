import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import KnitMode from '@/components/knitting/KnitMode';
import { Spinner, Text, Card } from '@/components/ui';

// Mock API - replace with actual API call
const fetchPattern = async (patternId: string) => {
  // TODO: Replace with actual API call
  // For now, return mock data structure matching the parsed pattern format
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    id: patternId,
    title: 'Sample Pattern',
    sizes: [
      { name: 'S', display_order: 0, measurements: {} },
      { name: 'M', display_order: 1, measurements: {} },
      { name: 'L', display_order: 2, measurements: {} },
    ],
    sizingChart: {
      measurements: [
        { label: 'Chest (inches)', key: 'chest' },
        { label: 'Length (inches)', key: 'length' },
      ],
      sizes: {
        S: { chest: '34', length: '22' },
        M: { chest: '38', length: '24' },
        L: { chest: '42', length: '26' },
      },
    },
    sections: [
      {
        name: 'Cast On',
        section_type: 'other',
        display_order: 0,
        rows: [
          {
            row_number: 1,
            row_label: 'Cast on',
            instruction: 'Cast on 120 stitches using long-tail method',
            stitch_counts: 'You should have 120 sts.',
          },
        ],
      },
      {
        name: 'Body',
        section_type: 'body',
        display_order: 1,
        rows: [
          {
            row_number: 1,
            row_label: 'Row 1',
            instruction: 'Knit across',
          },
          {
            row_number: 2,
            row_label: 'Row 2',
            instruction: 'Purl across',
            is_repeat_start: true,
            repeat_count: 20,
            repeat_group_id: 'body-repeat-1',
          },
          {
            row_number: 3,
            row_label: 'Row 3',
            instruction: 'Knit across',
            is_repeat_end: true,
            repeat_group_id: 'body-repeat-1',
          },
        ],
      },
    ],
  };
};

export default function PatternKnitPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pattern, setPattern] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Pattern ID is required');
      setLoading(false);
      return;
    }

    fetchPattern(id)
      .then((data) => {
        setPattern(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load pattern');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen-safe flex items-center justify-center bg-background">
        <div className="text-center">
          <Spinner size="lg" color="primary" />
          <Text variant="body-sm" color="muted" className="mt-4">
            Loading pattern...
          </Text>
        </div>
      </div>
    );
  }

  if (error || !pattern) {
    return (
      <div className="h-screen-safe flex items-center justify-center bg-background px-4">
        <Card variant="error" padding="lg">
          <Text variant="body-sm" className="text-status-error">
            {error || 'Pattern not found'}
          </Text>
        </Card>
      </div>
    );
  }

  return (
    <KnitMode
      pattern={pattern}
      onBack={() => navigate(`/patterns/${id}`)}
    />
  );
}


