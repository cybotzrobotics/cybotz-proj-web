"use client";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

interface FTCTeam {
  team_number: number;
  team_name: string;
  team_name_short: string;
  team_name_long?: string;
  team_key: string;
  city?: string;
  state_prov?: string;
  country?: string;
}

export default function RegisterTeam() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    username: "",
    teamNumber: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [filteredTeams, setFilteredTeams] = useState<FTCTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<FTCTeam | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // FTC Team search - Updated to use database cache
  useEffect(() => {
    const searchTeams = async () => {
      if (teamSearch.length < 2) {
        setFilteredTeams([]);
        return;
      }

      setSearchLoading(true);
      try {
        // Search from cached database
        const { data, error } = await supabase
          .rpc('search_teams', { search_term: teamSearch })
        
        if (error) throw error;
        
        setFilteredTeams(data || []);
        
      } catch (error) {
        console.error('Error searching teams:', error);
        setFilteredTeams([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchTeams, 300);
    return () => clearTimeout(timeoutId);
  }, [teamSearch]);

  const handleTeamSelect = (team: FTCTeam) => {
    setSelectedTeam(team);
    setForm(prev => ({ ...prev, teamNumber: team.team_number.toString() }));
    setTeamSearch(`${team.team_number} - ${team.team_name_short || team.team_name}`);
    setFilteredTeams([]);
  };

  // Registration logic
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validation
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

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            username: form.username,
            team_number: selectedTeam.team_number,
            team_name: selectedTeam.team_name_short || selectedTeam.team_name,
            team_key: selectedTeam.team_key
          }
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Registration successful! Please check your email to verify your account.");
        setForm({
          email: "",
          password: "",
          confirmPassword: "",
          fullName: "",
          username: "",
          teamNumber: ""
        });
        setSelectedTeam(null);
        setTeamSearch("");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Matrix Background - Let it show through */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-cyber font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent mb-2">
              Register Your Team
            </h1>
            <p className="text-gray-400">Join the FTC Quiz competition</p>
          </div>

          {/* Registration Form - Made transparent */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-red-800/30">
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Form in 3-column grid to fit on screen */}
              <div className="grid grid-cols-1 gap-4">
                {/* Row 1: Email and Full Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                      placeholder="student@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                      placeholder="Your Name"
                    />
                  </div>
                </div>

                {/* Row 2: Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                    placeholder="Username for leaderboard"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be displayed on the leaderboard</p>
                </div>

                {/* Row 3: Team Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    FTC Team
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={teamSearch}
                      onChange={(e) => {
                        setTeamSearch(e.target.value);
                        setSelectedTeam(null);
                      }}
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                      placeholder="Search by team number or name..."
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="text-red-400 text-xs">Searching for team...</div>
                      </div>
                    )}
                    {filteredTeams.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                        {filteredTeams.map((team) => (
                          <button
                            key={team.team_number}
                            type="button"
                            onClick={() => handleTeamSelect(team)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0"
                          >
                            <div className="font-medium">{team.team_number} - {team.team_name_short || team.team_name}</div>
                            {(team.city || team.state_prov) && (
                              <div className="text-xs text-gray-400">
                                {[team.city, team.state_prov, team.country].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* No results message */}
                    {teamSearch.length >= 2 && !searchLoading && filteredTeams.length === 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg p-3 text-gray-400 text-sm">
                        No teams found matching "{teamSearch}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: Password fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={form.confirmPassword}
                      onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-green-300 text-sm">
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !selectedTeam}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all transform hover:scale-105 disabled:hover:scale-100"
              >
                {loading ? "Registering..." : "Register Team"}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <button
                onClick={() => window.location.href = '/login'}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
