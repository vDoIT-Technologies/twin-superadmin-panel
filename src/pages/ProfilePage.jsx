import { useEffect, useState } from 'react';
import { Mail, Phone, Shield, UserCircle2 } from 'lucide-react';
import { useAuth } from '../app/AuthContext';

export function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const updateField = (key, value) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateProfile(draft);
    setSaved(true);
  };

  return (
    <section className="page-section profile-page">
      <header className="profile-page-header">
        <div className="profile-page-copy">
          <h1>Profile</h1>
          <p>Manage your superadmin identity, contact details, and basic account information.</p>
        </div>
      </header>

      <div className="profile-page-grid">
        <aside className="table-card profile-summary-card">
          <div className="profile-summary-avatar">
            <UserCircle2 size={30} />
          </div>
          <h2>{draft.name}</h2>
          <p>{draft.role}</p>

          <div className="profile-summary-list">
            <div className="profile-summary-row">
              <Mail size={15} />
              <span>{draft.email}</span>
            </div>
            <div className="profile-summary-row">
              <Phone size={15} />
              <span>{draft.phone || 'Add a contact number'}</span>
            </div>
            <div className="profile-summary-row">
              <Shield size={15} />
              <span>{draft.company}</span>
            </div>
          </div>
        </aside>

        <form className="table-card profile-form-card" onSubmit={handleSubmit}>
          <div className="profile-form-head">
            <div>
              <h2>Edit Details</h2>
              <span>These fields are saved for the current authenticated admin session.</span>
            </div>
            {saved ? <b className="profile-save-badge">Saved</b> : null}
          </div>

          <div className="profile-form-grid">
            <label className="profile-field">
              <span>Full Name</span>
              <input value={draft.name} onChange={(event) => updateField('name', event.target.value)} />
            </label>
            <label className="profile-field">
              <span>Role</span>
              <input value={draft.role} onChange={(event) => updateField('role', event.target.value)} />
            </label>
            <label className="profile-field">
              <span>Email</span>
              <input value={draft.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
            <label className="profile-field">
              <span>Phone</span>
              <input value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </label>
            <label className="profile-field">
              <span>Company</span>
              <input value={draft.company} onChange={(event) => updateField('company', event.target.value)} />
            </label>
            <label className="profile-field profile-field-full">
              <span>Bio</span>
              <textarea value={draft.bio} onChange={(event) => updateField('bio', event.target.value)} rows={5} />
            </label>
          </div>

          <div className="profile-form-actions">
            <button type="submit" className="profile-save-button">
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
