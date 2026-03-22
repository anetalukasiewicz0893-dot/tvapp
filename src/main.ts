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
    userShowsList.innerHTML = '<p class="text-gray-500 text-[10px] italic">No shows followed yet.</p>';
    return;
  }

  userShowsList.innerHTML = shows.map(show => `
    <div class="flex items-center justify-between p-1 border-b border-gray-200 last:border-0 hover:bg-win-blue hover:text-white group">
      <div class="flex flex-col">
        <span class="text-xs font-bold leading-tight">${show.showName}</span>
        <span class="text-[10px] opacity-70">${show.network}</span>
      </div>
      <button 
        onclick="window.unsubscribe(${show.showId})"
        class="text-[10px] underline cursor-pointer group-hover:text-white"
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
  searchBtn.textContent = 'Wait...';
  searchResults.innerHTML = '<p class="text-gray-500 text-[10px] italic">Searching TVMaze database...</p>';

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const results = response.ok ? await response.json() : [];
    renderSearchResults(results);
  } catch (error) {
    searchResults.innerHTML = '<p class="text-red-500 text-[10px]">Search failed.</p>';
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}

function renderSearchResults(results: any[]) {
  if (results.length === 0) {
    searchResults.innerHTML = '<p class="text-gray-500 text-[10px] italic">No matches found.</p>';
    return;
  }

  searchResults.innerHTML = results.map(show => `
    <div class="flex gap-2 p-1 border-b border-gray-200 last:border-0">
      ${show.image ? `<img src="${show.image}" class="w-10 h-14 object-cover border border-black" />` : '<div class="w-10 h-14 bg-gray-200 border border-black"></div>'}
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <h3 class="font-bold text-xs leading-tight">${show.name}</h3>
          <p class="text-[10px] text-gray-600">${show.network}</p>
        </div>
        <button 
          onclick="window.subscribe(${show.id}, '${show.name.replace(/'/g, "\\'")}', '${show.network.replace(/'/g, "\\'")}')"
          class="win-button text-[10px] self-start"
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
