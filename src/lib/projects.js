import { supabase } from './supabase.js';

function requireClient() {
  if (!supabase) throw new Error('Cloud projects need Supabase URL and anon key configured.');
  return supabase;
}

export async function listCloudProjects() {
  const { data, error } = await requireClient().from('projects').select('id, name, description, updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveCloudProject(name, files, projectId = null) {
  const client = requireClient();
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 120) throw new Error('Project name must be between 1 and 120 characters.');
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const user = userResult?.user;
  if (!user) throw new Error('Sign in before saving a cloud project.');
  let project;
  if (projectId) {
    const { data, error } = await client.from('projects').update({ name: cleanName, updated_at: new Date().toISOString() }).eq('id', projectId).select('id, name, description, updated_at').single();
    if (error) throw error;
    project = data;
  } else {
    const { data, error } = await client.from('projects').insert({ owner_id: user.id, name: cleanName, description: 'SYNTAX IDE workspace' }).select('id, name, description, updated_at').single();
    if (error) throw error;
    project = data;
  }
  const { data: existingRows, error: existingError } = await client.from('project_files').select('path').eq('project_id', project.id);
  if (existingError) throw existingError;
  const currentPaths = new Set(files.map((file) => file.name));
  const stalePaths = (existingRows ?? []).map((row) => row.path).filter((path) => !currentPaths.has(path));
  if (stalePaths.length) {
    const { error: deleteError } = await client.from('project_files').delete().eq('project_id', project.id).in('path', stalePaths);
    if (deleteError) throw deleteError;
  }
  const rows = files.map((file) => ({ project_id: project.id, owner_id: user.id, path: file.name, language: file.language || 'plaintext', content: file.content ?? '', updated_at: new Date().toISOString() }));
  const { error: filesError } = await client.from('project_files').upsert(rows, { onConflict: 'project_id,path' });
  if (filesError) throw filesError;
  return project;
}

export async function loadCloudProject(projectId) {
  const client = requireClient();
  const { data: project, error: projectError } = await client.from('projects').select('id, name, description, updated_at').eq('id', projectId).single();
  if (projectError) throw projectError;
  const { data: rows, error: filesError } = await client.from('project_files').select('path, language, content').eq('project_id', projectId).order('path', { ascending: true });
  if (filesError) throw filesError;
  return { project, files: (rows ?? []).map((row) => ({ name: row.path, language: row.language, content: row.content })) };
}
