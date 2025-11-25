// src/pages/AuthPage.jsx
import React, { useState } from "react";
import { signUpEmail, signInEmail, signInWithGoogle, signInAnon } from "../firebase";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "login") await signInEmail(email, password);
      else await signUpEmail(email, password);
    } catch (error) { setErr(error.message); }
  };

  return (
    <div style={{maxWidth:420, margin:"40px auto", padding:20}}>
      <h2>{mode==="login" ? "تسجيل دخول" : "إنشاء حساب"}</h2>
      <form onSubmit={submit}>
        <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input type="password" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)} required/>
        <button type="submit">{mode==="login" ? "دخول" : "تسجيل"}</button>
      </form>
      <hr/>
      <button onClick={()=>signInWithGoogle()}>دخول عبر Google</button>
      <button onClick={()=>signInAnon()}>تصفح كمجهول</button>
      <div>
        <button onClick={()=>setMode(mode==="login"?"signup":"login")}>
          {mode==="login" ? "إنشاء حساب جديد" : "لدي حساب بالفعل"}
        </button>
      </div>
      {err && <p style={{color:"red"}}>{err}</p>}
    </div>
  );
}
