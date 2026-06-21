// src/components/Footer.tsx
import React from 'react';
import '../style/Footer.css';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';
import tadbeerLogo from '../assets/images/tadbeer-logo.png';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Company Info */}
          <div className="footer-section">
            <div className="footer-logo">
            <div className="logo-icon">
              <img src={tadbeerLogo} alt="Logo" />
            </div>              
            </div>
            <p className="footer-description">
              Professional ticket management system powered by Ooredoo technology.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link" aria-label="Facebook">f</a>
              <a href="#" className="social-link" aria-label="Twitter">𝕏</a>
              <a href="#" className="social-link" aria-label="LinkedIn">in</a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><a href="/overview">Overview</a></li>
              <li><a href="/tickets">Active Tickets</a></li>
              <li><a href="/team">Team Projects</a></li>
              <li><a href="/help">Help & Support</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="footer-section">
            <h4 className="footer-title">Resources</h4>
            <ul className="footer-links">
              <li><a href="/docs">Documentation</a></li>
              <li><a href="/api">API Reference</a></li>
              <li><a href="/tutorials">Tutorials</a></li>
              <li><a href="/faq">FAQ</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-section">
            <h4 className="footer-title">Contact Us</h4>
            <ul className="footer-contact">
              <li>
                <Mail size={16} strokeWidth={2} />
                <span>support@tadbeer.ps</span>
              </li>
              <li>
                <Phone size={16} strokeWidth={2} />
                <span>+970 XX XXX XXXX</span>
              </li>
              <li>
                <MapPin size={16} strokeWidth={2} />
                <span>Palestine</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Tadbeer. Made with <Heart size={14} fill="currentColor" /> by Mohammad Almasri
          </p>
          <div className="footer-bottom-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/cookies">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
