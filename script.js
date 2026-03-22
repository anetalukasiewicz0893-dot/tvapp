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
      console.log(`Fetching: https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
      const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Data received:`, data);
      renderResults(data);
    } catch (error) {
      console.error('Search failed:', error);
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
      try {
        const response = await fetch('https://api.tvmaze.com/search/shows?q=test');
        if (response.ok) {
          statusField.textContent = 'CONNECTION: STABLE [200 OK]';
          statusField.style.color = 'var(--neon-green)';
          setTimeout(() => {
            statusField.style.color = '';
            statusField.textContent = 'SYSTEM READY';
          }, 3000);
        } else {
          throw new Error();
        }
      } catch (e) {
        statusField.textContent = 'CONNECTION: FAILED [OFFLINE]';
        statusField.style.color = 'red';
      }
    });
  }
});
