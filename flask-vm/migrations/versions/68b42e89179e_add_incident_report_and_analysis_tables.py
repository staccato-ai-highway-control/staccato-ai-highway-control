"""Add incident report and analysis tables

Revision ID: 68b42e89179e
Revises: 735c71bc1058
Create Date: 2026-05-14 06:07:04.032362

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
# 이 번호들이 현재 DB의 순서와 일치해야 합니다.
revision = '68b42e89179e'
down_revision = '735c71bc1058'
branch_labels = None
depends_on = None

def upgrade():
    # 1. incident_reports 테이블 생성
    op.create_table('incident_reports',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('report_code', sa.String(length=50), nullable=False),
        sa.Column('report_type', sa.String(length=50), nullable=False),
        sa.Column('upload_purpose', sa.String(length=30), nullable=False),
        sa.Column('report_source_type', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reporter_id', sa.BigInteger(), nullable=False),
        sa.Column('cctv_id', sa.BigInteger(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('risk_score', sa.Integer(), nullable=True),
        sa.Column('reviewed_by', sa.BigInteger(), nullable=True),
        sa.Column('closed_by', sa.BigInteger(), nullable=True),
        sa.Column('reject_reason', sa.Text(), nullable=True),
        sa.Column('is_demo_data', sa.Boolean(), nullable=False),
        sa.Column('converted_incident_id', sa.BigInteger(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['closed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['deleted_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('report_code')
    )

    # 2. report_attachments 테이블 생성
    op.create_table('report_attachments',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('report_id', sa.BigInteger(), nullable=False),
        sa.Column('file_type', sa.String(length=30), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('stored_filename', sa.String(length=255), nullable=False),
        sa.Column('storage_type', sa.String(length=30), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=True),
        sa.Column('thumbnail_url', sa.String(length=500), nullable=True),
        sa.Column('file_hash', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('scan_status', sa.String(length=30), nullable=False),
        sa.Column('is_private', sa.Boolean(), nullable=False),
        sa.Column('download_count', sa.Integer(), nullable=False),
        sa.Column('access_count', sa.Integer(), nullable=False),
        sa.Column('duration_seconds', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('fps', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('resolution_width', sa.Integer(), nullable=True),
        sa.Column('resolution_height', sa.Integer(), nullable=True),
        sa.Column('exif_latitude', sa.Numeric(precision=10, scale=7), nullable=True),
        sa.Column('exif_longitude', sa.Numeric(precision=10, scale=7), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=True),
        sa.Column('uploaded_by', sa.BigInteger(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_by', sa.BigInteger(), nullable=True),
        sa.Column('delete_reason', sa.Text(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['deleted_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['report_id'], ['incident_reports.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. report_analysis_jobs 테이블 생성
    op.create_table('report_analysis_jobs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('report_id', sa.BigInteger(), nullable=False),
        sa.Column('attachment_id', sa.BigInteger(), nullable=False),
        sa.Column('job_status', sa.String(length=30), nullable=False),
        sa.Column('analysis_type', sa.String(length=30), nullable=False),
        sa.Column('ai_engine_type', sa.String(length=30), nullable=False),
        sa.Column('requested_by', sa.BigInteger(), nullable=False),
        sa.Column('requested_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['attachment_id'], ['report_attachments.id'], ),
        sa.ForeignKeyConstraint(['report_id'], ['incident_reports.id'], ),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('report_analysis_jobs')
    op.drop_table('report_attachments')
    op.drop_table('incident_reports')