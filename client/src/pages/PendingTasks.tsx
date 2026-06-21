// src/pages/PendingTasks.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPendingTickets, TicketDTO } from "../../api/tickets";
import "../style/CommonPage.css";

const PendingTasks: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<TicketDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                const data = await getPendingTickets();
                setTickets(data);
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || "Failed to load pending tasks");
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
                    <h1>Pending Tasks</h1>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">⏳</div>
                    <p>Loading pending tasks...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="common-page">
                <div className="page-header">
                    <h1>Pending Tasks</h1>
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
                <h1>Pending Tasks</h1>
                <p className="page-description">
                    Tasks and tickets awaiting action or approval
                </p>
            </div>

            <div className="page-content">
                {tickets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">⏸️</div>
                        <h3>No Pending Tasks</h3>
                        <p>All tasks are up to date!</p>
                    </div>
                ) : (
                    <div className="content-section">
                        <h2>Pending Tasks ({tickets.length})</h2>
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
                                        <span className="status-badge pending">pending</span>
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

export default PendingTasks;
