// src/pages/SharedTraining.tsx
import React from "react";
import "../style/CommonPage.css";

const SharedTraining: React.FC = () => {
    return (
        <div className="common-page">
            <div className="page-header">
                <h1>Training Materials</h1>
                <p className="page-description">
                    Access training resources and documentation
                </p>
            </div>

            <div className="page-content">
                <div className="content-section">
                    <h2>Training Resources</h2>
                    <p>Training materials and documentation will be available here soon.</p>

                    <div className="empty-state">
                        <div className="empty-icon">📚</div>
                        <h3>Coming Soon</h3>
                        <p>Training materials feature is under development</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SharedTraining;
