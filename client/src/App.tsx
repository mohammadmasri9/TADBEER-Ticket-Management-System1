// src/routes/AppRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../src/pages/Login";
import Dashboard from "../src/pages/Dashboard";
import MyTickets from "../src/pages/MyTickets";
import TicketDetails from "../src/pages/TicketDetails";
import ManageUsers from "../src/pages/ManageUsers";
import Reports from "../src/pages/Reports";
import Profile from "../src/pages/Profile";
import AddUser from "../src/pages/AddUser";
import Kanban from "../src/pages/Kanban";
import CreateTicket from "../src/pages/CreateTicket";
import Notifications from "../src/pages/Notifications";
import SLAPage from "../src/pages/SLAPage";

// Sidebar navigation pages
import ActiveTickets from "../src/pages/ActiveTickets";
import PendingTasks from "../src/pages/PendingTasks";
import CompletedTickets from "../src/pages/CompletedTickets";
import TeamProjects from "../src/pages/TeamProjects";
import ArchivedTickets from "../src/pages/ArchivedTickets";
import RecentUpdates from "../src/pages/RecentUpdates";
import Favorites from "../src/pages/Favorites";
import RecycleBin from "../src/pages/RecycleBin";
import SharedTeam from "../src/pages/SharedTeam";
import SharedTraining from "../src/pages/SharedTraining";

import AuthLayout from "../src/layouts/AuthLayout";
import DashboardLayout from "../src/layouts/DashboardLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

import "./style/Dashboard.css";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* default */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* pages */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tickets" element={<MyTickets />} />
        <Route path="tickets/:id" element={<TicketDetails />} />
        <Route path="kanban" element={<Kanban />} />
        <Route path="createticket" element={<CreateTicket />} />
        <Route path="create-ticket" element={<CreateTicket />} />
        <Route path="notifications" element={<Notifications />} />

        {/* admin/manager */}
        <Route path="admin/users" element={<ManageUsers />} />
        <Route path="user-management" element={<ManageUsers />} />
        <Route path="admin/adduser" element={<AddUser />} />
        <Route path="manager/reports" element={<Reports />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin/sla" element={<SLAPage />} />

        {/* profile */}
        <Route path="profile/:id" element={<Profile />} />

        {/* sidebar navigation pages */}
        <Route path="active-tickets" element={<ActiveTickets />} />
        <Route path="pending-tasks" element={<PendingTasks />} />
        <Route path="completed" element={<CompletedTickets />} />
        <Route path="team-projects" element={<TeamProjects />} />
        <Route path="archived" element={<ArchivedTickets />} />
        <Route path="recent-updates" element={<RecentUpdates />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="recycle-bin" element={<RecycleBin />} />
        <Route path="shared/team" element={<SharedTeam />} />
        <Route path="shared/training" element={<SharedTraining />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
