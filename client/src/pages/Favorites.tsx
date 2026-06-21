// src/pages/Favorites.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { getFavorites, TicketDTO, toggleFavorite } from "../../api/tickets";
import "../style/CommonPage.css";

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getFavorites();
        setTickets(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load favorites");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleToggleFavorite = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleFavorite(String(ticketId));
      setTickets((prev) => prev.filter((ticket) => ticket._id !== ticketId));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update favorite");
    }
  };

  if (loading) {
    return (
      <div className="common-page">
        <div className="page-header">
          <h1>Favorites</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>Loading favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="common-page">
        <div className="page-header">
          <h1>Favorites</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="common-page">
      <div className="page-header">
        <h1>Favorites</h1>
        <p className="page-description">Quick access to your favorite and starred tickets</p>
      </div>

      <div className="page-content">
        {tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⭐</div>
            <h3>No Favorite Tickets</h3>
            <p>Star important tickets to find them quickly here</p>
          </div>
        ) : (
          <div className="content-section">
            <h2>Favorite Tickets ({tickets.length})</h2>
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <div key={ticket._id} className="ticket-card favorite" onClick={() => navigate(`/tickets/${ticket._id}`)}>
                  <div className="ticket-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span>
                    <span className={`status-badge ${ticket.status}`}>{ticket.status}</span>

                    <button
                      className="favorite-btn active"
                      onClick={(e) => handleToggleFavorite(ticket._id, e)}
                      title="Remove from favorites"
                      style={{ marginLeft: "auto" }}
                    >
                      <Star size={18} fill="currentColor" />
                    </button>
                  </div>

                  <h3 className="ticket-title">{ticket.title}</h3>

                  <p className="ticket-description">
                    {ticket.description?.substring(0, 150) || "No description"}
                    {ticket.description && ticket.description.length > 150 && "..."}
                  </p>

                  <div className="ticket-footer">
                    <span className="ticket-meta">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span className="ticket-meta">{ticket.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
