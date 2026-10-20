import { useEffect, useState } from 'react';
import { Cloud, Download, RefreshCw, Save } from 'lucide-react';
import { listCloudProjects, saveCloudProject, loadCloudProject } from './lib/projects.js';
import { supabaseConfigured } from './lib/supabase.js';

export default function CloudProjectsPanel({ authUser, files, onLoad, onNotice }) {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('My SYNTAX Project');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!authUser || !supabaseConfigured) return;
    setBusy(true);
    try {
      const nextProjects = await listCloudProjects();
      setProjects(nextProjects);
      if (selectedId && !nextProjects.some((project) => project.id === selectedId)) setSelectedId('');
      if (!selectedId && nextProjects[0]) {
        setSelectedId(nextProjects[0].id);
        setName(nextProjects[0].name);
      }
    } catch (error) {
      onNotice(error?.message || 'Could not load cloud projects. Apply the Supabase migration and check access policies.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { refresh(); }, [authUser?.id]);

  async function save(event) {
    event.preventDefault();
    if (!authUser) return onNotice('Sign in from the Account panel before saving a cloud project.');
    setBusy(true);
    try {
      const project = await saveCloudProject(name, files, selectedId || null);
      setSelectedId(project.id);
      setName(project.name);
      setProjects(await listCloudProjects());
      onNotice('Cloud project saved successfully.');
    } catch (error) {
      onNotice(error?.message || 'Cloud save failed. Check Supabase configuration and migration.');
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    if (!selectedId) return onNotice('Choose a cloud project to load.');
    setBusy(true);
    try {
      const result = await loadCloudProject(selectedId);
      if (!result.files.length) return onNotice('This cloud project has no saved files yet.');
      onLoad(result.project, result.files);
    } catch (error) {
      onNotice(error?.message || 'Could not load that cloud project.');
    } finally {
      setBusy(false);
    }
  }

  if (!authUser) return <div className="cloud-project-panel"><Cloud size={22} /><strong>Cloud workspace</strong><p>Sign in from the Account panel to save projects securely to your own account.</p></div>;
  return <div className="cloud-project-panel">
    <Cloud size={22} />
    <strong>Cloud workspace</strong>
    <p>Save this editor workspace to your private Supabase project space.</p>
    {!supabaseConfigured && <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in hosting settings to activate cloud storage.</p>}
    <form onSubmit={save}>
      <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></label>
      <button className="auth-button" type="submit" disabled={busy || !supabaseConfigured}><Save size={13} /> {busy ? 'Working…' : selectedId ? 'Update selected project' : 'Save as new project'}</button>
    </form>
    <button className="auth-button secondary" type="button" onClick={refresh} disabled={busy || !supabaseConfigured}><RefreshCw size={13} /> Refresh projects</button>
    <label>Saved projects<select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); const project = projects.find((item) => item.id === event.target.value); if (project) setName(project.name); }}><option value="">Select a project…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
    <button className="auth-button secondary" type="button" onClick={load} disabled={busy || !selectedId}><Download size={13} /> Load selected project</button>
  </div>;
}
