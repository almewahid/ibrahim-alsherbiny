import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

export default function StarRating({ recordingId, user }) {
  const queryClient = useQueryClient();
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [review, setReview] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: ratings = [] } = useQuery({
    queryKey: ["ratings", recordingId],
    queryFn: () => base44.entities.Rating.filter({ recording_id: recordingId }),
    enabled: !!recordingId,
  });

  const { data: myRating } = useQuery({
    queryKey: ["my-rating", recordingId, user?.id],
    queryFn: async () => {
      const r = await base44.entities.Rating.filter({ recording_id: recordingId, user_id: user.id });
      return r[0] || null;
    },
    enabled: !!recordingId && !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => myRating?.id
      ? base44.entities.Rating.update(myRating.id, data)
      : base44.entities.Rating.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ratings", recordingId] });
      queryClient.invalidateQueries({ queryKey: ["my-rating", recordingId, user?.id] });
      setShowForm(false);
    },
  });

  const avgRating = ratings.length > 0
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : 0;

  const openForm = () => {
    if (myRating) { setSelected(myRating.rating); setReview(myRating.review || ""); }
    setShowForm(!showForm);
  };

  const handleSave = () => {
    if (!selected) return;
    saveMutation.mutate({
      recording_id: recordingId,
      user_id: user.id,
      user_name: user.full_name || user.email,
      rating: selected,
      review: review.trim() || undefined,
    });
  };

  return (
    <div className="bg-white border-2 border-yellow-100 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          التقييمات والمراجعات
        </h3>
        <div className="flex items-center gap-2">
          {ratings.length > 0 && (
            <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-xl border border-yellow-200">
              <span className="text-xl font-bold text-yellow-600">{avgRating.toFixed(1)}</span>
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-gray-500">({ratings.length})</span>
            </div>
          )}
          {user && (
            <Button size="sm" variant="outline" onClick={openForm}
              className="border-yellow-200 text-yellow-700 hover:bg-yellow-50">
              {myRating ? "تعديل تقييمك" : "+ أضف تقييم"}
            </Button>
          )}
        </div>
      </div>

      {/* Rating Form */}
      {showForm && user && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-1 justify-center">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(star)}>
                <Star className={`w-8 h-8 transition-all ${star <= (hovered || selected) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
              </button>
            ))}
          </div>
          <Textarea value={review} onChange={e => setReview(e.target.value)}
            placeholder="اكتب مراجعتك (اختياري)..."
            className="bg-white min-h-[80px] text-sm" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button size="sm" disabled={!selected || saveMutation.isPending} onClick={handleSave}
              className="bg-yellow-500 hover:bg-yellow-600 text-white">
              {saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ التقييم"}
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {ratings.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">لا توجد تقييمات بعد. كن الأول!</p>
        ) : ratings.map(r => (
          <div key={r.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {r.user_name?.[0] || "؟"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-800">{r.user_name}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                  ))}
                </div>
              </div>
              {r.review && <p className="text-sm text-gray-600 leading-relaxed">{r.review}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}