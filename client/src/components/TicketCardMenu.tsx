// src/components/TicketCardMenu.tsx
import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Star, Archive, Trash2 } from "lucide-react";
import { toggleFavorite } from "../../api/tickets";
import "../style/TicketCardMenu.css";

interface TicketCardMenuProps {
    ticketId: string;
    isFavorite?: boolean;
    onFavoriteToggle?: (ticketId: string, isFavorite: boolean) => void;
    onArchive?: (ticketId: string) => void;
    onDelete?: (ticketId: string) => void;
    onClick?: (e: React.MouseEvent) => void;
}

const TicketCardMenu: React.FC<TicketCardMenuProps> = ({
    ticketId,
    isFavorite = false,
    onFavoriteToggle,
    onArchive,
    onDelete,
    onClick,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [favorited, setFavorited] = useState(isFavorite);
    const [loading, setLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
        if (onClick) onClick(e);
    };

    const handleFavoriteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (loading) return;

        try {
            setLoading(true);
            const result = await toggleFavorite(ticketId);
            const newFavoriteStatus = result.isFavorited;
            setFavorited(newFavoriteStatus);
            if (onFavoriteToggle) {
                onFavoriteToggle(ticketId, newFavoriteStatus);
            }
        } catch (error) {
            console.error("Failed to toggle favorite:", error);
        } finally {
            setLoading(false);
        }
        if (onClick) onClick(e);
    };

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        if (onArchive) onArchive(ticketId);
        if (onClick) onClick(e);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        if (onDelete) onDelete(ticketId);
        if (onClick) onClick(e);
    };

    return (
        <div className="ticket-card-actions" ref={menuRef}>
            {/* Favorite Star */}
            <button
                className={`favorite-icon-btn ${favorited ? "active" : ""}`}
                onClick={handleFavoriteClick}
                aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
                disabled={loading}
            >
                <Star
                    size={18}
                    fill={favorited ? "#FFD700" : "none"}
                    stroke={favorited ? "#FFD700" : "currentColor"}
                />
            </button>

            {/* Three-dot Menu */}
            <button
                className="menu-toggle-btn"
                onClick={handleMenuClick}
                aria-label="More options"
                aria-expanded={menuOpen}
            >
                <MoreVertical size={18} />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
                <div className="ticket-menu-dropdown">
                    {onArchive && (
                        <button className="menu-item" onClick={handleArchive}>
                            <Archive size={16} />
                            <span>Archive</span>
                        </button>
                    )}
                    {onDelete && (
                        <button className="menu-item delete" onClick={handleDelete}>
                            <Trash2 size={16} />
                            <span>Delete</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TicketCardMenu;
