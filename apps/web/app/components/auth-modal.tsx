"use client"

import { useState } from "react"

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log(mode === "login" ? "Log in" : "Sign up", { email, password })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="modal-header">
          <svg className="modal-logo" width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="10" stroke="#6d7cff" strokeWidth="2"/>
            <path d="M12 11v10h2.8a4.2 4.2 0 0 0 0-8.4H12" stroke="#6d7cff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 20l4-4" stroke="#6d7cff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <h2 className="modal-title">{mode === "login" ? "Welcome back" : "Create account"}</h2>
          <p className="modal-subtitle">
            {mode === "login" ? "Sign in to continue your search journey." : "Start your search journey."}
          </p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-field">
            <span className="modal-label">Email</span>
            <input
              type="email"
              className="modal-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="modal-field">
            <span className="modal-label">Password</span>
            <input
              type="password"
              className="modal-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="modal-submit">
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="modal-footer">
          <span className="modal-footer-text">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button className="modal-switch" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  )
}
