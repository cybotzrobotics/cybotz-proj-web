"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../utils/supabaseClient";
import { Search, Check, AlertCircle } from "lucide-react";

interface FTCTeam {
  team_number: number;
  team_name: string;
  team_name_short: string;
  team_name_long?: string;
  city?: string;
  state_prov?: string;
  country?: string;
}

interface TeamSearchProps {
  onTeamSelect: (team: FTCTeam) => void;
  selectedTeam?: FTCTeam | null;
  placeholder?: string;
  className?: string;
}

export default function TeamSearch({ 
  onTeamSelect, 
  selectedTeam, 
  placeholder = "Search for your FTC team...",
  className = ""
}: TeamSearchProps) {
  const [teamSearch, setTeamSearch] = useState("");
  const [filteredTeams, setFilteredTeams] = useState<FTCTeam[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear API error when selectedTeam changes (e.g., after form submission)
  useEffect(() => {
    if (selectedTeam) {
      setApiError("");
    }
  }, [selectedTeam]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FTC Team search - Database first, then API fallback
  useEffect(() => {
    const searchTeams = async () => {
      if (teamSearch.length < 2) {
        setFilteredTeams([]);
        setShowDropdown(false);
        return;
      }

      setSearchLoading(true);
      setApiError("");
      
      try {
        // First, try searching from cached database
        const { data: cachedTeams, error: dbError } = await supabase
          .rpc('search_teams', { search_term: teamSearch });
        
        if (!dbError && cachedTeams && cachedTeams.length > 0) {
          setFilteredTeams(cachedTeams);
          setShowDropdown(true);
          setSearchLoading(false);
          return;
        }

        // If no results from database, try API fallback
        console.log('No cached results, trying API fallback...');
        await searchFromAPI(teamSearch);
        
      } catch (error) {
        console.error('Error searching teams:', error);
        setApiError("Search failed. Please try again.");
        setFilteredTeams([]);
        setShowDropdown(false);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchTeams, 300);
    return () => clearTimeout(timeoutId);
  }, [teamSearch]);

  // API fallback function
  const searchFromAPI = async (searchTerm: string) => {
    setApiLoading(true);
    setApiError("");
    
    try {
      // Try FTCScout API first
      const response = await fetch(`https://ftcscout.org/api/teams/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const teams = data.map((team: any) => ({
            team_number: team.number || team.team_number,
            team_name: team.name || team.team_name,
            team_name_short: team.name_short || team.team_name_short || team.name || team.team_name,
            city: team.city,
            state_prov: team.state || team.state_prov,
            country: team.country
          }));
          
          setFilteredTeams(teams.slice(0, 10)); // Limit to 10 results
          setShowDropdown(true);
          return;
        }
      }

      // Try The Orange Alliance as backup
      const toaResponse = await fetch(`https://theorangealliance.org/api/team?team_name_short=${encodeURIComponent(searchTerm)}`);
      
      if (toaResponse.ok) {
        const toaData = await toaResponse.json();
        if (toaData && toaData.length > 0) {
          const teams = toaData.map((team: any) => ({
            team_number: team.team_number,
            team_name: team.team_name_long || team.team_name,
            team_name_short: team.team_name_short,
            city: team.city,
            state_prov: team.state_prov,
            country: team.country
          }));
          
          setFilteredTeams(teams.slice(0, 10));
          setShowDropdown(true);
          return;
        }
      }

      // If all APIs fail
      setApiError("No teams found. Please check your search term.");
      setFilteredTeams([]);
      setShowDropdown(false);
      
    } catch (error) {
      console.error('API search failed:', error);
      // Only show API error if no team is currently selected
      if (!selectedTeam) {
        setApiError("External APIs unavailable. Please try again later.");
      }
      setFilteredTeams([]);
      setShowDropdown(false);
    } finally {
      setApiLoading(false);
    }
  };

  const handleTeamSelect = (team: FTCTeam) => {
    onTeamSelect(team);
    setTeamSearch(`${team.team_number} - ${team.team_name_short || team.team_name}`);
    setShowDropdown(false);
    setFilteredTeams([]);
    setApiError(""); // Clear any API errors when a team is selected
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeamSearch(e.target.value);
    if (selectedTeam && e.target.value !== `${selectedTeam.team_number} - ${selectedTeam.team_name_short || selectedTeam.team_name}`) {
      onTeamSelect(null as any); // Clear selection if user is typing different text
    }
  };

  const displayValue = selectedTeam 
    ? `${selectedTeam.team_number} - ${selectedTeam.team_name_short || selectedTeam.team_name}`
    : teamSearch;

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (filteredTeams.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
        />
        
        {/* Loading/Status Icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {(searchLoading || apiLoading) && (
            <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-red-500 rounded-full" />
          )}
          {selectedTeam && !searchLoading && !apiLoading && (
            <Check className="w-5 h-5 text-green-500" />
          )}
          {apiError && !selectedTeam && !searchLoading && !apiLoading && (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Error Message - Only show if no team is selected */}
      {apiError && !selectedTeam && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-400 flex items-center space-x-2"
        >
          <AlertCircle className="w-4 h-4" />
          <span>{apiError}</span>
        </motion.div>
      )}

      {/* Dropdown Results */}
      <AnimatePresence>
        {showDropdown && filteredTeams.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
          >
            {filteredTeams.map((team, index) => (
              <motion.div
                key={`${team.team_number}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleTeamSelect(team)}
                className="px-4 py-3 hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">
                      #{team.team_number} - {team.team_name_short || team.team_name}
                    </div>
                    {team.team_name_short && team.team_name !== team.team_name_short && (
                      <div className="text-gray-400 text-sm mt-1">{team.team_name}</div>
                    )}
                    {(team.city || team.state_prov || team.country) && (
                      <div className="text-gray-500 text-xs mt-1">
                        {[team.city, team.state_prov, team.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Show API loading at bottom */}
            {apiLoading && (
              <div className="px-4 py-3 text-center text-gray-400 text-sm border-t border-gray-700">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-red-500 rounded-full" />
                  <span>Searching external APIs...</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show hint when no selection made */}
      {!selectedTeam && teamSearch.length === 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Start typing your team number or name to search
        </div>
      )}
    </div>
  );
}
