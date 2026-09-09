export function githubRawUrl(path, env) {
  if (!path) return '';
  const owner = env.GITHUB_OWNER || 'ittcmoph-cloud';
  const repo = env.GITHUB_REPO || 'thaijaroen';
  const ref = env.GITHUB_REF || 'main';
  const normalized = String(path).replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${normalized.split('/').map(encodeURIComponent).join('/')}`;
}
