import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mic, 
  Settings, 
  CheckCircle, 
  Chrome,
  Wifi,
  Volume2,
  Radio,
  ArrowRight,
  Info,
  ExternalLink,
  Copy
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AudioSetupGuide() {
  const navigate = useNavigate();
  const [copiedAppId, setCopiedAppId] = React.useState(false);
  const [copiedCert, setCopiedCert] = React.useState(false);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'appId') {
      setCopiedAppId(true);
      setTimeout(() => setCopiedAppId(false), 2000);
    } else {
      setCopiedCert(true);
      setTimeout(() => setCopiedCert(false), 2000);
    }
  };

  const agoraSteps = [
    {
      number: "1",
      title: "إنشاء حساب Agora",
      details: [
        "اذهب إلى: https://console.agora.io",
        "انقر على 'Sign Up' للتسجيل (مجاني)",
        "أكمل التسجيل عبر البريد الإلكتروني"
      ],
      color: "blue"
    },
    {
      number: "2", 
      title: "إنشاء مشروع RTC جديد",
      details: [
        "من لوحة التحكم، انقر 'Projects'",
        "انقر 'Create' لإنشاء مشروع جديد",
        "اختر 'Voice Call' أو 'Video Call'",
        "اختر 'Secured Mode' (موصى به) أو 'Testing Mode'",
        "أدخل اسم المشروع واحفظ"
      ],
      color: "purple"
    },
    {
      number: "3",
      title: "الحصول على App ID و Certificate",
      details: [
        "بعد إنشاء المشروع، ستجد 'App ID'",
        "انسخ App ID (انقر على أيقونة النسخ)",
        "لـ Certificate: انقر على زر التحرير بجانب App ID",
        "فعّل 'Primary Certificate' إذا لم يكن مفعلاً",
        "انسخ Primary Certificate (سيظهر مرة واحدة فقط)"
      ],
      color: "green"
    },
    {
      number: "4",
      title: "إضافة Credentials في Base44",
      details: [
        "اذهب إلى Dashboard → Settings → Environment Variables",
        "أضف متغير جديد: AGORA_APP_ID",
        "الصق App ID الذي نسخته",
        "أضف متغير آخر: AGORA_APP_CERTIFICATE",
        "الصق Certificate الذي نسخته",
        "احفظ التغييرات"
      ],
      color: "orange"
    }
  ];

  const colorClasses = {
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-pink-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-amber-500"
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mb-4">
            <Radio className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            دليل إعداد البث الصوتي
          </h1>
          <p className="text-lg text-gray-600">
            خطوات بسيطة لتفعيل البث الصوتي الحقيقي عبر Agora
          </p>
        </motion.div>

        <Alert className="mb-8 bg-yellow-50 border-yellow-200">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            ⚠️ <strong>هام:</strong> المشروع الموجود في الصورة هو Chat وليس RTC. يجب إنشاء مشروع جديد من نوع Voice/Video Call
          </AlertDescription>
        </Alert>

        <div className="space-y-6 mb-8">
          {agoraSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-2 border-purple-100 overflow-hidden">
                <CardHeader className={`bg-gradient-to-r ${colorClasses[step.color]} text-white`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-bold">{step.number}</span>
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {index === 0 && (
                    <Button
                      className="mt-4 gap-2"
                      onClick={() => window.open('https://console.agora.io', '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      افتح Agora Console
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6 text-purple-600" />
              مثال على الإعدادات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-xl p-4 border-2 border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">AGORA_APP_ID</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('d210dd39eb7f40cb86893dbd32a8f3d4', 'appId')}
                >
                  {copiedAppId ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded block">
                d210dd39eb7f40cb86893dbd32a8f3d4
              </code>
              <p className="text-xs text-gray-500 mt-2">مثال - استخدم App ID الخاص بك</p>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">AGORA_APP_CERTIFICATE</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('abc123...xyz', 'cert')}
                >
                  {copiedCert ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded block">
                ••••••••••••••••••••••••••••••
              </code>
              <p className="text-xs text-gray-500 mt-2">سري - احفظه في مكان آمن</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Volume2 className="w-6 h-6 text-green-600" />
              جاهز للبدء؟
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">✅ حساب Agora جاهز</p>
                  <p className="text-sm text-gray-600">مشروع RTC تم إنشاؤه</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">✅ Credentials منسوخة</p>
                  <p className="text-sm text-gray-600">App ID و Certificate</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">✅ متغيرات البيئة</p>
                  <p className="text-sm text-gray-600">تمت الإضافة في Base44</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">✅ الميكروفون جاهز</p>
                  <p className="text-sm text-gray-600">يعمل بشكل صحيح</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => navigate(createPageUrl("CreateBroadcast"))}
                className="flex-1 h-14 text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
              >
                <Radio className="w-5 h-5" />
                ابدأ البث الآن
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("Home"))}
                variant="outline"
                className="h-14 px-6"
              >
                العودة
              </Button>
            </div>
          </CardContent>
        </Card>

        <Alert className="mt-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            💡 <strong>نصيحة:</strong> احتفظ بنسخة من App ID و Certificate في مكان آمن. ستحتاجها مرة أخرى إذا أردت نقل المشروع أو إعادة الإعداد
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}