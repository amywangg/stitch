import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, 
  Image as ImageIcon, Award, CheckCircle2, Users,
  Sparkles, Plus
} from 'lucide-react';
import { Button, Card, Text, Heading, Avatar, Badge, IconButton } from '@/components/ui';

// Mock data for the feed
const mockFeedItems = [
  {
    id: '1',
    type: 'project_completed',
    user: {
      id: '2',
      username: 'yarnlover42',
      displayName: 'Sarah K.',
      avatarUrl: null,
    },
    title: 'Finished my first sweater!',
    description: 'Finally completed my Flax sweater after 3 months. So happy with how it turned out! 🎉',
    project: {
      id: '1',
      title: 'Flax Sweater',
      imageUrl: null,
      progress: 100,
    },
    likes: 24,
    comments: 8,
    isLiked: false,
    createdAt: '2 hours ago',
  },
  {
    id: '2',
    type: 'photo_added',
    user: {
      id: '3',
      username: 'knitpurl99',
      displayName: 'Emily R.',
      avatarUrl: null,
    },
    title: 'Progress update on my socks',
    description: 'Just turned the heel on my first pair of socks! The Fish Lips Kiss Heel is magic ✨',
    images: ['/api/placeholder/400/300'],
    project: {
      id: '2',
      title: 'Vanilla Socks',
      progress: 65,
    },
    likes: 15,
    comments: 3,
    isLiked: true,
    createdAt: '5 hours ago',
  },
  {
    id: '3',
    type: 'achievement_earned',
    user: {
      id: '4',
      username: 'stitchmaster',
      displayName: 'Mike T.',
      avatarUrl: null,
    },
    title: 'Earned "Speed Knitter" badge!',
    description: 'Completed 10,000 stitches this week. My fingers are tired but worth it! 💪',
    achievement: {
      name: 'Speed Knitter',
      icon: '⚡',
    },
    likes: 42,
    comments: 12,
    isLiked: false,
    createdAt: '1 day ago',
  },
  {
    id: '4',
    type: 'friend_added',
    user: {
      id: '5',
      username: 'woolwizard',
      displayName: 'Alex P.',
      avatarUrl: null,
    },
    title: 'New friend added!',
    description: 'Now friends with @cozycrafts. Excited to see their projects!',
    newFriend: {
      username: 'cozycrafts',
      displayName: 'Jordan C.',
    },
    likes: 5,
    comments: 0,
    isLiked: false,
    createdAt: '2 days ago',
  },
];

const mockFriendSuggestions = [
  { id: '1', username: 'lacequeen', displayName: 'Marie S.', mutualFriends: 3 },
  { id: '2', username: 'sockaddict', displayName: 'Tom W.', mutualFriends: 5 },
  { id: '3', username: 'cablemaster', displayName: 'Nina K.', mutualFriends: 2 },
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

function FeedItem({ feedItem }: { feedItem: typeof mockFeedItems[0] }) {
  const [isLiked, setIsLiked] = useState(feedItem.isLiked);
  const [likeCount, setLikeCount] = useState(feedItem.likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const getActivityIcon = () => {
    switch (feedItem.type) {
      case 'project_completed':
        return <CheckCircle2 className="w-4 h-4 text-status-success" />;
      case 'photo_added':
        return <ImageIcon className="w-4 h-4 text-teal-500" />;
      case 'achievement_earned':
        return <Award className="w-4 h-4 text-yellow-500" />;
      case 'friend_added':
        return <Users className="w-4 h-4 text-coral-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-content-muted" />;
    }
  };

  return (
    <motion.div variants={item}>
      <Card variant="elevated" padding="none" className="overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-start gap-3">
          <Link to={`/profile/${feedItem.user.username}`}>
            <Avatar 
              name={feedItem.user.displayName} 
              size="md"
              variant="primary"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link to={`/profile/${feedItem.user.username}`}>
                <Text variant="label-md" className="hover:text-content-primary transition-colors">
                  {feedItem.user.displayName}
                </Text>
              </Link>
              {getActivityIcon()}
            </div>
            <Text variant="body-xs" color="muted">
              @{feedItem.user.username} · {feedItem.createdAt}
            </Text>
          </div>
          <IconButton variant="ghost" size="sm" aria-label="More options">
            <MoreHorizontal className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <Text variant="body-md" className="font-medium mb-1">{feedItem.title}</Text>
          <Text variant="body-sm" color="muted">{feedItem.description}</Text>
        </div>

        {/* Project card if exists */}
        {feedItem.project && (
          <Link to={`/projects/${feedItem.project.id}`}>
            <div className="mx-4 mb-3 p-3 bg-background-subtle rounded-xl flex items-center gap-3 hover:bg-background-muted transition-colors">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-coral-100 to-teal-100 dark:from-coral-900 dark:to-teal-900 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🧶</span>
              </div>
              <div className="flex-1 min-w-0">
                <Text variant="label-sm">{feedItem.project.title}</Text>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-background-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-coral-500 rounded-full transition-all"
                      style={{ width: `${feedItem.project.progress}%` }}
                    />
                  </div>
                  <Text variant="body-xs" color="muted">{feedItem.project.progress}%</Text>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Achievement badge if exists */}
        {feedItem.achievement && (
          <div className="mx-4 mb-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <span className="text-2xl">{feedItem.achievement.icon}</span>
            </div>
            <div>
              <Badge variant="warning" size="sm">{feedItem.achievement.name}</Badge>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border-subtle flex items-center gap-1">
          <Button 
            variant={isLiked ? 'soft-primary' : 'ghost'} 
            size="sm"
            onClick={handleLike}
            leftIcon={<Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />}
          >
            {likeCount}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            leftIcon={<MessageCircle className="w-4 h-4" />}
          >
            {feedItem.comments}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function FriendSuggestionCard({ suggestion }: { suggestion: typeof mockFriendSuggestions[0] }) {
  const [isAdded, setIsAdded] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-background-subtle transition-colors">
      <Avatar name={suggestion.displayName} size="sm" variant="secondary" />
      <div className="flex-1 min-w-0">
        <Text variant="label-sm" className="truncate">{suggestion.displayName}</Text>
        <Text variant="body-xs" color="muted">{suggestion.mutualFriends} mutual friends</Text>
      </div>
      <Button 
        variant={isAdded ? 'ghost' : 'outline-primary'} 
        size="sm"
        onClick={() => setIsAdded(!isAdded)}
        disabled={isAdded}
      >
        {isAdded ? 'Sent' : 'Add'}
      </Button>
    </div>
  );
}

export default function FeedPage() {
  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl -mx-4 px-4 py-4 border-b border-border-subtle mb-4"
      >
        <div className="flex items-center justify-between">
          <Heading level={1} variant="heading-xl">Feed</Heading>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            New Post
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <motion.div 
          className="lg:col-span-2 space-y-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {mockFeedItems.map((feedItem) => (
            <FeedItem key={feedItem.id} feedItem={feedItem} />
          ))}

          {/* Load more */}
          <div className="text-center py-4">
            <Button variant="ghost">Load more</Button>
          </div>
        </motion.div>

        {/* Sidebar - Friend Suggestions */}
        <motion.div 
          className="hidden lg:block space-y-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated" padding="md">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3} variant="heading-sm">Suggested Friends</Heading>
              <Button variant="link" size="sm">See All</Button>
            </div>
            <div className="space-y-1">
              {mockFriendSuggestions.map((suggestion) => (
                <FriendSuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </Card>

          <Card variant="filled" padding="md">
            <div className="text-center">
              <span className="text-3xl mb-2 block">👋</span>
              <Text variant="label-md" className="mb-1">Invite Friends</Text>
              <Text variant="body-xs" color="muted" className="mb-3">
                Knitting is better with friends!
              </Text>
              <Button variant="outline-primary" size="sm" fullWidth>
                Share Invite Link
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}


