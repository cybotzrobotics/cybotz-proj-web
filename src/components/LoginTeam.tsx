"use client";
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function LoginTeam() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (loginError) throw loginError;
      setSuccess("Login successful! Redirecting...");
      // Redirect to dashboard after login
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-black/80 rounded-xl p-8 mt-8 shadow-lg border border-red-800">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Team Login</h2>
      <form onSubmit={handleLogin}>
        <input name="email" value={form.email} onChange={handleChange} required type="email" placeholder="Email" className="w-full p-2 rounded bg-black border border-red-700 text-white mb-4" />
        <input name="password" value={form.password} onChange={handleChange} required type="password" placeholder="Password" className="w-full p-2 rounded bg-black border border-red-700 text-white mb-4" />
        <button type="submit" disabled={loading} className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white font-bold">{loading ? "Logging in..." : "Login"}</button>
        {error && <div className="text-red-400 mt-2">{error}</div>}
        {success && <div className="text-green-400 mt-2">{success}</div>}
      </form>
    </div>
  );
}
