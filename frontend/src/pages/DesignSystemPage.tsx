import { useState } from 'react';
import { 
  Heart, 
  Plus, 
  ArrowRight, 
  Mail, 
  Lock, 
  Check, 
  X,
  Bell,
  Settings
} from 'lucide-react';
import {
  Button,
  IconButton,
  Text,
  Heading,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Badge,
  StatusBadge,
  Avatar,
  AvatarGroup,
  Progress,
  CircularProgress,
  Spinner,
  Divider,
  ThemeToggle,
  ThemeSelector,
} from '@/components/ui';

export default function DesignSystemPage() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="min-h-screen-safe bg-background pb-20 pt-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-border-default pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <Heading level={1} variant="heading-lg">Design System</Heading>
          <ThemeToggle />
        </div>
      </header>

      <div className="px-4 py-6 space-y-12">
        {/* ============================================
            THEME SELECTOR
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Theme</Heading>
          <ThemeSelector />
        </section>

        <Divider />

        {/* ============================================
            COLOR PALETTE
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Color Palette</Heading>
          
          <div className="space-y-4">
            <div>
              <Text variant="label-sm" color="muted" className="mb-2">Primary (Coral)</Text>
              <div className="flex gap-1">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div
                    key={shade}
                    className={`w-10 h-10 rounded-lg bg-coral-${shade}`}
                    title={`coral-${shade}`}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <Text variant="label-sm" color="muted" className="mb-2">Secondary (Teal)</Text>
              <div className="flex gap-1">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div
                    key={shade}
                    className={`w-10 h-10 rounded-lg bg-teal-${shade}`}
                    title={`teal-${shade}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <Text variant="label-sm" color="muted" className="mb-2">Semantic Colors</Text>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-success-subtle">
                  <div className="w-4 h-4 rounded-full bg-status-success" />
                  <Text variant="body-sm" color="success">Success</Text>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-warning-subtle">
                  <div className="w-4 h-4 rounded-full bg-status-warning" />
                  <Text variant="body-sm" color="warning">Warning</Text>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-error-subtle">
                  <div className="w-4 h-4 rounded-full bg-status-error" />
                  <Text variant="body-sm" color="error">Error</Text>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-info-subtle">
                  <div className="w-4 h-4 rounded-full bg-status-info" />
                  <Text variant="body-sm">Info</Text>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ============================================
            TYPOGRAPHY
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Typography</Heading>
          
          <Card variant="filled" className="space-y-3">
            <Text variant="display-lg">Display Large</Text>
            <Text variant="display-md">Display Medium</Text>
            <Text variant="display-sm">Display Small</Text>
            <Divider />
            <Text variant="heading-xl">Heading XL</Text>
            <Text variant="heading-lg">Heading Large</Text>
            <Text variant="heading-md">Heading Medium</Text>
            <Text variant="heading-sm">Heading Small</Text>
            <Divider />
            <Text variant="body-lg">Body Large - Great for main content</Text>
            <Text variant="body-md">Body Medium - Default body text</Text>
            <Text variant="body-sm">Body Small - Secondary content</Text>
            <Text variant="body-xs">Body XS - Fine print</Text>
            <Divider />
            <Text variant="label-lg">Label Large</Text>
            <Text variant="label-md">Label Medium</Text>
            <Text variant="label-sm">Label Small</Text>
            <Text variant="label-xs">LABEL XS (UPPERCASE)</Text>
          </Card>
        </section>

        <Divider />

        {/* ============================================
            BUTTONS
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Buttons</Heading>
          
          <div className="space-y-6">
            {/* Primary Variants */}
            <div>
              <Text variant="label-sm" color="muted" className="mb-3">Primary</Text>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>With Icon</Button>
                <Button variant="primary" loading>Loading</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>

            {/* Secondary Variants */}
            <div>
              <Text variant="label-sm" color="muted" className="mb-3">Secondary</Text>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary">Secondary</Button>
                <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>Continue</Button>
              </div>
            </div>

            {/* Outline Variants */}
            <div>
              <Text variant="label-sm" color="muted" className="mb-3">Outline</Text>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">Outline</Button>
                <Button variant="outline-primary">Primary</Button>
                <Button variant="outline-secondary">Secondary</Button>
              </div>
            </div>

            {/* Ghost Variants */}
            <div>
              <Text variant="label-sm" color="muted" className="mb-3">Ghost</Text>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost">Ghost</Button>
                <Button variant="ghost-primary">Primary</Button>
                <Button variant="ghost-secondary">Secondary</Button>
              </div>
            </div>

            {/* Soft Variants */}
            <div>
              <Text variant="label-sm" color="muted" className="mb-3">Soft</Text>
              <div className="flex flex-wrap gap-2">
                <Button variant="soft">Soft</Button>
                <Button variant="soft-primary">Primary</Button>
                <Button variant="soft-secondary">Secondary</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <Text variant="label-sm" color="muted" className="mb-3">Sizes</Text>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="xs">Extra Small</Button>
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
                <Button variant="primary" size="xl">Extra Large</Button>
              </div>
            </div>

            {/* Full Width */}
            <div>
              <Text variant="label-sm" color="muted" className="mb-3">Full Width</Text>
              <Button variant="primary" fullWidth>Full Width Button</Button>
            </div>
          </div>
        </section>

        <Divider />

        {/* ============================================
            ICON BUTTONS
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Icon Buttons</Heading>
          
          <div className="flex flex-wrap gap-2">
            <IconButton icon={<Heart />} aria-label="Like" variant="primary" />
            <IconButton icon={<Plus />} aria-label="Add" variant="secondary" />
            <IconButton icon={<Bell />} aria-label="Notifications" variant="outline" />
            <IconButton icon={<Settings />} aria-label="Settings" variant="ghost" />
            <IconButton icon={<Mail />} aria-label="Email" variant="soft" />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <IconButton icon={<Heart />} aria-label="Like" size="xs" />
            <IconButton icon={<Heart />} aria-label="Like" size="sm" />
            <IconButton icon={<Heart />} aria-label="Like" size="md" />
            <IconButton icon={<Heart />} aria-label="Like" size="lg" />
            <IconButton icon={<Heart />} aria-label="Like" size="xl" />
          </div>
        </section>

        <Divider />

        {/* ============================================
            CARDS
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Cards</Heading>
          
          <div className="grid gap-4">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>With border and no shadow</CardDescription>
              </CardHeader>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>With shadow for emphasis</CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive">
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
                <CardDescription>Hover and click me!</CardDescription>
              </CardHeader>
            </Card>

            <Card variant="primary">
              <CardHeader>
                <CardTitle>Primary Tint</CardTitle>
                <CardDescription>Coral background</CardDescription>
              </CardHeader>
            </Card>

            <Card variant="secondary">
              <CardHeader>
                <CardTitle>Secondary Tint</CardTitle>
                <CardDescription>Teal background</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <Divider />

        {/* ============================================
            INPUTS
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Inputs</Heading>
          
          <div className="space-y-4">
            <Input
              label="Default Input"
              placeholder="Type something..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <Input
              variant="filled"
              label="Filled Input"
              placeholder="Filled variant"
            />

            <Input
              label="With Icons"
              placeholder="Enter your email"
              leftIcon={<Mail className="w-5 h-5" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              leftIcon={<Lock className="w-5 h-5" />}
              hint="Must be at least 8 characters"
            />

            <Input
              label="Error State"
              placeholder="Invalid input"
              error="This field is required"
            />

            <Input
              variant="success"
              label="Success State"
              placeholder="Valid input"
              defaultValue="correct@email.com"
            />
          </div>
        </section>

        <Divider />

        {/* ============================================
            BADGES
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Badges</Heading>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Outline</Badge>
              <Badge variant="outline-primary">Primary</Badge>
              <Badge variant="outline-secondary">Secondary</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="solid-primary">Solid Primary</Badge>
              <Badge variant="solid-secondary">Solid Secondary</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" />
              <StatusBadge status="pending" />
              <StatusBadge status="success" />
              <StatusBadge status="error" />
              <StatusBadge status="warning" />
              <StatusBadge status="inactive" />
            </div>
          </div>
        </section>

        <Divider />

        {/* ============================================
            AVATARS
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Avatars</Heading>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar size="xs" name="John Doe" />
              <Avatar size="sm" name="Jane Smith" color="secondary" />
              <Avatar size="md" name="Bob Wilson" color="random" />
              <Avatar size="lg" name="Alice Brown" color="random" />
              <Avatar size="xl" name="Charlie Davis" color="random" />
              <Avatar size="2xl" name="Eve Johnson" color="random" />
            </div>

            <div className="flex items-center gap-3">
              <Avatar variant="rounded" name="Rounded" />
              <Avatar variant="square" name="Square" color="secondary" />
            </div>

            <div>
              <Text variant="label-sm" color="muted" className="mb-2">Avatar Group</Text>
              <AvatarGroup max={4}>
                <Avatar name="Person 1" color="random" />
                <Avatar name="Person 2" color="random" />
                <Avatar name="Person 3" color="random" />
                <Avatar name="Person 4" color="random" />
                <Avatar name="Person 5" color="random" />
                <Avatar name="Person 6" color="random" />
              </AvatarGroup>
            </div>
          </div>
        </section>

        <Divider />

        {/* ============================================
            PROGRESS
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Progress</Heading>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <Progress value={25} label="Primary" showValue />
              <Progress value={50} color="secondary" label="Secondary" showValue />
              <Progress value={75} color="success" label="Success" showValue />
              <Progress value={90} color="warning" label="Warning" showValue />
              <Progress value={30} color="error" label="Error" showValue />
            </div>

            <div className="flex flex-wrap gap-6">
              <CircularProgress value={25} showValue color="primary" />
              <CircularProgress value={50} showValue color="secondary" />
              <CircularProgress value={75} showValue color="success" />
              <CircularProgress value={100} showValue color="warning" />
            </div>
          </div>
        </section>

        <Divider />

        {/* ============================================
            SPINNERS
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Spinners</Heading>
          
          <div className="flex items-center gap-4">
            <Spinner size="xs" />
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" color="secondary" />
            <Spinner size="xl" color="muted" />
          </div>
        </section>

        <Divider />

        {/* ============================================
            SHADOWS
           ============================================ */}
        <section>
          <Heading level={2} className="mb-4">Shadows</Heading>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-xl shadow-xs text-center">
              <Text variant="label-sm">shadow-xs</Text>
            </div>
            <div className="p-4 bg-surface rounded-xl shadow-sm text-center">
              <Text variant="label-sm">shadow-sm</Text>
            </div>
            <div className="p-4 bg-surface rounded-xl shadow-md text-center">
              <Text variant="label-sm">shadow-md</Text>
            </div>
            <div className="p-4 bg-surface rounded-xl shadow-lg text-center">
              <Text variant="label-sm">shadow-lg</Text>
            </div>
            <div className="p-4 bg-surface rounded-xl shadow-xl text-center">
              <Text variant="label-sm">shadow-xl</Text>
            </div>
            <div className="p-4 bg-surface rounded-xl shadow-2xl text-center">
              <Text variant="label-sm">shadow-2xl</Text>
            </div>
            <div className="p-4 bg-coral-500 text-white rounded-xl shadow-primary text-center">
              <Text variant="label-sm" color="inverse">shadow-primary</Text>
            </div>
            <div className="p-4 bg-teal-500 text-white rounded-xl shadow-secondary text-center">
              <Text variant="label-sm" color="inverse">shadow-secondary</Text>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

