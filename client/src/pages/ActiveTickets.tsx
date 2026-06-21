// src/pages/ActiveTickets.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveTickets, TicketDTO } from "../../api/tickets";
import "../style/CommonPage.css";

const ActiveTickets: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<TicketDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                const data = await getActiveTickets();
                setTickets(data);
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || "Failed to load active tickets");
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
                    <h1>Active Tickets</h1>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">⏳</div>
                    <p>Loading active tickets...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="common-page">
                <div className="page-header">
                    <h1>Active Tickets</h1>
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
                <h1>Active Tickets</h1>
                <p className="page-description">
                    View and manage all your currently active tickets (Open & In Progress)
                </p>
            </div>

            <div className="page-content">
                {tickets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No Active Tickets</h3>
                        <p>You don't have any active tickets at the moment</p>
                    </div>
                ) : (
                    <div className="content-section">
                        <h2>Active Tickets ({tickets.length})</h2>
                        <div className="ticket-list">
                            {tickets.map((ticket) => (
                                <div
                                    key={ticket._id}
                                    className="ticket-card"
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
                                            {new Date(ticket.createdAt).toLocaleDateString()}
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

export default ActiveTickets;
