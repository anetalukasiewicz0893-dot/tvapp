import { v4 as uuidv4 } from 'uuid';

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
const searchResults = document.getElementById('search-results') as HTMLDivElement;
const userShowsList = document.getElementById('user-shows') as HTMLDivElement;
const icsUrlInput = document.getElementById('ics-url') as HTMLInputElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;

// User ID logic
let userId = localStorage.getItem('tvcal_user_id');
if (!userId) {
  userId = uuidv4();
  localStorage.setItem('tvcal_user_id', userId);
}

// Set ICS URL
const currentOrigin = window.location.origin;
icsUrlInput.value = `${currentOrigin}/ics/${userId}`;

// Fetch user shows
async function fetchUserShows() {
  try {
    const response = await fetch(`/api/shows?user=${userId}`);
    const shows = await response.json();
    renderUserShows(shows);
  } catch (error) {
    console.error('Failed to fetch user shows', error);
  }
}

function renderUserShows(shows: any[]) {
  if (shows.length === 0) {
    userShowsList.innerHTML = '<p class="text-white/20 italic text-sm py-4">No shows followed yet.</p>';
    return;
  }

  userShowsList.innerHTML = shows.map(show => `
    <div class="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors group">
      <div class="flex flex-col">
        <span class="text-sm font-medium text-white/90">${show.showName}</span>
        <span class="text-xs text-white/40">${show.network}</span>
      </div>
      <button 
        onclick="window.unsubscribe(${show.showId})"
        class="text-xs text-white/30 hover:text-red-400 transition-colors cursor-pointer"
      >
        Remove
      </button>
    </div>
  `).join('');
}

// Search logic
async function searchShows() {
  const query = searchInput.value.trim();
  if (!query) return;

  searchBtn.disabled = true;
  const originalText = searchBtn.textContent;
  searchBtn.textContent = '...';
  searchResults.innerHTML = '<p class="text-white/30 text-sm italic animate-pulse">Searching database...</p>';

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const results = response.ok ? await response.json() : [];
    renderSearchResults(results);
  } catch (error) {
    searchResults.innerHTML = '<p class="text-red-400/80 text-sm">Search failed. Try again.</p>';
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = originalText;
  }
}

function renderSearchResults(results: any[]) {
  if (results.length === 0) {
    searchResults.innerHTML = '<p class="text-white/30 text-sm italic">No matches found.</p>';
    return;
  }

  searchResults.innerHTML = results.map(show => `
    <div class="flex gap-4 p-3 bg-white/5 border border-white/5 rounded-xl hover:border-brand/30 transition-all group">
      <div class="relative shrink-0">
        ${show.image 
          ? `<img src="${show.image}" class="w-12 h-16 object-cover rounded-lg shadow-lg" alt="${show.name}" />` 
          : '<div class="w-12 h-16 bg-white/5 rounded-lg flex items-center justify-center text-[10px] text-white/20 italic">No Image</div>'}
      </div>
      <div class="flex-1 flex flex-col justify-between py-0.5">
        <div>
          <h3 class="font-semibold text-sm text-white/90 leading-tight">${show.name}</h3>
          <p class="text-xs text-white/40 mt-0.5">${show.network}</p>
        </div>
        <button 
          onclick="window.subscribe(${show.id}, '${show.name.replace(/'/g, "\\'")}', '${show.network.replace(/'/g, "\\'")}')"
          class="text-xs font-semibold text-brand hover:text-brand/80 transition-colors self-start mt-2"
        >
          + Subscribe
        </button>
      </div>
    </div>
  `).join('');
}

// Global actions
(window as any).subscribe = async (showId: number, showName: string, network: string) => {
  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, showId, showName, network })
    });
    if (response.ok) {
      fetchUserShows();
      searchResults.innerHTML = '';
      searchInput.value = '';
    }
  } catch (error) {
    console.error('Subscribe failed', error);
  }
};

(window as any).unsubscribe = async (showId: number) => {
  try {
    const response = await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, showId })
    });
    if (response.ok) {
      fetchUserShows();
    }
  } catch (error) {
    console.error('Unsubscribe failed', error);
  }
};

// Event listeners
searchBtn.addEventListener('click', searchShows);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchShows();
});

copyBtn.addEventListener('click', () => {
  icsUrlInput.select();
  document.execCommand('copy');
  copyBtn.textContent = 'Copied!';
  setTimeout(() => copyBtn.textContent = 'Copy', 2000);
});

// Initial load
fetchUserShows();
