// ==UserScript==
// @name         cqooc专用3.5倍视频加速
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      1.3
// @description  倍速播放视频，自动静音，3.5倍速播放，检测到视频自动播放，播放完成后不重播，后台保持倍速
// @author       Your Name
// @match        https://www.cqooc.com/*
// @grant        none
// @updateURL    https://github.com/rulerinne/replace/blob/main/Advanced%20Video%20Speed%20Booster.js
// ==/UserScript==

(function() {
    'use strict';

    // 定义要设置的倍速值
    const targetSpeed = 3.5;

    // 用于跟踪已处理的视频
    const processedVideos = new Set();
    // 跟踪已经播放的视频，避免重播
    const playedVideos = new Set();

    // 创建一个函数来处理新检测到的视频
    function processVideo(video) {
        // 检查视频是否已处理过，避免重复处理
        if (processedVideos.has(video)) {
            return;
        }

        // 将视频标记为已处理
        processedVideos.add(video);

        // 设置视频为静音
        video.muted = true;

        // 设置视频播放速度为3.5倍
        video.playbackRate = targetSpeed;

        // 立即尝试播放视频
        attemptPlay(video);

        // 添加监听器，确保即使用户调整后依然保持我们的设置
        video.addEventListener('ratechange', function() {
            if(video.playbackRate !== targetSpeed) {
                video.playbackRate = targetSpeed;
            }
        });

        video.addEventListener('volumechange', function() {
            if(!video.muted) {
                video.muted = true;
            }
        });

        // 添加canplay事件监听器，确保在视频可以播放时开始播放
        video.addEventListener('canplay', function() {
            attemptPlay(video);
        });

        // 添加监听器，确保视频播放结束后不会重新开始
        video.addEventListener('ended', function() {
            playedVideos.add(video);
            console.log("视频播放完成");
        });

        // 添加play事件监听器，确保每次播放时速度都是设定值
        video.addEventListener('play', function() {
            if(video.playbackRate !== targetSpeed) {
                video.playbackRate = targetSpeed;
            }
        });

        console.log("视频已设置为静音并以3.5倍速播放");
    }

    // 尝试播放视频的函数
    function attemptPlay(video) {
        // 如果视频已经播放完毕，不要重新播放
        if (playedVideos.has(video)) {
            return;
        }

        // 确保视频是静音的，以提高自动播放成功率
        video.muted = true;

        // 确保视频速度设置正确
        video.playbackRate = targetSpeed;

        // 立即尝试播放
        const playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.log("播放尝试失败:", err);
                // 如果自动播放失败，继续尝试
                setTimeout(() => attemptPlay(video), 1000);
            });
        }
    }

    // 强制所有视频保持正确的速度设置
    function enforceVideoSpeed() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (video.playbackRate !== targetSpeed) {
                video.playbackRate = targetSpeed;
            }
        });
    }

    // 处理页面已有的视频
    function handleExistingVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(processVideo);
    }

    // 设置MutationObserver来监听DOM变化，检测新添加的视频
    function setupVideoObserver() {
        const observer = new MutationObserver(function(mutations) {
            let foundVideo = false;

            mutations.forEach(function(mutation) {
                // 检查是否有新的节点被添加
                if(mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // 遍历新添加的节点
                    mutation.addedNodes.forEach(function(node) {
                        // 检查节点是否为视频元素
                        if(node.nodeName === 'VIDEO') {
                            processVideo(node);
                            foundVideo = true;
                        }
                        // 检查节点内部是否包含视频元素
                        else if(node.querySelectorAll) {
                            const videos = node.querySelectorAll('video');
                            if (videos.length > 0) {
                                videos.forEach(processVideo);
                                foundVideo = true;
                            }
                        }
                    });
                }
            });

            // 如果发现了新视频，也检查所有现有视频
            if (foundVideo) {
                handleExistingVideos();
            }
        });

        // 配置observer开始观察整个文档
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // 定期检查页面上是否有新的可播放视频
    function checkForPlayableVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            // 处理新视频
            if (!processedVideos.has(video)) {
                processVideo(video);
            }
            // 对已处理但还未播放过且不在播放中的视频，尝试播放
            else if (!playedVideos.has(video) && video.paused && video.readyState >= 2) {
                attemptPlay(video);
            }
            // 确保所有视频速度正确
            if (video.playbackRate !== targetSpeed) {
                video.playbackRate = targetSpeed;
            }
        });
    }

    // 监听页面可见性变化
    function setupVisibilityListener() {
        document.addEventListener('visibilitychange', function() {
            // 无论页面是否可见，都强制设置视频速度
            enforceVideoSpeed();

            // 如果页面变为可见，检查所有视频
            if (!document.hidden) {
                checkForPlayableVideos();
            }
        });
    }

    // 初始化函数
    function initialize() {
        handleExistingVideos();
        setupVideoObserver();
        setupVisibilityListener();

        // 定期检查可播放的视频和速度设置
        setInterval(checkForPlayableVideos, 500);

        // 更频繁地检查和强制视频速度（特别是对后台标签）
        setInterval(enforceVideoSpeed, 200);

        // 添加点击事件监听器，可能有助于绕过某些浏览器的自动播放限制
        document.addEventListener('click', function() {
            setTimeout(checkForPlayableVideos, 100);
        }, true);

        console.log("超级视频加速器已启动");
    }

    // 立即初始化，不等待DOMContentLoaded事件
    initialize();

    // 确保在页面加载完成后也检查视频
    window.addEventListener('load', checkForPlayableVideos);
})();
