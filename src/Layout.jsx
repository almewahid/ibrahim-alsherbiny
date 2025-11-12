
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Radio, Home, Mic, User, LogOut, MessageCircle, Settings, Image, Sun, Layers, BarChart3 } from "lucide-react";
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
    title: "جميع البثوث",
    url: createPageUrl("PublicBroadcasts"),
    icon: Radio,
  },
  {
    title: "التسجيلات",
    url: createPageUrl("Recordings"),
    icon: Radio,
  },
  {
    title: "السلاسل",
    url: createPageUrl("SeriesPublic"),
    icon: Layers,
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
    title: "جدولة بث",
    url: createPageUrl("ScheduleBroadcast"),
    icon: Settings,
  },
  {
    title: "بثوثي",
    url: createPageUrl("MyBroadcasts"),
    icon: User,
  },
  {
    title: "تصميم الغلاف",
    url: createPageUrl("BroadcastCoverEditor"),
    icon: Image,
  },
  {
    title: "الأغلفة المحفوظة",
    url: createPageUrl("CoversGallery"),
    icon: Image,
  },
  {
    title: "إدارة السلاسل",
    url: createPageUrl("SeriesManager"),
    icon: Layers,
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

      <SidebarGroup className="mt-6">
        <SidebarGroupLabel className="text-sm font-bold text-gray-500 px-3 py-3">
          نصائح سريعة
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <p className="text-sm text-gray-700 leading-relaxed">
              💡 تأكد من السماح للمتصفح بالوصول للميكروفون لبدء البث المباشر
            </p>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);

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
    <SidebarProvider>
      <style>
        {`
          :root {
            --primary: 280 100% 65%;
            --primary-foreground: 0 0% 100%;
            --background: 270 20% 98%;
          }
          
          @keyframes pulse-glow {
            0%, 100% { 
              box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
            }
            50% { 
              box-shadow: 0 0 30px rgba(168, 85, 247, 0.8);
            }
          }
          
          .live-pulse {
            animation: pulse-glow 2s ease-in-out infinite;
          }
        `}
      </style>
      <div className="min-h-screen flex w-full" dir="rtl" style={{background: 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)'}}>
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
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <NotificationBell userId={user.id} />
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
  );
}
