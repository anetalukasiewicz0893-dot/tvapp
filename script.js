document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsGrid = document.getElementById('results-grid');
  const statusField = document.getElementById('status-field');
  const timeField = document.getElementById('time-field');

  // Update time field
  const updateTime = () => {
    const now = new Date();
    timeField.textContent = now.toLocaleTimeString();
  };
  setInterval(updateTime, 1000);
  updateTime();

  // Search function
  const searchShows = async () => {
    const query = searchInput.value.trim();
    if (!query) {
      statusField.textContent = 'ERROR: EMPTY QUERY';
      return;
    }

    statusField.textContent = `SEARCHING FOR: ${query.toUpperCase()}...`;
    resultsGrid.innerHTML = '<div class="blink" style="grid-column: 1/-1; text-align: center; font-family: \'Press Start 2P\'; font-size: 14px; padding: 40px;">UPLOADING DATA...</div>';

    try {
      const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
      console.log(`[SEARCH] Fetching URL: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[SEARCH] API Error: ${response.status} ${response.statusText} for URL: ${url}`);
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[SEARCH] Data received:`, data);
      renderResults(data);
    } catch (error) {
      console.error('[SEARCH] Search failed:', error);
      statusField.textContent = `ERROR: ${error.message.toUpperCase()}`;
      resultsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red; font-family: 'Press Start 2P'; font-size: 14px; padding: 40px;">SYSTEM ERROR: ${error.message.toUpperCase()}</div>`;
    }
  };

  // Render function
  const renderResults = (results) => {
    if (results.length === 0) {
      statusField.textContent = '0 MATCHES FOUND';
      resultsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; font-family: \'Press Start 2P\'; font-size: 14px; padding: 40px;">NO MATCHES FOUND IN DATABASE</div>';
      return;
    }

    statusField.textContent = `${results.length} MATCHES FOUND`;
    resultsGrid.innerHTML = results.map(item => {
      const show = item.show;
      const summary = show.summary 
        ? show.summary.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'
        : 'NO DESCRIPTION AVAILABLE';
      
      const poster = show.image 
        ? show.image.medium 
        : 'https://via.placeholder.com/210x295/c0c0c0/000000?text=NO+POSTER';

      return `
        <div class="show-card">
          <img src="${poster}" alt="${show.name}" onerror="this.src='https://via.placeholder.com/210x295/c0c0c0/000000?text=NO+POSTER'">
          <h3>${show.name.toUpperCase()}</h3>
          <p>${summary}</p>
          <a href="${show.url}" target="_blank">VIEW PROFILE</a>
        </div>
      `;
    }).join('');
  };

  // Event listeners
  searchBtn.addEventListener('click', searchShows);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchShows();
  });

  // Test API button
  const testBtn = document.getElementById('test-api-btn');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      statusField.textContent = 'TESTING CONNECTION...';
      const testUrl = 'https://api.tvmaze.com/search/shows?q=test';
      console.log(`[TEST] Fetching URL: ${testUrl}`);
      try {
        const response = await fetch(testUrl);
        if (response.ok) {
          console.log(`[TEST] Connection successful: ${response.status} ${response.statusText}`);
          statusField.textContent = 'CONNECTION: STABLE [200 OK]';
          statusField.style.color = 'var(--neon-green)';
          setTimeout(() => {
            statusField.style.color = '';
            statusField.textContent = 'SYSTEM READY';
          }, 3000);
        } else {
          console.error(`[TEST] Connection failed: ${response.status} ${response.statusText}`);
          throw new Error(`Status ${response.status}`);
        }
      } catch (e) {
        console.error('[TEST] Connection error:', e);
        statusField.textContent = `CONNECTION: FAILED [${e.message.toUpperCase()}]`;
        statusField.style.color = 'red';
      }
    });
  }
});
