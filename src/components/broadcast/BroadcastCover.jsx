import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";

const DESIGN_VARIANTS = [
  { id: 1, colors: "from-purple-600 to-pink-600" },
  { id: 2, colors: "from-blue-600 to-cyan-600" },
  { id: 3, colors: "from-green-600 to-emerald-600" },
  { id: 4, colors: "from-yellow-600 to-orange-600" },
  { id: 5, colors: "from-indigo-600 to-purple-600" }
];

const truncateVerseText = (verses, isHomePage = false) => {
  if (!isHomePage || !verses || verses.length === 0) return verses;
  
  const firstVerse = verses[0];
  if (firstVerse.length > 100) {
    return [firstVerse.substring(0, 100) + "..."];
  }
  return [firstVerse];
};

export default function BroadcastCover({ broadcastId, className = "", isHomePage = false }) {
  const { data: cover, isLoading } = useQuery({
    queryKey: ['broadcastCover', broadcastId],
    queryFn: async () => {
      const covers = await base44.entities.BroadcastCover.filter({ broadcast_id: broadcastId });
      return covers[0];
    },
    enabled: !!broadcastId && broadcastId !== "preview",
  });

  if (isLoading) {
    return (
      <div className={`relative aspect-video rounded-2xl overflow-hidden ${className}`}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!cover) {
    return (
      <div className={`relative aspect-video rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center ${className}`}>
        <div className="text-white text-center p-6">
          <p className="text-2xl font-bold mb-2">لا يوجد غلاف بعد</p>
          <p className="text-sm opacity-80">سيتم عرض الغلاف عند إضافته</p>
        </div>
      </div>
    );
  }

  const selectedDesign = DESIGN_VARIANTS.find(d => d.id === (cover.design_variant || 1));

  if (cover.custom_image_url) {
    return (
      <div className={`relative aspect-video rounded-2xl overflow-hidden shadow-2xl ${className}`}>
        <img 
          src={cover.custom_image_url} 
          alt={cover.fixed_title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const displayVerses = truncateVerseText(cover.verses_text, isHomePage);

  return (
    <div className={`relative ${isHomePage ? 'min-h-[300px]' : 'min-h-[400px]'} rounded-2xl bg-gradient-to-br ${selectedDesign?.colors} shadow-2xl ${className}`}>
      <div className="absolute inset-0 bg-black/20" />
      
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id={`pattern-${broadcastId}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2" fill="white" />
          </pattern>
          <rect width="100" height="100" fill={`url(#pattern-${broadcastId})`} />
        </svg>
      </div>

      <div className={`relative z-10 flex flex-col ${isHomePage ? 'p-4 md:p-6' : 'p-6 md:p-10'} ${isHomePage ? 'min-h-[300px]' : 'min-h-[400px]'}`}>
        {cover.template_type === "تفسير" && displayVerses && displayVerses.length > 0 && (
          <>
            <div className="text-center mb-4">
              <h2 className={`${isHomePage ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl'} font-bold text-white mb-2 drop-shadow-2xl`}>
                سورة {cover.surah_name}
              </h2>
              <p className={`${isHomePage ? 'text-base md:text-xl' : 'text-xl md:text-3xl'} font-bold text-white/90 drop-shadow-lg`}>
                {cover.verse_from === cover.verse_to 
                  ? `الآية ${cover.verse_from}`
                  : `من الآية ${cover.verse_from} إلى ${cover.verse_to}`
                }
              </p>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              <div className={`bg-white/15 backdrop-blur-md rounded-2xl ${isHomePage ? 'p-4 md:p-6' : 'p-8 md:p-12'} w-full border-2 border-white/40 shadow-2xl`}>
                <div className={`${isHomePage ? 'text-base md:text-xl' : 'text-2xl md:text-4xl'} leading-relaxed text-white text-right font-arabic ${isHomePage ? 'line-clamp-3' : ''}`} dir="rtl">
                  {displayVerses.map((verse, index) => (
                    <React.Fragment key={index}>
                      <span className="drop-shadow-lg inline">
                        {verse}
                      </span>
                      {!isHomePage && index < displayVerses.length - 1 && (
                        <span className="mx-2 text-white/60 inline"> ۝ </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {cover.template_type === "حديث" && cover.hadith_text && (
          <>
            <div className="text-center mb-4">
              <h2 className={`${isHomePage ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl'} font-bold text-white mb-2 drop-shadow-2xl`}>
                الحديث {cover.hadith_number}
              </h2>
              <p className={`${isHomePage ? 'text-base md:text-xl' : 'text-xl md:text-2xl'} text-white/90 drop-shadow-lg`}>
                من الأربعين النووية
              </p>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              <div className={`bg-white/15 backdrop-blur-md rounded-2xl ${isHomePage ? 'p-4 md:p-6' : 'p-8 md:p-12'} w-full border-2 border-white/40 shadow-2xl`}>
                <p className={`${isHomePage ? 'text-base md:text-xl line-clamp-3' : 'text-2xl md:text-4xl'} leading-relaxed text-white text-right font-arabic drop-shadow-lg`} dir="rtl">
                  {cover.hadith_text}
                </p>
              </div>
            </div>
          </>
        )}

        {!displayVerses?.length && !cover.hadith_text && (
          <div className="flex-1 flex items-center justify-center">
            <h2 className={`${isHomePage ? 'text-2xl md:text-3xl' : 'text-4xl md:text-6xl'} font-bold text-white text-center drop-shadow-2xl line-clamp-2`}>
              {cover.fixed_title}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}