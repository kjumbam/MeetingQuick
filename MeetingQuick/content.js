// Content script for MeetingQuick extension
// This script runs on calendar pages to extract meeting information

(function() {
  'use strict';

  console.log('MeetingQuick content script loaded');

  // Detect meeting platform from URL or text
  function detectMeetingPlatform(link, text = '') {
    const lowerLink = (link || '').toLowerCase();
    const lowerText = (text || '').toLowerCase();
    const combined = lowerLink + ' ' + lowerText;

    if (combined.includes('zoom.us') || combined.includes('zoom.com') || combined.includes('zoom.us/j/')) {
      return { platform: 'Zoom', link: link };
    }
    if (combined.includes('meet.google.com') || combined.includes('google.com/meet')) {
      return { platform: 'Google Meet', link: link };
    }
    if (combined.includes('teams.microsoft.com') || combined.includes('teams.live.com')) {
      return { platform: 'Microsoft Teams', link: link };
    }
    if (link) {
      return { platform: 'Other', link: link };
    }
    return null;
  }

  // Extract meeting link from text or element
  function extractMeetingLink(text, element) {
    // Look for URLs in text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    // Also check for links in the element
    const linkElements = element?.querySelectorAll('a[href]') || [];
    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('http') || href.startsWith('//'))) {
        const fullUrl = href.startsWith('//') ? 'https:' + href : href;
        if (!urls.includes(fullUrl)) {
          urls.push(fullUrl);
        }
      }
    });

    // Find meeting links
    for (const url of urls) {
      const platform = detectMeetingPlatform(url, text);
      if (platform) {
        return platform;
      }
    }

    return null;
  }

  // Parse time from Google Calendar event
  function parseGoogleCalendarTime(element, ariaLabel) {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Try to get time from aria-label (format: "Event title, Date, Time")
    if (ariaLabel) {
      const parts = ariaLabel.split(',');
      if (parts.length >= 3) {
        const timePart = parts[2]?.trim();
        const timeMatch = timePart?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3]?.toUpperCase();
          
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          
          const startTime = new Date(today);
          startTime.setHours(hours, minutes, 0, 0);
          const endTime = new Date(startTime.getTime() + 30 * 60000); // Default 30 min
          
          return { startTime, endTime };
        }
      }
    }

    // Try to get time from time elements
    const timeElement = element.querySelector('[data-time], .Yf, [data-start-time]');
    if (timeElement) {
      const timeText = timeElement.textContent || timeElement.getAttribute('data-time');
      const timeMatch = timeText?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3]?.toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        const startTime = new Date(today);
        startTime.setHours(hours, minutes, 0, 0);
        const endTime = new Date(startTime.getTime() + 30 * 60000);
        
        return { startTime, endTime };
      }
    }

    // Default: use current time + 1 hour if no time found
    const startTime = new Date(today);
    startTime.setHours(today.getHours() + 1, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60000);
    
    return { startTime, endTime };
  }

  // Function to extract meetings from Google Calendar
  function extractGoogleCalendarMeetings() {
    const meetings = [];
    const processedIds = new Set();
    
    // Multiple selectors to catch different Google Calendar views
    const selectors = [
      '[data-eventid]',
      '[role="gridcell"] [data-eventid]',
      '[jsname="xQyMrb"]', // Event container
      '.Yf', // Event title
      '[data-event-title]',
      '[aria-label*="Event"]'
    ];

    let eventElements = [];
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!eventElements.includes(el)) {
            eventElements.push(el);
          }
        });
      } catch (e) {
        // Selector might not exist
      }
    });

    // Also look for event containers in the calendar grid
    const gridCells = document.querySelectorAll('[role="gridcell"]');
    gridCells.forEach(cell => {
      const events = cell.querySelectorAll('[data-eventid], [jsname="xQyMrb"]');
      events.forEach(el => {
        if (!eventElements.includes(el)) {
          eventElements.push(el);
        }
      });
    });
    
    eventElements.forEach(element => {
      try {
        const eventId = element.getAttribute('data-eventid') || 
                       element.getAttribute('data-event-id') ||
                       element.textContent?.substring(0, 50);
        
        if (!eventId || processedIds.has(eventId)) {
          return;
        }
        processedIds.add(eventId);

        // Extract title
        const titleElement = element.querySelector('[data-event-title], .Yf, [jsname="xQyMrb"]') || element;
        const ariaLabel = element.getAttribute('aria-label') || titleElement.getAttribute('aria-label');
        const title = titleElement.textContent?.trim() ||
                     ariaLabel?.split(',')[0]?.trim() ||
                     element.textContent?.trim() ||
                     'Untitled Meeting';
        
        if (!title || title === 'Untitled Meeting' || title.length < 2) {
          return;
        }

        // Extract time
        const timeInfo = parseGoogleCalendarTime(element, ariaLabel);
        
        // Extract meeting link and platform
        const fullText = element.textContent || ariaLabel || '';
        const meetingInfo = extractMeetingLink(fullText, element);
        
        // Create meeting object
        const meeting = {
          id: `gc_${eventId}_${Date.now()}`,
          title: title,
          startTime: timeInfo.startTime.toISOString(),
          endTime: timeInfo.endTime.toISOString(),
          source: 'Google Calendar',
          link: meetingInfo?.link || null,
          platform: meetingInfo?.platform || null,
          location: meetingInfo?.platform || null
        };

        meetings.push(meeting);
      } catch (error) {
        console.error('Error extracting meeting:', error);
      }
    });

    // Filter to only today's meetings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return meetingDate >= today && meetingDate < tomorrow;
    });
  }

  // Function to extract meetings from Outlook Calendar
  function extractOutlookCalendarMeetings() {
    const meetings = [];
    
    // Look for Outlook calendar event elements
    const eventElements = document.querySelectorAll('[role="gridcell"] [role="button"], .ms-CalendarDay-event');
    
    eventElements.forEach(element => {
      try {
        const title = element.getAttribute('aria-label')?.split(',')[0]?.trim() ||
                     element.textContent?.trim() ||
                     'Untitled Meeting';
        
        if (title && title !== 'Untitled Meeting') {
          meetings.push({
            title: title,
            source: 'Outlook Calendar'
          });
        }
      } catch (error) {
        console.error('Error extracting meeting:', error);
      }
    });

    return meetings;
  }

  // Main function to detect and extract meetings
  function detectAndExtractMeetings() {
    const url = window.location.href;
    let meetings = [];

    if (url.includes('calendar.google.com')) {
      meetings = extractGoogleCalendarMeetings();
    } else if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
      meetings = extractOutlookCalendarMeetings();
    }

    // Always send meetings (even if empty) so popup knows the extraction ran
    chrome.runtime.sendMessage({
      action: 'meetingsDetected',
      meetings: meetings,
      url: url,
      timestamp: Date.now()
    }).catch(err => {
      // Ignore errors if background script isn't ready
      console.log('Could not send meetings to background:', err);
    });

    return meetings;
  }

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractMeetings') {
      const meetings = detectAndExtractMeetings();
      sendResponse({ meetings: meetings, success: true });
      return true; // Keep channel open for async response
    }
    return false;
  });

  // Auto-detect meetings when page loads (with delay to ensure DOM is ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(detectAndExtractMeetings, 2000);
    });
  } else {
    setTimeout(detectAndExtractMeetings, 2000);
  }

  // Observe DOM changes to detect dynamically loaded calendar events
  const observer = new MutationObserver(() => {
    // Throttle detection to avoid excessive calls
    clearTimeout(window.meetingDetectionTimeout);
    window.meetingDetectionTimeout = setTimeout(detectAndExtractMeetings, 1000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();

