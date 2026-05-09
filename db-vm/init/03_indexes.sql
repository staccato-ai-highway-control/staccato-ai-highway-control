-- STACCATO Index Definitions
-- Query performance indexes for MVP core tables.

USE staccato;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_status ON users(role, account_status);

CREATE INDEX idx_signup_requests_status ON signup_requests(request_status);
CREATE INDEX idx_email_verifications_token ON email_verifications(verification_token);
CREATE INDEX idx_security_logs_actor_created ON security_logs(actor_user_id, created_at);

CREATE INDEX idx_cctvs_active ON cctvs(is_active);
CREATE INDEX idx_cctv_rois_cctv_type ON cctv_rois(cctv_id, roi_type);

CREATE INDEX idx_incidents_cctv ON incidents(cctv_id);
CREATE INDEX idx_incidents_status_detected ON incidents(incident_status, detected_at);
CREATE INDEX idx_incidents_type_risk ON incidents(incident_type, risk_level);

CREATE INDEX idx_detection_logs_incident ON detection_logs(incident_id);
CREATE INDEX idx_detection_logs_cctv_detected ON detection_logs(cctv_id, detected_at);

CREATE INDEX idx_incident_snapshots_incident ON incident_snapshots(incident_id);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_incident ON notifications(incident_id);
CREATE INDEX idx_notifications_created ON notifications(created_at);