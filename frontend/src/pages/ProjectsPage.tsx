import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, FolderKanban } from 'lucide-react';
import { Button, Card, Text, Heading, Input, Badge, Progress, IconButton } from '@/components/ui';
import { cn } from '@/lib/utils';

type ProjectStatus = 'all' | 'in_progress' | 'completed' | 'hibernating';

// Mock data
const projects = [
  {
    id: '1',
    title: 'Cozy Cable Cardigan',
    patternName: 'Fireside Cardigan',
    status: 'in_progress',
    progress: 65,
    startDate: '2024-01-15',
  },
  {
    id: '2',
    title: 'Striped Market Bag',
    patternName: 'Farmers Market Bag',
    status: 'in_progress',
    progress: 30,
    startDate: '2024-02-01',
  },
  {
    id: '3',
    title: 'Lace Shawl',
    patternName: 'Woodland Walk',
    status: 'hibernating',
    progress: 45,
    startDate: '2023-11-20',
  },
  {
    id: '4',
    title: 'Simple Beanie',
    patternName: 'Slouchy Beanie',
    status: 'completed',
    progress: 100,
    startDate: '2024-01-01',
  },
];

const statusTabs: { value: ProjectStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Finished' },
  { value: 'hibernating', label: 'Hibernating' },
];

const statusVariant: Record<string, 'secondary' | 'success' | 'warning' | 'error'> = {
  in_progress: 'secondary',
  completed: 'success',
  hibernating: 'warning',
  frogged: 'error',
};

export default function ProjectsPage() {
  const [activeStatus, setActiveStatus] = useState<ProjectStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((p) => {
    const matchesStatus = activeStatus === 'all' || p.status === activeStatus;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patternName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Heading level={1} variant="display-xs">My Projects</Heading>
        <Link to="/projects/new">
          <IconButton
            icon={<Plus className="w-5 h-5" />}
            aria-label="New project"
            variant="primary"
            size="lg"
          />
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-5 h-5" />}
          rightIcon={
            <button className="p-1 hover:bg-background-muted rounded">
              <Filter className="w-4 h-4" />
            </button>
          }
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar -mx-4 px-4">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeStatus === tab.value ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveStatus(tab.value)}
            className="whitespace-nowrap"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Projects list */}
      <AnimatePresence mode="popLayout">
        {filteredProjects.length > 0 ? (
          <div className="space-y-3">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/projects/${project.id}`}>
                  <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                    <div className="flex gap-4">
                      {/* Project image */}
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-coral-100 to-teal-100 dark:from-coral-900 dark:to-teal-900 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🧶</span>
                      </div>

                      {/* Project info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Text variant="heading-sm" truncate>{project.title}</Text>
                            <Text variant="body-sm" color="muted" truncate>{project.patternName}</Text>
                          </div>
                          <Badge variant={statusVariant[project.status]} size="sm">
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        {/* Progress */}
                        <div className="mt-3">
                          <Progress 
                            value={project.progress} 
                            size="sm" 
                            color={project.status === 'completed' ? 'success' : 'primary'}
                          />
                          <Text variant="label-xs" color="muted" className="mt-1">
                            {project.progress}% complete
                          </Text>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 rounded-2xl bg-background-muted flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-10 h-10 text-content-muted" />
            </div>
            <Heading level={3} variant="heading-md" color="subtle" className="mb-2">
              No projects found
            </Heading>
            <Text color="muted" className="mb-5">
              {searchQuery
                ? 'Try a different search term'
                : 'Start your first knitting project!'}
            </Text>
            <Link to="/projects/new">
              <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
                New Project
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
