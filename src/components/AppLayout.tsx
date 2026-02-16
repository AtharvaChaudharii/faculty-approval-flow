import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard, Upload, Archive, LogOut, FileText,
  Menu, X, ChevronRight, Bell, UserCircle,
} from 'lucide-react';
import { currentUser, roleLabels } from '@/lib/mock-data';
import { useDocuments } from '@/lib/document-store';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/upload', icon: Upload, label: 'Upload Document' },
  { path: '/archive', icon: Archive, label: 'Archive' },
  { path: '/settings', icon: UserCircle, label: 'Profile & Signatures' },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/upload': 'Upload Document',
  '/archive': 'Archive',
  '/settings': 'Profile & Signatures',
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { documents } = useDocuments();

  const pendingForUser = documents.filter(
    (d) => d.status === 'pending' && d.approval_chain.some(s => s.approver.id === currentUser.id && s.status === 'pending')
  );

  const pageTitle = pageTitles[location.pathname] || '';

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent">
            <FileText className="h-4 w-4 text-sidebar-accent-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-primary">DocFlow</p>
            <p className="text-[10px] text-sidebar-foreground/60">Approval System</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="text-xs font-semibold bg-sidebar-accent text-sidebar-accent-foreground">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.name}</p>
              <p className="text-[11px] text-sidebar-foreground/50">{roleLabels[currentUser.role]}</p>
            </div>
            <Link to="/login" className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          {pageTitle && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">DocFlow</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="font-medium">{pageTitle}</span>
            </div>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Bell className="h-4.5 w-4.5" />
                {pendingForUser.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-semibold text-warning-foreground">
                    {pendingForUser.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border bg-card shadow-elevated animate-fade-in">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <h4 className="text-sm font-medium">Notifications</h4>
                      {pendingForUser.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">{pendingForUser.length} pending</span>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {pendingForUser.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">No pending actions</div>
                      ) : (
                        pendingForUser.map((doc) => (
                          <Link
                            key={doc.id}
                            to={`/document/${doc.id}`}
                            onClick={() => setNotificationsOpen(false)}
                            className="flex items-start gap-3 border-b last:border-0 px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                              <AvatarImage src={doc.sender.avatar} />
                              <AvatarFallback className="text-[9px] bg-warning/10 text-warning">
                                {doc.sender.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{doc.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                From {doc.sender.name} • {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                              </p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentUser.department}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
