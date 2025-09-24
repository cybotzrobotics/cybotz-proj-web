"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../utils/supabaseClient";
import TeamSearch from "./TeamSearch";
import TermsAndConditions from "./TermsAndConditions";
import { UserPlus, LogIn, ArrowLeft } from "lucide-react";

interface FTCTeam {
  team_number: number;
  team_name: string;
  team_name_short: string;
  team_name_long?: string;
  city?: string;
  state_prov?: string;
  country?: string;
}

export default function LoginTeam() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({
    emailOrUsername: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    username: "",
    teamNumber: ""
  });
  const [selectedTeam, setSelectedTeam] = useState<FTCTeam | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTeamSelect = (team: FTCTeam | null) => {
    setSelectedTeam(team);
    if (team) {
      setForm(prev => ({ ...prev, teamNumber: team.team_number.toString() }));
    } else {
      setForm(prev => ({ ...prev, teamNumber: "" }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If terms not accepted yet, show terms modal
    if (!termsAccepted) {
      setShowTerms(true);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    // Validation for signup
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    if (!selectedTeam) {
      setError("Please select a valid FTC team");
      setLoading(false);
      return;
    }

    if (!form.username.trim()) {
      setError("Username is required for leaderboard ranking");
      setLoading(false);
      return;
    }

    if (!form.fullName.trim()) {
      setError("Full name is required");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.emailOrUsername,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            username: form.username,
            team_number: selectedTeam.team_number,
            team_name: selectedTeam.team_name,
            team_name_short: selectedTeam.team_name_short,
            team_city: selectedTeam.city,
            team_state: selectedTeam.state_prov,
            team_country: selectedTeam.country,
          }
        }
      });

      if (error) throw error;

      if (data.user && !data.user.email_confirmed_at) {
        setSuccess("Registration successful! Please check your email to verify your account. The verification link will expire in 24 hours.");
      } else {
        setSuccess("Registration successful! You can now log in.");
      }

      // Reset form after successful registration
      setForm({
        emailOrUsername: "",
        password: "",
        confirmPassword: "",
        fullName: "",
        username: "",
        teamNumber: ""
      });
      setSelectedTeam(null);

    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    const input = form.emailOrUsername.trim();
    
    try {
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
      } else if (err.message.includes('Email not confirmed')) {
        setError('Your email address hasn\'t been verified yet. Use the "Resend Verification" button below to get a new verification email.');
        setResendEmail(input);
        setShowResendVerification(true);
      } else if (err.message.includes('signup_disabled')) {
        setError('Account signup is temporarily disabled. Please contact support.');
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

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });
      
      if (error) throw error;
      
      setSuccess("Verification email resent! Please check your inbox and spam folder. The new link will be valid for 24 hours.");
      setShowResendVerification(false);
      setResendEmail("");
    } catch (err: any) {
      if (err.message.includes('Already confirmed')) {
        setError("This email is already verified! You can log in normally.");
      } else if (err.message.includes('User not found')) {
        setError("No account found with this email. Please sign up first or check the email address.");
      } else {
        setError(err.message || "Failed to resend verification email");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const resetAllStates = () => {
    setShowForgotPassword(false);
    setShowResendVerification(false);
    setShowTerms(false);
    setTermsAccepted(false);
    setError("");
    setSuccess("");
    setResetEmail("");
    setResendEmail("");
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTerms(false);
    // Automatically submit the form after terms acceptance
    const formEvent = new Event('submit') as any;
    handleRegister(formEvent);
  };

  const handleTermsDecline = () => {
    setShowTerms(false);
    setError("You must accept the terms and conditions to create an account.");
  };

  const handleTermsClose = () => {
    setShowTerms(false);
  };

  return (
    <div className="bg-black/90 rounded-xl p-8 shadow-2xl border border-red-800/50 backdrop-blur-sm">
      {/* Header with Toggle */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsSignUp(false);
              resetAllStates();
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
              !isSignUp 
                ? "bg-red-600 text-white shadow-lg" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsSignUp(true);
              resetAllStates();
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
              isSignUp 
                ? "bg-red-600 text-white shadow-lg" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up</span>
          </motion.button>
        </div>
        
        <h2 className="text-2xl font-bold text-red-500">
          {showForgotPassword ? "Reset Password" : 
           showResendVerification ? "Resend Verification" : 
           isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
      </div>
      
      {/* Form Content */}
      {showForgotPassword ? (
        /* FORGOT PASSWORD FORM */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
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
                onClick={resetAllStates}
                className="text-red-400 hover:text-red-300 text-sm underline transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
            </div>
          </form>
        </motion.div>
      ) : showResendVerification ? (
        /* RESEND VERIFICATION FORM */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleResendVerification} className="space-y-4">
            <div className="text-gray-300 text-sm mb-4">
              <p>Didn't receive a verification email or did your link expire?</p>
              <p className="mt-1 text-xs text-gray-400">
                We'll send you a fresh verification link that's valid for 24 hours.
              </p>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Email</label>
              <input 
                value={resendEmail} 
                onChange={(e) => setResendEmail(e.target.value)}
                required 
                type="email" 
                placeholder="your.email@example.com" 
                className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={resendLoading} 
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg text-white font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {resendLoading ? "Sending..." : "Resend Verification Email"}
            </button>
            
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={resetAllStates}
                className="text-red-400 hover:text-red-300 text-sm underline transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
              <div className="text-xs text-gray-500">
                Already verified? Try logging in normally.
              </div>
            </div>
          </form>
        </motion.div>
      ) : (
        /* LOGIN/SIGNUP FORM */
        <motion.div
          key={isSignUp ? "signup" : "login"}
          initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isSignUp ? (
            /* SIGNUP FORM */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Full Name</label>
                  <input 
                    name="fullName" 
                    value={form.fullName} 
                    onChange={handleChange} 
                    required 
                    type="text" 
                    placeholder="Your full name" 
                    className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Username</label>
                  <input 
                    name="username" 
                    value={form.username} 
                    onChange={handleChange} 
                    required 
                    type="text" 
                    placeholder="Choose a username" 
                    className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input 
                  name="emailOrUsername" 
                  value={form.emailOrUsername} 
                  onChange={handleChange} 
                  required 
                  type="email" 
                  placeholder="your.email@example.com" 
                  className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">FTC Team</label>
                <TeamSearch
                  onTeamSelect={handleTeamSelect}
                  selectedTeam={selectedTeam}
                  placeholder="Search for your FTC team..."
                  className="w-full"
                />
                {selectedTeam && (
                  <div className="mt-2 p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
                    <div className="text-green-400 text-sm font-semibold">
                      Selected: #{selectedTeam.team_number} - {selectedTeam.team_name_short || selectedTeam.team_name}
                    </div>
                    {selectedTeam.city && (
                      <div className="text-green-300 text-xs mt-1">
                        {[selectedTeam.city, selectedTeam.state_prov, selectedTeam.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Password</label>
                  <input 
                    name="password" 
                    value={form.password} 
                    onChange={handleChange} 
                    required 
                    type="password" 
                    placeholder="Choose a password" 
                    className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Confirm Password</label>
                  <input 
                    name="confirmPassword" 
                    value={form.confirmPassword} 
                    onChange={handleChange} 
                    required 
                    type="password" 
                    placeholder="Confirm your password" 
                    className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading || !selectedTeam} 
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : (
            /* LOGIN FORM */
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
              
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-red-400 hover:text-red-300 text-sm underline transition-colors block mx-auto"
                >
                  Forgot your password?
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowResendVerification(true)}
                  className="text-yellow-400 hover:text-yellow-300 text-sm underline transition-colors block mx-auto"
                >
                  Didn't receive verification email?
                </button>
              </div>
            </form>
          )}
        </motion.div>
      )}
      
      {/* Error and Success Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-900/50 border border-red-700 rounded-lg mt-4"
        >
          <div className="text-red-400 text-sm">{error}</div>
        </motion.div>
      )}
      
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-green-900/50 border border-green-700 rounded-lg mt-4"
        >
          <div className="text-green-400 text-sm">{success}</div>
        </motion.div>
      )}

      {/* Terms and Conditions Modal */}
      <TermsAndConditions
        isOpen={showTerms}
        onClose={handleTermsClose}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
    </div>
  );
}