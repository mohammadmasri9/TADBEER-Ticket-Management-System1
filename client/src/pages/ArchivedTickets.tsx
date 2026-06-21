// src/pages/ArchivedTickets.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, RotateCcw } from "lucide-react";
import { getArchivedTickets, TicketDTO, unarchiveTicket } from "../../api/tickets";
import "../style/CommonPage.css";

const ArchivedTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getArchivedTickets();
        setTickets(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load archived tickets");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleUnarchive = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unarchiveTicket(String(ticketId));
      setTickets((prev) => prev.filter((ticket) => ticket._id !== ticketId));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to unarchive ticket");
    }
  };

  if (loading) {
    return (
      <div className="common-page">
        <div className="page-header">
          <h1>Archived Tickets</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>Loading archived tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="common-page">
        <div className="page-header">
          <h1>Archived Tickets</h1>
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
        <h1>Archived Tickets</h1>
        <p className="page-description">Access your archived and historical tickets</p>
      </div>

      <div className="page-content">
        {tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No Archived Tickets</h3>
            <p>No tickets have been archived</p>
          </div>
        ) : (
          <div className="content-section">
            <h2>Archived Tickets ({tickets.length})</h2>
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <div key={ticket._id} className="ticket-card archived" onClick={() => navigate(`/tickets/${ticket._id}`)}>
                  <div className="ticket-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span>
                    <span className="status-badge archived">archived</span>

                    <button
                      type="button"
                      className="btn-restore"
                      onClick={(e) => handleUnarchive(ticket._id, e)}
                      title="Unarchive"
                      style={{ marginLeft: "auto", display: "inline-flex", gap: 6, alignItems: "center" }}
                    >
                      <RotateCcw size={16} />
                      Unarchive
                    </button>
                  </div>

                  <h3 className="ticket-title">{ticket.title}</h3>

                  <p className="ticket-description">
                    {ticket.description?.substring(0, 150) || "No description"}
                    {ticket.description && ticket.description.length > 150 && "..."}
                  </p>

                  <div className="ticket-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="ticket-meta">
                      <Archive size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                      Archived
                    </span>
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

export default ArchivedTickets;
