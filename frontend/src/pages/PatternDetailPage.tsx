import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Heart,
  Share,
  Play,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { Button, Card, Text, Heading, Badge, IconButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import KnittingGlossary from '@/components/pattern/KnittingGlossary';

// Mock data
// NOTE: The sizing chart is flexible and adapts to any item type.
// Examples:
// - Socks: Foot Length, Cuff Height, Foot Circumference
// - Mittens: Hand Length, Palm Width, Thumb Length
// - Shawls: Width, Length, Wingspan
// - Hats: Head Circumference, Crown Height, Brim Width
// - Cardigans/Sweaters: Chest, Length, Sleeve Length, etc.
// The component automatically displays whatever measurements are provided.

const pattern = {
  id: '1',
  title: 'Fireside Cardigan',
  designer: 'Tin Can Knits',
  description:
    'A cozy, seamless cardigan worked from the top down with a beautiful cable detail on the yoke.',
  difficulty: 'intermediate',
  category: 'Cardigan',
  sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  gauge: {
    stitches: 20,
    rows: 28,
    over: '10cm/4in',
    needle: '4.5mm',
  },
  yarn: {
    weight: 'Worsted',
    yardage: '1200-1800 yards',
    fiber: 'Wool or wool blend',
  },
  needles: ['4.5mm circular, 80cm', '4.5mm circular, 40cm', '4.5mm DPNs'],
  sections: [
    { id: '1', name: 'Yoke', rowCount: 80 },
    { id: '2', name: 'Body', rowCount: 120 },
    { id: '3', name: 'Sleeves', rowCount: 60 },
    { id: '4', name: 'Finishing', rowCount: 20 },
  ],
  sizingChart: {
    // Measurements array defines what to show - can be any measurement type
    measurements: [
      { label: 'Chest (inches)', key: 'chest' },
      { label: 'Chest (cm)', key: 'chestCm' },
      { label: 'Length (inches)', key: 'length' },
      { label: 'Length (cm)', key: 'lengthCm' },
      { label: 'Sleeve Length (inches)', key: 'sleeveLength' },
      { label: 'Sleeve Length (cm)', key: 'sleeveLengthCm' },
      { label: 'Yoke Depth (inches)', key: 'yokeDepth' },
      { label: 'Yoke Depth (cm)', key: 'yokeDepthCm' },
    ],
    // Sizes object contains values for each size - only include measurements that exist
    sizes: {
      XS: {
        chest: '32',
        chestCm: '81',
        length: '22',
        lengthCm: '56',
        sleeveLength: '16',
        sleeveLengthCm: '41',
        yokeDepth: '6',
        yokeDepthCm: '15',
      },
      S: {
        chest: '36',
        chestCm: '91',
        length: '23',
        lengthCm: '58',
        sleeveLength: '17',
        sleeveLengthCm: '43',
        yokeDepth: '6.5',
        yokeDepthCm: '16.5',
      },
      M: {
        chest: '40',
        chestCm: '102',
        length: '24',
        lengthCm: '61',
        sleeveLength: '18',
        sleeveLengthCm: '46',
        yokeDepth: '7',
        yokeDepthCm: '18',
      },
      L: {
        chest: '44',
        chestCm: '112',
        length: '25',
        lengthCm: '64',
        sleeveLength: '19',
        sleeveLengthCm: '48',
        yokeDepth: '7.5',
        yokeDepthCm: '19',
      },
      XL: {
        chest: '48',
        chestCm: '122',
        length: '26',
        lengthCm: '66',
        sleeveLength: '20',
        sleeveLengthCm: '51',
        yokeDepth: '8',
        yokeDepthCm: '20',
      },
      '2XL': {
        chest: '52',
        chestCm: '132',
        length: '27',
        lengthCm: '69',
        sleeveLength: '21',
        sleeveLengthCm: '53',
        yokeDepth: '8.5',
        yokeDepthCm: '21.5',
      },
      '3XL': {
        chest: '56',
        chestCm: '142',
        length: '28',
        lengthCm: '71',
        sleeveLength: '22',
        sleeveLengthCm: '56',
        yokeDepth: '9',
        yokeDepthCm: '23',
      },
    },
  },
};

/* 
Example sizing chart structures for different item types:

// SOCKS
sizingChart: {
  measurements: [
    { label: 'Foot Length (inches)', key: 'footLength' },
    { label: 'Foot Length (cm)', key: 'footLengthCm' },
    { label: 'Foot Circumference (inches)', key: 'footCirc' },
    { label: 'Foot Circumference (cm)', key: 'footCircCm' },
    { label: 'Cuff Height (inches)', key: 'cuffHeight' },
    { label: 'Cuff Height (cm)', key: 'cuffHeightCm' },
  ],
  sizes: {
    'Baby': { footLength: '4', footLengthCm: '10', footCirc: '4.5', footCircCm: '11.5', cuffHeight: '2', cuffHeightCm: '5' },
    'Toddler': { footLength: '5', footLengthCm: '13', footCirc: '5', footCircCm: '13', cuffHeight: '2.5', cuffHeightCm: '6' },
    'Child': { footLength: '6', footLengthCm: '15', footCirc: '6', footCircCm: '15', cuffHeight: '3', cuffHeightCm: '8' },
    'Adult S': { footLength: '9', footLengthCm: '23', footCirc: '8', footCircCm: '20', cuffHeight: '4', cuffHeightCm: '10' },
    'Adult M': { footLength: '10', footLengthCm: '25', footCirc: '9', footCircCm: '23', cuffHeight: '4', cuffHeightCm: '10' },
    'Adult L': { footLength: '11', footLengthCm: '28', footCirc: '10', footCircCm: '25', cuffHeight: '4', cuffHeightCm: '10' },
  },
}

// MITTENS
sizingChart: {
  measurements: [
    { label: 'Hand Length (inches)', key: 'handLength' },
    { label: 'Hand Length (cm)', key: 'handLengthCm' },
    { label: 'Palm Width (inches)', key: 'palmWidth' },
    { label: 'Palm Width (cm)', key: 'palmWidthCm' },
    { label: 'Thumb Length (inches)', key: 'thumbLength' },
    { label: 'Thumb Length (cm)', key: 'thumbLengthCm' },
  ],
  sizes: {
    'Child': { handLength: '5', handLengthCm: '13', palmWidth: '3', palmWidthCm: '8', thumbLength: '1.5', thumbLengthCm: '4' },
    'Adult S': { handLength: '6.5', handLengthCm: '17', palmWidth: '3.5', palmWidthCm: '9', thumbLength: '2', thumbLengthCm: '5' },
    'Adult M': { handLength: '7', handLengthCm: '18', palmWidth: '4', palmWidthCm: '10', thumbLength: '2.25', thumbLengthCm: '6' },
    'Adult L': { handLength: '7.5', handLengthCm: '19', palmWidth: '4.5', palmWidthCm: '11', thumbLength: '2.5', thumbLengthCm: '6' },
  },
}

// SHAWLS
sizingChart: {
  measurements: [
    { label: 'Width (inches)', key: 'width' },
    { label: 'Width (cm)', key: 'widthCm' },
    { label: 'Length (inches)', key: 'length' },
    { label: 'Length (cm)', key: 'lengthCm' },
    { label: 'Wingspan (inches)', key: 'wingspan' },
    { label: 'Wingspan (cm)', key: 'wingspanCm' },
  ],
  sizes: {
    'Small': { width: '48', widthCm: '122', length: '20', lengthCm: '51', wingspan: '60', wingspanCm: '152' },
    'Medium': { width: '56', widthCm: '142', length: '24', lengthCm: '61', wingspan: '72', wingspanCm: '183' },
    'Large': { width: '64', widthCm: '163', length: '28', lengthCm: '71', wingspan: '84', wingspanCm: '213' },
  },
}

// HATS
sizingChart: {
  measurements: [
    { label: 'Head Circumference (inches)', key: 'headCirc' },
    { label: 'Head Circumference (cm)', key: 'headCircCm' },
    { label: 'Crown Height (inches)', key: 'crownHeight' },
    { label: 'Crown Height (cm)', key: 'crownHeightCm' },
    { label: 'Brim Width (inches)', key: 'brimWidth' },
    { label: 'Brim Width (cm)', key: 'brimWidthCm' },
  ],
  sizes: {
    'Baby': { headCirc: '14', headCircCm: '36', crownHeight: '5', crownHeightCm: '13', brimWidth: '1', brimWidthCm: '2.5' },
    'Toddler': { headCirc: '16', headCircCm: '41', crownHeight: '6', crownHeightCm: '15', brimWidth: '1.5', brimWidthCm: '4' },
    'Child': { headCirc: '18', headCircCm: '46', crownHeight: '7', crownHeightCm: '18', brimWidth: '2', brimWidthCm: '5' },
    'Adult S': { headCirc: '20', headCircCm: '51', crownHeight: '8', crownHeightCm: '20', brimWidth: '2', brimWidthCm: '5' },
    'Adult M': { headCirc: '22', headCircCm: '56', crownHeight: '8.5', crownHeightCm: '22', brimWidth: '2.5', brimWidthCm: '6' },
    'Adult L': { headCirc: '24', headCircCm: '61', crownHeight: '9', crownHeightCm: '23', brimWidth: '2.5', brimWidthCm: '6' },
  },
}
*/

export default function PatternDetailPage() {
  const { id } = useParams();
  const [selectedSize, setSelectedSize] = useState('M');
  const [isFavorite, setIsFavorite] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen-safe bg-background">
      {/* Header image */}
      <header className="relative h-64 bg-gradient-to-br from-coral-500 to-teal-500">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pt-safe">
          <Link to="/patterns">
            <IconButton icon={<ChevronLeft />} aria-label="Back" variant="glass" />
          </Link>
          <div className="flex gap-2">
            <IconButton
              icon={<Heart className={cn(isFavorite && 'fill-current')} />}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              variant="glass"
              onClick={() => setIsFavorite(!isFavorite)}
            />
            <IconButton icon={<Share />} aria-label="Share" variant="glass" />
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl">🧶</span>
        </div>
      </header>

      {/* Pattern info */}
      <div className="px-4 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="elevated" padding="lg">
            <Heading level={1} variant="display-xs">{pattern.title}</Heading>
            {pattern.designer && (
              <Text color="muted" className="mt-1">by {pattern.designer}</Text>
            )}
            {/* Show purchase link if available */}
            {pattern.purchase_url && (
              <div className="mt-3">
                <a 
                  href={pattern.purchase_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
                >
                  <span>Purchase Pattern</span>
                  {pattern.shop_name && (
                    <span className="text-sm opacity-90">on {pattern.shop_name}</span>
                  )}
                </a>
              </div>
            )}

            <Text variant="body-sm" color="subtle" className="mt-4">
              {pattern.description}
            </Text>

            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="warning">{pattern.difficulty}</Badge>
              <Badge variant="default">{pattern.category}</Badge>
              <Badge variant="default">{pattern.yarn.weight}</Badge>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Size selector */}
      <div className="px-4 py-6">
        <Text variant="label-sm" color="muted" className="mb-3">Select Size</Text>
        <div className="flex flex-wrap gap-2">
          {pattern.sizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={cn(
                'w-12 h-12 rounded-xl font-bold transition-all',
                selectedSize === size
                  ? 'bg-coral-500 text-white shadow-primary'
                  : 'bg-surface border-2 border-border text-content-subtle hover:border-coral-300'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Sizing Chart */}
      {pattern.sizingChart && pattern.sizingChart.measurements && pattern.sizingChart.measurements.length > 0 && (
        <div className="px-4 pb-6">
          <Text variant="label-sm" color="muted" className="mb-3">Sizing Chart</Text>
          <Card variant="elevated" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-background-muted border-b border-border">
                    <th className="px-4 py-3 text-left sticky left-0 bg-background-muted z-10">
                      <Text variant="label-xs" color="muted">Measurement</Text>
                    </th>
                    {pattern.sizes.map((size) => (
                      <th
                        key={size}
                        className={cn(
                          'px-3 py-3 text-center min-w-[60px]',
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
                  {pattern.sizingChart.measurements.map((measurement, idx) => {
                    // Check if this measurement has any values across all sizes
                    const hasValues = pattern.sizes.some((size) => {
                      const sizeData = pattern.sizingChart?.sizes[size];
                      if (!sizeData) return false;
                      const value = sizeData[measurement.key as keyof typeof sizeData];
                      return value !== undefined && value !== null && value !== '';
                    });

                    // Only render rows that have at least one value
                    if (!hasValues) return null;

                    return (
                      <tr
                        key={measurement.key}
                        className={cn(
                          'hover:bg-background-subtle transition-colors',
                          idx % 2 === 0 && 'bg-background-subtle/50'
                        )}
                      >
                        <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                          <Text variant="body-sm" color="subtle">{measurement.label}</Text>
                        </td>
                        {pattern.sizes.map((size) => {
                          const sizeData = pattern.sizingChart?.sizes[size];
                          const value = sizeData?.[measurement.key as keyof typeof sizeData];
                          const displayValue = value !== undefined && value !== null && value !== '' ? String(value) : '-';
                          
                          return (
                            <td
                              key={size}
                              className={cn(
                                'px-3 py-3 text-center',
                                selectedSize === size && 'bg-coral-50 dark:bg-coral-950'
                              )}
                            >
                              <Text
                                variant="body-sm"
                                className={cn(
                                  selectedSize === size ? 'text-coral-600 dark:text-coral-400 font-semibold' : 'text-content-default',
                                  displayValue === '-' && 'text-content-muted'
                                )}
                              >
                                {displayValue}
                              </Text>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Materials */}
      <div className="px-4 pb-6">
        <Text variant="label-sm" color="muted" className="mb-3">Materials</Text>
        <Card variant="elevated" padding="none" className="divide-y divide-border">
          <div className="p-4">
            <Text variant="label-xs" color="muted">Yarn</Text>
            <Text variant="body-sm">{pattern.yarn.weight} • {pattern.yarn.yardage}</Text>
          </div>
          <div className="p-4">
            <Text variant="label-xs" color="muted">Gauge</Text>
            <Text variant="body-sm">
              {pattern.gauge.stitches} sts × {pattern.gauge.rows} rows = {pattern.gauge.over}
            </Text>
          </div>
          <div className="p-4">
            <Text variant="label-xs" color="muted">Needles</Text>
            <Text variant="body-sm">{pattern.needles.join(' • ')}</Text>
          </div>
        </Card>
      </div>

      {/* Knitting Glossary */}
      <div className="px-4 pb-6">
        <KnittingGlossary 
          patternText={pattern.sections.map(s => s.instructions || '').join(' ')}
        />
      </div>

      {/* Pattern sections */}
      <div className="px-4 pb-6">
        <Text variant="label-sm" color="muted" className="mb-3">Sections</Text>
        <div className="space-y-2">
          {pattern.sections.map((section) => (
            <Card key={section.id} variant="elevated" padding="none" className="overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background-muted flex items-center justify-center">
                    <Check className="w-4 h-4 text-content-muted" />
                  </div>
                  <Text variant="heading-xs">{section.name}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <Text variant="body-sm" color="muted">{section.rowCount} rows</Text>
                  {expandedSection === section.id ? (
                    <ChevronUp className="w-5 h-5 text-content-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-content-muted" />
                  )}
                </div>
              </button>

              {expandedSection === section.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4"
                >
                  <Card variant="filled" padding="sm">
                    <Text variant="body-sm" color="subtle" className="mb-2">
                      Row 1: Cast on 180 sts using long-tail method
                    </Text>
                    <Text variant="body-sm" color="subtle" className="mb-2">
                      Row 2: *K2, P2; rep from * to end
                    </Text>
                    <Text variant="body-sm" color="muted">
                      ... {section.rowCount - 2} more rows
                    </Text>
                  </Card>
                </motion.div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Start project button */}
      <div className="sticky bottom-0 px-4 py-4 pb-safe bg-gradient-to-t from-background via-background to-transparent">
        <Link to={`/patterns/${id}/knit?size=${selectedSize}`}>
          <Button variant="primary" size="xl" fullWidth leftIcon={<Play className="w-6 h-6" />}>
            Start Knitting
          </Button>
        </Link>
      </div>
    </div>
  );
}
