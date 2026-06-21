// src/pages/Kanban.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../style/Kanban.css";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  GripVertical,
  Loader,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Tag,
  User,
  X,
} from "lucide-react";

import { getTickets, TicketDTO, TicketStatus, updateTicketStatus } from "../../api/tickets";

interface Column {
  id: TicketStatus;
  title: string;
  color: string;
  icon: React.ReactNode;
}

const columns: Column[] = [
  { id: "open", title: "Open", color: "#3B82F6", icon: <AlertCircle size={18} /> },
  { id: "in-progress", title: "In Progress", color: "#F59E0B", icon: <Loader size={18} /> },
  { id: "pending", title: "Pending", color: "#8B5CF6", icon: <Clock size={18} /> },
  { id: "resolved", title: "Resolved", color: "#10B981", icon: <CheckCircle size={18} /> },
  { id: "closed", title: "Closed", color: "#6B7280", icon: <CheckCircle size={18} /> },
];

function normalizeName(value: any) {
  if (!value) return "Unassigned";
  if (typeof value === "string") return value;
  return value.name || value.email || "Unassigned";
}

function formatDate(value?: string) {
  if (!value) return "No due";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const SortableTicketCard: React.FC<{ ticket: TicketDTO }> = ({ ticket }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityLabel = ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1);

  return (
    <div ref={setNodeRef} style={style} className={`ticket-card ${isDragging ? "dragging" : ""}`}>
      <div className="drag-handle" {...attributes} {...listeners} aria-label="Drag ticket">
        <GripVertical size={16} />
      </div>

      <div className="ticket-header">
        <span className={`priority-badge priority-${ticket.priority}`}>{priorityLabel}</span>
        <button className="ticket-menu-btn" type="button" aria-label="Ticket menu">
          <MoreVertical size={16} />
        </button>
      </div>

      <h4 className="ticket-title">{ticket.title}</h4>
      <p className="ticket-description">{ticket.description}</p>

      {!!ticket.tags?.length && (
        <div className="ticket-tags">
          {ticket.tags.map((tag) => (
            <span key={tag} className="ticket-tag">
              <Tag size={12} />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="ticket-footer">
        <div className="ticket-assignee">
          <div className="assignee-avatar">
            <User size={14} />
          </div>
          <span className="assignee-name">{normalizeName(ticket.assignee)}</span>
        </div>

        <div className="ticket-meta">
          {!!ticket.attachments?.length && (
            <div className="meta-item" title="Attachments">
              <Paperclip size={14} />
              <span>{ticket.attachments.length}</span>
            </div>
          )}
          <div className="meta-item" title="Due date">
            <Calendar size={14} />
            <span>{formatDate(ticket.dueDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Kanban: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getTickets();
        if (mounted) setTickets(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.message || err?.message || "Failed to load kanban tickets");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeTicket = tickets.find((ticket) => ticket._id === activeId);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) => {
      return (
        ticket.title.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q) ||
        normalizeName(ticket.assignee).toLowerCase().includes(q) ||
        (ticket.tags || []).join(" ").toLowerCase().includes(q)
      );
    });
  }, [tickets, searchQuery]);

  const getTicketsByColumn = (status: TicketStatus) =>
    filteredTickets.filter((ticket) => ticket.status === status);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const ticketId = active.id as string;
    const nextStatus = over.id as TicketStatus;

    if (!columns.some((column) => column.id === nextStatus)) return;

    const ticket = tickets.find((item) => item._id === ticketId);
    if (!ticket || ticket.status === nextStatus) return;

    const previous = tickets;
    setTickets((prev) =>
      prev.map((item) => (item._id === ticketId ? { ...item, status: nextStatus } : item))
    );

    try {
      setSavingId(ticketId);
      const updated = await updateTicketStatus(ticketId, nextStatus);
      setTickets((prev) =>
        prev.map((item) => (item._id === ticketId ? { ...item, status: updated.status } : item))
      );
    } catch (err: any) {
      setTickets(previous);
      setError(err?.response?.data?.message || err?.message || "Failed to update ticket status");
    } finally {
      setSavingId("");
    }
  };

  return (
    <>
      <Header />
      <div className="kanban-page">
        <div className="kanban-content">
          <div className="kanban-header">
            <div className="kanban-header-left">
              <h1 className="kanban-title">Kanban Board</h1>
              <p className="kanban-subtitle">
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} across {columns.length} columns
              </p>
            </div>

            <div className="kanban-header-actions">
              <div className="kanban-search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search tickets"
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery("")} type="button" aria-label="Clear search">
                    <X size={16} />
                  </button>
                )}
              </div>

              <button className="kanban-filter-btn" type="button">
                <Filter size={18} />
                <span className="btn-text">Filter</span>
              </button>

              <button className="kanban-add-ticket-btn" type="button">
                <Plus size={18} />
                <span className="btn-text">New Ticket</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="empty-column" style={{ marginBottom: 16, color: "#b91c1c" }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="empty-column">Loading tickets...</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="kanban-board" role="region" aria-label="Kanban board">
                {columns.map((column) => {
                  const columnTickets = getTicketsByColumn(column.id);

                  return (
                    <div key={column.id} className="kanban-column" id={column.id}>
                      <div className="column-header" style={{ borderTopColor: column.color }}>
                        <div className="column-title-wrapper">
                          <div className="column-icon" style={{ color: column.color }}>
                            {column.icon}
                          </div>
                          <h3 className="column-title">{column.title}</h3>
                          <span className="column-count">{columnTickets.length}</span>
                        </div>
                        <button className="column-menu-btn" type="button" aria-label="Column menu">
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      <SortableContext items={columnTickets.map((ticket) => ticket._id)} strategy={verticalListSortingStrategy}>
                        <div className="column-content">
                          {columnTickets.length === 0 ? (
                            <div className="empty-column">
                              <p>No tickets</p>
                            </div>
                          ) : (
                            columnTickets.map((ticket) => (
                              <SortableTicketCard key={ticket._id} ticket={ticket} />
                            ))
                          )}

                          {savingId && columnTickets.some((ticket) => ticket._id === savingId) && (
                            <div className="empty-column">Saving...</div>
                          )}
                        </div>
                      </SortableContext>
                    </div>
                  );
                })}
              </div>

              <DragOverlay>
                {activeTicket ? (
                  <div className="ticket-card dragging-overlay">
                    <h4 className="ticket-title">{activeTicket.title}</h4>
                    <p className="ticket-description">{activeTicket.description}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Kanban;
