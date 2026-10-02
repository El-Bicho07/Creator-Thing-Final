"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { contactData } from "@/content/contact";
import { 
  Send, 
  CheckCircle2, 
  Mail, 
  MapPin, 
  Clock, 
  FileText, 
  ArrowUpRight, 
  Github, 
  Linkedin, 
  Instagram, 
  Lock, 
  X, 
  AlertTriangle, 
  ArrowRight 
} from "lucide-react";

const smoothEase = [0.16, 1, 0.3, 1];

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  
  // Secret Admin Edit Unlock State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("protosem_admin_authenticated");
      if (auth === "true") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 4000);
  };

  const getSocialIcon = (iconName: string) => {
    switch (iconName) {
      case "Github": return <Github className="h-4 w-4 text-white" />;
      case "Linkedin": return <Linkedin className="h-4 w-4 text-white" />;
      case "Instagram": return <Instagram className="h-4 w-4 text-white" />;
      default: return <Mail className="h-4 w-4 text-white" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16 py-8">
      
      {/* HEADER */}
      <section className="space-y-6 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs text-white border border-white/10"
        >
          <Mail className="h-3.5 w-3.5 text-neutral-300" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-300 font-bold">GET IN TOUCH</span>
        </motion.div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white leading-tight">
          {contactData.headline}
        </h1>

        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-sans">
          {contactData.description}
        </p>
      </section>

      {/* MAIN CONTACT LAYOUT */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Direct Info & Social Cards */}
        <div className="lg:col-span-5 space-y-8">
          
          <div className="glass-panel-elevated rounded-3xl p-8 border border-white/10 shadow-glass-md space-y-6">
            <h3 className="font-serif text-2xl font-bold text-white">Contact Information</h3>
            
            <div className="space-y-5 text-xs font-mono">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-white shrink-0 mt-1" />
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase">EMAIL ADDRESS</span>
                  <a href={`mailto:${contactData.email}`} className="text-sm font-bold text-white hover:underline">
                    {contactData.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-white shrink-0 mt-1" />
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase">LOCATION</span>
                  <span className="text-sm font-semibold text-white">{contactData.location}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-white shrink-0 mt-1" />
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase">AVAILABILITY</span>
                  <span className="text-xs font-semibold text-neutral-300">{contactData.availability}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 rounded-full glass-panel px-6 py-3 text-xs font-mono text-neutral-400 border border-white/10 cursor-not-allowed opacity-70"
              >
                <FileText className="h-4 w-4 text-neutral-400" />
                <span>Resume: {contactData.resumeStatus}</span>
              </button>
            </div>
          </div>

          {/* Social Profiles */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <h4 className="font-serif text-lg font-bold text-white">Socials & Links</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contactData.socials.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl glass-panel p-3 text-xs font-mono text-neutral-300 hover:text-white hover:border-white/25 transition-all border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    {getSocialIcon(s.icon)}
                    <span className="font-semibold">{s.platform}</span>
                  </div>
                  {s.status ? (
                    <span className="text-[9px] bg-white/10 text-neutral-400 px-1.5 py-0.5 rounded">{s.status}</span>
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500" />
                  )}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-7 glass-panel-elevated rounded-3xl p-8 sm:p-12 border border-white/10 shadow-glass-lg relative">
          {formSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-16 text-center space-y-4"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white border border-white/20">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-white">Message Sent</h3>
              <p className="text-xs font-mono text-neutral-300 max-w-md mx-auto">
                Thank you for reaching out! Your message has been sent. Response time: within 24 hours.
              </p>
              <button
                onClick={() => setFormSubmitted(false)}
                className="pt-4 text-xs font-mono font-bold text-white hover:underline"
              >
                Send Another Message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="font-serif text-2xl font-bold text-white">Contact Form</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-white font-bold">FULL NAME *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl glass-panel p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white border border-white/15"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white font-bold">EMAIL ADDRESS *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@example.com"
                    className="w-full rounded-xl glass-panel p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white border border-white/15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-white font-bold">SUBJECT *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Software project, filmmaking, or general inquiry"
                  className="w-full rounded-xl glass-panel p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white border border-white/15"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-white font-bold">MESSAGE *</label>
                <textarea
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Type your message here..."
                  className="w-full rounded-xl glass-panel p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white border border-white/15 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-full bg-white py-4 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all shadow-glass-sm"
              >
                <Send className="h-4 w-4 text-black" />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>

      </section>

      {/* FOOTER PART WITH SECRET "right" BUTTON */}
      <footer className="pt-12 pb-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-400">
        <div>
          <span>© {new Date().getFullYear()} Theeran P. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setShowPasswordModal(true);
              setPasswordError("");
              setPasswordInput("");
              setAuthSuccessMsg("");
            }}
            className="px-3 py-1.5 rounded-lg glass-panel hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/10 transition-all text-xs font-mono"
            title="Secret Admin Access"
          >
            right
          </button>
        </div>
      </footer>

      {/* PASSWORD PROMPT MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl glass-panel-elevated p-6 border border-white/20 shadow-2xl space-y-5 bg-neutral-900"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-mono text-sm font-bold">
                  <Lock className="h-4 w-4 text-white" />
                  <span>ProtoSem Admin Edit Unlock</span>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-full p-1 text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {authSuccessMsg ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-mono text-emerald-300 font-bold">{authSuccessMsg}</p>
                  <p className="text-xs text-neutral-300">
                    The Edit options are now revealed on the ProtoSem section!
                  </p>
                  <div className="pt-2 flex gap-3 justify-center">
                    <Link
                      href="/forge"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all"
                    >
                      <span>Go to ProtoSem Section</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      className="rounded-full glass-panel px-4 py-2 text-xs font-mono text-neutral-300 border border-white/15 hover:bg-neutral-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (passwordInput === "1611919") {
                      localStorage.setItem("protosem_admin_authenticated", "true");
                      setIsAuthenticated(true);
                      setAuthSuccessMsg("Password Correct! ProtoSem Admin Edit Mode Enabled.");
                      setPasswordError("");
                    } else {
                      setPasswordError("Incorrect Password. Please try again.");
                    }
                  }}
                  className="space-y-4"
                >
                  <p className="text-xs text-neutral-300 font-sans">
                    Enter the admin authorization password to unlock the interactive editing options for all weeks in the ProtoSem section.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-neutral-300 uppercase font-bold block">
                      ADMIN PASSWORD *
                    </label>
                    <input
                      type="password"
                      autoFocus
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter password..."
                      className="w-full rounded-xl glass-panel p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white border border-white/20 bg-black/50"
                    />
                    {passwordError && (
                      <p className="text-[11px] font-mono text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{passwordError}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="rounded-full glass-panel px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white border border-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-white px-5 py-2 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all"
                    >
                      Submit & Unlock
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

