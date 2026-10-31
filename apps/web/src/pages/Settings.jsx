import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReminderPreferencesForm from "../components/ReminderPreferencesForm";
import { changePassword, deleteAccount, exportAccountData } from "../lib/api/account";
import { useAuth } from "../context/auth-context";

export default function Settings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handlePasswordChange(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (passwords.newPassword.length < 8) {
      setPasswordError("Your new password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(passwords.newPassword) || !/[0-9]/.test(passwords.newPassword)) {
      setPasswordError("Your new password must include at least one uppercase letter and one number.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Password changed.");
    } catch (error) {
      setPasswordError(`Could not change password: ${error.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    setExportMessage("");
    try {
      const data = await exportAccountData();
      if (data === null || data === undefined) throw new Error("The export endpoint returned no data.");
      const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "hackhub-personal-data.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportMessage("Your export download has started.");
    } catch (error) {
      setExportMessage(`Could not export your data: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Delete your HackHub account and associated personal data? This action cannot be undone.");
    if (!confirmed) return;
    setDeleteMessage("");
    setIsDeleting(true);
    try {
      await deleteAccount();
      await logout();
      navigate("/auth?panel=login", { replace: true });
    } catch (error) {
      setDeleteMessage(`Could not delete your account: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="settings-page space-y-7">
      <section>
        <p className="field-label">YOUR ACCOUNT / 05</p>
        <h1 className="product-heading mt-2">Keep it yours.</h1>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={handlePasswordChange} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Change password</h2>
          <div className="mt-4 space-y-3">
            {[
              ["currentPassword", "Current password", "current-password"],
              ["newPassword", "New password", "new-password"],
              ["confirmPassword", "Confirm new password", "new-password"],
            ].map(([key, label, autocomplete]) => (
              <div key={key}>
                <label htmlFor={key} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                <input id={key} type="password" autoComplete={autocomplete} required minLength={key === "currentPassword" ? undefined : 8} value={passwords[key]} onChange={(event) => setPasswords((state) => ({ ...state, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-100" />
              </div>
            ))}
          </div>
          {passwordError && <p role="alert" className="mt-3 text-sm text-rose-700">{passwordError}</p>}
          {passwordMessage && <p role="status" className="mt-3 text-sm text-emerald-700">{passwordMessage}</p>}
          <button type="submit" disabled={isChangingPassword} className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{isChangingPassword ? "Changing…" : "Change password"}</button>
        </form>

        <ReminderPreferencesForm />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Your personal data</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Download a copy of the personal information associated with your account.</p>
        <button type="button" onClick={handleExport} disabled={isExporting} className="mt-4 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{isExporting ? "Preparing export…" : "Export personal data"}</button>
        {exportMessage && <p role="status" className="mt-3 text-sm text-slate-700">{exportMessage}</p>}
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-rose-900">Delete account</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Permanently delete your account and personal information. This action cannot be undone.</p>
        <button type="button" onClick={handleDeleteAccount} disabled={isDeleting} className="mt-4 rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">{isDeleting ? "Deleting…" : "Delete my account"}</button>
        {deleteMessage && <p role="alert" className="mt-3 text-sm text-rose-800">{deleteMessage}</p>}
      </section>
    </div>
  );
}
