-- Row-Level Security for the Beacon event stream (ROADMAP Epic 5 — closes the
-- GAP left open in Epic 3). Defense-in-depth: the replay read path uses the
-- trusted service role (BYPASSRLS) so this never affects it, but any future
-- non-privileged reader is now constrained to its own org.
--
-- beacon_events.org_id is free-text (Beacon uses string ids), and events can be
-- legitimately unattributed (mock / claude-code with no org). So the policy admits
-- NULL-org rows in addition to rows matching the request-scoped org GUC. Reuses
-- app_current_org_id() from 0001_rls.sql.

ALTER TABLE "beacon_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY beacon_events_tenant_isolation ON "beacon_events"
  USING ("org_id" IS NULL OR "org_id" = app_current_org_id()::text)
  WITH CHECK ("org_id" IS NULL OR "org_id" = app_current_org_id()::text);
