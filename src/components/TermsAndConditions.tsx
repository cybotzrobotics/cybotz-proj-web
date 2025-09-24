"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScrollText, Shield, Cookie, Calendar } from "lucide-react";

interface TermsAndConditionsProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsAndConditions({ isOpen, onClose, onAccept, onDecline }: TermsAndConditionsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-black/95 border border-red-800/50 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-red-800/30">
                <div className="flex items-center space-x-3">
                  <ScrollText className="w-6 h-6 text-red-400" />
                  <h2 className="text-xl font-bold text-white">Terms & Conditions</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 text-gray-300">
                  {/* Important Notice */}
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <h3 className="text-red-400 font-semibold mb-2 flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Important Information
                    </h3>
                    <p className="text-sm">
                      By creating an account, you agree to our terms and conditions. Please read carefully before proceeding.
                    </p>
                  </div>

                  {/* Age Requirements */}
                  <section>
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-red-400" />
                      Age Requirements
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Minimum Age:</strong> You must be at least 13 years old to create an account.</p>
                      <p><strong>Under 18:</strong> If you are under 18, you must have parental or guardian consent to use our service.</p>
                      <p><strong>Educational Use:</strong> This platform is designed for educational purposes related to FIRST Tech Challenge robotics competitions.</p>
                    </div>
                  </section>

                  {/* Data Collection & Privacy */}
                  <section>
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-red-400" />
                      Data Collection & Privacy
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Information We Collect:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Email address (for account creation only)</li>
                        <li>Full name (for personalized dashboard display only)</li>
                        <li>Username (for public leaderboard display)</li>
                        <li>FTC team information (team number, name, location)</li>
                        <li>Quiz performance data and ELO ratings</li>
                        <li>Account activity for core functionality</li>
                      </ul>
                      <p><strong>How We Use Your Data:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Provide quiz functionality and leaderboard features</li>
                        <li>Display personalized dashboard with your full name</li>
                        <li>Show username publicly on leaderboards and rankings</li>
                        <li>Track quiz progress and performance metrics</li>
                        <li>Essential platform functionality only</li>
                      </ul>
                      <p><strong>Data Retention:</strong> Account data is retained while your account is active. You may request deletion at any time.</p>
                    </div>
                  </section>

                  {/* Cookies & Tracking */}
                  <section>
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Cookie className="w-5 h-5 mr-2 text-red-400" />
                      Cookies & Tracking
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Essential Cookies:</strong> We use cookies to maintain your login session and remember your preferences.</p>
                      <p><strong>No Analytics:</strong> We do not use analytics cookies or tracking for data collection purposes.</p>
                      <p><strong>Third-Party Services:</strong> We use Supabase for authentication and database services, which may set their own essential cookies.</p>
                      <p><strong>Control:</strong> You can disable cookies in your browser, but some features may not work properly.</p>
                    </div>
                  </section>

                  {/* Data Protection Laws */}
                  <section>
                    <h3 className="text-white font-semibold mb-3">Applicable Laws & Compliance</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>COPPA Compliance:</strong> For users under 13, additional parental consent is required.</p>
                      <p><strong>GDPR Rights:</strong> EU users have the right to access, rectify, or delete their personal data.</p>
                      <p><strong>CCPA Rights:</strong> California users have rights regarding personal information disclosure and deletion.</p>
                      <p><strong>Educational Records:</strong> We comply with FERPA guidelines for educational technology platforms.</p>
                    </div>
                  </section>

                  {/* User Responsibilities */}
                  <section>
                    <h3 className="text-white font-semibold mb-3">User Responsibilities</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your password.</p>
                      <p><strong>Accurate Information:</strong> You must provide accurate team and personal information.</p>
                      <p><strong>Fair Use:</strong> No cheating, sharing answers, or attempting to manipulate leaderboards.</p>
                      <p><strong>Respectful Conduct:</strong> Use the platform respectfully and in accordance with FTC values.</p>
                    </div>
                  </section>

                  {/* Service Terms */}
                  <section>
                    <h3 className="text-white font-semibold mb-3">Service Terms</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Availability:</strong> We strive for 99% uptime but cannot guarantee uninterrupted service.</p>
                      <p><strong>Content Updates:</strong> Quiz questions and content may be updated regularly based on current FTC seasons.</p>
                      <p><strong>Account Termination:</strong> We reserve the right to terminate accounts that violate these terms.</p>
                      <p><strong>Changes to Terms:</strong> We may update these terms with notice to users.</p>
                    </div>
                  </section>

                  {/* Contact Information */}
                  <section>
                    <h3 className="text-white font-semibold mb-3">Contact & Support</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Questions:</strong> Contact us for any questions about these terms or your data.</p>
                      <p><strong>Data Requests:</strong> You may request access to or deletion of your personal data.</p>
                      <p><strong>Platform Issues:</strong> Report technical issues or concerns through our support channels.</p>
                    </div>
                  </section>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-red-800/30 p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onDecline}
                    className="flex-1 px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors font-medium"
                  >
                    I Decline
                  </button>
                  <button
                    onClick={onAccept}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition-all transform hover:scale-105"
                  >
                    I Accept Terms & Conditions
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">
                  By accepting, you confirm you have read and agree to all terms above, including age requirements and data collection practices.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}