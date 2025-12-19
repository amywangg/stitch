import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Sparkles, Upload, BookOpen, Loader2 } from 'lucide-react';
import { Button, Card, Text, Heading, Input, Badge, IconButton, Spinner } from '@/components/ui';
import { patternApi } from '@/lib/api';

type PatternSource = 'all' | 'library' | 'purchased' | 'favorites';

interface Pattern {
  id: string;
  title: string;
  designerName?: string;
  difficulty?: string;
  garmentType?: string;
  craftType?: string;
  isFavorited?: boolean;
  coverImageUrl?: string;
}

const sourceTabs: { value: PatternSource; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'library', label: 'My Library' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'favorites', label: 'Favorites' },
];

const difficultyVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
  expert: 'error',
};

export default function PatternsPage() {
  const location = useLocation();
  const [activeSource, setActiveSource] = useState<PatternSource>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatterns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data;
      if (activeSource === 'favorites') {
        data = await patternApi.getFavorites({ search: searchQuery || undefined });
      } else if (activeSource === 'library' || activeSource === 'all') {
        data = await patternApi.getMyPatterns({ search: searchQuery || undefined });
      } else {
        // For 'purchased', we'll use library for now (can be enhanced later)
        data = await patternApi.getMyPatterns({ search: searchQuery || undefined });
      }
      setPatterns(data.items || []);
    } catch (err: any) {
      console.error('Failed to fetch patterns:', err);
      setError(err.message || 'Failed to load patterns');
      setPatterns([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeSource, searchQuery]);

  // Check for success message from navigation
  useEffect(() => {
    if (location.state?.message) {
      // Refresh patterns when coming from save
      fetchPatterns();
    }
  }, [location.state, fetchPatterns]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  const filteredPatterns = patterns.filter((p) => {
    if (activeSource === 'favorites' && !p.isFavorited) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(query) ||
        (p.designerName && p.designerName.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Heading level={1} variant="display-xs">Patterns</Heading>
        <div className="flex gap-2">
          <Link to="/patterns/upload">
            <IconButton
              icon={<Upload className="w-5 h-5" />}
              aria-label="Upload pattern"
              variant="outline"
            />
          </Link>
          <Link to="/patterns/browse">
            <IconButton
              icon={<Plus className="w-5 h-5" />}
              aria-label="Browse patterns"
              variant="primary"
              size="lg"
            />
          </Link>
        </div>
      </div>

      {/* AI Feature Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link to="/patterns/upload">
          <Card padding="lg" className="bg-gradient-to-r from-teal-500 to-teal-600 border-0 shadow-secondary">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <Text variant="heading-md" className="text-white">
                  AI Pattern Parser ✨
                </Text>
                <Text variant="body-sm" className="text-teal-100">
                  Upload a PDF and get interactive row-by-row instructions!
                </Text>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search patterns..."
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

      {/* Source tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar -mx-4 px-4">
        {sourceTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeSource === tab.value ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveSource(tab.value)}
            className="whitespace-nowrap"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <Card variant="error" padding="md" className="mb-4">
          <Text variant="body-sm" className="text-status-error">{error}</Text>
        </Card>
      )}

      {/* Patterns grid */}
      <AnimatePresence mode="popLayout">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
          </div>
        ) : filteredPatterns.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredPatterns.map((pattern, index) => (
              <motion.div
                key={pattern.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/patterns/${pattern.id}`}>
                  <Card variant="elevated" padding="none" className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Pattern image */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-coral-100 via-background-subtle to-teal-100 dark:from-coral-900 dark:via-background-muted dark:to-teal-900 flex items-center justify-center">
                      {pattern.coverImageUrl ? (
                        <img src={pattern.coverImageUrl} alt={pattern.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl">🧶</span>
                      )}
                    </div>

                    {/* Pattern info */}
                    <div className="p-3">
                      <Text variant="heading-xs" truncate>{pattern.title}</Text>
                      <Text variant="body-xs" color="muted" truncate>
                        {pattern.designerName || 'Unknown Designer'}
                      </Text>
                      <div className="flex items-center gap-2 mt-2">
                        {pattern.difficulty && (
                          <Badge variant={difficultyVariant[pattern.difficulty] || 'default'} size="sm">
                            {pattern.difficulty}
                          </Badge>
                        )}
                        {pattern.garmentType && (
                          <Badge variant="default" size="sm">
                            {pattern.garmentType}
                          </Badge>
                        )}
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
              <BookOpen className="w-10 h-10 text-content-muted" />
            </div>
            <Heading level={3} variant="heading-md" color="subtle" className="mb-2">
              No patterns found
            </Heading>
            <Text color="muted" className="mb-5">
              {searchQuery
                ? 'Try a different search term'
                : activeSource === 'favorites'
                ? 'You haven\'t favorited any patterns yet'
                : 'Add patterns to your library'}
            </Text>
            {activeSource !== 'favorites' && (
              <Link to="/patterns/upload">
                <Button variant="primary" leftIcon={<Upload className="w-5 h-5" />}>
                  Upload Pattern
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
