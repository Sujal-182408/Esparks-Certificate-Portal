-- ============================================================
-- docs/schema.sql — database schema REFERENCE
-- ============================================================
--
-- ⚠️  The repository never contained a schema or migrations, so this
--     file was RECONSTRUCTED from the SQL queries in the code. Column
--     types/defaults may differ from the live Neon database.
--
--     Before running anything against production, compare with:
--         pg_dump --schema-only "$DATABASE_URL"
--     and then replace this file with the real dump.
--
--     Recommended next step: adopt a migration tool (e.g. node-pg-migrate)
--     so every schema change is versioned in git.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS admin_users (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'admin',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS employee_users (
  id             BIGSERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(254) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS certificates (
  id                  BIGSERIAL PRIMARY KEY,
  certificate_no      TEXT NOT NULL UNIQUE,            -- EITS-CERT-2026-1002
  certificate_type    TEXT NOT NULL CHECK (certificate_type IN ('CERT', 'INTR')),
  employee_id         BIGINT REFERENCES employee_users(id) ON DELETE SET NULL,
  recipient_name      VARCHAR(150) NOT NULL,
  course_name         VARCHAR(200) NOT NULL,
  issuer_name         VARCHAR(200) NOT NULL,
  issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  verification_token  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), -- in the QR code
  status              TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'revoked')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS certificate_requests (
  id                  BIGSERIAL PRIMARY KEY,
  employee_id         BIGINT NOT NULL REFERENCES employee_users(id) ON DELETE CASCADE,
  certificate_type    TEXT NOT NULL CHECK (certificate_type IN ('CERT', 'INTR')),
  course_name         VARCHAR(200) NOT NULL,
  additional_details  VARCHAR(2000),
  duration_months     SMALLINT CHECK (duration_months BETWEEN 1 AND 24),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'issued', 'rejected')),
  certificate_id      BIGINT REFERENCES certificates(id) ON DELETE SET NULL,
  rejection_reason    VARCHAR(2000),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  issued_at           TIMESTAMPTZ
);

-- Business rule: at most ONE pending request per employee.
-- The app checks this too, but only the database can guarantee it
-- when two requests arrive at the same instant.
CREATE UNIQUE INDEX IF NOT EXISTS certificate_requests_one_pending_per_employee
  ON certificate_requests (employee_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS certificate_number_sequences (
  certificate_type  TEXT NOT NULL,
  certificate_year  INTEGER NOT NULL,
  next_number       INTEGER NOT NULL,
  PRIMARY KEY (certificate_type, certificate_year)
);

CREATE TABLE IF NOT EXISTS certificate_audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  certificate_id  BIGINT REFERENCES certificates(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  performed_by    TEXT NOT NULL,
  details         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id                      BIGSERIAL PRIMARY KEY,
  recipient_type          TEXT NOT NULL CHECK (recipient_type IN ('admin', 'employee')),
  recipient_id            BIGINT NOT NULL,
  type                    TEXT NOT NULL,
  title                   TEXT NOT NULL,
  message                 TEXT NOT NULL,
  certificate_request_id  BIGINT REFERENCES certificate_requests(id) ON DELETE SET NULL,
  certificate_id          BIGINT REFERENCES certificates(id) ON DELETE SET NULL,
  is_read                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON notifications (recipient_type, recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_type   TEXT NOT NULL CHECK (user_type IN ('admin', 'employee')),
  user_id     BIGINT NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,   -- SHA-256 hex; the raw token is never stored
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificate_delete_otps (
  id              UUID PRIMARY KEY,
  admin_id        BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  admin_email     TEXT NOT NULL,
  certificate_id  BIGINT NOT NULL,
  otp_hash        CHAR(64) NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
