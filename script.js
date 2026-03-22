import { 
  auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, 
  collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDocs, serverTimestamp 
} from './firebase.ts';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsGrid = document.getElementById('results-grid');
  const subsGrid = document.getElementById('subs-grid');
  const statusField = document.getElementById('status-field');
  const timeField = document.getElementById('time-field');
  const tabSearch = document.getElementById('tab-search');
  const tabSubs = document.getElementById('tab-subs');
  const searchView = document.getElementById('search-view');
  const subsView = document.getElementById('subs-view');
  const exportBtn = document.getElementById('export-ical-btn');
  const loginBtn = document.getElementById('login-btn');

  let subscriptions = [];
  let currentUser = null;
  let unsubscribeSubs = null;

  // Error Handler
  const handleFirestoreError = (error, operationType, path) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    statusField.textContent = `ERROR: ${operationType.toUpperCase()} FAILED`;
    statusField.style.color = 'red';
  };

  // Auth Logic
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      loginBtn.textContent = 'LOGOUT';
      statusField.textContent = `WELCOME, ${user.displayName.toUpperCase()}`;
      setupSubscriptionsListener(user.uid);
    } else {
      loginBtn.textContent = 'LOGIN';
      statusField.textContent = 'SYSTEM READY [GUEST MODE]';
      subscriptions = [];
      if (unsubscribeSubs) unsubscribeSubs();
      renderSubscriptions();
      if (searchView.style.display === 'block') {
        // Refresh search results to update buttons
        const lastResults = resultsGrid.querySelectorAll('.show-card');
        if (lastResults.length > 0) {
          // This is a bit hacky, but we just want to update the buttons
          // In a real app we'd re-render the search results from a stored array
        }
      }
    }
  });

  loginBtn.addEventListener('click', async () => {
    if (currentUser) {
      await signOut(auth);
    } else {
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('Login failed:', error);
        statusField.textContent = 'LOGIN FAILED';
      }
    }
  });

  const setupSubscriptionsListener = (userId) => {
    if (unsubscribeSubs) unsubscribeSubs();
    
    const q = query(collection(db, 'subscriptions'), where('userId', '==', userId));
    unsubscribeSubs = onSnapshot(q, (snapshot) => {
      subscriptions = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data().showData
      }));
      
      if (subsView.style.display === 'block') {
        renderSubscriptions();
      } else {
        // Update search results buttons if any
        const buttons = resultsGrid.querySelectorAll('.btn-subscribe');
        buttons.forEach(btn => {
          const id = parseInt(btn.dataset.id);
          const isSubbed = subscriptions.some(s => s.id === id);
          btn.textContent = isSubbed ? 'UNSUBSCRIBE' : 'SUBSCRIBE';
          btn.classList.toggle('active', isSubbed);
        });
      }
    }, (error) => {
      handleFirestoreError(error, 'list', 'subscriptions');
    });
  };

  // Tab Switching
  tabSearch.addEventListener('click', () => {
    tabSearch.classList.add('active');
    tabSubs.classList.remove('active');
    searchView.style.display = 'block';
    subsView.style.display = 'none';
    statusField.textContent = currentUser ? `LOGGED IN AS: ${currentUser.displayName.toUpperCase()}` : 'SYSTEM READY';
  });

  tabSubs.addEventListener('click', () => {
    tabSubs.classList.add('active');
    tabSearch.classList.remove('active');
    searchView.style.display = 'none';
    subsView.style.display = 'block';
    renderSubscriptions();
  });

  // Update time field
  const updateTime = () => {
    const now = new Date();
    timeField.textContent = now.toLocaleTimeString();
  };
  setInterval(updateTime, 1000);
  updateTime();

  // Subscription Logic
  const toggleSubscription = async (show) => {
    if (!currentUser) {
      statusField.textContent = 'ERROR: LOGIN REQUIRED TO SAVE';
      statusField.style.color = 'red';
      setTimeout(() => statusField.style.color = '', 2000);
      return;
    }

    const existingSub = subscriptions.find(s => s.id === show.id);
    
    try {
      if (!existingSub) {
        statusField.textContent = `SAVING: ${show.name.toUpperCase()}...`;
        await addDoc(collection(db, 'subscriptions'), {
          userId: currentUser.uid,
          showId: show.id,
          showData: show,
          createdAt: serverTimestamp()
        });
        statusField.textContent = `SAVED: ${show.name.toUpperCase()}`;
      } else {
        statusField.textContent = `REMOVING: ${show.name.toUpperCase()}...`;
        // We need to find the document ID to delete it
        const q = query(collection(db, 'subscriptions'), 
                        where('userId', '==', currentUser.uid), 
                        where('showId', '==', show.id));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnap) => {
          await deleteDoc(doc(db, 'subscriptions', docSnap.id));
        });
        statusField.textContent = `REMOVED: ${show.name.toUpperCase()}`;
      }
    } catch (error) {
      handleFirestoreError(error, 'write', 'subscriptions');
    }
  };

  const renderSubscriptions = () => {
    if (!currentUser) {
      subsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; font-family: \'Press Start 2P\'; font-size: 14px; padding: 40px; color: var(--win-border-dark);">PLEASE LOGIN TO VIEW SAVED SHOWS</div>';
      return;
    }

    if (subscriptions.length === 0) {
      statusField.textContent = '0 SAVED SHOWS';
      subsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; font-family: \'Press Start 2P\'; font-size: 14px; padding: 40px; color: var(--win-border-dark);">NO SAVED SHOWS YET...</div>';
      return;
    }

    statusField.textContent = `${subscriptions.length} SHOWS SAVED`;
    subsGrid.innerHTML = subscriptions.map(show => renderShowCard(show, true)).join('');
    attachCardListeners(subsGrid, subscriptions);
  };

  // Search function
  const searchShows = async () => {
    const queryStr = searchInput.value.trim();
    if (!queryStr) {
      statusField.textContent = 'ERROR: EMPTY QUERY';
      return;
    }

    statusField.textContent = `SEARCHING FOR: ${queryStr.toUpperCase()}...`;
    resultsGrid.innerHTML = '<div class="blink" style="grid-column: 1/-1; text-align: center; font-family: \'Press Start 2P\'; font-size: 14px; padding: 40px;">UPLOADING DATA...</div>';

    try {
      const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(queryStr)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      renderResults(data);
    } catch (error) {
      console.error('[SEARCH] Search failed:', error);
      statusField.textContent = `ERROR: ${error.message.toUpperCase()}`;
      resultsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red; font-family: 'Press Start 2P'; font-size: 14px; padding: 40px;">SYSTEM ERROR: ${error.message.toUpperCase()}</div>`;
    }
  };

  // Render function
  const renderShowCard = (show, isSubbed) => {
    const summary = show.summary 
      ? show.summary.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...'
      : 'NO DESCRIPTION AVAILABLE';
    
    const poster = show.image 
      ? show.image.medium 
      : 'https://via.placeholder.com/210x295/ffb7c5/ffffff?text=NO+POSTER';

    return `
      <div class="show-card">
        <img src="${poster}" alt="${show.name}" onerror="this.src='https://via.placeholder.com/210x295/ffb7c5/ffffff?text=NO+POSTER'">
        <h3>${show.name.toUpperCase()}</h3>
        <p>${summary}</p>
        <a href="${show.url}" target="_blank">VIEW PROFILE</a>
        <button class="btn-subscribe ${isSubbed ? 'active' : ''}" data-id="${show.id}">
          ${isSubbed ? 'UNSUBSCRIBE' : 'SUBSCRIBE'}
        </button>
      </div>
    `;
  };

  const attachCardListeners = (container, dataList) => {
    container.querySelectorAll('.btn-subscribe').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        // Find show in dataList (which could be search results or subscriptions)
        const item = dataList.find(i => (i.show ? i.show.id : i.id) === id);
        const show = item.show || item;
        toggleSubscription(show);
      });
    });
  };

  const renderResults = (results) => {
    if (results.length === 0) {
      statusField.textContent = '0 MATCHES FOUND';
      resultsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; font-family: \'Press Start 2P\'; font-size: 14px; padding: 40px;">NO MATCHES FOUND IN DATABASE</div>';
      return;
    }

    statusField.textContent = `${results.length} MATCHES FOUND`;
    resultsGrid.innerHTML = results.map(item => {
      const isSubbed = subscriptions.some(s => s.id === item.show.id);
      return renderShowCard(item.show, isSubbed);
    }).join('');

    attachCardListeners(resultsGrid, results);
  };

  // iCal Export Logic
  const generateICal = () => {
    if (subscriptions.length === 0) {
      statusField.textContent = 'ERROR: NO SUBS TO EXPORT';
      return;
    }

    statusField.textContent = 'GENERATING ICAL...';
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Y2K TV VIBE//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    subscriptions.forEach(show => {
      if (show.schedule && show.schedule.days && show.schedule.days.length > 0) {
        show.schedule.days.forEach(day => {
          const now = new Date();
          const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          
          const dayMap = {
            'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE', 
            'Thursday': 'TH', 'Friday': 'FR', 'Saturday': 'SA', 'Sunday': 'SU'
          };
          
          const rruleDay = dayMap[day];
          const time = show.schedule.time ? show.schedule.time.replace(':', '') : '2000';
          
          icsContent.push('BEGIN:VEVENT');
          icsContent.push(`UID:${show.id}-${day}@y2ktvvibe.com`);
          icsContent.push(`DTSTAMP:${stamp}`);
          icsContent.push(`DTSTART;TZID=UTC:${now.getFullYear()}0101T${time}00`);
          icsContent.push(`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay}`);
          icsContent.push(`SUMMARY:TV: ${show.name}`);
          icsContent.push(`DESCRIPTION:Watch ${show.name} on ${show.network ? show.network.name : 'TV'}. ${show.url}`);
          icsContent.push('END:VEVENT');
        });
      }
    });

    icsContent.push('END:VCALENDAR');
    
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'tv_schedule.ical');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    statusField.textContent = 'ICAL EXPORTED SUCCESSFULLY (.ICAL)';
  };

  exportBtn.addEventListener('click', generateICal);

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
      try {
        const response = await fetch(testUrl);
        if (response.ok) {
          statusField.textContent = 'CONNECTION: STABLE [200 OK]';
          statusField.style.color = 'var(--neon-green)';
          setTimeout(() => {
            statusField.style.color = '';
            statusField.textContent = currentUser ? `LOGGED IN AS: ${currentUser.displayName.toUpperCase()}` : 'SYSTEM READY';
          }, 3000);
        } else {
          throw new Error(`Status ${response.status}`);
        }
      } catch (e) {
        statusField.textContent = `CONNECTION: FAILED [${e.message.toUpperCase()}]`;
        statusField.style.color = 'red';
      }
    });
  }
});
