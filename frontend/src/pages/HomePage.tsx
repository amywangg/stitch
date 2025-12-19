import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ArrowRight, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button, Card, Text, Heading, Progress } from '@/components/ui';

// Mock data - replace with real API calls
const recentProjects = [
  {
    id: '1',
    title: 'Cozy Cable Cardigan',
    patternName: 'Fireside Cardigan by Tin Can Knits',
    currentSection: 'Left Sleeve',
    progress: 65,
    lastWorked: '2 hours ago',
    currentRow: 45,
    totalRows: 120,
  },
  {
    id: '2',
    title: 'Striped Market Bag',
    patternName: 'Farmers Market Bag',
    currentSection: 'Main Body',
    progress: 30,
    lastWorked: 'Yesterday',
    currentRow: 24,
    totalRows: 80,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="px-4 py-6 space-y-8">
      {/* Greeting */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-block mb-3">
          <span className="text-5xl">👋</span>
        </div>
        <Heading level={1} variant="display-sm">
          {isAuthenticated 
            ? `Hey, ${user?.displayName || user?.username || 'Knitter'}!`
            : 'Welcome to Stitch!'}
        </Heading>
        <Text color="muted" className="mt-1">
          {isAuthenticated 
            ? 'Ready to pick up where you left off?'
            : 'Your fun & friendly knitting companion 🧶'}
        </Text>
      </motion.section>

      {/* Quick actions */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3"
      >
        <motion.div variants={item}>
          <Link to="/projects/new">
            <Card variant="primary" padding="lg" className="bg-coral-500 border-0 shadow-primary">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <Text variant="label-lg" className="text-white">New Project</Text>
              </div>
            </Card>
          </Link>
        </motion.div>
        <motion.div variants={item}>
          <Link to="/patterns/upload">
            <Card variant="secondary" padding="lg" className="bg-gradient-to-br from-teal-500 to-teal-600 border-0 shadow-secondary">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <Text variant="label-lg" className="text-white">Upload Pattern</Text>
              </div>
            </Card>
          </Link>
        </motion.div>
      </motion.section>

      {/* Continue knitting */}
      {recentProjects.length > 0 && (
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
        >
          <div className="flex items-center justify-between mb-4">
            <Heading level={2} variant="heading-lg">Continue Knitting</Heading>
            <Link to="/projects">
              <Button variant="ghost-primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View all
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentProjects.map((project) => (
              <motion.div key={project.id} variants={item}>
                <Link to={`/projects/${project.id}`}>
                  <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                    <div className="flex gap-4">
                      {/* Project image placeholder */}
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-coral-900 dark:to-coral-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-4xl">🧶</span>
                      </div>

                      {/* Project info */}
                      <div className="flex-1 min-w-0">
                        <Text variant="heading-sm" className="truncate">{project.title}</Text>
                        <Text variant="body-sm" color="muted" className="truncate">
                          {project.currentSection}
                        </Text>
                        
                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <Text variant="label-xs" color="muted">
                              Row {project.currentRow} of {project.totalRows}
                            </Text>
                            <Text variant="label-xs" color="primary">
                              {project.progress}%
                            </Text>
                          </div>
                          <Progress value={project.progress} size="sm" />
                        </div>
                      </div>

                      {/* Quick counter button */}
                      <Link
                        to={`/projects/${project.id}/counter`}
                        onClick={(e) => e.stopPropagation()}
                        className="self-center"
                      >
                        <div className="w-14 h-14 rounded-xl bg-teal-500 flex items-center justify-center hover:bg-teal-600 transition-colors shadow-secondary">
                          <Plus className="w-6 h-6 text-white" />
                        </div>
                      </Link>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Stats summary - for authenticated users */}
      {isAuthenticated && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                <Clock className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <Text variant="display-xs">12.5h</Text>
                <Text variant="label-xs" color="muted">This week</Text>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-coral-100 dark:bg-coral-900 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-coral-600 dark:text-coral-400" />
              </div>
              <div>
                <Text variant="display-xs">847</Text>
                <Text variant="label-xs" color="muted">Rows this week</Text>
              </div>
            </div>
          </Card>
        </motion.section>
      )}

      {/* Getting started - for non-authenticated users */}
      {!isAuthenticated && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated" padding="xl" className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-coral-500 flex items-center justify-center mx-auto mb-4 shadow-primary">
              <span className="text-4xl">✨</span>
            </div>
            <Heading level={3} variant="heading-lg" className="mb-2">
              Start Your Journey
            </Heading>
            <Text color="muted" className="mb-5">
              Sign up to track projects, save patterns, and knit hands-free with voice commands!
            </Text>
            <Link to="/register">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Create Free Account
              </Button>
            </Link>
          </Card>
        </motion.section>
      )}
    </div>
  );
}
