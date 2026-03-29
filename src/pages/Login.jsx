import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await base44.auth.loginWithEmailPassword(email, password);
      if (result?.token) {
        localStorage.setItem('token', result.token);
      }
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f0f1a',
      fontFamily: "'Cairo', sans-serif", direction: 'rtl'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');`}</style>
      <div style={{
        width: '100%', maxWidth: '420px', margin: '20px',
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
        borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)',
        padding: '48px 40px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '70px', height: '70px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            borderRadius: '20px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '30px'
          }}>🎙️</div>
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '800', margin: '0 0 8px' }}>
            د. إبراهيم الشربيني
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
            تسجيل دخول المشرف
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px', padding: '12px', marginBottom: '20px',
            color: '#fca5a5', fontSize: '14px', textAlign: 'center'
          }}>{error}</div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            dir="ltr"
            style={{
              padding: '14px 18px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '15px',
              fontFamily: 'Cairo, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              padding: '14px 18px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '15px',
              fontFamily: 'Cairo, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '15px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              color: 'white', fontSize: '16px', fontWeight: '700',
              fontFamily: 'Cairo, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, marginTop: '8px'
            }}
          >
            {loading ? '⏳ جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', margin: '24px 0 0' }}>
          <a href="/" style={{ color: 'rgba(139,92,246,0.8)', textDecoration: 'none', fontSize: '14px' }}>
            العودة للرئيسية ←
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;