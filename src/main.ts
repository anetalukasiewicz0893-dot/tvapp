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
    userShowsList.innerHTML = '<p class="text-stone-400 italic text-sm">No shows followed yet.</p>';
    return;
  }

  userShowsList.innerHTML = shows.map(show => `
    <div class="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
      <div>
        <h3 class="font-semibold text-sm">${show.showName}</h3>
        <p class="text-xs text-stone-500">${show.network}</p>
      </div>
      <button 
        onclick="window.unsubscribe(${show.showId})"
        class="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
      >
        Unsubscribe
      </button>
    </div>
  `).join('');
}

// Search logic
async function searchShows() {
  const query = searchInput.value.trim();
  if (!query) return;

  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';
  searchResults.innerHTML = '<p class="text-stone-400 text-sm italic">Searching TVMaze...</p>';

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();
    renderSearchResults(results);
  } catch (error) {
    searchResults.innerHTML = '<p class="text-red-500 text-sm">Search failed. Try again.</p>';
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}

function renderSearchResults(results: any[]) {
  if (results.length === 0) {
    searchResults.innerHTML = '<p class="text-stone-400 text-sm italic">No matches found.</p>';
    return;
  }

  searchResults.innerHTML = results.map(show => `
    <div class="flex items-center gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200 hover:border-stone-400 transition-colors">
      ${show.image ? `<img src="${show.image}" class="w-12 h-16 object-cover rounded-md shadow-sm" />` : '<div class="w-12 h-16 bg-stone-200 rounded-md"></div>'}
      <div class="flex-1">
        <h3 class="font-bold text-sm">${show.name}</h3>
        <p class="text-xs text-stone-500 mb-2">${show.network}</p>
        <button 
          onclick="window.subscribe(${show.id}, '${show.name.replace(/'/g, "\\'")}', '${show.network.replace(/'/g, "\\'")}')"
          class="bg-stone-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
        >
          Subscribe
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
