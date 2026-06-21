// src/components/LoadingStates.tsx
import React from 'react';
import '../style/LoadingStates.css';

export const FolderSkeleton: React.FC = () => (
  <div className="folder-card skeleton-card">
    <div className="skeleton skeleton-icon"></div>
    <div className="skeleton-content">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-meta"></div>
    </div>
  </div>
);

export const DashboardCardSkeleton: React.FC = () => (
  <div className="dashboard-card skeleton-card">
    <div className="skeleton skeleton-thumbnail"></div>
    <div className="skeleton skeleton-footer"></div>
  </div>
);
