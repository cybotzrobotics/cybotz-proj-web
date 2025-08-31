"use client";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

interface FTCTeam {
  number: number;
  name: string;
  schoolName?: string;
  city?: string;
  stateProv?: string;
  country?: string;
  region?: string;
}

export default function RegisterTeam() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student" as "student" | "mentor" | "coach",
    team_number: "",
    team_name: "",
    school_name: "",
    region: "",
    isCreatingTeam: false, // Default to joining existing team
    joinCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ftcTeams, setFtcTeams] = useState<FTCTeam[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<FTCTeam[]>([]);
  const [teamSearch, setTeamSearch] = useState("");

  // Fetch specific team from FTCScout API by team number
  const searchTeamByNumber = async (teamNumber: string) => {
    if (!teamNumber.trim()) {
      setFilteredTeams([]);
      return;
    }

    setTeamsLoading(true);
    try {
      // Try direct team lookup first
      const directResponse = await fetch(`https://api.ftcscout.org/rest/v1/teams/${teamNumber}`);
      if (directResponse.ok) {
        const team = await directResponse.json();
        setFilteredTeams([{
          number: team.number,
          name: team.name,
          schoolName: team.schoolName,
          city: team.city,
          stateProv: team.stateProv,
          country: team.country,
          region: team.region
        }]);
        setTeamsLoading(false);
        return;
      }

      // If direct lookup fails, try search
      const searchResponse = await fetch(`https://api.ftcscout.org/rest/v1/teams/search?searchText=${encodeURIComponent(teamNumber)}&limit=20`);
      if (searchResponse.ok) {
        const teams = await searchResponse.json();
        setFilteredTeams(teams.map((team: any) => ({
          number: team.number,
          name: team.name,
          schoolName: team.schoolName,
          city: team.city,
          stateProv: team.stateProv,
          country: team.country,
          region: team.region
        })));
      } else {
        setFilteredTeams([]);
        setError('No teams found. Please check the team number and try again.');
      }
    } catch (err) {
      console.error('Failed to fetch team:', err);
      setError('Failed to search for team. Please try again.');
      setFilteredTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Remove the old useEffect that fetched all teams
  // useEffect(() => {
  //   const fetchTeams = async () => {
  //     setTeamsLoading(true);
  //     try {
  //       const response = await fetch('https://api.ftcscout.org/rest/v1/teams/search?limit=1000');
  //       if (response.ok) {
  //         const teams = await response.json();
  //         setFtcTeams(teams);
  //         setFilteredTeams(teams);
  //       }
  //     } catch (err) {
  //       console.error('Failed to fetch FTC teams:', err);
  //       setError('Failed to load team data. Please try again.');
  //     } finally {
  //       setTeamsLoading(false);
  //     }
  //   };
  //   fetchTeams();
  // }, []);

  // Search teams when user types
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchTeamByNumber(teamSearch);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [teamSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTeamSelect = (team: FTCTeam) => {
    setForm({
      ...form,
      team_number: team.number.toString(),
      team_name: team.name,
      school_name: team.schoolName || "",
      region: team.region || ""
    });
    setTeamSearch(`${team.number} - ${team.name}`);
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  // Registration logic
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // 1. Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { 
          data: { 
            full_name: form.full_name,
            role: form.role,
            team_number: form.team_number,
            team_name: form.team_name
          } 
        },
      });
      if (authError) throw authError;
      
      setSuccess("Registration successful! Check your email to verify your account.");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-red-600' : 'bg-gray-700'}`}>
            <span className="text-white text-sm font-bold">1</span>
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-red-600' : 'bg-gray-700'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-red-600' : 'bg-gray-700'}`}>
            <span className="text-white text-sm font-bold">2</span>
          </div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-red-600' : 'bg-gray-700'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-red-600' : 'bg-gray-700'}`}>
            <span className="text-white text-sm font-bold">3</span>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-400">
          <span>Personal Info</span>
          <span>Team Selection</span>
          <span>Confirmation</span>
        </div>
      </div>

      <div className="bg-black/90 rounded-xl p-8 shadow-2xl border border-red-800/50 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-red-500 mb-6 text-center">Join the Competition</h2>
        
        <form onSubmit={handleRegister}>
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Personal Information</h3>
              
              <div>
                <label className="block text-gray-300 mb-2">Full Name</label>
                <input 
                  name="full_name" 
                  value={form.full_name} 
                  onChange={handleChange} 
                  required 
                  placeholder="Enter your full name" 
                  className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Email Address</label>
                <input 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  required 
                  type="email" 
                  placeholder="your.email@example.com" 
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
                  placeholder="Choose a strong password" 
                  className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Role</label>
                <input 
                  name="role" 
                  value="Student" 
                  readOnly
                  className="w-full p-3 rounded-lg bg-gray-800/70 border border-gray-600 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Currently only accepting student registrations</p>
              </div>

              <button 
                type="button" 
                onClick={handleNext} 
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition-all transform hover:scale-105"
              >
                Continue to Team Selection
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Team Selection</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-700 hover:border-red-600 transition-colors cursor-pointer">
                  <input 
                    type="radio" 
                    name="isCreatingTeam" 
                    checked={!form.isCreatingTeam} 
                    onChange={() => setForm(f => ({ ...f, isCreatingTeam: false }))}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="text-white font-semibold">Join Existing FTC Team</div>
                    <div className="text-gray-400 text-sm">Find your team from the official FTC roster</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-700 hover:border-red-600 transition-colors cursor-pointer">
                  <input 
                    type="radio" 
                    name="isCreatingTeam" 
                    checked={form.isCreatingTeam} 
                    onChange={() => setForm(f => ({ ...f, isCreatingTeam: true }))}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="text-white font-semibold">Create New Team Entry</div>
                    <div className="text-gray-400 text-sm">For teams not yet in our system</div>
                  </div>
                </label>
              </div>

              {!form.isCreatingTeam ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Search for Your FTC Team</label>
                    <input 
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      placeholder="Enter team number (e.g., 12345)"
                      className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">Type your team number to search the official FTC database</p>
                  </div>

                  {teamsLoading && (
                    <div className="text-center py-4 text-gray-400">Searching teams...</div>
                  )}

                  {filteredTeams.length > 0 && !teamsLoading && (
                    <div className="bg-black/50 rounded-lg border border-red-700/50">
                      {filteredTeams.map((team) => (
                        <div
                          key={team.number}
                          onClick={() => handleTeamSelect(team)}
                          className="p-3 hover:bg-red-600/20 cursor-pointer border-b border-gray-800 last:border-b-0 transition-colors"
                        >
                          <div className="text-white font-semibold">#{team.number} - {team.name}</div>
                          {team.schoolName && <div className="text-gray-400 text-sm">{team.schoolName}</div>}
                          {team.city && team.stateProv && (
                            <div className="text-gray-500 text-xs">{team.city}, {team.stateProv}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredTeams.length === 0 && teamSearch && !teamsLoading && (
                    <div className="p-4 text-center text-gray-400 bg-black/50 rounded-lg border border-red-700/50">
                      No teams found. Please check the team number or try creating a new team entry.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Team Number</label>
                    <input 
                      name="team_number" 
                      value={form.team_number} 
                      onChange={handleChange} 
                      required 
                      placeholder="Enter your FTC team number" 
                      className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Team Name</label>
                    <input 
                      name="team_name" 
                      value={form.team_name} 
                      onChange={handleChange} 
                      required 
                      placeholder="Enter your team name" 
                      className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">School Name (Optional)</label>
                    <input 
                      name="school_name" 
                      value={form.school_name} 
                      onChange={handleChange} 
                      placeholder="Enter school or organization name" 
                      className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Region (Optional)</label>
                    <input 
                      name="region" 
                      value={form.region} 
                      onChange={handleChange} 
                      placeholder="e.g., California North, Texas East" 
                      className="w-full p-3 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors" 
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={handleBack} 
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors"
                >
                  Back
                </button>
                <button 
                  type="button" 
                  onClick={handleNext} 
                  disabled={!form.team_number || !form.team_name}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Review & Register
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Confirm Registration</h3>
              
              <div className="bg-black/50 rounded-lg p-6 border border-red-700/50">
                <h4 className="text-lg font-semibold text-red-400 mb-4">Registration Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white">{form.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{form.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Role:</span>
                    <span className="text-white capitalize">{form.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Team:</span>
                    <span className="text-white">#{form.team_number} - {form.team_name}</span>
                  </div>
                  {form.school_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">School:</span>
                      <span className="text-white">{form.school_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={handleBack} 
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors"
                >
                  Back to Edit
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? "Creating Account..." : "Complete Registration"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <div className="text-red-400">{error}</div>
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-4 bg-green-900/50 border border-green-700 rounded-lg">
              <div className="text-green-400">{success}</div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
