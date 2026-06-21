// src/pages/Login.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import "../style/Login.css";
import tadbeerLogo from "../assets/images/tadbeer-logo.png";
import ooredooLogo from "../assets/images/ooredoo-logo.png";

export default function Login() {
  const { login, user } = useAuth() as any; // keep as any if your AuthContext type isn't strict yet
  const nav = useNavigate();

  const [email, setEmail] = useState("manager@ooredoo.ps");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, force dashboard
  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      await login({ email, password });

      // ✅ Always go to dashboard مهما كان
      nav("/dashboard", { replace: true });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        e?.toString?.() ||
        "Login failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Form */}
        <div className="login-form-section">
          <div className="login-form-wrapper">
            {/* Brand Header */}
            <div className="login-brand">
              <img src={tadbeerLogo} alt="Tadbeer" className="login-logo" />
            </div>

            <div className="login-header-text">
              <h1 className="login-title">Welcome Back</h1>
              <p className="login-subtitle">Sign in to access your dashboard</p>
            </div>

            {/* Error Banner */}
            {err && (
              <div className="login-error-banner">
                <AlertCircle size={18} />
                <div className="error-content">
                  <strong>Authentication Failed</strong>
                  <p>{err}</p>
                </div>
                <button
                  className="error-dismiss"
                  onClick={() => setErr(null)}
                  type="button"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={onSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <Mail size={16} />
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  <Lock size={16} />
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button type="button" className="forgot-password">
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Powered By */}
            <div className="powered-by-footer">
              <span>POWERED BY</span>
              <img src={ooredooLogo} alt="Ooredoo" />
            </div>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="login-branding-section">
          <div className="branding-overlay" />
          <div className="branding-content">
            <div className="branding-logo">
              <img src={tadbeerLogo} alt="Tadbeer" />
            </div>

            <h2 className="branding-title">Smart Ticketing Management</h2>
            <p className="branding-description">
              Streamline your support operations with our AI-powered ticketing system.
              Manage, track, and resolve customer issues efficiently.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <CheckCircle size={20} />
                </div>
                <div className="feature-text">
                  <h4>Real-time Analytics</h4>
                  <p>Monitor performance with live dashboards</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <CheckCircle size={20} />
                </div>
                <div className="feature-text">
                  <h4>Smart Automation</h4>
                  <p>AI-powered ticket routing and assignment</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <CheckCircle size={20} />
                </div>
                <div className="feature-text">
                  <h4>Team Collaboration</h4>
                  <p>Seamless communication across departments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
