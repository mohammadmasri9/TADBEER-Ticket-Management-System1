import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import '../style/Reports.css';
import { 
  Calendar,
  Download,
  FileText,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Users,
  Ticket,
  AlertCircle,
  FileSpreadsheet,
  Lock
} from 'lucide-react';

interface ChartData {
  label: string;
  value: number;
  percentage?: number;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  
  const [startDate, setStartDate] = useState('2025-11-01');
  const [endDate, setEndDate] = useState('2025-12-21');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');

  // Role-based access check
  if (user?.role !== "manager") {
    return (
      <div className="reports-page">
        <div className="reports-content">
          <div className="access-denied-container">
            <div className="access-denied-card">
              <div className="access-denied-icon">
                <Lock size={64} />
              </div>
              <h2 className="access-denied-title">Access Restricted</h2>
              <p className="access-denied-message">
                You don't have permission to access this page. Reports dashboard is only available for managers.
              </p>
              <div className="access-denied-info">
                <p className="info-label">Your Current Role:</p>
                <span className="role-badge">{user?.role || 'Guest'}</span>
              </div>
              <button 
                className="back-btn"
                onClick={() => window.history.back()}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Data remains the same (ticketMetrics, performanceIndicators, stats, teamPerformance)
  const ticketMetrics: ChartData[] = [
    { label: 'Mon', value: 85 },
    { label: 'Tue', value: 62 },
    { label: 'Wed', value: 78 },
    { label: 'Thu', value: 92 },
    { label: 'Fri', value: 71 },
    { label: 'Sat', value: 105 },
    { label: 'Sun', value: 58 },
    { label: 'Mon', value: 95 }
  ];

  const performanceIndicators: ChartData[] = [
    { label: 'Resolved', value: 156, percentage: 45 },
    { label: 'In Progress', value: 89, percentage: 26 },
    { label: 'Open', value: 52, percentage: 15 },
    { label: 'On Hold', value: 28, percentage: 8 },
    { label: 'Closed', value: 21, percentage: 6 }
  ];

  const stats = [
    {
      label: 'Total Tickets',
      value: '346',
      change: '+12.5%',
      trend: 'up' as const,
      icon: <Ticket size={24} />
    },
    {
      label: 'Avg Response Time',
      value: '2.4h',
      change: '-8.3%',
      trend: 'down' as const,
      icon: <Clock size={24} />
    },
    {
      label: 'Resolution Rate',
      value: '94.2%',
      change: '+5.1%',
      trend: 'up' as const,
      icon: <CheckCircle size={24} />
    },
    {
      label: 'Customer Satisfaction',
      value: '4.8/5',
      change: '+0.3',
      trend: 'up' as const,
      icon: <TrendingUp size={24} />
    }
  ];

  const teamPerformance = [
    { team: 'Technical Support', tickets: 142, resolved: 128, avgTime: '1.8h', satisfaction: '4.9' },
    { team: 'Customer Service', tickets: 98, resolved: 89, avgTime: '2.1h', satisfaction: '4.7' },
    { team: 'IT Department', tickets: 76, resolved: 71, avgTime: '3.2h', satisfaction: '4.6' },
    { team: 'Security Team', tickets: 30, resolved: 28, avgTime: '2.5h', satisfaction: '4.8' }
  ];

  const maxTicketValue = Math.max(...ticketMetrics.map(m => m.value));

  const handleGenerateReport = () => {
    console.log('Generating report with:', { startDate, endDate, selectedStatus, selectedTeam });
  };

  const handleDownloadPDF = () => {
    console.log('Downloading PDF report...');
  };

  const handleDownloadExcel = () => {
    console.log('Downloading Excel report...');
  };

  return (
    <div className="reports-page">
      <div className="reports-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Reports Dashboard</h1>
            <p className="page-subtitle">Comprehensive analytics and performance metrics</p>
          </div>
          <div className="header-right">
            <button className="primary-btn" onClick={handleGenerateReport}>
              <BarChart3 size={18} />
              Generate Report
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filter-group">
            <div className="filter-item">
              <label htmlFor="start-date">Start Date</label>
              <div className="date-input-wrapper">
                <Calendar size={18} />
                <input
                  id="start-date"
                  type="date"
                  className="date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-item">
              <label htmlFor="end-date">End Date</label>
              <div className="date-input-wrapper">
                <Calendar size={18} />
                <input
                  id="end-date"
                  type="date"
                  className="date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-item">
              <label htmlFor="status-filter">Status</label>
              <div className="select-wrapper">
                <Filter size={18} />
                <select
                  id="status-filter"
                  className="filter-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="filter-item">
              <label htmlFor="team-filter">Team</label>
              <div className="select-wrapper">
                <Users size={18} />
                <select
                  id="team-filter"
                  className="filter-select"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="all">All Teams</option>
                  <option value="technical">Technical Support</option>
                  <option value="customer">Customer Service</option>
                  <option value="it">IT Department</option>
                  <option value="security">Security Team</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Same pattern as other pages */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-left">
                <div className="stat-icon-wrapper">
                  {stat.icon}
                </div>
                <div className={`stat-trend ${stat.trend}`}>
                  {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div className="stat-right">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-label">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Enhanced Bar Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Ticket Metrics (Weekly)</h3>
              <BarChart3 size={20} className="chart-icon" />
            </div>
            <div className="chart-container">
              <div className="bar-chart">
                {ticketMetrics.map((metric, index) => (
                  <div key={index} className="bar-item">
                    <div 
                      className="bar"
                      style={{ height: `${(metric.value / maxTicketValue) * 100}%` }}
                    />
                    <span className="bar-value">{metric.value}</span>
                    <span className="bar-label">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Pie Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Performance Indicators</h3>
              <PieChart size={20} className="chart-icon" />
            </div>
            <div className="chart-container">
              <div className="pie-chart-container">
                <div className="pie-chart">
                  <svg viewBox="0 0 200 200">
                    {performanceIndicators.map((indicator, index) => {
                      const colors = ['#DC0032', '#A50026', '#808285', '#E5E3E1', '#302927'];
                      const percentage = indicator.percentage || 0;
                      const angle = (percentage / 100) * 360;
                      const startAngle = 0; // Simplified for demo
                      
                      return (
                        <circle
                          key={index}
                          cx="100"
                          cy="100"
                          r="80"
                          fill="transparent"
                          stroke={colors[index]}
                          strokeWidth="20"
                          strokeDasharray={`${angle * 2.24} 251.3`}
                          strokeDashoffset="251.3"
                          transform="rotate(-90 100 100)"
                          className="pie-segment"
                        />
                      );
                    })}
                    <circle cx="100" cy="100" r="60" fill="#f8fafc" />
                  </svg>
                  <div className="pie-center">
                    <span className="pie-total">346</span>
                    <span className="pie-label">Total Tickets</span>
                  </div>
                </div>
                <div className="pie-legend">
                  {performanceIndicators.map((indicator, index) => (
                    <div key={index} className="legend-item">
                      <div 
                        className="legend-color"
                        style={{ backgroundColor: ['#DC0032', '#A50026', '#808285', '#E5E3E1', '#302927'][index] }}
                      />
                      <span className="legend-label">{indicator.label}</span>
                      <span className="legend-value">{indicator.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance Table */}
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Team Performance Overview</h3>
            <Users size={20} className="table-icon" />
          </div>
          <div className="table-container">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Total Tickets</th>
                  <th>Resolved</th>
                  <th>Avg Response</th>
                  <th>Satisfaction</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((team, index) => {
                  const resolveRate = ((team.resolved / team.tickets) * 100).toFixed(1);
                  const statusClass = parseFloat(resolveRate) >= 90 ? 'excellent' : 
                                    parseFloat(resolveRate) >= 80 ? 'good' : 'needs-improvement';
                  return (
                    <tr key={index}>
                      <td className="team-name">{team.team}</td>
                      <td>{team.tickets}</td>
                      <td>{team.resolved}</td>
                      <td>{team.avgTime}</td>
                      <td>
                        <div className="satisfaction-rating">
                          {team.satisfaction}/5
                          <div className="stars">★★★★☆</div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {parseFloat(resolveRate) >= 90 ? 'Excellent' : 
                           parseFloat(resolveRate) >= 80 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Download Section */}
        <div className="download-section">
          <div className="section-header">
            <h3 className="section-title">Download Reports</h3>
            <FileText size={20} />
          </div>
          <div className="download-buttons">
            <button className="download-btn pdf-btn" onClick={handleDownloadPDF}>
              <Download size={18} />
              <span>PDF Report</span>
            </button>
            <button className="download-btn excel-btn" onClick={handleDownloadExcel}>
              <FileSpreadsheet size={18} />
              <span>Excel Export</span>
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Reports;
