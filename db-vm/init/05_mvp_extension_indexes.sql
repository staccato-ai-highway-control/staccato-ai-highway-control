-- STACCATO MVP Extension Indexes

USE staccato;

CREATE INDEX idx_its_weather_incident_observed
    ON its_weather_snapshots(incident_id, observed_at);

CREATE INDEX idx_its_traffic_incident_observed
    ON its_traffic_snapshots(incident_id, observed_at);

CREATE INDEX idx_its_risk_scores_incident
    ON its_risk_scores(incident_id);

CREATE INDEX idx_notification_deliveries_notification
    ON notification_deliveries(notification_id);

CREATE INDEX idx_notification_deliveries_user_status
    ON notification_deliveries(user_id, delivery_status);

CREATE INDEX idx_external_api_logs_service_created
    ON external_api_logs(service_name, created_at);

CREATE INDEX idx_external_api_logs_success_created
    ON external_api_logs(is_success, created_at);

CREATE INDEX idx_ai_models_task_active
    ON ai_models(task_type, is_active);

CREATE INDEX idx_ai_model_versions_model_deployed
    ON ai_model_versions(model_id, is_deployed);

CREATE INDEX idx_training_datasets_name_version
    ON training_datasets(dataset_name, dataset_version);

CREATE INDEX idx_training_jobs_status_created
    ON training_jobs(job_status, created_at);

CREATE INDEX idx_training_jobs_model
    ON training_jobs(model_id);
