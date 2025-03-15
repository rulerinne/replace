// ==UserScript==
// @name         cqooc专用3.5倍视频加速
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      1.0
// @description  倍速播放视频，自动静音，3.5倍速播放
// @author       Your Name
// @match        https://www.cqooc.com/*
// @grant        none
// @updateURL    https://github.com/rulerinne/replace/blob/main/Advanced%20Video%20Speed%20Booster.js
// ==/UserScript==

(function() {
    'use strict';

    // 定义要设置的倍速值
    const targetSpeed = 3.5;

    // 创建一个函数来处理新检测到的视频
    function processVideo(video) {
        // 设置视频为静音
        video.muted = true;

        // 设置视频播放速度为3.5倍
        video.playbackRate = targetSpeed;

        // 确保视频在后台继续播放
        video.play().catch(err => {
            console.log("自动播放失败，可能需要用户交互:", err);
        });

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

        console.log("视频已设置为静音并以3.5倍速播放");
    }

    // 处理页面已有的视频
    function handleExistingVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(processVideo);
    }

    // 设置MutationObserver来监听DOM变化，检测新添加的视频
    function setupVideoObserver() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // 检查是否有新的节点被添加
                if(mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // 遍历新添加的节点
                    mutation.addedNodes.forEach(function(node) {
                        // 检查节点是否为视频元素
                        if(node.nodeName === 'VIDEO') {
                            processVideo(node);
                        }
                        // 检查节点内部是否包含视频元素
                        else if(node.querySelectorAll) {
                            const videos = node.querySelectorAll('video');
                            videos.forEach(processVideo);
                        }
                    });
                }
            });
        });

        // 配置observer开始观察整个文档
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // 页面加载完成后立即运行
    window.addEventListener('load', function() {
        handleExistingVideos();
        setupVideoObserver();
        console.log("超级视频加速器已启动");
    });

    // 为了处理可能在脚本运行时已经存在的视频
    handleExistingVideos();
    setupVideoObserver();
})();
