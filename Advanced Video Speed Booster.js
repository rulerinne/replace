// ==UserScript==
// @name         Ultimate Video Speed Booster (up to 16x)
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      3.0
// @description  Advanced video speed control up to 16x with multiple acceleration methods and anti-detection
// @author       Optimized Version
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ===== Configurable Options =====
    let CONFIG = {
        // Speed settings
        TARGET_SPEED: 16,            // Desired effective playback speed
        DIRECT_SPEED: 3.5,           // Maximum direct playback speed to attempt
        
        // Advanced settings
        SKIP_INTERVAL: 80,           // How often to check and adjust video (ms)
        SKIP_AMOUNT_FACTOR: 0.8,     // How aggressive the skip should be (0.5-1.0)
        BUFFER_SENSITIVITY: 1.5,     // Higher = more sensitive to buffering detection
        
        // UI settings
        SHOW_INDICATOR: true,        // Show speed indicator
        ENABLE_SHORTCUTS: true,      // Enable keyboard shortcuts
        
        // Acceleration methods (enable/disable different strategies)
        USE_DIRECT_SPEED: true,      // Try native playbackRate first
        USE_TIME_SKIP: true,         // Use currentTime skipping
        USE_PLAYBACK_SKIP: true,     // Use playbackRate+skipping hybrid
        
        // Anti-detection settings
        RANDOMIZE_SKIPS: true,       // Add small random variations to skips
        SMART_TRANSITIONS: true      // Gradually apply speed changes
    };

    // ===== Internal State =====
    const videoPlayers = new Map();
    const ACCELERATION_METHODS = ['direct', 'timeSkip', 'hybrid'];
    let activeAccelerationMethod = 0; // Index in the ACCELERATION_METHODS array
    
    // Load saved config if available
    try {
        const savedConfig = GM_getValue('speedBoosterConfig');
        if (savedConfig) {
            CONFIG = {...CONFIG, ...JSON.parse(savedConfig)};
        }
    } catch (e) {
        console.log('Could not load saved configuration', e);
    }

    // ===== Utility Functions =====
    
    // Save current configuration
    function saveConfig() {
        GM_setValue('speedBoosterConfig', JSON.stringify(CONFIG));
    }
    
    // Generate a small random variation for anti-detection
    function randomVariation(baseValue, percentage = 0.1) {
        if (!CONFIG.RANDOMIZE_SKIPS) return baseValue;
        const variation = baseValue * percentage * (Math.random() * 2 - 1);
        return baseValue + variation;
    }
    
    // Detect if a video is buffering
    function isVideoBuffering(video, controller) {
        if (!video.paused) {
            const currentTime = performance.now();
            const expectedProgress = (currentTime - controller.lastCheckTime) / 1000 * video.playbackRate;
            const actualProgress = video.currentTime - controller.lastPosition;
            
            // If actual progress is significantly less than expected, might be buffering
            return actualProgress < expectedProgress / CONFIG.BUFFER_SENSITIVITY;
        }
        return false;
    }
    
    // Try to find the optimal acceleration method for this video/site
    function findOptimalAccelerationMethod(video, controller) {
        // Check if current method is working well
        if (controller.successCounter > 10) {
            return; // Current method is working fine
        }

        // If buffering or stuttering detected, try next method
        activeAccelerationMethod = (activeAccelerationMethod + 1) % ACCELERATION_METHODS.length;
        
        // Reset counters
        controller.successCounter = 0;
        controller.bufferingCounter = 0;
        
        // Apply the new method
        controller.accelerationMethod = ACCELERATION_METHODS[activeAccelerationMethod];
        console.log(`Switching to ${controller.accelerationMethod} acceleration method`);
        
        // Reset state for the new method
        controller.lastTimeUpdate = performance.now();
        controller.currentDirectSpeed = Math.min(3.0, CONFIG.DIRECT_SPEED);
    }

    // ===== Core Video Speed Control =====
    
    // Main function to apply effective speed using chosen method
    function applyEffectiveSpeed(video, controller) {
        if (video.paused || controller.isSkipping) return;
        
        const now = performance.now();
        const timeDiff = (now - controller.lastTimeUpdate) / 1000;
        
        // Update buffering detection metrics
        const actualProgress = video.currentTime - controller.lastPosition;
        controller.lastPosition = video.currentTime;
        controller.lastCheckTime = now;
        
        // Detect buffering
        if (timeDiff > 0.1 && isVideoBuffering(video, controller)) {
            controller.bufferingCounter++;
            if (controller.bufferingCounter > 3) {
                findOptimalAccelerationMethod(video, controller);
                return;
            }
        } else {
            controller.bufferingCounter = Math.max(0, controller.bufferingCounter - 0.5);
            controller.successCounter += 0.1;
        }
        
        // Only proceed with adjustment after minimal interval
        if (timeDiff <= 0.05) return;
        
        // Apply the active acceleration method
        switch (controller.accelerationMethod) {
            case 'direct':
                applyDirectSpeedMethod(video, controller, now);
                break;
            
            case 'timeSkip':
                applyTimeSkipMethod(video, controller, now, timeDiff);
                break;
                
            case 'hybrid':
                applyHybridMethod(video, controller, now, timeDiff);
                break;
                
            default:
                applyHybridMethod(video, controller, now, timeDiff);
        }
        
        controller.lastTimeUpdate = now;
    }
    
    // Method 1: Try to use native playbackRate directly (works on some sites)
    function applyDirectSpeedMethod(video, controller, now) {
        // Try to gradually increase speed up to target
        if (video.playbackRate < CONFIG.TARGET_SPEED) {
            // Slowly increase speed to avoid detection
            if (CONFIG.SMART_TRANSITIONS) {
                let nextSpeed = Math.min(
                    video.playbackRate + 0.5, 
                    CONFIG.TARGET_SPEED
                );
                video.playbackRate = nextSpeed;
            } else {
                video.playbackRate = CONFIG.TARGET_SPEED;
            }
            
            // If speed was reset by the player, switch methods
            setTimeout(() => {
                if (video.playbackRate < controller.currentDirectSpeed) {
                    findOptimalAccelerationMethod(video, controller);
                } else {
                    controller.currentDirectSpeed = video.playbackRate;
                }
            }, 50);
        }
    }
    
    // Method 2: Skip video time periodically
    function applyTimeSkipMethod(video, controller, now, timeDiff) {
        // Use a modest playback rate
        if (video.playbackRate !== 1.0) {
            video.playbackRate = 1.0;
        }
        
        // Calculate time to skip to achieve target speed
        const targetTimeDiff = timeDiff * CONFIG.TARGET_SPEED;
        const skipAmount = targetTimeDiff - timeDiff;
        
        // Only skip if we have a reasonable amount and aren't near the end
        if (skipAmount > 0.01 && video.currentTime + skipAmount < video.duration - 0.5) {
            const actualSkipAmount = skipAmount * CONFIG.SKIP_AMOUNT_FACTOR;
            const adjustedSkip = randomVariation(actualSkipAmount);
            
            controller.isSkipping = true;
            video.currentTime += adjustedSkip;
            setTimeout(() => { controller.isSkipping = false; }, 30);
        }
    }
    
    // Method 3: Hybrid approach - moderate playbackRate + time skipping
    function applyHybridMethod(video, controller, now, timeDiff) {
        // Set moderate direct speed
        const stableSpeed = Math.min(2.0, CONFIG.DIRECT_SPEED);
        if (video.playbackRate !== stableSpeed) {
            video.playbackRate = stableSpeed;
        }
        
        // Calculate necessary skip to achieve target speed
        const speedMultiplier = CONFIG.TARGET_SPEED / stableSpeed;
        const skipAmount = timeDiff * video.playbackRate * (speedMultiplier - 1) * CONFIG.SKIP_AMOUNT_FACTOR;
        
        // Apply the skip with some randomization for anti-detection
        if (skipAmount > 0.01 && video.currentTime + skipAmount < video.duration - 0.5) {
            const adjustedSkip = randomVariation(skipAmount);
            
            controller.isSkipping = true;
            video.currentTime += adjustedSkip;
            setTimeout(() => { controller.isSkipping = false; }, 30);
        }
    }

    // ===== Video Setup & Management =====
    
    // Setup a new video with speed control
    function setupVideo(video) {
        // Skip if already handled
        if (videoPlayers.has(video)) return;
        
        // Create video controller object
        const controller = {
            skipTimer: null,
            lastTimeUpdate: performance.now(),
            lastCheckTime: performance.now(),
            lastPosition: video.currentTime,
            isSkipping: false,
            accelerationMethod: ACCELERATION_METHODS[activeAccelerationMethod],
            successCounter: 0,
            bufferingCounter: 0,
            currentDirectSpeed: 1.0,
            
            startSkipTimer: function() {
                this.stopSkipTimer(); // Clear any existing timer
                this.lastTimeUpdate = performance.now();
                this.lastCheckTime = performance.now();
                this.lastPosition = video.currentTime;
                this.skipTimer = setInterval(() => applyEffectiveSpeed(video, this), CONFIG.SKIP_INTERVAL);
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
        
        // Enable autoplay if possible
        video.muted = true;
        video.setAttribute('autoplay', '');
        
        // Setup event listeners
        video.addEventListener('play', () => {
            controller.startSkipTimer();
        });
        
        video.addEventListener('pause', () => {
            controller.stopSkipTimer();
        });
        
        video.addEventListener('seeking', () => {
            controller.lastTimeUpdate = performance.now();
            controller.lastCheckTime = performance.now();
            controller.lastPosition = video.currentTime;
        });
        
        video.addEventListener('ended', () => {
            controller.stopSkipTimer();
        });
        
        // Monitor volume changes (some sites use volume as an interaction check)
        const originalVolumeSetter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume').set;
        Object.defineProperty(video, 'volume', {
            set: function(val) {
                // Preserve user volume settings when possible
                originalVolumeSetter.call(this, val);
            }
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
        video.addEventListener('canplay', tryAutoplay);
        tryAutoplay();
        
        // Add visual indicator for speed if enabled
        if (CONFIG.SHOW_INDICATOR) {
            addSpeedIndicator(video);
        }
    }
    
    // ===== UI Components =====
    
    // Add a visual speed indicator to the video
    function addSpeedIndicator(video) {
        const container = video.parentElement || document.body;
        if (!container) return;
        
        // Create indicator element
        const indicator = document.createElement('div');
        indicator.className = 'speed-booster-indicator';
        indicator.textContent = `${CONFIG.TARGET_SPEED}x`;
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
            transition: opacity 0.3s;
        `;
        
        // Position the container if needed
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        
        // Add to DOM
        container.appendChild(indicator);
        
        // Update the indicator when config changes
        const updateIndicator = () => {
            indicator.textContent = `${CONFIG.TARGET_SPEED}x`;
        };
        
        // Store update function for later use
        videoPlayers.get(video).updateIndicator = updateIndicator;
        
        // Fade out indicator after a few seconds
        setTimeout(() => {
            indicator.style.opacity = '0.5';
        }, 3000);
        
        // Show indicator on hover
        container.addEventListener('mouseenter', () => {
            indicator.style.opacity = '1';
        });
        
        container.addEventListener('mouseleave', () => {
            indicator.style.opacity = '0.5';
        });
    }
    
    // ===== Video Detection & Processing =====
    
    // Process any existing videos on the page
    function processExistingVideos() {
        document.querySelectorAll('video').forEach(video => {
            setupVideo(video);
        });
    }
    
    // Process videos in shadow DOM (used by some modern video players)
    function processShadowDomVideos(root) {
        if (!root) return;
        
        // Check if the node has shadow DOM
        if (root.shadowRoot) {
            // Find videos in the shadow root
            root.shadowRoot.querySelectorAll('video').forEach(video => {
                setupVideo(video);
            });
            
            // Recursively check elements in the shadow DOM
            root.shadowRoot.querySelectorAll('*').forEach(el => {
                processShadowDomVideos(el);
            });
        }
        
        // For non-shadow nodes, check their children
        if (root.querySelectorAll) {
            root.querySelectorAll('*').forEach(el => {
                processShadowDomVideos(el);
            });
        }
    }
    
    // ===== Keyboard Controls =====
    
    // Setup keyboard shortcuts for speed control
    function setupKeyboardShortcuts() {
        if (!CONFIG.ENABLE_SHORTCUTS) return;
        
        document.addEventListener('keydown', (e) => {
            // Ignore keypress in form inputs
            if (e.target.matches('input, textarea, select')) return;
            
            switch (e.key.toLowerCase()) {
                // 'S' - Toggle between normal and boosted speed
                case 's':
                    toggleSpeedBoost();
                    break;
                
                // '+' - Increase target speed
                case '+':
                case '=': // Same key on most keyboards
                    adjustTargetSpeed(1);
                    break;
                
                // '-' - Decrease target speed
                case '-':
                    adjustTargetSpeed(-1);
                    break;
                
                // '0' to '9' - Set specific speeds
                case '1': case '2': case '3': case '4': case '5':
                case '6': case '7': case '8': case '9':
                    const speedValue = parseInt(e.key) * 2;
                    setTargetSpeed(speedValue);
                    break;
                    
                // 'M' - Toggle method
                case 'm':
                    cycleAccelerationMethod();
                    break;
            }
        });
    }
    
    // Toggle between normal and boosted speed
    function toggleSpeedBoost() {
        const allVideos = document.querySelectorAll('video');
        
        if (CONFIG.TARGET_SPEED > 1) {
            // Store current speed before switching to normal
            CONFIG._previousSpeed = CONFIG.TARGET_SPEED;
            setTargetSpeed(1);
        } else {
            // Restore previous speed, default to 16x
            setTargetSpeed(CONFIG._previousSpeed || 16);
        }
    }
    
    // Adjust target speed up or down
    function adjustTargetSpeed(delta) {
        let newSpeed = CONFIG.TARGET_SPEED + delta;
        // Clamp between 0.5 and 32
        newSpeed = Math.max(0.5, Math.min(32, newSpeed));
        setTargetSpeed(newSpeed);
    }
    
    // Set specific target speed
    function setTargetSpeed(speed) {
        CONFIG.TARGET_SPEED = speed;
        saveConfig();
        
        // Update all videos with new speed
        document.querySelectorAll('video').forEach(video => {
            const controller = videoPlayers.get(video);
            if (controller && controller.updateIndicator) {
                controller.updateIndicator();
            }
        });
        
        // Show feedback
        showTemporaryMessage(`Speed set to ${speed}x`);
    }
    
    // Cycle through acceleration methods
    function cycleAccelerationMethod() {
        activeAccelerationMethod = (activeAccelerationMethod + 1) % ACCELERATION_METHODS.length;
        
        // Apply to all videos
        document.querySelectorAll('video').forEach(video => {
            const controller = videoPlayers.get(video);
            if (controller) {
                controller.accelerationMethod = ACCELERATION_METHODS[activeAccelerationMethod];
                controller.lastTimeUpdate = performance.now();
            }
        });
        
        // Show feedback
        showTemporaryMessage(`Method: ${ACCELERATION_METHODS[activeAccelerationMethod]}`);
    }
    
    // Show temporary on-screen message
    function showTemporaryMessage(text) {
        let message = document.getElementById('speed-booster-message');
        
        // Create message element if it doesn't exist
        if (!message) {
            message = document.createElement('div');
            message.id = 'speed-booster-message';
            message.style.cssText = `
                position: fixed;
                top: 50px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 16px;
                transition: opacity 0.3s;
                pointer-events: none;
            `;
            document.body.appendChild(message);
        }
        
        // Update and show message
        message.textContent = text;
        message.style.opacity = '1';
        
        // Hide after delay
        clearTimeout(message._timeout);
        message._timeout = setTimeout(() => {
            message.style.opacity = '0';
        }, 1500);
    }
    
    // ===== Initialization =====
    
    // Setup Menu Commands
    function setupMenuCommands() {
        GM_registerMenuCommand("Speed: 2x", () => setTargetSpeed(2));
        GM_registerMenuCommand("Speed: 4x", () => setTargetSpeed(4));
        GM_registerMenuCommand("Speed: 8x", () => setTargetSpeed(8));
        GM_registerMenuCommand("Speed: 16x", () => setTargetSpeed(16));
        GM_registerMenuCommand("Toggle Speed Indicator", () => {
            CONFIG.SHOW_INDICATOR = !CONFIG.SHOW_INDICATOR;
            saveConfig();
            showTemporaryMessage(`Indicator ${CONFIG.SHOW_INDICATOR ? 'Enabled' : 'Disabled'}`);
        });
    }
    
    // Setup observer to detect dynamically added videos
    function setupMutationObserver() {
        const observer = new MutationObserver(mutations => {
            let processNow = false;
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'VIDEO') {
                        setupVideo(node);
                        processNow = true;
                    } else if (node.querySelectorAll) {
                        const videos = node.querySelectorAll('video');
                        if (videos.length > 0) {
                            videos.forEach(video => setupVideo(video));
                            processNow = true;
                        }
                        
                        // Check for shadow DOM
                        processShadowDomVideos(node);
                    }
                });
            });
            
            // If we found videos, also check for shadow DOM
            if (processNow) {
                processShadowDomVideos(document.body);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Initial setup
    function initialize() {
        // Initial processing of existing videos
        processExistingVideos();
        processShadowDomVideos(document.body);
        
        // Setup Tampermonkey menu commands if available
        if (typeof GM_registerMenuCommand !== 'undefined') {
            setupMenuCommands();
        }
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Setup observer for new videos
        setupMutationObserver();
        
        // Detect Single Page App navigation
        const handleSPANavigation = () => {
            setTimeout(() => {
                processExistingVideos();
                processShadowDomVideos(document.body);
            }, 500);
        };
        
        // Listen for potential page navigation events
        window.addEventListener('popstate', handleSPANavigation);
        window.addEventListener('pushState', handleSPANavigation);
        window.addEventListener('replaceState', handleSPANavigation);
        
        // Backup periodic check
        setInterval(() => {
            processExistingVideos();
            processShadowDomVideos(document.body);
        }, 3000);
        
        // Hack for history state methods often used by SPAs
        const _pushState = history.pushState;
        history.pushState = function() {
            _pushState.apply(this, arguments);
            window.dispatchEvent(new Event('pushState'));
        };
        
        const _replaceState = history.replaceState;
        history.replaceState = function() {
            _replaceState.apply(this, arguments);
            window.dispatchEvent(new Event('replaceState'));
        };
    }
    
    // Start the script
    initialize();
})();
