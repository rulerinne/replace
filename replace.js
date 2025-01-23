// ==UserScript==
// @name         动态文本替换悬浮球
// @namespace    http://yournamespace.com
// @version      3.1
// @description  在网页右上角显示一个美观的动态文本替换悬浮球，集成ON/OFF开关，点击悬浮球主体弹出菜单，绿灯ON，红灯OFF，修复分页BUG，优化手机端页面适配，紧凑横向规则显示，限制规则显示数量, 修复手机端悬浮窗超出屏幕边界BUG, 进一步优化手机端替换规则排布，极致紧凑横向显示, **新增：根据屏幕宽度自动切换电脑/手机样式**。
// @author       你的名字
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 获取当前网站的 hostname，用于区分不同网站的存储
    const hostname = window.location.hostname;
    const storageKey = `replacementTable_${hostname}`;
    const enabledKey = `replacementEnabled_${hostname}`; // 开关状态存储 key

    // 定义文本替换表,初始值从GM_getValue读取，如果没有则用默认值，每个网站独立存储
    let replacementTable = GM_getValue(storageKey, {});
    let isReplacementEnabled = GM_getValue(enabledKey, true); // 默认开启替换功能

    // 用于存储原始文本的 WeakMap，key 是 TextNode，value 是原始文本
    const originalTextMap = new WeakMap();
    const replacedNodes = new WeakSet(); // 保存已替换的节点，防止重复替换

    // 判断是否为手机屏幕 (宽度小于 768px 时认为是手机)
    const isMobileScreen = window.innerWidth <= 768;

    // 添加 CSS 样式 (美化版本 3.1 - 自动切换电脑/手机样式)
    GM_addStyle(`
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
            background-color: rgba(0, 0, 0, 0.4);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 24px;
            transition: opacity 0.3s ease-in-out, transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            position: relative;
            pointer-events: auto;
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
            background-color: #4CAF50;
            border: none;
        }
        #toggle-indicator.off {
            background-color: #f44336;
            border: none;
        }


        #choice-modal {
            position: fixed;
            z-index: 10000;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            padding: 15px 20px;
            border-radius: 12px;
            display: none;
            transform-origin: top center;
            opacity: 0;
            transform: scaleY(0.8);
            transition: transform 0.3s ease-out, opacity 0.3s ease-out;
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
             background-color: #f0f0f0;
             color: #333;
             font-size: 1em;
             transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          }
           #choice-modal button:hover {
             background-color: #e0e0e0;
             transform: scale(1.05);
             box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
         #replacement-editor {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 25px;
            z-index: 10001;
            display: none;
            max-height: 85vh;
            overflow-y: auto;
            width: 550px; /* **电脑端默认宽度** */
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            user-select: none;
            pointer-events: auto;
         }
         #replacement-editor.hide {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
            transition: opacity 0.3s ease-in, transform 0.3s ease-in;
         }
        #replacement-editor .replacement-row {
           display: flex;
           margin-bottom: 8px; /* **电脑端默认行间距** */
            align-items: center;
        }
        #replacement-editor label {
             margin-right: 4px; /* **电脑端默认 label 右边距** */
             flex-basis: 60px; /* **电脑端默认 label 宽度** */
             text-align: right;
             white-space: nowrap;
             color: #555;
             font-size: 0.9em; /* **电脑端默认 label 字体** */
             line-height: inherit; /* 移除 label 的 line-height 强制垂直居中 */
        }
        #replacement-editor input {
           flex-grow: 1;
           padding: 6px; /* **电脑端默认 input 内边距** */
           border: 1px solid #eee;
           border-radius: 6px; /* **电脑端默认 input 圆角** */
           font-size: 0.9em; /* **电脑端默认 input 字体** */
           color: #444;
           background-color: #fff;
           transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
           user-select: text !important;
           min-width: auto; /* 恢复 input 默认 min-width */
        }
         #replacement-editor input:focus {
             border-color: #ccc;
             box-shadow: 0 0 5px rgba(0, 0, 0, 0.08); /* 电脑端默认 focus 效果 */
             outline: none;
         }
          #replacement-editor button {
            padding: 8px 12px; /* **电脑端默认 button 内边距** */
             cursor: pointer;
             border: none;
             border-radius: 8px; /* **电脑端默认 button 圆角** */
             background-color: #f0f0f0;
              color: #333;
              font-size: 0.9em; /* **电脑端默认 button 字体** */
              transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          }
          #replacement-editor button:hover {
              background-color: #e0e0e0;
              transform: scale(1.03);
              box-shadow: 0 2px 4px rgba(0,0,0,0.08); /* 电脑端默认 hover 阴影 */
           }
            #replacement-editor .button-pagination-container {
               display: flex;
               justify-content: space-around;
               align-items: center;
               margin-top: 10px; /* **电脑端默认 上边距** */
               margin-bottom: 10px; /* **电脑端默认 下边距** */
            }
            #replacement-editor .button-pagination-container button{
              background-color: #e0e0e0;
                padding: 8px 12px; /* **电脑端默认 分页按钮内边距** */
             }
            #replacement-editor .button-pagination-container button:hover{
               background-color: #d0d0d0;
            }
           #replacement-editor .delete-button {
              background-color: #f44336;
              color: white;
             border-radius: 50%;
             padding: 3px 6px; /* **电脑端默认 删除按钮内边距** */
             border: none;
              margin-left: 4px; /* **电脑端默认 删除按钮 左边距** */
            cursor: pointer;
            font-size: 0.75em; /* **电脑端默认 删除按钮字体** */
            line-height: 1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2); /* 电脑端默认 删除按钮阴影 */
            transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
            }
            #replacement-editor .delete-button:hover{
                 background-color: #d32f2f;
                 transform: scale(1.1);
                 box-shadow: 0 3px 5px rgba(0,0,0,0.3); /* 电脑端默认 删除按钮 hover 阴影 */
            }
            #replacement-editor .scrollable-container {
               overflow-x: hidden;
              overflow-y: auto;
                max-height: 300px;
                padding-right: 8px; /* **电脑端默认 滚动容器右内边距** */
                border-radius: 12px; /* **电脑端默认 滚动容器圆角** */
            }
            #replacement-editor .scrollable-content {
               display: flex;
                flex-direction: column;
                padding-right: 8px; /* **电脑端默认 内容容器右内边距** */
                padding-bottom: 5px; /* **电脑端默认 内容容器下内边距** */
            }


        #replacement-editor .pagination-container button {
        }


        #replacement-editor .pagination-container button {
            margin: 0 4px; /* **电脑端默认 分页按钮 左右margin** */
            padding: 6px 10px; /* **电脑端默认 分页按钮 内边距** */
            border-radius: 6px; /* **电脑端默认 分页按钮圆角** */
            background-color: #f0f0f0;
            border: none;
            color: #555;
            font-size: 0.85em; /* **电脑端默认 分页按钮 字体** */
            transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
        }
         #replacement-editor .pagination-container button:hover {
             background-color: #e0e0e0;
             color: #333;
         }
        #replacement-editor .pagination-container button:disabled {
            opacity: 0.6;
            cursor: default;
            background-color: #f0f0f0;
            color: #999;
         }

       #replacement-editor .editor-buttons-container {
         display: flex;
         justify-content: center;
         gap: 10px; /* **电脑端默认 保存/关闭按钮 间距** */
         margin-top: 10px; /* **电脑端默认 上边距** */
         margin-bottom: 15px; /* **电脑端默认 下边距** */
       }
       #replacement-editor .editor-buttons-container button {
         display: inline-block;
         margin: 0;
         padding: 10px 16px; /* **电脑端默认 保存/关闭按钮 内边距** */
         border-radius: 10px; /* **电脑端默认 保存/关闭按钮圆角** */
         font-size: 0.9em; /* **电脑端默认 保存/关闭按钮 字体** */
         background-color: #e6e6e6;
         color: #333;
         border: none;
         transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
     }
      #replacement-editor .editor-buttons-container button:hover {
          background-color: #d0d0d0;
          transform: scale(1.02);
          box-shadow: 0 2px 4px rgba(0,0,0,0.08); /* 电脑端默认 保存/关闭按钮 hover 阴影 */
      }

      #replacement-editor .enable-switch-container {
         display: none;
         justify-content: flex-end;
         align-items: center;
         padding: 10px 20px;
         border-top: 1px solid #eee;
      }

      #replacement-editor .enable-switch-label {
         margin-right: 10px;
         color: #777;
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
          background-color: #ccc;
          transition: .4s;
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


       /* 滚动条美化 (Webkit based browsers) */
        #replacement-editor .scrollable-container::-webkit-scrollbar {
            width: 8px; /* **电脑端默认滚动条宽度** */
        }

        #replacement-editor .scrollable-container::-webkit-scrollbar-track {
            background-color: #f1f1f1;
            border-radius: 10px; /* **电脑端默认滚动条圆角** */
        }

        #replacement-editor .scrollable-container::-webkit-scrollbar-thumb {
            background-color: #ccc;
            border-radius: 10px; /* **电脑端默认滚动条滑块圆角** */
        }

        #replacement-editor .scrollable-container::-webkit-scrollbar-thumb:hover {
            background-color: #aaa;
        }

        /* 媒体查询，针对小屏幕设备（例如手机） */
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
                position: fixed; /* 确保 fixed 定位 */
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%); /* 居中定位 */
                width: 95%; /* 宽度占据屏幕 95% */
                max-width: 320px; /* **手机端更窄编辑器最大宽度** */
                max-height: 80vh; /* 高度略微增加 */
                padding: 10px; /* **手机端极小 编辑器 padding** */
                font-size: 0.85em; /* 手机端编辑器字体稍微缩小 */
            }
            #replacement-editor .replacement-row {
                flex-direction: row;
                align-items: center;
                margin-bottom: 2px; /* **手机端极小行间距** */
            }
            #replacement-editor label {
                text-align: right;
                margin-bottom: 0;
                flex-basis: 30px; /* **手机端极小 label 宽度** */
                font-size: 0.75em; /* **手机端极小 label 字体** */
                margin-right: 1px; /* **手机端极小 label 右边距** */
                line-height: 1; /* 垂直居中 label 文本 */
            }
            #replacement-editor input {
                padding: 2px 3px; /* **手机端极小 input 内边距** */
                font-size: 0.75em; /* **手机端极小 input 字体** */
                margin-bottom: 0;
                border-radius: 3px; /* **手机端极小 input 圆角** */
            }
            #replacement-editor button,
            #replacement-editor .button-pagination-container button,
            #replacement-editor .editor-buttons-container button,
            #replacement-editor .pagination-container button {
                padding: 4px 6px;
                font-size: 0.75em; /* **手机端极小 按钮字体** */
                margin: 1px; /* **手机端极小 按钮 margin** */
                border-radius: 5px; /* **手机端极小 按钮圆角** */
            }
            #replacement-editor .delete-button {
                padding: 1px 2px; /* **手机端极小 删除按钮内边距** */
                font-size: 0.55em; /* **手机端极小 删除按钮字体** */
                margin-left: 1px; /* **手机端极小 删除按钮左边距** */
            }
            #replacement-editor .scrollable-container {
                padding-right: 4px; /* **手机端极小 滚动容器右内边距** */
                border-radius: 8px; /* **手机端极小 滚动容器圆角** */
            }
        }


    `);
    // ... (JavaScript 代码部分保持不变，与 v3.0 版本一致)
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


    // 创建选择窗口元素 (保持不变)
    let choiceModal = document.createElement('div');
    choiceModal.id = 'choice-modal';
    choiceModal.innerHTML = `
        <p>请选择操作:</p>
        <button id="choice-1">显示替换</button>
        <button id="choice-2">隐藏悬浮球</button>
    `;
    document.body.appendChild(choiceModal);

    //创建文本替换编辑窗口 (保持不变)
    let replacementEditor = document.createElement('div');
    replacementEditor.id = 'replacement-editor';
    replacementEditor.style.display = 'none'; // 初始化隐藏
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

   // 显示文本替换编辑器 (保持不变)
    function showReplacementEditor() {
        replacementEditor.innerHTML = ''; // 清空之前的编辑器内容
        replacementEditor.classList.remove('hide'); // 确保显示时没有隐藏动画 class

        // 创建滑动容器 (保持不变)
        const scrollableContainer = document.createElement('div');
        scrollableContainer.className = 'scrollable-container';
        replacementEditor.appendChild(scrollableContainer); // 先将滑动容器添加到编辑器

        const scrollableContent = document.createElement('div');
        scrollableContent.className = 'scrollable-content';
        scrollableContainer.appendChild(scrollableContent); // 然后将内容容器添加到滑动容器


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
                    replacementRow.appendChild(originalInput);
                    // 替换文输入框
                    const translatedLabel = document.createElement('label');
                    translatedLabel.textContent = '替换：';
                    replacementRow.appendChild(translatedLabel);
                    const translatedInput = document.createElement('input');
                    translatedInput.value = replacementTable[key];
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


        // 创建 按钮和分页 容器 (保持不变)
        const buttonPaginationContainer = document.createElement('div');
        buttonPaginationContainer.className = 'button-pagination-container';
        replacementEditor.appendChild(buttonPaginationContainer);

        // 上一页按钮 (保持不变)
        const prevPageButton = document.createElement('button');
        prevPageButton.innerText = '上一页';
        prevPageButton.className = 'pagination-container button'; // 添加 pagination-container 类，保持样式一致
        prevPageButton.addEventListener('click', function () {
            if (currentPage > 1) {
                displayPage(currentPage - 1);
            }
        });
        buttonPaginationContainer.appendChild(prevPageButton);


        // 添加新增条目按钮 (保持不变)
        let addButton = document.createElement('button');
        addButton.innerText = '新增条目';
        buttonPaginationContainer.appendChild(addButton);

        addButton.addEventListener('click', function () {
            const replacementRow = document.createElement('div');
            replacementRow.className = 'replacement-row';
            // 原文输入框
            const originalLabel = document.createElement('label');
            originalLabel.textContent = '原文：';
            replacementRow.appendChild(originalLabel);
            const originalInput = document.createElement('input');
            replacementRow.appendChild(originalInput);
            // 替换文输入框
            const translatedLabel = document.createElement('label');
            translatedLabel.textContent = '替换：';
            replacementRow.appendChild(translatedLabel);
            const translatedInput = document.createElement('input');
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
        const nextPageButton = document.createElement('button');
        nextPageButton.innerText = '下一页';
        nextPageButton.className = 'pagination-container button'; // 添加 pagination-container 类，保持样式一致
        nextPageButton.addEventListener('click', function () {
            if (currentPage < totalPages) {
                displayPage(currentPage + 1);
            }
        });
        buttonPaginationContainer.appendChild(nextPageButton);


        // 更新分页按钮状态和页码显示 (保持不变)
        function updatePaginationButtons() {
            prevPageButton.disabled = currentPage <= 1;
            nextPageButton.disabled = currentPage >= totalPages;
        }


        // 创建保存/关闭按钮容器 (保持不变)
        const editorButtonsContainer = document.createElement('div');
        editorButtonsContainer.className = 'editor-buttons-container';
        replacementEditor.appendChild(editorButtonsContainer);

        // 添加保存按钮 (放到容器中) (保持不变)
        let saveButton = document.createElement('button');
        saveButton.innerText = '保存';
        editorButtonsContainer.appendChild(saveButton);

        // 添加关闭按钮 (放到容器中) (保持不变)
        let closeButton = document.createElement('button');
        closeButton.innerText = '关闭';
        editorButtonsContainer.appendChild(closeButton);


        //为保存按钮添加事件监听 (修改保存逻辑，使用网站独立的 storageKey) (**关键修复点**)
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

        //为关闭按钮添加事件监听 (保持不变)
         closeButton.addEventListener('click', function() {
              replacementEditor.classList.add('hide'); // 添加隐藏动画 class
             setTimeout(() => {
                replacementEditor.style.display: none;
                replacementEditor.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
             }, 300); // 等待动画结束后隐藏
              startFadeTimer();
        });


        displayPage(currentPage); // 初始显示第一页 (保持不变)
        updatePaginationButtons(); // 初始化分页按钮状态 (保持不变)
        replacementEditor.style.display = 'block'; // 显示编辑器 (保持不变)
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

     replacePage();// 启动替换

     // 使用 Set 保存已替换的节点，防止重复替换 (保持不变)


    // MutationObserver 监听动态内容 (保持不变)
     const observer = new MutationObserver(function(mutations) {
       if (!isReplacementEnabled) {
            // 如果总开关关闭，不再进行任何替换，但需要处理已添加的节点，确保在关闭状态下不应用替换
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
