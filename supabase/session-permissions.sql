-- Applied as harvest_server_session_read. Only the backend role receives these
-- three column privileges. Browser roles cannot read sessions or call this RPC.
grant select (id,user_id,not_after) on auth.sessions to service_role;
