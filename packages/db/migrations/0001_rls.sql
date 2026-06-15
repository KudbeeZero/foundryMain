-- Foundry Row-Level Security policies (Core Plane).
--
-- Tenant isolation model: the Edge/API plane authenticates the request, resolves
-- the caller's org, and sets a transaction-local GUC before issuing queries:
--
--     SELECT set_config('app.current_org_id', '<org-uuid>', true);
--
-- Every tenant-scoped table is then constrained to rows whose org_id matches that
-- GUC. The `orgs` table is constrained on its own id. A NULL/unset GUC matches no
-- rows (fail-closed). The service role (used by trusted workers) bypasses RLS via
-- its BYPASSRLS attribute and is unaffected by these policies.

-- Helper: current org from the request-scoped setting (NULL when unset).
CREATE OR REPLACE FUNCTION app_current_org_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid
$$;

-- Enable + force RLS on every table.
ALTER TABLE "orgs"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "channels"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repos"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_runs"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_calls"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_memory"      ENABLE ROW LEVEL SECURITY;

-- orgs: a caller may only see/act on their own org row.
CREATE POLICY orgs_tenant_isolation ON "orgs"
  USING (id = app_current_org_id())
  WITH CHECK (id = app_current_org_id());

-- All other tables: scoped by org_id.
CREATE POLICY users_tenant_isolation ON "users"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY teams_tenant_isolation ON "teams"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY agents_tenant_isolation ON "agents"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY channels_tenant_isolation ON "channels"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY repos_tenant_isolation ON "repos"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY messages_tenant_isolation ON "messages"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY tasks_tenant_isolation ON "tasks"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY agent_runs_tenant_isolation ON "agent_runs"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY tool_calls_tenant_isolation ON "tool_calls"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY approval_requests_tenant_isolation ON "approval_requests"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY audit_log_tenant_isolation ON "audit_log"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
CREATE POLICY agent_memory_tenant_isolation ON "agent_memory"
  USING (org_id = app_current_org_id()) WITH CHECK (org_id = app_current_org_id());
