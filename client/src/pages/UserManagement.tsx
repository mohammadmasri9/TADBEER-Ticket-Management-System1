import React, { useState } from 'react';
import Footer from '../components/Footer';
import '../style/UserManagement.css';
import { 
  Search,
  Filter,
  MoreVertical,
  ArrowUpDown,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Grid,
  List,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  Users,
  UserPlus,
  Activity
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'team-lead' | 'team-member';
  phone?: string;
  department?: string;
  joinedDate: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
  ticketsCount?: number;
}

const UserManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  // Sample user data
  const allUsers: User[] = [
    {
      id: 'USR-001',
      name: 'John Smith',
      email: 'john.smith@tadbeer.com',
      role: 'admin',
      phone: '+972-599-123456',
      department: 'IT',
      joinedDate: '2024-01-15',
      lastActive: '2025-12-21',
      status: 'active',
      ticketsCount: 24
    },
    {
      id: 'USR-002',
      name: 'Emily Turner',
      email: 'emily.turner@tadbeer.com',
      role: 'team-lead',
      phone: '+972-599-234567',
      department: 'Support',
      joinedDate: '2024-03-10',
      lastActive: '2025-12-21',
      status: 'active',
      ticketsCount: 18
    },
    {
      id: 'USR-003',
      name: 'Michael Brown',
      email: 'michael.brown@tadbeer.com',
      role: 'team-member',
      phone: '+972-599-345678',
      department: 'Support',
      joinedDate: '2024-06-20',
      lastActive: '2025-12-20',
      status: 'active',
      ticketsCount: 12
    },
    {
      id: 'USR-004',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@tadbeer.com',
      role: 'team-lead',
      phone: '+972-599-456789',
      department: 'Technical',
      joinedDate: '2024-02-28',
      lastActive: '2025-12-19',
      status: 'active',
      ticketsCount: 31
    },
    {
      id: 'USR-005',
      name: 'David Wilson',
      email: 'david.wilson@tadbeer.com',
      role: 'team-member',
      department: 'Support',
      joinedDate: '2024-09-15',
      lastActive: '2025-12-18',
      status: 'inactive',
      ticketsCount: 8
    },
    {
      id: 'USR-006',
      name: 'Emma Davis',
      email: 'emma.davis@tadbeer.com',
      role: 'team-member',
      phone: '+972-599-567890',
      department: 'Technical',
      joinedDate: '2024-11-01',
      lastActive: '2025-12-21',
      status: 'active',
      ticketsCount: 15
    },
    {
      id: 'USR-007',
      name: 'Alex Rivera',
      email: 'alex.rivera@tadbeer.com',
      role: 'team-member',
      phone: '+972-599-678901',
      department: 'Security',
      joinedDate: '2024-07-12',
      lastActive: '2025-12-20',
      status: 'active',
      ticketsCount: 20
    },
    {
      id: 'USR-008',
      name: 'Lisa Anderson',
      email: 'lisa.anderson@tadbeer.com',
      role: 'team-member',
      department: 'Support',
      joinedDate: '2024-12-01',
      lastActive: '2025-12-15',
      status: 'pending',
      ticketsCount: 3
    }
  ];

  // Filter users based on search and role
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Get role badge styling
  const getRoleConfig = (role: string) => {
    const configs = {
      'admin': { icon: <Shield size={14} />, class: 'role-admin', label: 'Admin' },
      'team-lead': { icon: <UserCheck size={14} />, class: 'role-lead', label: 'Team Lead' },
      'team-member': { icon: <User size={14} />, class: 'role-member', label: 'Team Member' }
    };
    return configs[role as keyof typeof configs];
  };

  // Get status badge styling
  const getStatusClass = (status: string) => {
    const classes = {
      'active': 'status-active',
      'inactive': 'status-inactive',
      'pending': 'status-pending'
    };
    return classes[status as keyof typeof classes];
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Statistics
  const stats = [
    { 
      label: 'Total Users', 
      value: allUsers.length.toString(), 
      icon: <Users size={24} />,
      trendValue: '+5',
      trendUp: true
    },
    { 
      label: 'Active Users', 
      value: allUsers.filter(u => u.status === 'active').length.toString(), 
      icon: <UserCheck size={24} />,
      trendValue: '+2',
      trendUp: true
    },
    { 
      label: 'Team Leads', 
      value: allUsers.filter(u => u.role === 'team-lead').length.toString(), 
      icon: <Shield size={24} />,
      trendValue: '0',
      trendUp: true
    },
    { 
      label: 'Pending Invites', 
      value: allUsers.filter(u => u.status === 'pending').length.toString(), 
      icon: <UserPlus size={24} />,
      trendValue: '+1',
      trendUp: true
    }
  ];

  // User Card Component
  const UserCard: React.FC<{ user: User }> = ({ user }) => {
    const roleConfig = getRoleConfig(user.role);
    
    return (
      <div className="user-card">
        <div className="user-card-header">
          <div className="user-avatar">
            <User size={32} />
          </div>
          <button className="user-menu-btn" aria-label="More options">
            <MoreVertical size={18} />
          </button>
        </div>

        <div className="user-info">
          <h3 className="user-name">{user.name}</h3>
          <p className="user-email">
            <Mail size={14} />
            {user.email}
          </p>
          {user.phone && (
            <p className="user-phone">
              <Phone size={14} />
              {user.phone}
            </p>
          )}
        </div>

        <div className="user-badges">
          <span className={`role-badge ${roleConfig.class}`}>
            {roleConfig.icon}
            {roleConfig.label}
          </span>
          <span className={`status-badge ${getStatusClass(user.status)}`}>
            {user.status}
          </span>
        </div>

        <div className="user-meta">
          {user.department && (
            <div className="meta-item">
              <Users size={14} />
              <span>{user.department}</span>
            </div>
          )}
          <div className="meta-item">
            <Calendar size={14} />
            <span>Joined {formatDate(user.joinedDate)}</span>
          </div>
          <div className="meta-item">
            <Activity size={14} />
            <span>Active {formatDate(user.lastActive)}</span>
          </div>
        </div>

        <div className="user-footer">
          <div className="user-stats">
            {user.ticketsCount && (
              <span className="stat-item">
                <Shield size={14} />
                {user.ticketsCount} tickets
              </span>
            )}
          </div>
          <div className="user-actions">
            <button className="action-btn edit-btn" aria-label="Edit user">
              <Edit size={16} />
            </button>
            <button className="action-btn delete-btn" aria-label="Remove user">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // List View Item Component
  const UserListItem: React.FC<{ user: User }> = ({ user }) => {
    const roleConfig = getRoleConfig(user.role);
    
    return (
      <div className="user-list-item">
        <div className="list-item-left">
          <div className="user-avatar-small">
            <User size={24} />
          </div>
          <div className="user-info-list">
            <h3 className="user-name-list">{user.name}</h3>
            <p className="user-email-list">
              <Mail size={12} />
              {user.email}
            </p>
          </div>
        </div>

        <div className="list-item-center">
          <span className={`role-badge ${roleConfig.class}`}>
            {roleConfig.icon}
            {roleConfig.label}
          </span>
          <span className={`status-badge ${getStatusClass(user.status)}`}>
            {user.status}
          </span>
          {user.department && (
            <span className="department-badge">
              <Users size={12} />
              {user.department}
            </span>
          )}
        </div>

        <div className="list-item-right">
          {user.phone && (
            <div className="user-contact">
              <Phone size={14} />
              <span>{user.phone}</span>
            </div>
          )}
          <div className="user-activity">
            <Activity size={14} />
            <span>{formatDate(user.lastActive)}</span>
          </div>
          {user.ticketsCount && (
            <div className="user-tickets">
              <Shield size={14} />
              <span>{user.ticketsCount} tickets</span>
            </div>
          )}
          <div className="user-actions-list">
            <button className="action-btn edit-btn" aria-label="Edit user">
              <Edit size={16} />
            </button>
            <button className="action-btn delete-btn" aria-label="Remove user">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="user-management-page">
      <div className="user-management-content">
        {/* Statistics Cards */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-left">
                <div className="stat-icon">{stat.icon}</div>
                <span className={`stat-trend ${stat.trendUp ? 'up' : 'down'}`}>
                  {stat.trendValue}
                </span>
              </div>
              <div className="stat-right">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-label">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="controls-bar">
          <div className="controls-left">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <button 
                className={`filter-btn ${filterOpen ? 'active' : ''}`}
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <Filter size={18} />
                Filter
              </button>

              <select 
                className="sort-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="team-lead">Team Lead</option>
                <option value="team-member">Team Member</option>
              </select>

              <button className="sort-btn">
                <ArrowUpDown size={18} />
                Sort
              </button>
            </div>
          </div>

          <div className="controls-right">
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid size={18} />
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List size={18} />
              </button>
            </div>

            <button className="add-user-btn">
              <Plus size={18} />
              Add New User
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {filterOpen && (
          <div className="filter-panel">
            <div className="filter-section">
              <h4>Status</h4>
              <label className="filter-option">
                <input type="checkbox" defaultChecked />
                <span>Active</span>
              </label>
              <label className="filter-option">
                <input type="checkbox" defaultChecked />
                <span>Inactive</span>
              </label>
              <label className="filter-option">
                <input type="checkbox" defaultChecked />
                <span>Pending</span>
              </label>
            </div>

            <div className="filter-section">
              <h4>Department</h4>
              <label className="filter-option">
                <input type="checkbox" defaultChecked />
                <span>IT</span>
              </label>
              <label className="filter-option">
                <input type="checkbox" defaultChecked />
                <span>Support</span>
              </label>
              <label className="filter-option">
                <input type="checkbox" defaultChecked />
                <span>Technical</span>
              </label>
              <label className="filter-option">
                <input type="checkbox" defaultChecked />
                <span>Security</span>
              </label>
            </div>

            <div className="filter-section">
              <h4>Join Date</h4>
              <select className="filter-select">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last 6 months</option>
                <option>All time</option>
              </select>
            </div>

            <div className="filter-actions">
              <button className="filter-reset-btn">Reset</button>
              <button className="filter-apply-btn">Apply Filters</button>
            </div>
          </div>
        )}

        {/* Users Display */}
        {filteredUsers.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="users-grid">
                {filteredUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            ) : (
              <div className="users-list">
                {filteredUsers.map((user) => (
                  <UserListItem key={user.id} user={user} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Users size={64} strokeWidth={1} />
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default UserManagement;
