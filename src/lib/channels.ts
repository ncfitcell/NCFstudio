// Central configuration for the NCF Venture Studio navigation structure,
// channel types and role-based access control.

export type ChannelType =
  | 'discussion'   // chat/forum style feed
  | 'announcement' // read-mostly broadcast feed (leadership/admin post)
  | 'kanban'       // task board
  | 'document'     // document vault / repository
  | 'gate'         // stage-gate voting module
  | 'directory'    // filterable people/company directory
  | 'jobs'         // job board
  | 'events'       // event calendar + RSVP
  | 'roadmap'      // visual roadmap
  | 'dealflow'     // portfolio dealflow cards
  | 'dashboard'    // metrics dashboard
  | 'rules'        // static read-only rules page

export type RoleKey =
  | 'leadership'
  | 'core'
  | 'eir'
  | 'academic'
  | 'investor'
  | 'mentor'
  | 'portfolio_team'
  | 'corporate'
  | 'talent'

export const ALL_ROLES: RoleKey[] = [
  'leadership', 'core', 'eir', 'academic', 'investor', 'mentor', 'portfolio_team', 'corporate', 'talent'
]

export const ROLE_LABELS: Record<RoleKey, string> = {
  leadership: 'Studio Leadership',
  core: 'Studio Core Team',
  eir: 'EIR / Venture Founder',
  academic: 'Academic Partner / Dean',
  investor: 'VC & Investor Network',
  mentor: 'Advisor & Mentor',
  portfolio_team: 'Portfolio Team Member',
  corporate: 'Corporate Partner',
  talent: 'Talent Pool / Candidate'
}

export interface Channel {
  key: string
  name: string
  icon: string
  type: ChannelType
  description: string
  // 'public' means every authenticated user can see it regardless of roles
  roles: RoleKey[] | 'public'
  announceOnly?: RoleKey[] | 'admin' // who can create top-level posts/announcements/tasks/etc (others read/react/comment only). Undefined = anyone with access can post.
  gateApprovers?: RoleKey[] // who can cast a formal vote on a gate
}

export interface Category {
  key: string
  name: string
  icon: string
  roles: RoleKey[] | 'public'
  channels: Channel[]
}

export const CATEGORIES: Category[] = [
  {
    key: 'welcome',
    name: 'Welcome & HQ',
    icon: '📢',
    roles: 'public',
    channels: [
      { key: 'server-rules', name: 'server-rules', icon: '📜', type: 'rules', description: 'Read-only studio guidelines and governance policy.', roles: 'public', announceOnly: 'admin' },
      { key: 'announcements', name: 'announcements', icon: '📣', type: 'announcement', description: 'Broadcast announcements from Studio Leadership.', roles: 'public', announceOnly: ['leadership'] },
      { key: 'studio-news', name: 'studio-news', icon: '📰', type: 'announcement', description: 'Public news feed and PR updates.', roles: 'public', announceOnly: ['leadership', 'core'] },
      { key: 'studio-roadmap', name: 'studio-roadmap', icon: '🗺️', type: 'roadmap', description: 'Interactive visual roadmap of studio milestones.', roles: 'public' },
      { key: 'introductions', name: 'introductions', icon: '👋', type: 'directory', description: 'Community introductions feed with filterable skills/profiles.', roles: 'public' }
    ]
  },
  {
    key: 'townhall',
    name: 'Studio Town Hall',
    icon: '🏛️',
    roles: 'public',
    channels: [
      { key: 'general-lounge', name: 'general-lounge', icon: '💬', type: 'discussion', description: 'Interactive chat/discussion forum for all studio members.', roles: 'public' },
      { key: 'pitch-your-idea', name: 'pitch-your-idea', icon: '💡', type: 'discussion', description: 'Submission portal for raw startup ideas and innovation prompts.', roles: 'public' },
      { key: 'ask-an-eir', name: 'ask-an-eir', icon: '🎓', type: 'discussion', description: 'Q&A discussion board with Entrepreneurs-in-Residence.', roles: 'public' },
      { key: 'academic-innovation', name: 'academic-innovation', icon: '🔬', type: 'discussion', description: 'Research paper, patent, and lab prototype commercialization board.', roles: 'public' },
      { key: 'events-and-hackathons', name: 'events-and-hackathons', icon: '📅', type: 'events', description: 'Event calendar, RSVP system, and hackathon tracker.', roles: 'public' }
    ]
  },
  {
    key: 'talent-eir',
    name: 'Talent & EIR Hub',
    icon: '🎯',
    roles: ['leadership', 'core', 'eir', 'talent'],
    channels: [
      { key: 'eir-announcements', name: 'eir-announcements', icon: '📢', type: 'announcement', description: 'Dedicated announcements for EIRs.', roles: ['leadership', 'core', 'eir'], announceOnly: ['leadership', 'core'] },
      { key: 'cofounder-matching', name: 'cofounder-matching', icon: '🤝', type: 'directory', description: 'Interactive directory matching technical talent with business co-founders.', roles: ['leadership', 'core', 'eir', 'talent'] },
      { key: 'open-studio-roles', name: 'open-studio-roles', icon: '💼', type: 'jobs', description: 'Job board for open positions across portfolio ventures.', roles: ['leadership', 'core', 'eir', 'talent'] },
      { key: 'resume-and-portfolio', name: 'resume-and-portfolio', icon: '📄', type: 'document', description: 'Candidate resume drops and profile repository.', roles: ['leadership', 'core', 'eir', 'talent'] }
    ]
  },
  {
    key: 'stage1',
    name: 'Stage 01 — Ideation & Discovery',
    icon: '🔬',
    roles: ['leadership', 'core', 'eir'],
    channels: [
      { key: 'problem-validation', name: 'problem-validation', icon: '✅', type: 'discussion', description: 'Problem statement scoring & market validation board.', roles: ['leadership', 'core', 'eir'] },
      { key: 'market-research-and-tech', name: 'market-research-and-tech', icon: '📊', type: 'document', description: 'Technical feasibility & competitor analysis repository.', roles: ['leadership', 'core', 'eir'] },
      { key: 'ip-and-patent-scouting', name: 'ip-and-patent-scouting', icon: '⚖️', type: 'document', description: 'Academic patent viability & IP licensing tracking.', roles: ['leadership', 'core', 'eir'] },
      { key: 'unit-economics-and-tam', name: 'unit-economics-and-tam', icon: '🧮', type: 'document', description: 'Financial modeler, TAM calculator, and unit economics tools.', roles: ['leadership', 'core', 'eir'] },
      { key: 'stage-1-investment-gate', name: 'stage-1-investment-gate', icon: '🚦', type: 'gate', description: 'Stage Gate 1 Approval Panel: Voting system for Investment Committee to advance ideas to Stage 02.', roles: ['leadership', 'core', 'eir'], gateApprovers: ['leadership'] }
    ]
  },
  {
    key: 'stage2',
    name: 'Stage 02 — Build & MVP',
    icon: '🚀',
    roles: ['leadership', 'core', 'eir'],
    channels: [
      { key: 'mvp-sprints', name: 'mvp-sprints', icon: '🗂️', type: 'kanban', description: 'Kanban task board for MVP development.', roles: ['leadership', 'core', 'eir'] },
      { key: 'ui-ux-design-critique', name: 'ui-ux-design-critique', icon: '🎨', type: 'discussion', description: 'Asset sharing and design feedback feed.', roles: ['leadership', 'core', 'eir'] },
      { key: 'tech-stack-and-architecture', name: 'tech-stack-and-architecture', icon: '🧱', type: 'document', description: 'Tech stack documentation & cloud architecture specs.', roles: ['leadership', 'core', 'eir'] },
      { key: 'user-testing-feedback', name: 'user-testing-feedback', icon: '🐞', type: 'kanban', description: 'Beta user feedback logs and bug tracker.', roles: ['leadership', 'core', 'eir'] },
      { key: 'stage-2-spinout-gate', name: 'stage-2-spinout-gate', icon: '🚦', type: 'gate', description: 'Stage Gate 2 Spin-out Approval: Formal vote to spin out into an independent legal entity.', roles: ['leadership', 'core', 'eir'], gateApprovers: ['leadership'] }
    ]
  },
  {
    key: 'stage3',
    name: 'Stage 03 — Scale & Fundraise',
    icon: '📈',
    roles: ['leadership', 'core', 'eir', 'investor'],
    channels: [
      { key: 'gtm-and-growth', name: 'gtm-and-growth', icon: '📣', type: 'discussion', description: 'Go-to-market strategy, CAC/LTV tracking, and marketing pipelines.', roles: ['leadership', 'core', 'eir', 'investor'] },
      { key: 'grant-and-csr-prep', name: 'grant-and-csr-prep', icon: '🏦', type: 'document', description: 'Government grant application tracker & CSR funding documents.', roles: ['leadership', 'core', 'eir', 'investor'] },
      { key: 'pitch-deck-clinic', name: 'pitch-deck-clinic', icon: '🖥️', type: 'document', description: 'Pitch deck upload, version control, and mentor review system.', roles: ['leadership', 'core', 'eir', 'investor', 'mentor'] },
      { key: 'investor-updates', name: 'investor-updates', icon: '📈', type: 'announcement', description: 'Monthly founder update publishing system.', roles: ['leadership', 'core', 'eir', 'investor'], announceOnly: ['leadership', 'core', 'eir'] },
      { key: 'scaleup-war-room', name: 'scaleup-war-room', icon: '🔥', type: 'kanban', description: 'High-priority growth sprint tracking.', roles: ['leadership', 'core', 'eir', 'investor'] }
    ]
  },
  {
    key: 'platform',
    name: 'Studio Platform & Shared Services',
    icon: '🛠️',
    roles: ['leadership', 'core', 'eir', 'portfolio_team'],
    channels: [
      { key: 'legal-and-ip-support', name: 'legal-and-ip-support', icon: '⚖️', type: 'document', description: 'Document generator/request system for cap tables, NDA templates, and IP assignments.', roles: ['leadership', 'core', 'eir', 'portfolio_team'] },
      { key: 'finance-and-accounting', name: 'finance-and-accounting', icon: '💰', type: 'document', description: 'Expense tracking, budget requests, and payroll templates.', roles: ['leadership', 'core', 'eir', 'portfolio_team'] },
      { key: 'brand-marketing-and-pr', name: 'brand-marketing-and-pr', icon: '🎯', type: 'document', description: 'Shared marketing collateral, brand guidelines, and press kits.', roles: ['leadership', 'core', 'eir', 'portfolio_team'] },
      { key: 'talent-acquisition-hr', name: 'talent-acquisition-hr', icon: '🧑‍💼', type: 'document', description: 'HR policies, onboarding workflows, and hiring request forms.', roles: ['leadership', 'core', 'eir', 'portfolio_team'] },
      { key: 'compliance-and-governance', name: 'compliance-and-governance', icon: '📋', type: 'document', description: 'Statutory compliance checklists & board resolution templates.', roles: ['leadership', 'core', 'eir', 'portfolio_team'] },
      { key: 'devops-and-cloud-credits', name: 'devops-and-cloud-credits', icon: '☁️', type: 'document', description: 'Studio cloud credit redemption (AWS, GCP, Azure) & API key manager.', roles: ['leadership', 'core', 'eir', 'portfolio_team'] }
    ]
  },
  {
    key: 'investors',
    name: 'Investors & Partners Network',
    icon: '💼',
    roles: ['leadership', 'investor', 'corporate'],
    channels: [
      { key: 'investor-announcements', name: 'investor-announcements', icon: '📢', type: 'announcement', description: 'Investor-only announcements and deal alerts.', roles: ['leadership', 'investor', 'corporate'], announceOnly: ['leadership'] },
      { key: 'portfolio-dealflow', name: 'portfolio-dealflow', icon: '🗃️', type: 'dealflow', description: 'Filterable cards of all portfolio startups ready for external seed/series-A investment.', roles: ['leadership', 'investor', 'corporate'] },
      { key: 'monthly-metrics-and-reports', name: 'monthly-metrics-and-reports', icon: '📊', type: 'dashboard', description: 'Executive dashboard showing consolidated MRR, burn rate, runway, and growth rate across ventures.', roles: ['leadership', 'investor', 'corporate'] },
      { key: 'syndicate-discussions', name: 'syndicate-discussions', icon: '🗣️', type: 'discussion', description: 'Discussion board for lead investors and syndicate participants.', roles: ['leadership', 'investor', 'corporate'] }
    ]
  },
  {
    key: 'academic',
    name: 'Academic & Institutional Partners',
    icon: '🏫',
    roles: ['leadership', 'core', 'academic'],
    channels: [
      { key: 'campus-announcements', name: 'campus-announcements', icon: '📢', type: 'announcement', description: 'Updates for university partners and technical institutes.', roles: ['leadership', 'core', 'academic'], announceOnly: ['leadership', 'core'] },
      { key: 'incubator-in-a-box-docs', name: 'incubator-in-a-box-docs', icon: '📦', type: 'document', description: 'Downloadable/viewable setup guides, NIRF/NAAC compliance frameworks, and operational toolkits.', roles: ['leadership', 'core', 'academic'] },
      { key: 'faculty-startup-track', name: 'faculty-startup-track', icon: '👨‍🏫', type: 'discussion', description: 'Academic workload balance & faculty equity governance tracking.', roles: ['leadership', 'core', 'academic'] },
      { key: 'student-startup-track', name: 'student-startup-track', icon: '🎓', type: 'discussion', description: 'Student innovation track progress & cash grant tracking.', roles: ['leadership', 'core', 'academic'] }
    ]
  }
]

// Portfolio hub sub-channel templates (created per venture)
export const PORTFOLIO_SUBCHANNELS: { suffix: string; name: string; icon: string; type: ChannelType }[] = [
  { suffix: 'announcements', name: 'announcements', icon: '📢', type: 'announcement' },
  { suffix: 'general', name: 'general', icon: '💬', type: 'discussion' },
  { suffix: 'dev-and-product', name: 'dev-and-product', icon: '🧑‍💻', type: 'kanban' },
  { suffix: 'growth-marketing', name: 'growth-marketing', icon: '📈', type: 'discussion' }
]

export function ventureChannelKey(ventureSlug: string, suffix: string) {
  return `venture:${ventureSlug}:${suffix}`
}

// Flatten all static channels for quick lookup
export function findChannel(key: string): { category: Category; channel: Channel } | null {
  for (const cat of CATEGORIES) {
    for (const ch of cat.channels) {
      if (ch.key === key) return { category: cat, channel: ch }
    }
  }
  return null
}

export function hasAccess(userRoles: RoleKey[], isAdmin: boolean, required: RoleKey[] | 'public'): boolean {
  if (isAdmin) return true
  if (required === 'public') return true
  return required.some((r) => userRoles.includes(r))
}

export function canPost(userRoles: RoleKey[], isAdmin: boolean, channel: Channel): boolean {
  if (isAdmin) return true
  if (!channel.announceOnly) return hasAccess(userRoles, isAdmin, channel.roles)
  if (channel.announceOnly === 'admin') return isAdmin
  return channel.announceOnly.some((r) => userRoles.includes(r))
}
