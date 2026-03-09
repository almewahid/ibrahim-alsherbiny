import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Radio, Home, Mic, User, LogOut, MessageCircle, Settings, Image, Sun, Layers, BarChart3, FileQuestion, Trophy, Moon, BookOpen, Film } from "lucide-react";
import { FloatingPlayerProvider } from "./components/recording/FloatingPlayer";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import NotificationBell from "./components/broadcast/NotificationBell";

const navigationItems = [
  {
    title: "الرئيسية",
    url: createPageUrl("Home"),
    icon: Home,
  },
  {
    title: "المكتبة",
    url: createPageUrl("Library"),
    icon: BookOpen,
  },
  {
    title: "الرسائل",
    url: createPageUrl("DirectMessages"),
    icon: MessageCircle,
  },
  {
    title: "الأذكار",
    url: createPageUrl("MorningAdhkar"),
    icon: Sun,
  },
  {
    title: "لوحة الشرف",
    url: createPageUrl("Leaderboard"),
    icon: Trophy,
  },
  {
    title: "ملفي الشخصي",
    url: createPageUrl("UserProfile"),
    icon: User,
  },
];

const adminNavigationItems = [
  {
    title: "ابدأ بث",
    url: createPageUrl("CreateBroadcast"),
    icon: Mic,
  },
  {
    title: "بثوثي",
    url: createPageUrl("MyBroadcasts"),
    icon: User,
  },
  {
    title: "الأغلفة",
    url: createPageUrl("CoversGallery"),
    icon: Image,
  },
  {
    title: "إدارة السلاسل",
    url: createPageUrl("SeriesManager"),
    icon: Layers,
  },
  {
    title: "إدارة المحتوى",
    url: createPageUrl("ContentManager"),
    icon: Film,
  },
  {
    title: "إدارة الاختبارات",
    url: createPageUrl("QuizManager"),
    icon: FileQuestion,
  },
  {
    title: "لوحة الشرف",
    url: createPageUrl("Leaderboard"),
    icon: Trophy,
  },
  {
    title: "الإحصائيات",
    url: createPageUrl("Analytics"),
    icon: BarChart3,
  },
  {
    title: "لوحة التحكم",
    url: createPageUrl("AdminPanel"),
    icon: Settings,
  },
];

function SidebarNav({ user }) {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-sm font-bold text-gray-500 px-3 py-3">
          القائمة الرئيسية
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  className={`hover:bg-purple-100 hover:text-purple-700 transition-all duration-200 rounded-xl mb-2 ${
                    location.pathname === item.url ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600' : ''
                  }`}
                >
                  <Link to={item.url} onClick={handleNavClick} className="flex items-center gap-4 px-4 py-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-semibold text-base">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {user?.role === 'admin' && (
        <>
          <SidebarSeparator className="my-4 bg-purple-200" />
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm font-bold text-purple-700 px-3 py-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              إدارة المنصة
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-purple-100 hover:text-purple-700 transition-all duration-200 rounded-xl mb-2 ${
                        location.pathname === item.url ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600' : ''
                      }`}
                    >
                      <Link to={item.url} onClick={handleNavClick} className="flex items-center gap-4 px-4 py-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-semibold text-base">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}


    </>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);
  const [darkMode, setDarkMode] = React.useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <FloatingPlayerProvider>
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl" style={{background: darkMode ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' : 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)'}}>
      <style>{`
        :root { --primary: 280 100% 65%; --primary-foreground: 0 0% 100%; --background: 270 20% 98%; }
        .dark { --background: 222 47% 8%; --foreground: 210 40% 95%; --card: 222 47% 11%; --card-foreground: 210 40% 95%; --border: 217 33% 20%; --sidebar-background: 222 47% 8%; --sidebar-foreground: 210 40% 90%; --sidebar-border: 217 33% 18%; --sidebar-accent: 217 33% 17%; }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(168,85,247,0.4); } 50% { box-shadow: 0 0 30px rgba(168,85,247,0.8); } }
        .live-pulse { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>
        <Sidebar side="right" className="border-l border-purple-100">
          <SidebarHeader className="border-b border-purple-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center live-pulse">
                <Radio className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-900">د. إبراهيم الشربيني</h2>
                <p className="text-xs text-purple-600">البث الصوتي المباشر</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarNav user={user} />
          </SidebarContent>

          <SidebarFooter className="border-t border-purple-100 p-4">
            {user && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <NotificationBell userId={user.id} />
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setDarkMode(!darkMode)}
                    className="w-9 h-9 p-0 hover:bg-purple-50 hover:text-purple-600"
                    title={darkMode ? 'الوضع المضيء' : 'الوضع المظلم'}
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </Button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-purple-100 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                <Radio className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold text-gray-900">د. إبراهيم الشربيني</h1>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
    </FloatingPlayerProvider>

  );
}