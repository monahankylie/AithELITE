import {useEffect, useState} from "react";
import {useNavigate} from "react-router";
import {doc, updateDoc, deleteDoc} from "firebase/firestore";
import {deleteUser, type User} from "firebase/auth";
import PageLayout from "../components/page-layout";
import {useAuth} from "../auth-context";
import {auth, db} from "../../firebase-config";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ProfilePage() {
  const {user, profile} = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organization, setOrganization] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setOrganization(profile.organization ?? "");
    }
  }, [profile]);

  const hasChanges =
    firstName !== (profile?.firstName ?? "") ||
    lastName !== (profile?.lastName ?? "") ||
    organization !== (profile?.organization ?? "");

  const handleSave = async () => {
    if (!user || !hasChanges) return;
    setSaveStatus("saving");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        organization: organization.trim(),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user as User);
      navigate("/");
    } catch (err: any) {
      console.error("Failed to delete account:", err);
      if (err?.code === "auth/requires-recent-login") {
        alert("For security, please sign out, sign back in, and try again.");
      } else {
        alert("Something went wrong. Please try again.");
      }
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const initials = `${(profile?.firstName ?? "")[0] ?? ""}${(profile?.lastName ?? "")[0] ?? ""}`.toUpperCase() || "?";

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-black sm:text-3xl">Personal Information</h1>
          {saveStatus === "saving" && (
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
              Saving changes…
            </span>
          )}
          {saveStatus === "saved" && <span className="text-sm font-medium text-emerald-600">Changes saved</span>}
          {saveStatus === "error" && <span className="text-sm font-medium text-red-500">Save failed</span>}
        </div>

        {/* Avatar */}
        <div className="mt-8 flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-bold text-white shadow-md">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-black">
              {profile?.firstName} {profile?.lastName}
            </p>
            <p className="text-sm text-black/50">{user?.email}</p>
          </div>
        </div>

        <hr className="my-8 border-black/10" />

        {/* Form */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-black/80">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black/30 focus:ring-4 focus:ring-black/5"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black/80">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black/30 focus:ring-4 focus:ring-black/5"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-black/80">Email Address</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 text-sm text-black/50 outline-none"
            />
            <p className="mt-1.5 text-xs text-black/40">Email is tied to your login and cannot be changed here.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-black/80">Team / Organization</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Richmond Oilers"
              className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black/30 focus:ring-4 focus:ring-black/5"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="mt-8">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === "saving"}
            className={`
              rounded-full px-8 py-3 text-sm font-semibold text-white transition-all
              bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700
              bg-[length:200%_200%] bg-left
              shadow-md hover:shadow-lg
              focus:outline-none focus:ring-2 focus:ring-blue-400/40
              ${hasChanges && saveStatus !== "saving" ? "hover:bg-right duration-500" : "opacity-40 cursor-not-allowed"}
            `}
          >
            {saveStatus === "saving" ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* Danger zone */}
        <hr className="my-10 border-black/10" />

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
          <p className="mt-1 text-sm text-red-600/70">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-4 rounded-full border border-red-300 px-6 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300/40"
            >
              Delete Account
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-full border border-black/10 px-6 py-2 text-sm font-medium text-black/60 transition hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
