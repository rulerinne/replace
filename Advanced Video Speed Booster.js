// ==UserScript==
// @name         Advanced Video Speed Booster (16x)
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      2.0
// @description  Plays videos at effective 16x speed using a hybrid approach to prevent stuttering
// @author       Your Name
// @match        https://www.cqooc.com/*
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const MAX_STABLE_SPEED = 3.5;    // Maximum stable direct playback rate
    const TARGET_SPEED = 16;         // Desired effective playback speed
    const SKIP_INTERVAL = 100;       // How often to check and adjust video (ms)
    
    // Store video player references and their timers
    const videoPlayers = new Map();
    
    // Core video setup function
    function setupVideo(video) {
        // Skip if already handled
        if (videoPlayers.has(video)) return;
        
        // Create video controller object
        const controller = {
            skipTimer: null,
            lastTimeUpdate: 0,
            isSkipping: false,
            speedMultiplier: TARGET_SPEED / MAX_STABLE_SPEED,
            applyEffectiveSpeed: function() {
                if (video.paused || controller.isSkipping) return;
                
                // Set direct speed to maximum stable rate
                if (video.playbackRate !== MAX_STABLE_SPEED) {
                    video.playbackRate = MAX_STABLE_SPEED;
                }
                
                const now = performance.now();
                const timeDiff = (now - controller.lastTimeUpdate) / 1000;
                
                if (timeDiff > 0.05) { // Small threshold to avoid too frequent updates
                    // Calculate how much to skip ahead
                    const skipAmount = timeDiff * video.playbackRate * (controller.speedMultiplier - 1);
                    
                    // Skip forward if needed and not near the end
                    if (skipAmount > 0 && video.currentTime + skipAmount < video.duration - 0.5) {
                        controller.isSkipping = true;
                        video.currentTime += skipAmount;
                        setTimeout(() => { controller.isSkipping = false; }, 50);
                    }
                    
                    controller.lastTimeUpdate = now;
                }
            },
            startSkipTimer: function() {
                this.stopSkipTimer(); // Clear any existing timer
                this.lastTimeUpdate = performance.now();
                this.skipTimer = setInterval(() => this.applyEffectiveSpeed(), SKIP_INTERVAL);
            },
            stopSkipTimer: function() {
                if (this.skipTimer) {
                    clearInterval(this.skipTimer);
                    this.skipTimer = null;
                }
            }
        };
        
        // Store the controller
        videoPlayers.set(video, controller);
        
        // Enable autoplay
        video.muted = true;
        
        // Setup event listeners
        video.addEventListener('play', () => {
            controller.startSkipTimer();
        });
        
        video.addEventListener('pause', () => {
            controller.stopSkipTimer();
        });
        
        video.addEventListener('seeking', () => {
            controller.lastTimeUpdate = performance.now();
        });
        
        video.addEventListener('ended', () => {
            controller.stopSkipTimer();
        });
        
        // Try to autoplay
        const tryAutoplay = () => {
            if (video.paused) {
                video.play().catch(e => {
                    console.log('Autoplay blocked:', e.message);
                });
            }
        };
        
        // Initialize autoplay
        video.addEventListener('loadedmetadata', tryAutoplay);
        tryAutoplay();
        
        // Add visual indicator for 16x speed
        addSpeedIndicator(video);
    }
    
    // Add a visual speed indicator to the video
    function addSpeedIndicator(video) {
        const container = video.parentElement;
        if (!container) return;
        
        const indicator = document.createElement('div');
        indicator.textContent = `${TARGET_SPEED}x`;
        indicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            z-index: 9999;
            pointer-events: none;
        `;
        
        // Position the container if needed
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        
        container.appendChild(indicator);
    }
    
    // Process existing videos
    function processExistingVideos() {
        document.querySelectorAll('video').forEach(video => {
            setupVideo(video);
        });
    }
    
    // Initial processing
    processExistingVideos();
    
    // Handle dynamically added videos with MutationObserver
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'VIDEO') {
                    setupVideo(node);
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('video').forEach(video => {
                        setupVideo(video);
                    });
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Handle SPA (Single Page Application) navigation
    const handleSPANavigation = () => {
        setTimeout(processExistingVideos, 500);
    };
    
    // Listen for potential page navigation events
    window.addEventListener('spa-navigate', handleSPANavigation);
    window.addEventListener('popstate', handleSPANavigation);
    window.addEventListener('pushState', handleSPANavigation);
    window.addEventListener('replaceState', handleSPANavigation);
    
    // Backup periodic check for videos
    setInterval(processExistingVideos, 2000);
    
    // Add a keyboard shortcut to toggle between speeds (optional)
    document.addEventListener('keydown', (e) => {
        // Press 'S' to toggle speed
        if (e.key === 's' || e.key === 'S') {
            document.querySelectorAll('video').forEach(video => {
                const controller = videoPlayers.get(video);
                if (controller) {
                    if (controller.speedMultiplier === TARGET_SPEED / MAX_STABLE_SPEED) {
                        controller.speedMultiplier = 1; // Normal speed (just 3.5x)
                    } else {
                        controller.speedMultiplier = TARGET_SPEED / MAX_STABLE_SPEED; // Back to 16x
                    }
                }
            });
        }
    });
})();

