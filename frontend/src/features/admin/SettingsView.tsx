import { ShieldCheck } from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Settings</h2>
        <p className="text-sm text-slate-caption">Role-gated admin controls and operational guardrails for the observer portal.</p>
      </div>

      <div className="rounded-container border border-white/10 bg-deep-slate p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-input bg-veridian-emerald/15 p-3">
            <ShieldCheck className="w-5 h-5 text-veridian-emerald" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Access Policy</h3>
            <p className="text-xs text-slate-caption">Handlers stay on the field app, while admin-only sections remain protected by User/Role checks.</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-200">
          <p>`ROLE_ADMIN` users can observe analytics, manage handlers, inspect livestock, and archive cleared batches.</p>
          <p>`ROLE_HANDLER` users are redirected to `/mobile` and do not receive the admin sidebar or admin API access.</p>
          <p>All protected backend management endpoints are enforced with Spring Security and `@PreAuthorize` checks under `com.authapp`.</p>
        </div>
      </div>
    </div>
  );
}
