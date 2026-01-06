// Install event - set up initial state
chrome.runtime.onInstalled.addListener(() => {
  console.log('MeetingQuick extension installed');
  
  // Initialize storage with default values
  chrome.storage.local.set({
    meetings: []
  });

});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMeetings') {
    chrome.storage.local.get(['meetings'], (result) => {
      sendResponse({ meetings: result.meetings || [] });
    });
    return true; // Indicates we will send a response asynchronously
  }

  if (request.action === 'saveMeetings') {
    chrome.storage.local.set({ meetings: request.meetings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'syncCalendar') {
    // TODO: Implement calendar sync logic
    console.log('Calendar sync requested');
    sendResponse({ success: false, message: 'Calendar sync not yet implemented' });
  }

  if (request.action === 'meetingsDetected') {
    // Store meetings from content script
    const meetings = request.meetings || [];
    if (meetings.length > 0) {
      chrome.storage.local.set({ 
        meetings: meetings,
        lastSync: Date.now()
      }, () => {
        console.log(`Stored ${meetings.length} meetings from ${request.url}`);
        sendResponse({ success: true, count: meetings.length });
      });
    } else {
      sendResponse({ success: true, count: 0 });
    }
    return true;
  }

  if (request.action === 'getMeetingsFromTab') {
    // Request meetings from active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && (tabs[0].url?.includes('calendar.google.com') || 
                      tabs[0].url?.includes('outlook.live.com') || 
                      tabs[0].url?.includes('outlook.office.com'))) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractMeetings' }, (response) => {
          if (response && response.meetings) {
            // Store the meetings
            chrome.storage.local.set({ 
              meetings: response.meetings,
              lastSync: Date.now()
            }, () => {
              sendResponse({ meetings: response.meetings, success: true });
            });
          } else {
            // Fallback to stored meetings
            chrome.storage.local.get(['meetings'], (result) => {
              sendResponse({ meetings: result.meetings || [], success: true });
            });
          }
        });
      } else {
        // Not on calendar page, return stored meetings
        chrome.storage.local.get(['meetings'], (result) => {
          sendResponse({ meetings: result.meetings || [], success: true });
        });
      }
    });
    return true;
  }
});

// Listen for tab updates to detect calendar pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('calendar.google.com') || 
        tab.url.includes('outlook.live.com') || 
        tab.url.includes('outlook.office.com')) {
      // Calendar page detected - could trigger sync
      console.log('Calendar page detected:', tab.url);
    }
  }
});

