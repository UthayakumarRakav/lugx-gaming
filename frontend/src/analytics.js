class AnalyticsService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.currentPage = window.location.pathname;
    this.userId = null;
    this.deviceInfo = this.getDeviceInfo();
    this.locationInfo = {};
    
    // Initialize session
    this.initializeSession();
    
    // Track page load
    this.trackPageView();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Track session end on page unload
    window.addEventListener('beforeunload', () => this.trackSessionEnd());
  }
  
  generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  getDeviceInfo() {
    const ua = navigator.userAgent;
    return {
      device: /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(ua) ? 'Mobile' : 'Desktop',
      browser: this.getBrowser(ua),
      os: this.getOS(ua)
    };
  }
  
  getBrowser(ua) {
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    if (ua.includes('Trident')) return 'IE';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
  }
  
  getOS(ua) {
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) return 'iOS';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS')) return 'Mac OS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown';
  }
  
  async initializeSession() {
    try {
      // In a real app, you might get user ID from authentication
      this.userId = localStorage.getItem('userId') || null;
      
      // Get location info (simplified - in production use a proper service)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            this.locationInfo = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            // In production, you would reverse geocode to get country/city
            this.locationInfo.country = 'Unknown';
            this.locationInfo.city = 'Unknown';
          },
          error => {
            console.error('Geolocation error:', error);
            this.locationInfo = {
              country: 'Unknown',
              city: 'Unknown'
            };
          }
        );
      } else {
        this.locationInfo = {
          country: 'Unknown',
          city: 'Unknown'
        };
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }
  
  async trackPageView() {
    const pageLoadTime = performance.now();
    const scrollDepth = 0;
    
    // Track initial page view
    await this.sendAnalytics('pageview', {
      page_url: this.currentPage,
      time_spent: 0,
      scroll_depth: scrollDepth
    });
    
    // Track scroll depth
    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      const newScrollDepth = (scrollTop + clientHeight) / scrollHeight;
      
      if (newScrollDepth > scrollDepth) {
        scrollDepth = newScrollDepth;
      }
    });
    
    // Track time spent on page before leaving
    window.addEventListener('beforeunload', () => {
      const timeSpent = performance.now() - pageLoadTime;
      this.sendAnalytics('pageview', {
        page_url: this.currentPage,
        time_spent: Math.floor(timeSpent / 1000), // Convert to seconds
        scroll_depth: scrollDepth
      });
    });
  }
  
  setupEventListeners() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target;
      const elementId = target.id || target.classList.value || target.tagName;
      const textContent = target.textContent?.trim().substring(0, 100) || '';
      const { top, left } = target.getBoundingClientRect();
      
      this.sendAnalytics('click', {
        element_id: elementId,
        page_url: this.currentPage,
        text_content: textContent,
        x_position: Math.floor(left),
        y_position: Math.floor(top)
      });
    });
  }
  
  async trackSessionEnd() {
    const sessionEnd = new Date();
    const duration = (sessionEnd - this.sessionStart) / 1000; // in seconds
    
    // Determine if this was a bounce (only one page view)
    // In a real app, you'd track page views during session
    const isBounce = true; // Simplified
    
    await this.sendAnalytics('session', {
      start_time: this.sessionStart.toISOString(),
      end_time: sessionEnd.toISOString(),
      duration: Math.floor(duration),
      pages_visited: 1, // Simplified
      is_bounce: isBounce
    });
  }
  
  async sendAnalytics(type, data) {
    try {
      const payload = {
        session_id: this.sessionId,
        user_id: this.userId,
        ...this.deviceInfo,
        ...this.locationInfo,
        ...data
      };
      
      let endpoint;
      switch (type) {
        case 'pageview':
          endpoint = '/analytics/pageview';
          break;
        case 'click':
          endpoint = '/analytics/click';
          break;
        case 'session':
          endpoint = '/analytics/session';
          break;
        default:
          return;
      }
      
      // In production, you would use the analytics service URL
      // For our setup, the frontend will proxy requests to the analytics service
      const response = await fetch(`http://analytics-service:3002${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.error('Analytics tracking failed:', response.status);
      }
    } catch (error) {
      console.error('Error sending analytics:', error);
    }
  }
}

// Initialize analytics
const analytics = new AnalyticsService();

export default analytics;
