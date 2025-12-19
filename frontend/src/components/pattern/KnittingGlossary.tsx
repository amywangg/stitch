import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Card, Text, Heading, Badge, Input, IconButton, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { knittingTerms, KnittingStyle, getTermInstruction, extractAbbreviations, getTermByAbbreviation } from '@/data/knittingTerms';
import { useAuthStore } from '@/stores/authStore';

interface KnittingGlossaryProps {
  patternText?: string;
  abbreviations?: string[];
  className?: string;
}

export default function KnittingGlossary({ patternText, abbreviations, className }: KnittingGlossaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  
  // Get user's knitting style from auth store (default to 'continental')
  const user = useAuthStore((state) => state.user);
  const knittingStyle: KnittingStyle = (user?.knittingStyle as KnittingStyle) || 'continental';

  // Extract abbreviations from pattern if provided
  const patternAbbrevs = useMemo(() => {
    if (abbreviations) return abbreviations;
    if (patternText) return extractAbbreviations(patternText);
    return [];
  }, [patternText, abbreviations]);

  // Filter terms based on search and category
  const filteredTerms = useMemo(() => {
    let filtered = knittingTerms;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.abbreviation.toLowerCase().includes(query) ||
        t.fullName.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    // If pattern abbreviations provided, prioritize those
    if (patternAbbrevs.length > 0) {
      const patternTerms = filtered.filter(t => patternAbbrevs.includes(t.abbreviation.toLowerCase()));
      const otherTerms = filtered.filter(t => !patternAbbrevs.includes(t.abbreviation.toLowerCase()));
      return [...patternTerms, ...otherTerms];
    }

    return filtered;
  }, [searchQuery, selectedCategory, patternAbbrevs]);

  const categories = [
    { id: 'basic', label: 'Basic', count: knittingTerms.filter(t => t.category === 'basic').length },
    { id: 'increase', label: 'Increases', count: knittingTerms.filter(t => t.category === 'increase').length },
    { id: 'decrease', label: 'Decreases', count: knittingTerms.filter(t => t.category === 'decrease').length },
    { id: 'special', label: 'Special', count: knittingTerms.filter(t => t.category === 'special').length },
    { id: 'finishing', label: 'Finishing', count: knittingTerms.filter(t => t.category === 'finishing').length },
  ];

  const toggleTerm = (abbrev: string) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(abbrev)) {
      newExpanded.delete(abbrev);
    } else {
      newExpanded.add(abbrev);
    }
    setExpandedTerms(newExpanded);
  };

  return (
    <div className={cn('w-full', className)}>
      <Button
        variant="outline"
        fullWidth
        leftIcon={<BookOpen className="w-4 h-4" />}
        rightIcon={isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        onClick={() => setIsOpen(!isOpen)}
        className="justify-between"
      >
        <span>Knitting Terms Glossary</span>
        {patternAbbrevs.length > 0 && (
          <Badge variant="primary" size="sm">
            {patternAbbrevs.length} used
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card variant="elevated" padding="lg" className="mt-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <Heading level={3} variant="heading-md">Knitting Abbreviations</Heading>
                <Text variant="body-xs" color="muted">
                  Style: <span className="capitalize">{knittingStyle}</span>
                </Text>
              </div>

              {/* Search */}
              <div className="mb-4">
                <Input
                  placeholder="Search terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                  rightIcon={searchQuery ? (
                    <IconButton
                      icon={<X className="w-4 h-4" />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                    />
                  ) : undefined}
                />
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={selectedCategory === null ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.label} ({cat.count})
                  </Button>
                ))}
              </div>

              {/* Terms List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTerms.length === 0 ? (
                  <Text variant="body-sm" color="muted" className="text-center py-8">
                    No terms found
                  </Text>
                ) : (
                  filteredTerms.map((term) => {
                    const isExpanded = expandedTerms.has(term.abbreviation);
                    const isUsedInPattern = patternAbbrevs.includes(term.abbreviation.toLowerCase());
                    const instruction = getTermInstruction(term, knittingStyle);

                    return (
                      <motion.div
                        key={term.abbreviation}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'border rounded-lg transition-colors',
                          isUsedInPattern
                            ? 'border-coral-300 dark:border-coral-700 bg-coral-50/50 dark:bg-coral-950/20'
                            : 'border-border-default bg-background-subtle'
                        )}
                      >
                        <button
                          onClick={() => toggleTerm(term.abbreviation)}
                          className="w-full p-3 flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={isUsedInPattern ? 'primary' : 'default'} size="sm">
                              {term.abbreviation}
                            </Badge>
                            <div>
                              <Text variant="body-sm" className="font-medium">
                                {term.fullName}
                              </Text>
                              <Text variant="body-xs" color="muted">
                                {term.description}
                              </Text>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-content-muted" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-content-muted" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 pt-2 border-t border-border-default">
                                <Text variant="label-xs" color="muted" className="mb-1">
                                  How to {term.fullName} ({knittingStyle} style):
                                </Text>
                                <Text variant="body-sm" color="subtle" className="leading-relaxed">
                                  {instruction}
                                </Text>
                                {term.category && (
                                  <div className="mt-2">
                                    <Badge variant="outline" size="xs">
                                      {term.category}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


