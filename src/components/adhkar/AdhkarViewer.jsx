import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, CheckCircle, Trash2 } from "lucide-react";

const removeTashkeel = (text) => {
  return text.replace(/[\u064B-\u065F\u0670]/g, "");
};

export default function AdhkarViewer({ adhkarList, onClose, onComplete, onDeleteDhikr, title = "أذكار الصباح والمساء" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dhikrList, setDhikrList] = useState(adhkarList);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showTashkeel, setShowTashkeel] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("show-tashkeel");
      return saved === null ? true : saved === "true";
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("show-tashkeel", String(showTashkeel));
    }
  }, [showTashkeel]);

  const currentDhikr = dhikrList[currentIndex];
  const minSwipeDistance = 50;

  const handleTap = () => {
    if (currentDhikr.currentCount > 0) {
      const updated = dhikrList.map((d, i) => 
        i === currentIndex ? { ...d, currentCount: d.currentCount - 1 } : d
      );
      setDhikrList(updated);

      if (currentDhikr.currentCount - 1 === 0 && currentIndex < dhikrList.length - 1) {
        setTimeout(() => setCurrentIndex(currentIndex + 1), 500);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < dhikrList.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleComplete = () => {
    onComplete(dhikrList);
    onClose();
  };

  const handleDeleteDhikr = () => {
    if (window.confirm("هل أنت متأكد من حذف هذا الذكر؟")) {
      const updatedList = dhikrList.filter((_, i) => i !== currentIndex);
      setDhikrList(updatedList);

      if (updatedList.length === 0) {
        onClose();
      } else if (currentIndex >= updatedList.length) {
        setCurrentIndex(updatedList.length - 1);
      }

      if (onDeleteDhikr) {
        onDeleteDhikr(currentDhikr.id);
      }
    }
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) handlePrevious();
    if (isRightSwipe) handleNext();
  };

  const allCompleted = dhikrList.every((d) => d.currentCount === 0);
  const displayText = showTashkeel ? currentDhikr.text : removeTashkeel(currentDhikr.text);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-extrabold text-white">{title}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTashkeel(!showTashkeel)}
              className={`rounded-full ${showTashkeel ? "bg-purple-500 text-white" : "bg-gray-700 text-white"}`}
              title={showTashkeel ? "إخفاء التشكيل" : "إظهار التشكيل"}
            >
              <span className="font-bold text-lg">ت</span>
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="rounded-full hover:bg-red-100 text-white"
            >
              <X className="w-6 h-6 text-red-500" />
            </Button>
          </div>
        </div>

        <Card
          className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-purple-200 shadow-2xl rounded-2xl"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <CardContent className="p-8 space-y-8">
            <div className="flex justify-center gap-2">
              {dhikrList.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? "w-10 bg-purple-600"
                      : dhikrList[i].currentCount === 0
                        ? "w-3 bg-purple-400"
                        : "w-3 bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <div
              className="text-center cursor-pointer select-none min-h-[220px] flex items-center justify-center"
              onClick={handleTap}
            >
              <p className="text-2xl md:text-4xl font-semibold text-gray-800 leading-relaxed">
                {displayText}
              </p>
            </div>

            {currentDhikr.virtue && (
              <div className="text-center bg-yellow-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentDhikr.virtue}
                </p>
              </div>
            )}

            <div className="text-center">
              <div
                className={`mx-auto flex items-center justify-center w-24 h-24 rounded-full shadow-inner border-4 text-3xl font-bold ${
                  currentDhikr.currentCount === 0
                    ? "bg-green-100 text-green-600 border-green-300"
                    : "bg-white text-purple-600 border-purple-400"
                }`}
              >
                {currentDhikr.currentCount === 0 ? (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                ) : (
                  currentDhikr.currentCount
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {currentDhikr.currentCount === 0 ? "مكتمل" : "اضغط للتكرار"}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
                السابق
              </Button>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">
                  {currentIndex + 1} / {dhikrList.length}
                </div>
                {onDeleteDhikr && dhikrList.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteDhikr}
                    className="text-red-600 rounded-full hover:bg-red-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentIndex === dhikrList.length - 1}
                className="flex items-center gap-2 rounded-full"
              >
                التالي
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>

            {allCompleted && (
              <div className="text-center pt-6">
                <Button
                  onClick={handleComplete}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-6 text-lg font-bold"
                >
                  <CheckCircle className="w-6 h-6 ml-2" />
                  إنهاء الأذكار
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-300 mt-4">
          اسحب من اليمين لليسار للسابق، ومن اليسار لليمين للتالي
        </p>
      </div>
    </div>
  );
}