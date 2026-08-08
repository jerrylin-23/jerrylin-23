const fs = require('node:fs');

const USERNAME = 'jerrylin-23';
const API = `https://api.github.com/users/${USERNAME}`;
const headers = {
  accept: 'application/vnd.github+json',
  'user-agent': `${USERNAME}-profile-readme`,
};

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status} for ${path}`);
  return response.json();
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function card(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="195" viewBox="0 0 495 195">
  <style>text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Ubuntu,sans-serif}.card{fill:#1a1b26;stroke:#1f2328}.title{fill:#7aa2f7;font-size:11px;letter-spacing:2px}.label{fill:#565f89;font-size:10px}.value{fill:#c0caf5;font-size:22px;font-weight:700}.muted{fill:#a9b1d6;font-size:11px}</style>
  <rect class="card" x="0.5" y="0.5" width="494" height="194" rx="12"/>
  <text class="title" x="24" y="31">${escapeXml(title.toUpperCase())}</text>
${body}
</svg>
`;
}

function statsSvg(profile) {
  const rows = [
    ['Repositories', profile.public_repos],
    ['Followers', profile.followers],
    ['Following', profile.following],
  ];
  return card('GitHub Stats', rows.map(([label, value], index) => {
    const x = 24 + index * 155;
    return `<text class="label" x="${x}" y="78">${label}</text><text class="value" x="${x}" y="111">${value}</text>`;
  }).join('') + `<text class="muted" x="24" y="157">Public profile activity for github.com/${USERNAME}</text>`);
}

function languagesSvg(languages) {
  const entries = languages.slice(0, 5);
  const total = entries.reduce((sum, item) => sum + item.bytes, 0) || 1;
  const colors = ['#7aa2f7', '#bb9af7', '#7dcfff', '#9ece6a', '#f7768e'];
  let x = 24;
  let body = '';
  for (const [index, item] of entries.entries()) {
    const width = Math.max(8, Math.round((item.bytes / total) * 447));
    body += `<rect x="${x}" y="62" width="${width}" height="10" fill="${colors[index]}"/>`;
    x += width;
  }
  entries.forEach((item, index) => {
    const y = 106 + Math.floor(index / 3) * 34;
    const col = index % 3;
    const labelX = 24 + col * 155;
    body += `<circle cx="${labelX + 5}" cy="${y - 4}" r="5" fill="${colors[index]}"/><text class="muted" x="${labelX + 16}" y="${y}">${escapeXml(item.name)}</text>`;
  });
  return card('Top Languages', body || '<text class="muted" x="24" y="110">No public language data available</text>');
}

async function main() {
  const profile = await github(`/users/${USERNAME}`);
  const repos = await github(`/users/${USERNAME}/repos?per_page=100&sort=updated`);
  const totals = new Map();
  for (const repo of repos.filter((repo) => !repo.fork)) {
    const languages = await github(`/repos/${USERNAME}/${repo.name}/languages`);
    for (const [name, bytes] of Object.entries(languages)) {
      totals.set(name, (totals.get(name) || 0) + bytes);
    }
  }
  const languages = [...totals.entries()]
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes);

  fs.writeFileSync('github_stats.svg', statsSvg(profile));
  fs.writeFileSync('top_languages.svg', languagesSvg(languages));
  console.log(`Updated stats for ${USERNAME}: ${profile.public_repos} repositories, ${languages.length} languages.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
