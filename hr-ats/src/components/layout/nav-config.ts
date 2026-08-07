import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Kanban,
  UploadCloud,
  Sparkles,
  BarChart3,
  Settings,
  type LucideIcon,
  UserSearch,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  matchPrefix?: string;
}

export const navItems: NavItem[] = [
  // { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Jobs", to: "/jobs", icon: Briefcase },
  { label: "Candidates", to: "/candidates", icon: Users },
  { label: "Candidate Leads", to: "/candidate-leads", icon: UserSearch },
  { label: "Applications", to: "/applications", icon: FileText },
  { label: "Pipeline", to: "/pipeline", icon: Kanban },
  // { label: "Candidate Imports", to: "/imports", icon: UploadCloud },
  { label: "AI Analysis", to: "/ai-analysis", icon: Sparkles },
  // { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },
];
