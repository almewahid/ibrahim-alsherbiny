import { useState } from 'react';
import { base44 } from '@/api/base44Client';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginWithEmailPassword(email, password);
    } catch (err) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
  base44.auth.redirectToLogin(window.location.origin + '/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      direction: 'rtl',
      background: '#0f0f1a',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap');
        
        @keyframes float1 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.15; }
          50% { transform: translateY(-40px) scale(1.1); opacity: 0.25; }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.1; }
          50% { transform: translateY(30px) scale(0.9); opacity: 0.2; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(139, 92, 246, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .login-card {
          animation: fadeSlideIn 0.7s ease forwards;
        }
        .input-field {
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.1);
          color: white;
          width: 100%;
          padding: 14px 18px;
          border-radius: 14px;
          font-size: 15px;
          font-family: 'Cairo', sans-serif;
          outline: none;
          box-sizing: border-box;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.3); }
        .input-field:focus {
          border-color: rgba(139, 92, 246, 0.8);
          background: rgba(139, 92, 246, 0.08);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
        }
        .btn-primary {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-size: 16px;
          font-weight: 700;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #7c3aed, #a855f7, #ec4899);
          background-size: 200% auto;
          color: white;
          letter-spacing: 0.5px;
        }
        .btn-primary:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-google {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.15);
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .btn-google:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
        .logo-pulse {
          animation: pulse-ring 2.5s infinite;
        }
        .eye-btn {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.4);
          font-size: 18px;
          padding: 0;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: rgba(255,255,255,0.7); }
      `}</style>

      {/* Background blobs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
          animation: 'float1 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)',
          animation: 'float2 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '30%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
          animation: 'float1 12s ease-in-out infinite',
        }} />
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Left panel - decorative */}
      <div style={{
        flex: 1,
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
      }} className="left-panel">
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎙️</div>
          <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px', 
            background: 'linear-gradient(135deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            البث الصوتي المباشر
          </h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.8' }}>
            استمع وشارك البث الصوتي<br />من أي مكان في العالم
          </p>
        </div>
      </div>

      {/* Login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        zIndex: 10,
      }}>
        <div className="login-card" style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '28px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '48px 40px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="logo-pulse" style={{
              width: '70px', height: '70px',
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              borderRadius: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px',
            }}>
              🎙️
            </div>
            <h1 style={{
              fontSize: '26px', fontWeight: '800', color: 'white',
              marginBottom: '8px', margin: '0 0 8px 0',
            }}>
              د. إبراهيم الشربيني
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: 0 }}>
              تسجيل الدخول للمنصة
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
              color: '#fca5a5', fontSize: '14px', textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                كلمة المرور
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '46px' }}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? '⏳ جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            margin: '24px 0', color: 'rgba(255,255,255,0.2)', fontSize: '13px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            أو
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Google login */}
          <button className="btn-google" onClick={handleGoogleLogin}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            الدخول بحساب Google
          </button>

          <p style={{ textAlign: 'center', marginTop: '28px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
            للزوار — تصفح الموقع بدون تسجيل دخول
            <br />
            <a href="/" style={{ color: 'rgba(139,92,246,0.8)', textDecoration: 'none', fontWeight: '600' }}>
              العودة للرئيسية ←
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;