import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, UserPlus, UserMinus, Check, X, 
  Users, UserCheck, Clock, MoreHorizontal,
  MapPin, Sparkles, Filter, ChevronDown, 
  Loader2, AtSign, Award, FolderKanban
} from 'lucide-react';
import { Button, Card, Text, Heading, Avatar, Input, Badge, IconButton, Divider } from '@/components/ui';

type TabType = 'friends' | 'requests' | 'sent' | 'find';
type RequestStatus = 'none' | 'pending' | 'friends';

interface KnitterProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio: string;
  location?: string;
  projectCount: number;
  patternCount: number;
  friendCount: number;
  mutualFriends: number;
  skills: string[];
  craftTypes: string[];
  isOnline: boolean;
  requestStatus: RequestStatus;
  friendsSince?: string;
  requestedAt?: string;
  sentAt?: string;
}

// Mock database of all knitters
const allKnitters: KnitterProfile[] = [
  { 
    id: '1', 
    username: 'yarnlover42', 
    displayName: 'Sarah K.', 
    bio: 'Sock enthusiast and yarn hoarder 🧦 Always looking for new sock patterns!',
    location: 'Portland, OR',
    projectCount: 15,
    patternCount: 8,
    friendCount: 42,
    mutualFriends: 0,
    skills: ['socks', 'colorwork', 'cables'],
    craftTypes: ['knitting'],
    isOnline: true,
    requestStatus: 'friends',
    friendsSince: '3 months ago',
  },
  { 
    id: '2', 
    username: 'knitpurl99', 
    displayName: 'Emily R.', 
    bio: 'Cable queen 👑 Teaching knitting for 10 years',
    location: 'Seattle, WA',
    projectCount: 28,
    patternCount: 15,
    friendCount: 156,
    mutualFriends: 0,
    skills: ['cables', 'sweaters', 'teaching'],
    craftTypes: ['knitting'],
    isOnline: false,
    requestStatus: 'friends',
    friendsSince: '1 year ago',
  },
  { 
    id: '3', 
    username: 'stitchmaster', 
    displayName: 'Mike T.', 
    bio: 'Speed knitter ⚡ 10,000 stitches a day keeps the stress away',
    location: 'Austin, TX',
    projectCount: 42,
    patternCount: 3,
    friendCount: 89,
    mutualFriends: 0,
    skills: ['speed knitting', 'blankets', 'scarves'],
    craftTypes: ['knitting'],
    isOnline: true,
    requestStatus: 'friends',
    friendsSince: '6 months ago',
  },
  { 
    id: '4', 
    username: 'woolwizard', 
    displayName: 'Alex P.', 
    bio: 'Colorwork lover 🌈 Fair Isle is my happy place',
    location: 'Denver, CO',
    projectCount: 31,
    patternCount: 12,
    friendCount: 67,
    mutualFriends: 5,
    skills: ['fair isle', 'colorwork', 'stranded'],
    craftTypes: ['knitting'],
    isOnline: false,
    requestStatus: 'pending',
    requestedAt: '2 days ago',
  },
  { 
    id: '5', 
    username: 'purlqueen', 
    displayName: 'Lisa M.', 
    bio: 'Lace knitter 🕸️ Shawls are my specialty',
    location: 'Boston, MA',
    projectCount: 24,
    patternCount: 6,
    friendCount: 93,
    mutualFriends: 2,
    skills: ['lace', 'shawls', 'beading'],
    craftTypes: ['knitting'],
    isOnline: true,
    requestStatus: 'pending',
    requestedAt: '1 week ago',
  },
  { 
    id: '6', 
    username: 'sockaddict', 
    displayName: 'Tom W.', 
    bio: 'Yarn collector & sock machine operator',
    location: 'Chicago, IL',
    projectCount: 67,
    patternCount: 2,
    friendCount: 45,
    mutualFriends: 3,
    skills: ['socks', 'machine knitting', 'colorwork'],
    craftTypes: ['knitting', 'machine knitting'],
    isOnline: false,
    requestStatus: 'none',
    sentAt: '3 days ago',
  },
  { 
    id: '7', 
    username: 'lacequeen', 
    displayName: 'Marie S.', 
    bio: 'Heirloom lace specialist ✨ Creating keepsakes',
    location: 'San Francisco, CA',
    projectCount: 19,
    patternCount: 22,
    friendCount: 234,
    mutualFriends: 8,
    skills: ['lace', 'heirloom', 'fine yarn'],
    craftTypes: ['knitting'],
    isOnline: true,
    requestStatus: 'none',
  },
  { 
    id: '8', 
    username: 'cablemaster', 
    displayName: 'Nina K.', 
    bio: 'Aran sweater obsessed 🇮🇪 Traditional techniques',
    location: 'Dublin, Ireland',
    projectCount: 33,
    patternCount: 18,
    friendCount: 178,
    mutualFriends: 5,
    skills: ['cables', 'aran', 'sweaters', 'traditional'],
    craftTypes: ['knitting'],
    isOnline: false,
    requestStatus: 'none',
  },
  { 
    id: '9', 
    username: 'briocheking', 
    displayName: 'James L.', 
    bio: 'Brioche enthusiast 🥐 Two colors are better than one',
    location: 'New York, NY',
    projectCount: 21,
    patternCount: 7,
    friendCount: 112,
    mutualFriends: 2,
    skills: ['brioche', 'colorwork', 'hats'],
    craftTypes: ['knitting'],
    isOnline: true,
    requestStatus: 'none',
  },
  { 
    id: '10', 
    username: 'fairislefan', 
    displayName: 'Anna B.', 
    bio: 'Stranded colorwork fanatic 🎨 Norwegian heritage knitting',
    location: 'Minneapolis, MN',
    projectCount: 45,
    patternCount: 9,
    friendCount: 203,
    mutualFriends: 4,
    skills: ['fair isle', 'norwegian', 'colorwork', 'mittens'],
    craftTypes: ['knitting'],
    isOnline: false,
    requestStatus: 'none',
  },
  { 
    id: '11', 
    username: 'crochetqueen', 
    displayName: 'Diana C.', 
    bio: 'Amigurumi creator 🧸 Cute things only!',
    location: 'Los Angeles, CA',
    projectCount: 89,
    patternCount: 34,
    friendCount: 456,
    mutualFriends: 1,
    skills: ['amigurumi', 'toys', 'blankets'],
    craftTypes: ['crochet'],
    isOnline: true,
    requestStatus: 'none',
  },
  { 
    id: '12', 
    username: 'yarnbomber', 
    displayName: 'Chris R.', 
    bio: 'Street artist with yarn 🎭 Making the world softer',
    location: 'Brooklyn, NY',
    projectCount: 156,
    patternCount: 0,
    friendCount: 890,
    mutualFriends: 6,
    skills: ['yarn bombing', 'street art', 'installation'],
    craftTypes: ['knitting', 'crochet'],
    isOnline: false,
    requestStatus: 'none',
  },
  { 
    id: '13', 
    username: 'sweaterweather', 
    displayName: 'Pat M.', 
    bio: 'Sweater designer 🧥 Cozy is a lifestyle',
    location: 'Vermont',
    projectCount: 52,
    patternCount: 28,
    friendCount: 567,
    mutualFriends: 12,
    skills: ['sweaters', 'design', 'fitting'],
    craftTypes: ['knitting'],
    isOnline: true,
    requestStatus: 'none',
  },
  { 
    id: '14', 
    username: 'tinystitches', 
    displayName: 'Morgan K.', 
    bio: 'Miniature knitting specialist 🔬 Tiny needles, big patience',
    location: 'London, UK',
    projectCount: 78,
    patternCount: 15,
    friendCount: 234,
    mutualFriends: 3,
    skills: ['miniature', 'fine knitting', 'dollhouse'],
    craftTypes: ['knitting'],
    isOnline: false,
    requestStatus: 'none',
  },
  { 
    id: '15', 
    username: 'dyepot', 
    displayName: 'Sam T.', 
    bio: 'Hand dyer & knitter 🌈 Making colors sing',
    location: 'Asheville, NC',
    projectCount: 34,
    patternCount: 5,
    friendCount: 789,
    mutualFriends: 7,
    skills: ['dyeing', 'indie yarn', 'colorwork'],
    craftTypes: ['knitting', 'dyeing'],
    isOnline: true,
    requestStatus: 'none',
  },
];

// Filter options
const skillOptions = [
  'socks', 'sweaters', 'shawls', 'hats', 'mittens', 'blankets',
  'colorwork', 'fair isle', 'cables', 'lace', 'brioche', 'aran',
  'amigurumi', 'toys', 'design', 'teaching'
];

const craftTypeOptions = ['knitting', 'crochet', 'machine knitting', 'dyeing'];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// Enhanced Knitter Card
function KnitterCard({ 
  knitter, 
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  showActions = true,
}: { 
  knitter: KnitterProfile;
  onSendRequest?: () => void;
  onAcceptRequest?: () => void;
  onDeclineRequest?: () => void;
  onCancelRequest?: () => void;
  showActions?: boolean;
}) {
  const [localStatus, setLocalStatus] = useState(knitter.requestStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendRequest = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLocalStatus('pending');
    setIsLoading(false);
    onSendRequest?.();
  };

  const handleAccept = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLocalStatus('friends');
    setIsLoading(false);
    onAcceptRequest?.();
  };

  const handleDecline = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLocalStatus('none');
    setIsLoading(false);
    onDeclineRequest?.();
  };

  const handleCancel = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLocalStatus('none');
    setIsLoading(false);
    onCancelRequest?.();
  };

  return (
    <motion.div variants={item}>
      <Card variant="elevated" padding="md">
        <div className="flex gap-4">
          {/* Avatar */}
          <Link to={`/profile/${knitter.username}`} className="flex-shrink-0 relative">
            <Avatar name={knitter.displayName} size="xl" variant="primary" />
            {knitter.isOnline && (
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-status-success border-2 border-surface rounded-full" />
            )}
          </Link>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link to={`/profile/${knitter.username}`}>
                  <Text variant="label-lg" className="hover:text-content-primary transition-colors">
                    {knitter.displayName}
                  </Text>
                </Link>
                <div className="flex items-center gap-1 text-content-muted">
                  <AtSign className="w-3 h-3" />
                  <Text variant="body-xs">{knitter.username}</Text>
                </div>
              </div>
              
              {/* Status badge */}
              {localStatus === 'friends' && (
                <Badge variant="success" size="sm">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Friends
                </Badge>
              )}
            </div>
            
            {/* Bio */}
            <Text variant="body-sm" color="muted" className="mt-2 line-clamp-2">
              {knitter.bio}
            </Text>
            
            {/* Location */}
            {knitter.location && (
              <div className="flex items-center gap-1 mt-2 text-content-muted">
                <MapPin className="w-3 h-3" />
                <Text variant="body-xs">{knitter.location}</Text>
              </div>
            )}
            
            {/* Stats */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <FolderKanban className="w-3 h-3 text-content-muted" />
                <Text variant="body-xs">
                  <span className="font-medium text-content-default">{knitter.projectCount}</span>
                  <span className="text-content-muted"> projects</span>
                </Text>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-content-muted" />
                <Text variant="body-xs">
                  <span className="font-medium text-content-default">{knitter.friendCount}</span>
                  <span className="text-content-muted"> friends</span>
                </Text>
              </div>
              {knitter.mutualFriends > 0 && (
                <Text variant="body-xs" className="text-teal-600 dark:text-teal-400">
                  {knitter.mutualFriends} mutual
                </Text>
              )}
            </div>
            
            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {knitter.skills.slice(0, 4).map((skill) => (
                <Badge key={skill} variant="secondary" size="sm">
                  {skill}
                </Badge>
              ))}
              {knitter.skills.length > 4 && (
                <Badge variant="default" size="sm">
                  +{knitter.skills.length - 4}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/profile/${knitter.username}`}>View Profile</Link>
            </Button>
            
            <div className="flex items-center gap-2">
              {localStatus === 'none' && (
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleSendRequest}
                  loading={isLoading}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Add Friend
                </Button>
              )}
              
              {localStatus === 'pending' && knitter.requestedAt && (
                <>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={handleAccept}
                    loading={isLoading}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Accept
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleDecline}
                    disabled={isLoading}
                  >
                    Decline
                  </Button>
                </>
              )}
              
              {localStatus === 'pending' && knitter.sentAt && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCancel}
                  loading={isLoading}
                  leftIcon={<Clock className="w-4 h-4" />}
                >
                  Request Sent
                </Button>
              )}
              
              {localStatus === 'pending' && !knitter.requestedAt && !knitter.sentAt && (
                <Button 
                  variant="soft-primary" 
                  size="sm"
                  disabled
                  leftIcon={<Clock className="w-4 h-4" />}
                >
                  Request Sent
                </Button>
              )}
              
              {localStatus === 'friends' && (
                <IconButton 
                  variant="ghost" 
                  size="sm" 
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </IconButton>
              )}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<KnitterProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCraftTypes, setSelectedCraftTypes] = useState<string[]>([]);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Get different lists from mock data
  const friends = allKnitters.filter(k => k.requestStatus === 'friends');
  const incomingRequests = allKnitters.filter(k => k.requestStatus === 'pending' && k.requestedAt);
  const sentRequests = allKnitters.filter(k => k.requestStatus === 'pending' && k.sentAt);
  const suggestions = allKnitters
    .filter(k => k.requestStatus === 'none')
    .sort((a, b) => b.mutualFriends - a.mutualFriends)
    .slice(0, 5);

  const tabs = [
    { id: 'friends' as const, label: 'Friends', count: friends.length, icon: UserCheck },
    { id: 'requests' as const, label: 'Requests', count: incomingRequests.length, icon: UserPlus },
    { id: 'sent' as const, label: 'Sent', count: sentRequests.length, icon: Clock },
    { id: 'find' as const, label: 'Find Knitters', icon: Search },
  ];

  // Search function
  const handleSearch = async () => {
    if (!searchQuery.trim() && selectedSkills.length === 0 && selectedCraftTypes.length === 0) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let results = allKnitters.filter(k => k.requestStatus !== 'friends');
    
    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(k => 
        k.username.toLowerCase().includes(query) ||
        k.displayName.toLowerCase().includes(query) ||
        k.bio.toLowerCase().includes(query) ||
        k.location?.toLowerCase().includes(query) ||
        k.skills.some(s => s.toLowerCase().includes(query))
      );
    }
    
    // Skill filter
    if (selectedSkills.length > 0) {
      results = results.filter(k => 
        selectedSkills.some(skill => k.skills.includes(skill))
      );
    }
    
    // Craft type filter
    if (selectedCraftTypes.length > 0) {
      results = results.filter(k => 
        selectedCraftTypes.some(craft => k.craftTypes.includes(craft))
      );
    }
    
    // Online filter
    if (showOnlineOnly) {
      results = results.filter(k => k.isOnline);
    }
    
    setSearchResults(results);
    setIsSearching(false);
  };

  // Search on enter or filter change
  useEffect(() => {
    if (activeTab === 'find') {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedSkills, selectedCraftTypes, showOnlineOnly, activeTab]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const toggleCraftType = (craft: string) => {
    setSelectedCraftTypes(prev => 
      prev.includes(craft) 
        ? prev.filter(c => c !== craft)
        : [...prev, craft]
    );
  };

  const clearFilters = () => {
    setSelectedSkills([]);
    setSelectedCraftTypes([]);
    setShowOnlineOnly(false);
    setSearchQuery('');
  };

  const filteredFriends = friends.filter(f => 
    f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFiltersCount = selectedSkills.length + selectedCraftTypes.length + (showOnlineOnly ? 1 : 0);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Heading level={1} variant="display-xs" className="mb-4">Friends</Heading>
        
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                  setHasSearched(false);
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm
                  transition-all whitespace-nowrap flex-shrink-0
                  ${activeTab === tab.id 
                    ? 'bg-coral-500 text-white shadow-primary' 
                    : 'bg-background-subtle text-content-muted hover:bg-background-muted'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge 
                    variant={activeTab === tab.id ? 'default' : 'secondary'} 
                    size="sm"
                    className={activeTab === tab.id ? 'bg-white/20 text-white' : ''}
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Search & Filters for Find tab */}
      {activeTab === 'find' && (
        <motion.div 
          className="mb-4 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Search input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by username, name, location, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
                rightIcon={isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : undefined}
              />
            </div>
            <Button 
              variant={showFilters ? 'primary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-coral-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
          
          {/* Filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card variant="filled" padding="md" className="space-y-4">
                  {/* Craft types */}
                  <div>
                    <Text variant="label-sm" className="mb-2">Craft Type</Text>
                    <div className="flex flex-wrap gap-2">
                      {craftTypeOptions.map((craft) => (
                        <button
                          key={craft}
                          onClick={() => toggleCraftType(craft)}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all
                            ${selectedCraftTypes.includes(craft)
                              ? 'bg-coral-500 text-white'
                              : 'bg-background-muted text-content-muted hover:bg-background-emphasis'
                            }
                          `}
                        >
                          {craft}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Skills */}
                  <div>
                    <Text variant="label-sm" className="mb-2">Skills & Interests</Text>
                    <div className="flex flex-wrap gap-2">
                      {skillOptions.map((skill) => (
                        <button
                          key={skill}
                          onClick={() => toggleSkill(skill)}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all
                            ${selectedSkills.includes(skill)
                              ? 'bg-teal-500 text-white'
                              : 'bg-background-muted text-content-muted hover:bg-background-emphasis'
                            }
                          `}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Online only toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Text variant="label-sm">Online now</Text>
                      <Text variant="body-xs" color="muted">Show only knitters currently online</Text>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={showOnlineOnly}
                        onChange={(e) => setShowOnlineOnly(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-background-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-coral-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral-500"></div>
                    </label>
                  </div>
                  
                  {/* Clear filters */}
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear all filters
                    </Button>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Search for friends tab */}
      {activeTab === 'friends' && (
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Input
            placeholder="Search your friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-5 h-5" />}
          />
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        key={activeTab}
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <>
            {filteredFriends.length === 0 ? (
              <Card variant="filled" padding="xl" className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-content-muted" />
                <Text variant="label-lg" className="mb-1">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </Text>
                <Text variant="body-sm" color="muted" className="mb-4">
                  {searchQuery 
                    ? 'Try a different search term'
                    : 'Start connecting with other knitters!'
                  }
                </Text>
                {!searchQuery && (
                  <Button variant="primary" onClick={() => setActiveTab('find')}>
                    Find Knitters
                  </Button>
                )}
              </Card>
            ) : (
              filteredFriends.map((knitter) => (
                <KnitterCard 
                  key={knitter.id} 
                  knitter={knitter}
                />
              ))
            )}
          </>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <>
            {incomingRequests.length === 0 ? (
              <Card variant="filled" padding="xl" className="text-center">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-content-muted" />
                <Text variant="label-lg" className="mb-1">No pending requests</Text>
                <Text variant="body-sm" color="muted">
                  When someone sends you a friend request, it will appear here.
                </Text>
              </Card>
            ) : (
              incomingRequests.map((knitter) => (
                <KnitterCard 
                  key={knitter.id} 
                  knitter={knitter}
                />
              ))
            )}
          </>
        )}

        {/* Sent Tab */}
        {activeTab === 'sent' && (
          <>
            {sentRequests.length === 0 ? (
              <Card variant="filled" padding="xl" className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-content-muted" />
                <Text variant="label-lg" className="mb-1">No sent requests</Text>
                <Text variant="body-sm" color="muted">
                  Friend requests you send will appear here until they're accepted.
                </Text>
              </Card>
            ) : (
              sentRequests.map((knitter) => (
                <KnitterCard 
                  key={knitter.id} 
                  knitter={{...knitter, sentAt: knitter.sentAt || '3 days ago'}}
                />
              ))
            )}
          </>
        )}

        {/* Find Knitters Tab */}
        {activeTab === 'find' && (
          <>
            {/* Search Results */}
            {hasSearched && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Text variant="label-md">
                    {searchResults.length} {searchResults.length === 1 ? 'knitter' : 'knitters'} found
                  </Text>
                </div>
                
                {searchResults.length === 0 ? (
                  <Card variant="filled" padding="xl" className="text-center">
                    <Search className="w-12 h-12 mx-auto mb-3 text-content-muted" />
                    <Text variant="label-lg" className="mb-1">No knitters found</Text>
                    <Text variant="body-sm" color="muted" className="mb-4">
                      Try adjusting your search or filters
                    </Text>
                    <Button variant="ghost" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </Card>
                ) : (
                  searchResults.map((knitter) => (
                    <KnitterCard 
                      key={knitter.id} 
                      knitter={knitter}
                    />
                  ))
                )}
              </>
            )}
            
            {/* Suggestions (when not searching) */}
            {!hasSearched && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-coral-500" />
                  <Text variant="label-md">Suggested for you</Text>
                </div>
                <Text variant="body-sm" color="muted" className="mb-4">
                  Knitters you might know based on mutual friends and interests
                </Text>
                
                {suggestions.map((knitter) => (
                  <KnitterCard 
                    key={knitter.id} 
                    knitter={knitter}
                  />
                ))}
                
                <Divider className="my-6" />
                
                <Card variant="secondary" padding="lg" className="text-center">
                  <Text variant="label-md" className="mb-2">Looking for someone specific?</Text>
                  <Text variant="body-sm" color="muted" className="mb-4">
                    Use the search bar above to find knitters by username, name, location, or skills
                  </Text>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="secondary">@username</Badge>
                    <Badge variant="secondary">Portland, OR</Badge>
                    <Badge variant="secondary">socks</Badge>
                    <Badge variant="secondary">colorwork</Badge>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
