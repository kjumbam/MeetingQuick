// Popup script for MeetingQuick extension

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  
  const meetingsList = document.getElementById('meetingsList');
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('emptyState');
  const dateDisplay = document.getElementById('dateDisplay');
  const refreshBtn = document.getElementById('refreshBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  // Verify elements exist
  if (!meetingsList) {
    console.error('meetingsList not found');
    return;
  }
  if (!refreshBtn) {
    console.error('refreshBtn not found');
  }
  if (!settingsBtn) {
    console.error('settingsBtn not found');
  }

  // Display current date
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  if (dateDisplay) {
    dateDisplay.textContent = today.toLocaleDateString('en-US', options);
  }

  // Store meetings data globally for easy access
  let currentMeetings = [];

  // Set up event delegation for dynamically created buttons
  meetingsList.addEventListener('click', handleMeetingListClick);
  
  function handleMeetingListClick(e) {
    console.log('Click detected in meetingsList:', e.target);
    
    // Find the closest button
    const button = e.target.closest('button');
    if (!button) {
      console.log('No button found in click target');
      return;
    }

    console.log('Button clicked:', button.className, button.getAttribute('data-meeting-id'));

    // Handle Join button clicks
    if (button.classList.contains('join-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const meetingId = button.getAttribute('data-meeting-id');
      console.log('Join button clicked for meeting ID:', meetingId);
      
      if (button.disabled) {
        console.log('Join button is disabled');
        return;
      }

      // Find meeting data
      const meetingItem = button.closest('.meeting-item');
      const meeting = meetingItem && meetingItem.meetingData 
        ? meetingItem.meetingData 
        : currentMeetings.find(m => m.id === meetingId);
      
      if (meeting) {
        console.log('Found meeting data:', meeting);
        joinMeeting(meeting);
      } else {
        console.error('Meeting data not found for ID:', meetingId);
      }
      return;
    }

    // Handle Delete button clicks
    if (button.classList.contains('delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const meetingId = button.getAttribute('data-meeting-id');
      console.log('Delete button clicked for meeting ID:', meetingId);
      deleteMeeting(meetingId);
      return;
    }
  }

  // Refresh button handler - attach directly
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Refresh button clicked');
      // Simply reload meetings from storage
      loadMeetings();
    });
    console.log('Refresh button listener attached');
  }

  // Settings button handler - attach directly
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Settings button clicked');
      // TODO: Open settings page or modal
    });
    console.log('Settings button listener attached');
  }

  // Add Meeting form handler
  const addMeetingForm = document.getElementById('addMeetingForm');
  if (addMeetingForm) {
    addMeetingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Add meeting form submitted');
      
      const title = document.getElementById('meetingTitle').value.trim();
      const time = document.getElementById('meetingTime').value;
      const url = document.getElementById('meetingUrl').value.trim();
      const platform = document.getElementById('meetingType').value;
      
      if (!title || !time) {
        alert('Please fill in meeting title and time');
        return;
      }
      
      // Create meeting object
      const today = new Date();
      const [hours, minutes] = time.split(':');
      const meetingDate = new Date(today);
      meetingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Default duration: 30 minutes
      const endDate = new Date(meetingDate.getTime() + 30 * 60000);
      
      const meeting = {
        id: `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title,
        startTime: meetingDate.toISOString(),
        endTime: endDate.toISOString(),
        platform: platform,
        link: url || null
      };
      
      // Save to storage
      try {
        const result = await chrome.storage.local.get(['meetings']);
        const meetings = result.meetings || [];
        meetings.push(meeting);
        await chrome.storage.local.set({ meetings });
        console.log('Meeting added:', meeting);
        
        // Reset form
        addMeetingForm.reset();
        
        // Reload meetings
        loadMeetings();
      } catch (error) {
        console.error('Error saving meeting:', error);
        alert('Failed to save meeting');
      }
    });
  }

  // Load meetings on popup open
  loadMeetings();

  async function loadMeetings() {
    console.log('Loading meetings...');
    if (loading) loading.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    
    try {
      // Get meetings from storage only
      const result = await chrome.storage.local.get(['meetings']);
      const meetings = result.meetings || [];
      console.log('Got meetings from storage:', meetings.length);

      // Store current meetings
      currentMeetings = meetings;

      // Filter today's meetings
      const todayMeetings = filterTodayMeetings(meetings);
      console.log('Today\'s meetings:', todayMeetings.length);
      
      displayMeetings(todayMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
      showError('Failed to load meetings');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  function filterTodayMeetings(meetings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return meetingDate >= today && meetingDate < tomorrow;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }

  function displayMeetings(meetings) {
    console.log('Displaying meetings:', meetings.length);
    
    // Clear existing meetings but preserve emptyState
    const emptyStateElement = meetingsList.querySelector('.empty-state');
    meetingsList.innerHTML = '';

    if (meetings.length === 0) {
      if (emptyState) {
        emptyState.style.display = 'flex';
        meetingsList.appendChild(emptyState);
      }
      return;
    }

    meetings.forEach((meeting, index) => {
      const meetingElement = createMeetingElement(meeting);
      meetingsList.appendChild(meetingElement);
      console.log(`Created meeting element ${index + 1}:`, meeting.title);
    });
  }

  function createMeetingElement(meeting) {
    const div = document.createElement('div');
    div.className = 'meeting-item';
    // Store meeting data on the element for easy access
    div.meetingData = meeting;
    
    const startTime = new Date(meeting.startTime);
    const endTime = new Date(meeting.endTime);
    const timeStr = formatTimeRange(startTime, endTime);
    
    // Determine platform badge
    const platform = meeting.platform || '';
    const platformLower = platform.toLowerCase();
    const platformBadge = platform ? `<span class="platform-badge platform-${platformLower.replace(/\s+/g, '-')}">${escapeHtml(platform)}</span>` : '';
    
    // Check if meeting has a joinable link
    const hasLink = meeting.link && meeting.link.trim() && (meeting.link.startsWith('http') || meeting.link.startsWith('//'));
    const joinButtonDisabled = !hasLink;
    
    div.innerHTML = `
      <div class="meeting-time">${timeStr}</div>
      <div class="meeting-content">
        <div class="meeting-title">${escapeHtml(meeting.title)}</div>
        ${platformBadge}
        ${meeting.location && !platformBadge ? `<div class="meeting-location">📍 ${escapeHtml(meeting.location)}</div>` : ''}
        ${meeting.description ? `<div class="meeting-description">${escapeHtml(meeting.description)}</div>` : ''}
      </div>
      <div class="meeting-actions">
        <button class="action-btn join-btn ${joinButtonDisabled ? 'disabled' : ''}" 
                type="button"
                title="${hasLink ? 'Join meeting' : 'No meeting link available'}" 
                data-meeting-id="${meeting.id}"
                ${joinButtonDisabled ? 'disabled' : ''}>
          ${hasLink ? `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span class="join-text">Join Now</span>
          ` : `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          `}
        </button>
        <button class="action-btn delete-btn" 
                type="button"
                title="Delete meeting" 
                data-meeting-id="${meeting.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    // Also attach direct listeners as backup
    const joinBtn = div.querySelector('.join-btn');
    const deleteBtn = div.querySelector('.delete-btn');
    
    if (joinBtn && !joinButtonDisabled) {
      joinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Direct Join button listener triggered for:', meeting.id);
        joinMeeting(meeting);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Direct Delete button listener triggered for:', meeting.id);
        deleteMeeting(meeting.id);
      });
    }

    return div;
  }

  function formatTimeRange(start, end) {
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };
    return `${formatTime(start)} - ${formatTime(end)}`;
  }


  async function deleteMeeting(meetingId) {
    console.log('Deleting meeting:', meetingId);
    try {
      const result = await chrome.storage.local.get(['meetings']);
      const meetings = result.meetings || [];
      const filteredMeetings = meetings.filter(m => m.id !== meetingId);
      
      await chrome.storage.local.set({ meetings: filteredMeetings });
      console.log('Meeting deleted, reloading list');
      currentMeetings = filteredMeetings;
      loadMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  }

  function joinMeeting(meeting) {
    console.log('Joining meeting:', meeting.title, meeting);
    
    // Use the actual URL from the meeting
    let link = meeting.link;
    
    // If no URL provided, don't open anything
    if (!link || !link.trim()) {
      console.log('No meeting URL provided');
      alert('No meeting URL available for this meeting');
      return;
    }
    
    // Ensure link is a full URL
    if (link.startsWith('//')) {
      link = 'https:' + link;
    } else if (!link.startsWith('http')) {
      link = 'https://' + link;
    }
    
    console.log('Opening meeting URL:', link);
    
    // Open meeting link in a new tab
    chrome.tabs.create({ url: link });
  }

  function showError(message) {
    meetingsList.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
