// ==UserScript==
// @name         动态文本替换悬浮球
// @namespace    http://yournamespace.com
// @version      3.5
// @description  在网页右上角显示一个美观的动态文本替换悬浮球，集成ON/OFF开关，点击悬浮球主体弹出菜单，绿灯ON，红灯OFF，修复分页BUG，优化手机端页面适配，紧凑横向规则显示，限制规则显示数量, 修复手机端悬浮窗超出屏幕边界BUG, 进一步优化手机端替换规则排布，极致紧凑横向显示，解决超出遮挡问题, 新增分辨率自适应样式，电脑端显示更清晰, 解决刷新页面时原文闪烁问题, 优化悬浮球点击行为，再次点击可收回菜单, **默认深色模式，界面更简洁**。
// @author       你的名字
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/rulerinne/replace/refs/heads/main/replace.js
// ==/UserScript==

(function() {
    'use strict';

    // 获取当前网站的 hostname，用于区分不同网站的存储
    const hostname = window.location.hostname;
    const storageKey = `replacementTable_${hostname}`;
    const enabledKey = `replacementEnabled_${hostname}`; // 开关状态存储 key

    // 从 GM_getValue 读取配置，如果没有则使用默认值
    let replacementTable = GM_getValue(storageKey, {});
    let isReplacementEnabled = GM_getValue(enabledKey, true); // 默认开启替换功能

    // 用于存储原始文本的 WeakMap，key 是 TextNode，value 是原始文本
    const originalTextMap = new WeakMap();
    const replacedNodes = new WeakSet(); // 保存已替换的节点，防止重复替换

    // 立即执行页面替换，防止原文闪烁 (在添加样式和创建元素之前执行)
    replacePage();

    // 定义 CSS 变量和样式 (美化版本 3.5 - 默认深色模式，移除切换功能)
    const styles = `
        :root {
            /* Dark Mode 默认主题色 (移除 Light Mode 定义) */
            --bg-color: #121212; /* 深灰色背景 */
            --modal-bg-color: #222; /* 稍浅的深灰色模态框背景 */
            --text-color: #eee;      /* 浅灰色文字 */
            --text-color-light: #ccc;
            --text-color-lighter: #aaa;
            --border-color: #555;     /* 深灰色边框 */
            --hover-bg-color: #444;   /* 较深的 hover 背景 */
            --button-bg-color: #333;  /* 深灰色按钮背景 */
            --button-hover-bg-color: var(--hover-bg-color);
            --button-active-bg-color: #555;
            --button-text-color: var(--text-color);
            --button-delete-bg-color: #d32f2f; /* 保持删除按钮红色系 */
            --button-delete-hover-bg-color: #f44336;
            --scroll-track-color: #333;
            --scroll-thumb-color: #666;
            --scroll-thumb-hover-color: #888;
            --floating-ball-bg-color: rgba(255, 255, 255, 0.3); /* 浅色悬浮球背景 */
            --floating-ball-text-color: #333;          /* 深色悬浮球文字 */
            --toggle-indicator-on-color: #69F0AE; /* 鲜艳的绿色指示器 */
            --toggle-indicator-off-color: #FF5252;/* 鲜艳的红色指示器 */
        }


        #floating-ball-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            width: 50px;
            height: 50px;
            cursor: pointer;
            user-select: none;
        }

        #floating-ball {
            width: 100%;
            height: 100%;
            background-color: var(--floating-ball-bg-color);
            color: var(--floating-ball-text-color);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 24px;
            transition: opacity 0.3s ease-in-out, transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), background-color 0.2s ease-in-out; /* 背景色过渡 */
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            position: relative;
            pointer-events: auto;
        }
        #floating-ball:hover {
            background-color: rgba(255, 255, 255, 0.5); /* Hover 时背景色 */
        }


        #floating-ball.transparent {
            opacity: 0.4;
            transform: scale(0.9);
        }
        #floating-ball.rotating {
            transform: rotate(360deg);
            transition: transform 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        }

        #toggle-indicator {
            position: absolute;
            top: 5px;
            right: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.8);
            pointer-events: auto;
            cursor: pointer;
        }
        #toggle-indicator.on {
            background-color: var(--toggle-indicator-on-color);
            border: none;
        }
        #toggle-indicator.off {
            background-color: var(--toggle-indicator-off-color);
            border: none;
        }


        #choice-modal {
            position: fixed;
            z-index: 10000;
            background-color: var(--modal-bg-color);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            padding: 15px 20px;
            border-radius: 12px;
            display: none;
            transform-origin: top center;
            opacity: 0;
            transform: scaleY(0.8);
            transition: transform 0.3s ease-out, opacity 0.3s ease-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, color 0.3s ease-in-out; /*  过渡效果 */
            user-select: none;
             pointer-events: auto;
        }

        #choice-modal.show {
            opacity: 1;
            transform: scaleY(1);
            display: block;
        }
        #choice-modal.hide {
            opacity: 0;
            transform: scaleY(0.8);
            transition: transform 0.3s ease-in, opacity 0.3s ease-in;
        }

          #choice-modal button {
             margin: 6px 8px;
             padding: 10px 16px;
             cursor: pointer;
             border: none;
             border-radius: 8px;
             background-color: var(--button-bg-color);
             color: var(--button-text-color);
             font-size: 1em;
             transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, color 0.2s ease-in-out; /*  过渡效果 */
          }
           #choice-modal button:hover {
             background-color: var(--button-hover-bg-color);
             transform: scale(1.05);
             box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
         #replacement-editor {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: var(--modal-bg-color);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 25px;
            z-index: 10001;
            display: none;
            max-height: 85vh;
            overflow-y: auto;
            width: 550px;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            user-select: none;
            pointer-events: auto;
            transition: background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, color 0.3s ease-in-out; /*  过渡效果 */
         }
         #replacement-editor.hide {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
            transition: opacity 0.3s ease-in, transform 0.3s ease-in;
         }
         #replacement-editor h2 {
            text-align: center;
            margin-top: 0;
            margin-bottom: 15px;
            color: var(--text-color-light);
         }
        #replacement-editor .replacement-row {
           display: flex;
           margin-bottom: 8px; /* 稍微减小行间距 */
            align-items: center;
        }
        #replacement-editor label {
             margin-right: 4px; /* 稍微减小 label 右边距 */
             flex-basis: 60px; /* 缩小 label 宽度 */
             text-align: right;
             white-space: nowrap;
             color: var(--text-color-light);
             font-size: 0.9em; /* 稍微缩小 label 字体 */
             line-height: normal; /* 恢复 label 行高默认值 */
        }
        #replacement-editor input {
           flex-grow: 1;
           padding: 6px; /* 稍微减小 input 内边距 */
           border: 1px solid var(--border-color);
           border-radius: 6px; /* 稍微减小 input 圆角 */
           font-size: 0.9em; /* 稍微缩小 input 字体 */
           color: var(--text-color);
           background-color: #444; /*  默认深色背景 for input */
           transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, color 0.2s ease-in-out, background-color 0.2s ease-in-out; /*  过渡效果 */
           user-select: text !important;
           min-width: auto; /* 恢复 input 最小宽度默认值 */
        }


         #replacement-editor input:focus {
             border-color: #ccc;
             box-shadow: 0 0 5px rgba(0, 0, 0, 0.08); /* 恢复 focus 效果 */
             outline: none;
         }
          #replacement-editor button,
          #replacement-editor .button-pagination-container button{
            padding: 8px 12px;
             cursor: pointer;
             border: none;
             border-radius: 8px; /* 恢复 button 圆角 */
             background-color: var(--button-bg-color);
              color: var(--button-text-color);
              font-size: 0.9em; /* 恢复 button 字体 */
              transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, color 0.2s ease-in-out; /*  过渡效果 */
          }
          #replacement-editor button:hover,
          #replacement-editor .button-pagination-container button:hover {
              background-color: var(--button-hover-bg-color);
              transform: scale(1.03);
              box-shadow: 0 2px 4px rgba(0,0,0,0.08); /* 恢复 hover 阴影 */
           }
            #replacement-editor .button-pagination-container {
               display: flex;
               justify-content: space-around;
               align-items: center;
               margin-top: 10px; /* 稍微减小 上边距 */
               margin-bottom: 10px; /* 稍微减小 下边距 */
            }

           #replacement-editor .delete-button {
              background-color: var(--button-delete-bg-color);
              color: white;
             border-radius: 50%;
             padding: 3px 6px;
             border: none;
              margin-left: 4px;
            cursor: pointer;
            font-size: 0.75em;
            line-height: 1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2); /* 恢复删除按钮阴影 */
            transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, color 0.2s ease-in-out; /*  过渡效果 */
            }
            #replacement-editor .delete-button:hover{
                 background-color: var(--button-delete-hover-bg-color);
                 transform: scale(1.1);
                 box-shadow: 0 3px 5px rgba(0,0,0,0.3); /* 恢复删除按钮 hover 阴影 */
            }
            #replacement-editor .scrollable-container {
               overflow-x: hidden;
              overflow-y: auto;
                max-height: 300px;
                padding-right: 8px;
                border-radius: 12px;
                transition: background-color 0.3s ease-in-out; /*  过渡效果 */
                 background-color: transparent; /*  透明背景 */
            }
            #replacement-editor .scrollable-content {
               display: flex;
                flex-direction: column;
                padding-right: 8px;
                padding-bottom: 5px;
            }


        #replacement-editor .pagination-container button {
        }


        #replacement-editor .pagination-container button {
            margin: 0 4px;
            padding: 6px 10px;
            border-radius: 6px;
            background-color: var(--button-bg-color);
            border: none;
            color: var(--text-color-light);
            font-size: 0.85em;
            transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out, transform 0.2s ease-in-out, color 0.2s ease-in-out; /*  过渡效果 */
        }
         #replacement-editor .pagination-container button:hover {
             background-color: var(--button-hover-bg-color);
             color: var(--button-text-color);
         }
        #replacement-editor .pagination-container button:disabled {
            opacity: 0.6;
            cursor: default;
            background-color: var(--button-bg-color);
            color: var(--text-color-lighter);
         }

       #replacement-editor .editor-buttons-container {
         display: flex;
         justify-content: center;
         gap: 10px;
         margin-top: 10px;
         margin-bottom: 15px;
       }
       #replacement-editor .editor-buttons-container button {
         display: inline-block;
         margin: 0;
         padding: 10px 16px;
         border-radius: 10px;
         font-size: 0.9em;
         background-color: var(--button-bg-color);
         color: var(--button-text-color);
         border: none;
         transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, color 0.2s ease-in-out; /*  过渡效果 */
     }
      #replacement-editor .editor-buttons-container button:hover {
          background-color: var(--button-hover-bg-color);
          transform: scale(1.02);
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      }

      #replacement-editor .enable-switch-container {
         display: none; /* 保持隐藏 */
         justify-content: flex-end;
         align-items: center;
         padding: 10px 20px;
         border-top: 1px solid var(--border-color);
         transition: border-color 0.3s ease-in-out; /*  过渡效果 */
      }

      #replacement-editor .enable-switch-label {
         margin-right: 10px;
         color: var(--text-color-light);
         font-size: 0.9em;
      }

      #replacement-editor .enable-switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 22px;
      }

      #replacement-editor .enable-switch input {
          opacity: 0;
          width: 0;
          height: 0;
      }

      #replacement-editor .enable-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #888; /* 默认深色滑块颜色 */
          transition: .4s, background-color 0.3s ease-in-out; /*  过渡效果 */
          border-radius: 22px;
      }


      #replacement-editor .enable-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
      }

      #replacement-editor input:checked + .enable-slider {
          background-color: #2196F3;
      }

      #replacement-editor input:focus + .enable-slider {
          box-shadow: 0 0 1px #2196F3;
      }

      #replacement-editor input:checked + .enable-slider:before {
          transform: translateX(18px);
      }

       /* 滚动条美化 (Webkit based browsers) - 电脑端 恢复稍宽滚动条 */
        #replacement-editor .scrollable-container::-webkit-scrollbar {
            width: 8px;
        }

        #replacement-editor .scrollable-container::-webkit-scrollbar-track {
            background-color: var(--scroll-track-color);
            border-radius: 10px;
        }

        #replacement-editor .scrollable-container::-webkit-scrollbar-thumb {
            background-color: var(--scroll-thumb-color);
            border-radius: 10px;
        }

        #replacement-editor .scrollable-container::-webkit-scrollbar-thumb:hover {
            background-color: var(--scroll-thumb-hover-color);
        }

        /* 媒体查询，针对小屏幕设备（例如手机） - 保持极致紧凑样式 */
        @media (max-width: 768px) {
            #floating-ball-container {
                width: 36px;
                height: 36px;
                top: 8px;
                right: 8px;
            }
            #floating-ball {
                font-size: 18px;
            }
            #toggle-indicator {
                width: 9px;
                height: 9px;
                top: 3px;
                right: 3px;
            }
            #choice-modal {
                width: 90%;
                max-width: 280px;
                padding: 10px 12px;
                font-size: 0.9em;
            }
            #choice-modal button {
                padding: 6px 10px;
                font-size: 0.85em;
                margin: 4px 5px;
            }
            #replacement-editor {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 95%;
                max-width: 320px;
                max-height: 80vh;
                padding: 10px;
                font-size: 0.85em;
            }
            #replacement-editor .replacement-row {
                margin-bottom: 2px;
            }
            #replacement-editor label {
                flex-basis: 30px;
                font-size: 0.75em;
                margin-right: 1px;
                line-height: 1;
            }
            #replacement-editor input {
                padding: 2px 3px;
                font-size: 0.75em;
                border-radius: 3px;
                min-width: 0;
            }
            #replacement-editor button,
            #replacement-editor .button-pagination-container button,
            #replacement-editor .editor-buttons-container button,
            #replacement-editor .pagination-container button {
                padding: 4px 6px;
                font-size: 0.75em;
                margin: 1px;
                border-radius: 5px;
            }
            #replacement-editor .delete-button {
                padding: 1px 2px;
                font-size: 0.55em;
                margin-left: 1px;
            }
            #replacement-editor .scrollable-container {
                padding-right: 4px;
                border-radius: 8px;
            }
             /* 滚动条美化 (Webkit based browsers) - 手机端 恢复极窄滚动条 */
            #replacement-editor .scrollable-container::-webkit-scrollbar {
                width: 5px;
            }

            #replacement-editor .scrollable-container::-webkit-scrollbar-track {
                background-color: var(--scroll-track-color);
                border-radius: 6px;
            }

            #replacement-editor .scrollable-container::-webkit-scrollbar-thumb {
                background-color: var(--scroll-thumb-color);
                border-radius: 6px;
            }

            #replacement-editor .scrollable-container::-webkit-scrollbar-thumb:hover {
                background-color: var(--scroll-thumb-hover-color);
            }
        }


    `;
    GM_addStyle(styles);


    // ... (JavaScript 代码部分，v3.5 版本移除暗色模式切换相关代码)
        // 创建悬浮球容器元素 (新的容器元素)
    let floatingBallContainer = document.createElement('div');
    floatingBallContainer.id = 'floating-ball-container';

    // 创建悬浮球元素
    let floatingBall = document.createElement('div');
    floatingBall.id = 'floating-ball';
    floatingBall.innerText = 'R';

    // 创建 ON/OFF 指示器
    let toggleIndicator = document.createElement('div');
    toggleIndicator.id = 'toggle-indicator';
    if (isReplacementEnabled) {
        toggleIndicator.classList.add('on');
    } else {
        toggleIndicator.classList.add('off');
    }
    floatingBall.appendChild(toggleIndicator); // 指示器放入悬浮球

    floatingBallContainer.appendChild(floatingBall); // 悬浮球放入容器
    document.body.appendChild(floatingBallContainer); // 容器添加到 body
    document.body.classList.add('dark-mode'); // **默认添加 dark-mode class 到 body，启用深色模式**


    // 创建选择窗口元素 (保持不变)
    let choiceModal = document.createElement('div');
    choiceModal.id = 'choice-modal';
    choiceModal.innerHTML = `
        <p>请选择操作:</p>
        <button id="choice-1">显示替换</button>
        <button id="choice-2">隐藏悬浮球</button>
    `;
    document.body.appendChild(choiceModal);

    //创建文本替换编辑窗口 (移除暗色模式切换按钮)
    let replacementEditor = document.createElement('div');
    replacementEditor.id = 'replacement-editor';
    replacementEditor.style.display = 'none'; // 初始化隐藏
    replacementEditor.innerHTML = `
        <h2>文本替换规则编辑</h2>
        <div class="scrollable-container">
            <div class="scrollable-content">
            </div>
        </div>
        <div class="button-pagination-container">
            <button id="prev-page" class="pagination-container button">上一页</button>
            <button id="add-rule">新增条目</button>
            <button id="next-page" class="pagination-container button">下一页</button>
        </div>
        <div class="editor-buttons-container">
            <button id="save-button">保存</button>
            <button id="close-button">关闭</button>
        </div>
         <div class="enable-switch-container" style="display:none;">  <!-- 隐藏 enable switch 容器 -->
            <span class="enable-switch-label">启用：</span>
            <label class="enable-switch">
                <input type="checkbox" id="global-enable-switch">
                <span class="enable-slider"></span>
            </label>
        </div>
    `;
    document.body.appendChild(replacementEditor);



    let timeoutId;

    // 点击事件 **绑定到容器**
    floatingBallContainer.addEventListener('click', function(e) {
        if (e.target === toggleIndicator) { // **点击的是指示器，切换开关**
            isReplacementEnabled = !isReplacementEnabled; // 切换状态
            GM_setValue(enabledKey, isReplacementEnabled); // 保存状态

            if (isReplacementEnabled) {
                toggleIndicator.classList.remove('off');
                toggleIndicator.classList.add('on');
                replacePage(); // 重新应用替换
            } else {
                toggleIndicator.classList.remove('on');
                toggleIndicator.classList.add('off');
                restoreOriginalPage(); // 恢复原始文本
            }
             startFadeTimer(); // 重新启动透明度计时器
        } else if (e.target === floatingBall || e.target === floatingBallContainer) { // **点击的是悬浮球主体或容器，显示菜单**
             clearTimeout(timeoutId);
            floatingBall.classList.remove('transparent');
            floatingBall.classList.add('rotating');

            // 判断 choiceModal 当前的显示状态
            if (choiceModal.classList.contains('show')) {
                // 如果菜单显示，则隐藏菜单
                choiceModal.classList.remove('show');
                choiceModal.classList.add('hide'); // 添加隐藏动画 class
                setTimeout(() => {
                    choiceModal.style.display = 'none';
                    choiceModal.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
                }, 300); // 等待动画结束后隐藏
            } else {
                // 如果菜单隐藏，则显示菜单 (保持原有逻辑)
                // 设置选择框位置前先显示，以便获取尺寸
                choiceModal.style.display = 'block';
                choiceModal.style.visibility = 'hidden'; // 隐藏，防止闪烁

                let ballRect = floatingBallContainer.getBoundingClientRect(); // 使用容器的位置
                let modalRect = choiceModal.getBoundingClientRect();
                let modalWidth = modalRect.width;
                let modalHeight = modalRect.height;
                let viewportWidth = window.innerWidth;
                let viewportHeight = window.innerHeight;
                let margin = 20; // 距离屏幕边缘的距离

                let modalLeft = ballRect.left + ballRect.width / 2 - modalWidth / 2; // 默认居中对齐
                let modalTop = ballRect.bottom + 10;

                // 水平边界检测和调整
                if (modalLeft < margin) {
                    modalLeft = margin;
                } else if (modalLeft + modalWidth > viewportWidth - margin) {
                    modalLeft = viewportWidth - modalWidth - margin;
                    modalLeft = Math.max(margin, viewportWidth - modalWidth - margin); // 确保 modalLeft 不小于 margin
                }


                 // 垂直边界检测和调整
                if (modalTop + modalHeight > viewportHeight - margin) {
                    modalTop = ballRect.top - modalHeight - 10; // 显示在悬浮球上方
                    if (modalTop < margin) { // 如果上方空间也不够，则贴近顶部
                        modalTop = margin;
                    }
                }

                choiceModal.style.left = modalLeft + 'px';
                choiceModal.style.top = modalTop + 'px';
                choiceModal.style.visibility = 'visible'; // 显示选择框

                 // 动画展开选择框
                choiceModal.classList.add('show');
            }


            setTimeout(() => {
                 floatingBall.classList.remove('rotating');
            }, 500);

            e.preventDefault();
        }
    });

     // 选择1事件: 显示文本替换编辑器 (保持不变)
    document.getElementById('choice-1').addEventListener('click', function(e) {
       choiceModal.classList.remove('show');
       choiceModal.classList.add('hide'); // 添加隐藏动画 class
        setTimeout(() => {
             choiceModal.style.display = 'none';
             choiceModal.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
        }, 300); // 等待动画结束后隐藏
      showReplacementEditor();
        e.preventDefault();
    });

    // 选择2事件: 隐藏悬浮球 (保持不变)
    document.getElementById('choice-2').addEventListener('click', function(e) {
        floatingBallContainer.style.display = 'none'; // 隐藏容器
        choiceModal.classList.remove('show');
        choiceModal.classList.add('hide'); // 添加隐藏动画 class
        setTimeout(() => {
          choiceModal.style.display = 'none';
          choiceModal.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
       }, 300); // 等待动画结束后隐藏
        e.preventDefault();
    });

   // 显示文本替换编辑器 (保持不变，移除暗色模式切换按钮相关代码)
    function showReplacementEditor() {
        replacementEditor.classList.remove('hide'); // 确保显示时没有隐藏动画 class
        replacementEditor.style.display = 'block'; // 显示编辑器

        const scrollableContent = replacementEditor.querySelector('.scrollable-content');
        scrollableContent.innerHTML = ''; // 清空之前的编辑器内容

        // 加载当前网站的替换表 (保持不变)
        replacementTable = GM_getValue(storageKey, {});
        const rulesPerPage = 10; // 每页显示规则数量
        let currentPage = 1; // 当前页码
        const totalRules = Object.keys(replacementTable).length;
        const totalPages = Math.ceil(totalRules / rulesPerPage) || 1; // 计算总页数，至少为1页

        // 分页显示规则 (保持不变)
        function displayPage(page) {
            scrollableContent.innerHTML = ''; // 清空内容
            currentPage = page; // 更新当前页码
            const startIndex = (currentPage - 1) * rulesPerPage;
            const endIndex = Math.min(startIndex + rulesPerPage, totalRules);
            let ruleIndex = 0; // 规则索引，用于在所有规则中定位

            for (const key in replacementTable) {
                if (ruleIndex >= startIndex && ruleIndex < endIndex) {
                    const replacementRow = document.createElement('div');
                    replacementRow.className = 'replacement-row';
                    // 原文输入框
                    const originalLabel = document.createElement('label');
                    originalLabel.textContent = '原文：';
                    replacementRow.appendChild(originalLabel);
                    const originalInput = document.createElement('input');
                    originalInput.value = key;
                    originalInput.placeholder = '请输入要替换的原文'; // Placeholder 提示
                    replacementRow.appendChild(originalInput);
                    // 替换文输入框
                    const translatedLabel = document.createElement('label');
                    translatedLabel.textContent = '替换：';
                    replacementRow.appendChild(translatedLabel);
                    const translatedInput = document.createElement('input');
                    translatedInput.value = replacementTable[key];
                    translatedInput.placeholder = '请输入替换后的文本'; // Placeholder 提示
                    replacementRow.appendChild(translatedInput);
                    // 删除按钮
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'X';
                    deleteButton.className = 'delete-button';
                    deleteButton.addEventListener('click', function () {
                        const originalKey = originalInput.value;
                        delete replacementTable[originalKey];
                        scrollableContent.removeChild(replacementRow);
                        updateReplacementTable();
                        replacePage();
                        // 重新计算总页数并更新分页按钮状态
                        const updatedTotalRules = Object.keys(replacementTable).length;
                        totalPages = Math.ceil(updatedTotalRules / rulesPerPage) || 1;
                        updatePaginationButtons();
                         // 如果删除后当前页没有规则且不是第一页，则显示上一页
                        if (scrollableContent.children.length === 0 && currentPage > 1) {
                            displayPage(currentPage - 1);
                        }
                    });
                    replacementRow.appendChild(deleteButton);

                    scrollableContent.appendChild(replacementRow);
                }
                ruleIndex++;
            }
            updatePaginationButtons(); // 更新分页按钮状态
        }


        // 上一页按钮 (保持不变)
        const prevPageButton = replacementEditor.querySelector('#prev-page');
        prevPageButton.addEventListener('click', function () {
            if (currentPage > 1) {
                displayPage(currentPage - 1);
            }
        });


        // 添加新增条目按钮 (保持不变)
        const addButton = replacementEditor.querySelector('#add-rule');
        addButton.addEventListener('click', function () {
            const replacementRow = document.createElement('div');
            replacementRow.className = 'replacement-row';
            // 原文输入框
            const originalLabel = document.createElement('label');
            originalLabel.textContent = '原文：';
            replacementRow.appendChild(originalLabel);
            const originalInput = document.createElement('input');
            originalInput.placeholder = '请输入要替换的原文'; // Placeholder 提示
            replacementRow.appendChild(originalInput);
            // 替换文输入框
            const translatedLabel = document.createElement('label');
            translatedLabel.textContent = '替换：';
            replacementRow.appendChild(translatedLabel);
            const translatedInput = document.createElement('input');
            translatedInput.placeholder = '请输入替换后的文本'; // Placeholder 提示
            replacementRow.appendChild(translatedInput);
            // 删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'X';
            deleteButton.className = 'delete-button';
            deleteButton.addEventListener('click', function () {
                scrollableContent.removeChild(replacementRow);
                updateReplacementTable();
                replacePage();
            });
            replacementRow.appendChild(deleteButton);
            scrollableContent.appendChild(replacementRow); // **改为 appendChild，添加到末尾**

             // 重新计算总页数并更新分页按钮状态 (新增条目后页数可能增加)
            const updatedTotalRules = Object.keys(replacementTable).length;
            totalPages = Math.ceil(updatedTotalRules / rulesPerPage) || 1;
            updatePaginationButtons();
            // 移除 displayPage(currentPage);  不再强制刷新当前页
        });


        // 下一页按钮 (保持不变)
        const nextPageButton = replacementEditor.querySelector('#next-page');
        nextPageButton.addEventListener('click', function () {
            if (currentPage < totalPages) {
                displayPage(currentPage + 1);
            }
        });


        // 更新分页按钮状态和页码显示 (保持不变)
        function updatePaginationButtons() {
            prevPageButton.disabled = currentPage <= 1;
            nextPageButton.disabled = currentPage >= totalPages;
        }


        // 保存按钮 (保持不变)
        const saveButton = replacementEditor.querySelector('#save-button');
        saveButton.addEventListener('click', function() {
            updateReplacementTable();//更新文本替换表
            GM_setValue(storageKey, replacementTable); // 保存到 GM_setValue，使用网站独立的 key
              replacementEditor.classList.add('hide'); // 添加隐藏动画 class
             setTimeout(() => {
                replacementEditor.style.display = 'none';
                replacementEditor.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
             }, 300); // 等待动画结束后隐藏
             startFadeTimer();
             if (isReplacementEnabled) {
                 replacePage();// 更新页面替换
             }
        });

        // 关闭按钮 (保持不变)
         const closeButton = replacementEditor.querySelector('#close-button');
         closeButton.addEventListener('click', function() {
              replacementEditor.classList.add('hide'); // 添加隐藏动画 class
             setTimeout(() => {
                replacementEditor.style.display = 'none';
                replacementEditor.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
             }, 300); // 等待动画结束后隐藏
              startFadeTimer();
        });


        displayPage(currentPage); // 初始显示第一页 (保持不变)
        updatePaginationButtons(); // 初始化分页按钮状态 (保持不变)
    }


    //更新文本替换表 (**BUG修复关键点：移除初始化 `replacementTable = {}`**)
    function updateReplacementTable() {
         // replacementTable = {}; // **移除此行，不再重新初始化，而是更新现有对象**
          replacementEditor.querySelectorAll('.replacement-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if(inputs.length === 2) { // 确保存在原文和替换文
                const originalText = inputs[0].value.trim();
                const translatedText = inputs[1].value.trim();
                if (originalText) { // 只有当原文本不为空才添加
                   replacementTable[originalText] = translatedText;
                 }
             }
          });
    }


    //启动透明计时器 (保持不变)
    function startFadeTimer() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(function() {
            floatingBall.classList.add('transparent');
        }, 1000);
    }

      // 替换文字功能 (修改：判断开关状态) (保持不变)
   function replaceText(node) {
        if (!isReplacementEnabled) {
            restoreSingleNode(node); // 如果关闭，恢复这个节点的原始文本
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            let textContent = node.textContent;
           let originalText = textContent;
             for (let key in replacementTable) {
                // 使用不区分大小写的正则表达式和全局匹配
                  const regex = new RegExp(escapeRegExp(key), 'gi');
                textContent = textContent.replace(regex, replacementTable[key]);
             }
            if(originalText !== textContent) {
                if (!originalTextMap.has(node)) {
                    originalTextMap.set(node, originalText); // 存储原始文本
                }
                node.textContent = textContent;
            }
        }
    }
     // 转义正则表达式特殊字符 (保持不变)
      function escapeRegExp(string) {
          return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       }
    // 遍历节点并替换文本 (修改：判断开关状态) (保持不变)
    function replaceNode(node) {
        if (!isReplacementEnabled) {
            restoreNode(node); // 关闭替换时恢复节点及其子节点的原始文本
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            replaceText(node);
        }else if(node.nodeType === Node.ELEMENT_NODE){
            for (let i = 0; i < node.childNodes.length; i++) {
              replaceNode(node.childNodes[i]);
           }
        }
    }

    // 恢复单个文本节点的原始文本
    function restoreSingleNode(node) {
        if (node.nodeType === Node.TEXT_NODE && originalTextMap.has(node)) {
            node.textContent = originalTextMap.get(node);
        }
    }

    // 递归恢复节点及其子节点的原始文本
    function restoreNode(node) {
         if (node.nodeType === Node.TEXT_NODE) {
            restoreSingleNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (let i = 0; i < node.childNodes.length; i++) {
                restoreNode(node.childNodes[i]);
            }
        }
    }


    // 恢复页面到原始状态 (修改为恢复所有已替换节点的文本)
    function restoreOriginalPage() {
        restoreNode(document.body); // 恢复整个 body 的原始文本
        console.log("文本替换已关闭，已恢复原始文本。");
    }


   // 页面加载完成时初始替换 (保持不变)
    function replacePage() {
        if (isReplacementEnabled) { // 只有在开关开启时才替换
            replaceNode(document.body);
        } else {
            restoreOriginalPage(); // 如果初始状态是关闭，则恢复
        }
    }


     // 使用 Set 保存已替换的节点，防止重复替换 (保持不变)


    // MutationObserver 监听动态内容 (保持不变)
     const observer = new MutationObserver(function(mutations) {
       if (!isReplacementEnabled) {
            // 如果总开关关闭，不再进行任何替换，但需要处理已添加的节点，确保在关闭状态下不应用任何替换
            return;
        }

       for(let mutation of mutations){
            if(mutation.type === 'childList'){
                for(let addedNode of mutation.addedNodes){
                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        if(!replacedNodes.has(addedNode)){
                          replaceNode(addedNode);
                      }
                   }
                    else if (addedNode.nodeType === Node.TEXT_NODE) {
                        if(!replacedNodes.has(addedNode)){
                             replaceText(addedNode);
                             replacedNodes.add(addedNode);
                        }
                    }
              }

            }
          else if (mutation.type === 'characterData'){
                if(!replacedNodes.has(mutation.target)){
                     replaceText(mutation.target);
                   replacedNodes.add(mutation.target);
                }
            }
        }
    });
     // 配置监听选项 (保持不变)
    const config = { childList: true, subtree: true, characterData: true };

    // 启动监听 (保持不变)
    observer.observe(document.body, config);

    startFadeTimer();


})();
