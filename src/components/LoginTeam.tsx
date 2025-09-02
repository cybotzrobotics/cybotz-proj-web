"use client";
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function LoginTeam() {
  const [form, setForm] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const input = form.emailOrUsername.trim();
      
      // Check if input is an email (contains @) or username
      const isEmail = input.includes('@');
      
      if (isEmail) {
        // Direct email login
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: input,
          password: form.password,
        });
        
        if (loginError) throw loginError;
      } else {
        // Username login - we need to try a different approach
        // Since we can't directly query auth metadata, we'll show a helpful message
        setError(`Please use your email address to log in. If you registered with username "${input}", please use the email address you provided during registration.`);
        return;
      }
      
      setSuccess("Login successful!");
      // The auth state change will be handled by the parent component
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setSuccess("Password reset email sent! Check your inbox for instructions.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="bg-black/90 rounded-xl p-8 shadow-2xl border border-red-800/50 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-red-500 mb-6 text-center">
        {showForgotPassword ? "Reset Password" : "Welcome Back"}
      </h2>
      
      {!showForgotPassword ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Email or Username</label>
            <input 
              name="emailOrUsername" 
              value={form.emailOrUsername} 
              onChange={handleChange} 
              required 
              type="text" 
              placeholder="Enter your email or username" 
              className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Password</label>
            <input 
              name="password" 
              value={form.password} 
              onChange={handleChange} 
              required 
              type="password" 
              placeholder="Enter your password" 
              className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="text-gray-300 text-sm mb-4">
            Enter your email address and we'll send you a link to reset your password.
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Email</label>
            <input 
              value={resetEmail} 
              onChange={(e) => setResetEmail(e.target.value)}
              required 
              type="email" 
              placeholder="your.email@example.com" 
              className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={resetLoading} 
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {resetLoading ? "Sending..." : "Send Reset Email"}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail("");
                setError("");
                setSuccess("");
              }}
              className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>
      )}
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg mt-4">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg mt-4">
          <div className="text-green-400 text-sm">{success}</div>
        </div>
      )}
    </div>
  );
}
