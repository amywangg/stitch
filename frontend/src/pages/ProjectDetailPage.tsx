import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Play,
  Camera,
  Clock,
  CalendarDays,
  ChevronRight,
  Plus,
  Check,
  Ruler,
  Settings,
} from 'lucide-react';
import { Button, Card, Text, Heading, Progress, IconButton, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

// Mock data
const project = {
  id: '1',
  title: 'Cozy Cable Cardigan',
  patternName: 'Fireside Cardigan by Tin Can Knits',
  status: 'in_progress',
  progress: 65,
  startDate: '2024-01-15',
  totalTime: '12h 30m',
  yarn: 'Malabrigo Rios in Azul Profundo',
  needles: '4.5mm circular, 80cm',
  notes: 'Using gauge swatch, getting 20st/10cm. Remember to try on after the yoke!',
  sections: [
    { id: '1', name: 'Yoke', rows: 80, completedRows: 80, isComplete: true },
    { id: '2', name: 'Body', rows: 120, completedRows: 45, isComplete: false },
    { id: '3', name: 'Left Sleeve', rows: 60, completedRows: 0, isComplete: false },
    { id: '4', name: 'Right Sleeve', rows: 60, completedRows: 0, isComplete: false },
    { id: '5', name: 'Button Band', rows: 20, completedRows: 0, isComplete: false },
  ],
  photos: [
    { id: '1', url: null, date: '2024-01-20', caption: 'Yoke complete!' },
    { id: '2', url: null, date: '2024-02-05', caption: 'Body in progress' },
  ],
};

type Tab = 'progress' | 'photos' | 'notes';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('progress');

  const currentSection = project.sections.find((s) => !s.isComplete) || project.sections[0];

  return (
    <div className="min-h-screen-safe bg-background">
      {/* Header */}
      <header className="relative h-48 bg-coral-500">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pt-safe">
          <Link to="/projects">
            <IconButton icon={<ChevronLeft />} aria-label="Back" variant="glass" />
          </Link>
          <IconButton icon={<Settings />} aria-label="Settings" variant="glass" />
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <Heading level={1} variant="display-xs">{project.title}</Heading>
          <Text variant="body-sm" color="subtle">{project.patternName}</Text>
        </div>
      </header>

      {/* Quick stats */}
      <div className="px-4 -mt-2">
        <Card variant="elevated" padding="md">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <Text variant="heading-sm">{project.totalTime}</Text>
              <Text variant="label-xs" color="muted">Time spent</Text>
            </div>
            <div className="text-center">
              <div className="w-11 h-11 rounded-xl bg-coral-100 dark:bg-coral-900 flex items-center justify-center mx-auto mb-2">
                <Ruler className="w-5 h-5 text-coral-600 dark:text-coral-400" />
              </div>
              <Text variant="heading-sm">{project.progress}%</Text>
              <Text variant="label-xs" color="muted">Progress</Text>
            </div>
            <div className="text-center">
              <div className="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center mx-auto mb-2">
                <CalendarDays className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <Text variant="heading-sm">23d</Text>
              <Text variant="label-xs" color="muted">Active days</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick counter button */}
      <div className="px-4 py-4">
        <Link to={`/projects/${id}/counter/${currentSection.id}`}>
          <Card padding="md" className="bg-gradient-to-r from-teal-500 to-teal-600 border-0 shadow-secondary">
            <div className="flex items-center justify-between">
              <div>
                <Text variant="body-sm" className="text-teal-100">Continue knitting</Text>
                <Text variant="heading-md" className="text-white">{currentSection.name}</Text>
              </div>
              <div className="flex items-center gap-3">
                <Text variant="display-xs" className="text-white">
                  {currentSection.completedRows}/{currentSection.rows}
                </Text>
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <Play className="w-7 h-7 text-white ml-0.5" />
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4">
        {(['progress', 'photos', 'notes'] as Tab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="flex-1 capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {project.sections.map((section) => (
                <Link key={section.id} to={`/projects/${id}/counter/${section.id}`}>
                  <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center',
                          section.isComplete ? 'bg-teal-500' : 'bg-background-muted'
                        )}>
                          {section.isComplete && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <Text variant="heading-xs" color={section.isComplete ? 'muted' : 'default'}>
                          {section.name}
                        </Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <Text variant="body-sm" color="muted">
                          {section.completedRows}/{section.rows}
                        </Text>
                        <ChevronRight className="w-5 h-5 text-content-muted" />
                      </div>
                    </div>
                    <Progress 
                      value={(section.completedRows / section.rows) * 100} 
                      size="sm"
                      color={section.isComplete ? 'success' : 'primary'}
                    />
                  </Card>
                </Link>
              ))}
            </motion.div>
          )}

          {activeTab === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid grid-cols-2 gap-3">
                <button className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-coral-400 hover:bg-coral-50 dark:hover:bg-coral-950 transition-colors">
                  <Camera className="w-8 h-8 text-content-muted" />
                  <Text variant="label-sm" color="muted">Add photo</Text>
                </button>
                {project.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-2xl bg-gradient-to-br from-coral-100 to-teal-100 dark:from-coral-900 dark:to-teal-900 flex items-center justify-center"
                  >
                    <span className="text-5xl">📷</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Card variant="elevated" padding="md">
                <Text variant="label-sm" color="muted" className="mb-2">Yarn</Text>
                <Text>{project.yarn}</Text>
              </Card>

              <Card variant="elevated" padding="md">
                <Text variant="label-sm" color="muted" className="mb-2">Needles</Text>
                <Text>{project.needles}</Text>
              </Card>

              <Card variant="elevated" padding="md">
                <Text variant="label-sm" color="muted" className="mb-2">Notes</Text>
                <Text variant="body-sm" color="subtle">{project.notes}</Text>
              </Card>

              <button className="w-full py-3 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 hover:border-coral-400 hover:bg-coral-50 dark:hover:bg-coral-950 transition-colors">
                <Plus className="w-5 h-5 text-content-muted" />
                <Text color="muted">Add note</Text>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
