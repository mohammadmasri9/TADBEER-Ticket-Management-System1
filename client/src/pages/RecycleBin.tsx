// src/pages/RecycleBin.tsx
import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { getRecycleBin, permanentDelete, restoreTicket, TicketDTO } from "../../api/tickets";
import "../style/CommonPage.css";

const RecycleBin: React.FC = () => {
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getRecycleBin();
        setTickets(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load recycle bin");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleRestore = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Restore this ticket?")) {
      try {
        await restoreTicket(String(ticketId));
        setTickets((prev) => prev.filter((ticket) => ticket._id !== ticketId));
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to restore ticket");
      }
    }
  };

  const handlePermanentDelete = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this ticket? This action cannot be undone!")) {
      try {
        await permanentDelete(String(ticketId));
        setTickets((prev) => prev.filter((ticket) => ticket._id !== ticketId));
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to permanently delete ticket");
      }
    }
  };

  if (loading) {
    return (
      <div className="common-page">
        <div className="page-header">
          <h1>Recycle Bin</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>Loading recycle bin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="common-page">
        <div className="page-header">
          <h1>Recycle Bin</h1>
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
        <h1>Recycle Bin</h1>
        <p className="page-description">Restore or permanently delete removed tickets</p>
      </div>

      <div className="page-content">
        {tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗑️</div>
            <h3>Recycle Bin is Empty</h3>
            <p>No deleted tickets</p>
          </div>
        ) : (
          <div className="content-section">
            <h2>Deleted Tickets ({tickets.length})</h2>
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <div key={ticket._id} className="ticket-card deleted">
                  <div className="ticket-header">
                    <span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span>
                    <span className="status-badge deleted">deleted</span>
                  </div>

                  <h3 className="ticket-title">{ticket.title}</h3>

                  <p className="ticket-description">
                    {ticket.description?.substring(0, 150) || "No description"}
                    {ticket.description && ticket.description.length > 150 && "..."}
                  </p>

                  <div className="ticket-footer">
                    <span className="ticket-meta">
                      <Trash2 size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                      {ticket.category}
                    </span>

                    <div className="ticket-actions">
                      <button className="btn-restore" onClick={(e) => handleRestore(ticket._id, e)}>
                        Restore
                      </button>
                      <button className="btn-delete-permanent" onClick={(e) => handlePermanentDelete(ticket._id, e)}>
                        Delete Forever
                      </button>
                    </div>
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

export default RecycleBin;
