// src/pages/CompletedTickets.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCompletedTickets, TicketDTO } from "../../api/tickets";
import "../style/CommonPage.css";

const CompletedTickets: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<TicketDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                const data = await getCompletedTickets();
                setTickets(data);
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || "Failed to load completed tickets");
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, []);

    if (loading) {
        return (
            <div className="common-page">
                <div className="page-header">
                    <h1>Completed Tickets</h1>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">⏳</div>
                    <p>Loading completed tickets...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="common-page">
                <div className="page-header">
                    <h1>Completed Tickets</h1>
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
                <h1>Completed Tickets</h1>
                <p className="page-description">
                    View all successfully completed tickets (Resolved & Closed)
                </p>
            </div>

            <div className="page-content">
                {tickets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✅</div>
                        <h3>No Completed Tickets</h3>
                        <p>No tickets have been completed yet</p>
                    </div>
                ) : (
                    <div className="content-section">
                        <h2>Completed Tickets ({tickets.length})</h2>
                        <div className="ticket-list">
                            {tickets.map((ticket) => (
                                <div
                                    key={ticket._id}
                                    className="ticket-card completed"
                                    onClick={() => navigate(`/tickets/${ticket._id}`)}
                                >
                                    <div className="ticket-header">
                                        <span className={`priority-badge ${ticket.priority}`}>
                                            {ticket.priority}
                                        </span>
                                        <span className={`status-badge ${ticket.status}`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <h3 className="ticket-title">{ticket.title}</h3>
                                    <p className="ticket-description">
                                        {ticket.description.substring(0, 150)}
                                        {ticket.description.length > 150 && "..."}
                                    </p>
                                    <div className="ticket-footer">
                                        <span className="ticket-meta">
                                            Completed: {new Date(ticket.updatedAt).toLocaleDateString()}
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

export default CompletedTickets;
