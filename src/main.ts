import { v4 as uuidv4 } from 'uuid';

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
const testApiBtn = document.getElementById('test-api-btn') as HTMLButtonElement;
const searchResults = document.getElementById('search-results') as HTMLDivElement;
const userShowsList = document.getElementById('user-shows') as HTMLDivElement;
const icsUrlInput = document.getElementById('ics-url') as HTMLInputElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;

// User ID logic
const urlParams = new URLSearchParams(window.location.search);
let userId = urlParams.get('user') || localStorage.getItem('tvcal_user_id');

async function initUser() {
  if (!userId) {
    try {
      const response = await fetch('/user');
      const data = await response.json();
      userId = data.userId;
      if (userId) localStorage.setItem('tvcal_user_id', userId);
    } catch (error) {
      console.error('Failed to get user ID', error);
      userId = 'default-user'; // Fallback
    }
  } else {
    localStorage.setItem('tvcal_user_id', userId);
  }
  
  // Set ICS URL
  const currentOrigin = window.location.origin;
  icsUrlInput.value = `${currentOrigin}/ics/${userId}`;
  
  fetchUserShows();
}

// Fetch user shows
async function fetchUserShows() {
  if (!userId) return;
  try {
    const response = await fetch(`/shows/${userId}`);
    const shows = await response.json();
    renderUserShows(shows);
  } catch (error) {
    console.error('Failed to fetch user shows', error);
  }
}

function renderUserShows(shows: any[]) {
  if (shows.length === 0) {
    userShowsList.innerHTML = `
      <div class="text-white/20 italic text-sm py-12 text-center border-2 border-dashed border-white/10 rounded-[2rem] bg-black/20">
        <p class="uppercase tracking-widest font-bold opacity-50">No data streams detected</p>
      </div>
    `;
    return;
  }

  userShowsList.innerHTML = shows.map(show => `
    <div class="flex items-center justify-between p-6 bg-white/5 border-2 border-white/10 rounded-[2rem] hover:bg-white/10 transition-all group animate-fade-in">
      <div class="flex flex-col">
        <span class="text-lg font-black text-white italic uppercase tracking-tight">${show.showName}</span>
        <span class="text-xs text-cyber/60 font-bold uppercase tracking-widest">${show.network}</span>
      </div>
      <button 
        onclick="window.unsubscribe(${show.showId})"
        class="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-brand transition-colors cursor-pointer italic"
      >
        [ DISCONNECT ]
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
    const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
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
    searchResults.innerHTML = '<p class="text-white/30 text-xs uppercase tracking-widest font-bold italic">No matches found in archive.</p>';
    return;
  }

  searchResults.innerHTML = results.map(show => {
    const nextAirDate = show.nextAir !== 'N/A' ? new Date(show.nextAir).toLocaleDateString() : 'N/A';
    
    return `
    <div class="flex gap-6 p-6 bg-black/40 border-2 border-white/10 rounded-[2rem] hover:border-cyber/40 transition-all group animate-fade-in">
      <div class="relative shrink-0">
        ${show.image 
          ? `<img src="${show.image}" class="w-16 h-24 object-cover rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10" alt="${show.name}" />` 
          : '<div class="w-16 h-24 bg-white/5 rounded-2xl flex items-center justify-center text-[10px] text-white/20 italic border border-white/10">NO SIGNAL</div>'}
      </div>
      <div class="flex-1 flex flex-col justify-between py-1">
        <div>
          <h3 class="font-black text-xl text-white italic uppercase tracking-tight leading-none">${show.name}</h3>
          <p class="text-[10px] text-cyber/60 font-bold uppercase tracking-widest mt-2">${show.network}</p>
          <p class="text-[10px] text-brand/60 font-bold uppercase tracking-widest mt-1">Next Air: ${nextAirDate}</p>
        </div>
        <button 
          onclick="window.subscribe(${show.id}, '${show.name.replace(/'/g, "\\'")}', '${show.network.replace(/'/g, "\\'")}')"
          class="text-xs font-black text-brand hover:text-cyber transition-colors self-start mt-4 uppercase tracking-widest italic"
        >
          + UPLINK
        </button>
      </div>
    </div>
  `}).join('');
}

// Global actions
(window as any).subscribe = async (showId: number, showName: string, network: string) => {
  try {
    const response = await fetch('/subscribe', {
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
    const response = await fetch('/unsubscribe', {
      method: 'DELETE',
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
testApiBtn.addEventListener('click', () => {
  searchInput.value = 'Batman';
  searchShows();
});
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchShows();
});

copyBtn.addEventListener('click', () => {
  icsUrlInput.select();
  document.execCommand('copy');
  const originalText = copyBtn.textContent;
  copyBtn.textContent = 'COPIED!';
  setTimeout(() => copyBtn.textContent = originalText, 2000);
});

// Initial load
initUser();
