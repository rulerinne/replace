<!-- 开站时间计时器（带彩虹渐变） -->
<div class="timer-container">
    <a class="timer-link" href="https://Alist.sonogamiruler.top" target="_blank">
        <span id="timeDate" class="rainbow-text">载入天数...</span>
        <span id="times">载入时分秒...</span>
    </a>
</div>

<style>
    /* 计时器容器样式 */
    .timer-container {
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    .timer-link {
        text-decoration: none; /* 去除链接下划线 */
    }

    /* 彩虹渐变文字动画 */
    .rainbow-text {
        background: linear-gradient(90deg, 
            #ff0000, #ff7f00, #ffff00, #00ff00, 
            #0000ff, #4b0082, #9400d3, #ff0000);
        background-size: 400% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: rainbow 3s linear infinite;
        font-weight: bold;
    }

    @keyframes rainbow {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
    }

    /* 时分秒的样式 */
    #times {
        animation: color-change 5s infinite;
        color: #333; /* 默认颜色 */
    }

    @keyframes color-change {
        0% { color: #ff0000; }
        25% { color: #00ff00; }
        50% { color: #0000ff; }
        75% { color: #ff00ff; }
        100% { color: #ff0000; }
    }
</style>

<script>
    // IIFE (立即调用函数表达式) 避免全局变量污染
    (function() {
        // ---- 在这里设置您的网站启用时间 ----
        const siteLaunchDate = new Date("2024-02-16T00:00:00");
        
        // 获取用于显示时间的元素
        const timeDateElement = document.getElementById("timeDate");
        const timesElement = document.getElementById("times");

        function updateTimer() {
            // 获取当前时间
            const now = new Date();
            
            // 计算总的时间差（单位：秒）
            const totalSeconds = Math.floor((now - siteLaunchDate) / 1000);
            
            // 计算天数
            const days = Math.floor(totalSeconds / 86400); // 86400 = 24 * 60 * 60
            
            // 计算剩余的小时数
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            
            // 计算剩余的分钟数
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            
            // 计算剩余的秒数
            const seconds = totalSeconds % 60;
            
            // 使用 padStart 补零，让数字始终保持两位数，例如 01, 02...
            const paddedHours = String(hours).padStart(2, '0');
            const paddedMinutes = String(minutes).padStart(2, '0');
            const paddedSeconds = String(seconds).padStart(2, '0');
            
            // 更新页面上的内容
            timeDateElement.innerHTML = `⏱️本站已稳定运行 ${days} 天`;
            timesElement.innerHTML = `${paddedHours} 小时 ${paddedMinutes} 分 ${paddedSeconds} 秒`;
        }
        
        // 1. 页面加载后立即运行一次，避免显示“载入中...”
        updateTimer();
        
        // 2. 设置定时器，每秒更新一次时间
        setInterval(updateTimer, 1000);

    })();
</script>
