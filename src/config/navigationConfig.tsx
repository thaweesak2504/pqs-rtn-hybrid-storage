import {
  Home,
  History,
  Users,
  Star,
  Mail,
  LogIn,
  LogOut,
  LayoutDashboard,
  Shield,
  Database,
  Crown,
  UserPlus,
  Archive,
  BookOpen,
} from 'lucide-react'

// Route configuration for navigation
export const ROUTE_CONFIG = {
  welcome: {
    home: '/home',
    history: '/history',
    team: '/team'
  },
  admin: {
    dashboard: '/dashboard',
    database: '/dashboard/database',
    highranks: '/dashboard/highranks',
    management: '/dashboard/management'
  },
  standalone: {
    contact: '/contact',
    signin: '/signin',
    registration: '/register',
    register: '/register',
    pqs_example: '/visitor',
  }
} as const

// Route to state mapping for router synchronization
export const ROUTE_STATE_MAP = {
  '/home': { activeItem: 'home', expandedMenus: [] },
  '/': { activeItem: 'home', expandedMenus: [] },
  '/history': { activeItem: 'history', expandedMenus: [] },
  '/team': { activeItem: 'team', expandedMenus: [] },
  '/dashboard': { activeItem: 'dashboard', expandedMenus: ['admin'] },
  '/dashboard/database': { activeItem: 'database', expandedMenus: ['admin'] },
  '/dashboard/highranks': { activeItem: 'highranks', expandedMenus: ['admin'] },
  '/dashboard/management': { activeItem: 'management', expandedMenus: ['admin'] },
  '/contact': { activeItem: 'contact', expandedMenus: [] },
  '/signin': { activeItem: 'signin', expandedMenus: [] },
  '/register': { activeItem: 'register', expandedMenus: [] },
  '/registration': { activeItem: 'register', expandedMenus: [] },
  '/visitor': { activeItem: 'pqs_example', expandedMenus: [] }
} as const

// Menu item configuration
export interface MenuItemConfig {
  id: string
  label: string
  icon: React.ReactNode
  subItems?: {
    id: string
    label: string
    icon: React.ReactNode
  }[]
}

// Memoized menu items to prevent recreation on every render
export const MENU_ITEMS_CONFIG: MenuItemConfig[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    icon: <Star className="w-5 h-5" />,
    subItems: [
      { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
      { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
      { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> }
    ]
  },
  {
    id: 'admin',
    label: 'Admin Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    subItems: [
      { id: 'dashboard', label: 'Admin Panel', icon: <Shield className="w-4 h-4" /> },
      { id: 'database', label: 'Database Viewer', icon: <Database className="w-4 h-4" /> },
      { id: 'highranks', label: 'High Ranks', icon: <Crown className="w-4 h-4" /> },
      { id: 'management', label: 'Database Management', icon: <Archive className="w-4 h-4" /> }
    ]
  },
  {
    id: 'pqs_example',
    label: 'Pqs Example',
    icon: <BookOpen className="w-5 h-5" />
  },
  {
    id: 'contact',
    label: 'Contact Us',
    icon: <Mail className="w-5 h-5" />
  }
]

// Authentication menu items
export const AUTH_MENU_ITEMS: MenuItemConfig[] = [
  {
    id: 'signout',
    label: 'Sign Out',
    icon: <LogOut className="w-5 h-5" />
  },
  {
    id: 'signin',
    label: 'Sign In',
    icon: <LogIn className="w-5 h-5" />
  },
  {
    id: 'register',
    label: 'Registration',
    icon: <UserPlus className="w-5 h-5" />
  }
]

// Type definitions for better type safety
export type WelcomeRouteKey = keyof typeof ROUTE_CONFIG.welcome
export type AdminRouteKey = keyof typeof ROUTE_CONFIG.admin
export type StandaloneRouteKey = keyof typeof ROUTE_CONFIG.standalone
export type RouteKey = WelcomeRouteKey | AdminRouteKey | StandaloneRouteKey
export type RoutePath = keyof typeof ROUTE_STATE_MAP

// Helper functions
export const getRouteForItem = (itemId: string, subItemId?: string): string | null => {
  if (subItemId && ROUTE_CONFIG.welcome[subItemId as WelcomeRouteKey]) {
    return ROUTE_CONFIG.welcome[subItemId as WelcomeRouteKey]
  }

  if (subItemId && ROUTE_CONFIG.admin[subItemId as AdminRouteKey]) {
    return ROUTE_CONFIG.admin[subItemId as AdminRouteKey]
  }

  if (ROUTE_CONFIG.standalone[itemId as StandaloneRouteKey]) {
    return ROUTE_CONFIG.standalone[itemId as StandaloneRouteKey]
  }

  return null
}

export const getStateForRoute = (path: string): { activeItem: string; expandedMenus: string[] } => {
  const state = ROUTE_STATE_MAP[path as RoutePath] || ROUTE_STATE_MAP['/home']
  // Return the state as configured - spread to convert readonly to mutable
  return { activeItem: state.activeItem, expandedMenus: [...state.expandedMenus] }
}

export const isWelcomeSubItem = (itemId: string): boolean => {
  return itemId in ROUTE_CONFIG.welcome
}

export const isAdminSubItem = (itemId: string): boolean => {
  return itemId in ROUTE_CONFIG.admin
}

export const isStandaloneItem = (itemId: string): boolean => {
  return itemId in ROUTE_CONFIG.standalone
}
