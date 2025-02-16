// ==UserScript==
// @name         动态文本替换悬浮球
// @namespace    http://yournamespace.com
// @version      4.4m
// @description  在网页右上角显示一个美观的动态文本替换悬浮球，集成ON/OFF开关，点击悬浮球主体弹出菜单，绿灯ON，红灯OFF，修复分页BUG，优化手机端页面适配，紧凑横向规则显示，限制规则显示数量, 修复手机端悬浮窗超出屏幕边界BUG, 进一步优化手机端替换规则排布，极致紧凑横向显示，解决超出遮挡问题, 新增分辨率自适应样式，电脑端显示更清晰, 解决刷新页面时原文闪烁问题, 优化悬浮球点击行为，再次点击可收回菜单, 默认深色模式，界面更简洁, 优化移动端字体颜色，提升桌面端美观度, 修复新增条目 BUG，界面更紧凑, 新增半透明模糊悬浮窗和按钮效果，更美观, 再次修复新增条目 BUG (v3.8 Bugfix), 美化删除按钮样式为半透明黑色按钮, 全局字体颜色更新为浅色白色系 (v3.9 Font Update), 新增右键选中文本快速替换功能 (v4.0 New Feature), 修复新增条目报错，增强动画效果，美化按钮样式 (v4.1 Animation & Button Update), 新增右键替换开关，可禁用默认右键菜单 (v4.2 Toggle Switch Feature), 全面增强弹出窗口和按钮动画效果 (v4.3 Animation Overhaul), 美化滑动条，调整输入框宽度，固定编辑器窗口大小 (v4.4 UI Refinements), 修复匹配不严格问题，实现全词严格匹配 (v4.4c Strict Matching Fix), 添加 null 检查，增强代码健壮性，尝试解决 `nodeType` is null 错误 (v4.4d Null Check), 在文本替换规则编辑界面右下角新增右键替换开关 (v4.4e Editor Switch), 全面适配手机端网页浏览，优化悬浮窗显示 (v4.4f Mobile Adaption), 手机端规则条目极致紧凑排版优化 (v4.4g Mobile Layout Refine), 手机端极致紧凑横向排版再优化，修复悬浮球不显示和 appendChild 错误 (v4.4j Mobile Layout & Bugfix), 手机端字体和排版优化，彻底修复分页 BUG (v4.4k Mobile Font & Pagination Fix), **电脑端恢复显示右键开关 & 手机端隐藏 (v4.4l Switch Display Platform Fix), 电脑端恢复显示右键开关 & 手机端隐藏 (v4.4m Switch Display Platform Fix)**.
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

    // v4.2 新增：右键替换开关状态
    let isQuickReplaceEnabled = GM_getValue('quickReplaceEnabled', true); // 默认开启右键替换

    // 用于存储原始文本的 WeakMap，key 是 TextNode，value 是原始文本
    const originalTextMap = new WeakMap();
    const replacedNodes = new WeakSet(); // 保存已替换的节点，防止重复替换

    // 立即执行页面替换，防止原文闪烁 (在添加样式和创建元素之前执行)
    replacePage();

    // v4.1 提升作用域：分页相关变量提升到全局作用域
    const rulesPerPage = 10; // 每页显示规则数量
    let currentPage = 1; // 当前页码
    let totalPages = 1; // 总页数，初始值设为1

    // 定义 CSS 变量和样式 (美化版本 4.4b - 按钮固定底部)
    const styles = `
        :root {
            /* Dark Mode 默认主题色 - 全局浅色字体调整 */
            --bg-color: #121212;
            --modal-bg-color: rgba(34, 34, 34, 0.7);
            --button-bg-color: rgba(51, 51, 51, 0.6);
            --text-color: #f0f0f0;
            --text-color-light: #ddd;
            --text-color-lighter: #eee;
            --border-color: #555;
            --hover-bg-color: #444;
            --button-hover-bg-color: var(--hover-bg-color);
            --button-active-bg-color: #555;
            --button-text-color: var(--text-color);
            --button-delete-bg-color: #f44336;
            --button-delete-hover-bg-color: #d32f2f;
            --scroll-track-color: #333;
            --scroll-thumb-color: #666;
            --scroll-thumb-hover-color: #888;
            --floating-ball-bg-color: rgba(255, 255, 255, 0.3);
            --floating-ball-text-color: #333;
            --toggle-indicator-on-color: #69F0AE;
            --toggle-indicator-off-color: #FF5252;
            --quick-replace-toggle-on-color: #69F0AE;
            --quick-replace-toggle-off-color: #FF5252;

            /* v4.3 Animation Variables */
            --modal-transition-duration: 0.25s;
            --modal-transition-easing: cubic-bezier(0.175, 0.885, 0.32, 1.275);
            --button-transition-duration: 0.2s;
            --button-transition-easing: cubic-bezier(0.175, 0.885, 0.32, 1.15);

            --base-font-size: 0.9em; /* v4.4i 电脑端基础字体大小 */
        }

        body {
            font-size: var(--base-font-size);
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
            transition: opacity 0.3s ease-in-out, transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), background-color 0.2s ease-in-out;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            position: relative;
            pointer-events: auto;
        }
        #floating-ball:hover {
            background-color: rgba(255, 255, 255, 0.5);
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
            background-color: var(--modal-bg-color); /* 使用半透明背景色 */
            color: var(--text-color); /*  全局文本颜色  */
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            padding: 12px 16px;
            border-radius: 10px;
            display: none;
            transform-origin: top center;
            opacity: 0;
            transform: scaleY(0.8);
            transition: transform var(--modal-transition-duration) var(--modal-transition-easing), opacity var(--modal-transition-duration) ease-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, color 0.3s ease-in-out; /* v4.3 使用统一定义的动画变量 */
            user-select: none;
             pointer-events: auto;
             backdrop-filter: blur(8px); /* 添加模糊效果 */
             -webkit-backdrop-filter: blur(8px); /* 兼容旧版 Safari */
        }

        #choice-modal.show {
            opacity: 1;
            transform: scaleY(1);
            display: block;
        }
        #choice-modal.hide {
            opacity: 0;
            transform: scaleY(0.8);
            transition: transform 0.2s ease-in, opacity 0.2s ease-in; /* v4.3 Exit 动画时间缩短 */
        }

          #choice-modal button {
             margin: 5px 6px;
             padding: 8px 12px;
             cursor: pointer;
             border: none;
             border-radius: 8px;
             background-color: var(--button-bg-color); /* 使用半透明背景色 */
             color: var(--button-text-color); /* 按钮文字颜色，使用 --button-text-color */
             font-size: 0.9em;
             transition: background-color var(--button-transition-duration) ease-in-out, transform var(--button-transition-duration) var(--button-transition-easing), box-shadow var(--button-transition-duration) ease-in-out, color var(--button-transition-duration) ease-in-out; /* v4.3 使用统一定义的动画变量 */
          }
           #choice-modal button:hover {
             background-color: var(--button-hover-bg-color);
             transform: scale(1.06); /* v4.3 Hover 放大比例略微增加 */
             box-shadow: 0 3px 8px rgba(0,0,0,0.15); /* v4.3 Hover 阴影更明显 */
          }
          #choice-modal button:active {
             background-color: var(--button-active-bg-color); /* v4.3 点击反馈 */
             transform: scale(0.97); /* v4.3 Active 缩小比例略微增加 */
             box-shadow: inset 0 2px 6px rgba(0,0,0,0.2); /* v4.3 Active 内阴影更明显 */
          }
         #replacement-editor {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: var(--modal-bg-color); /* 使用半透明背景色 */
            color: var(--text-color); /*  全局文本颜色  */
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 20px;
            z-index: 10001;
            display: none;
            height: 600px; /* v4.4  固定高度 */
            overflow-y: auto; /* v4.4  启用垂直滚动 */
            width: 520px;
            border-radius: 14px;
            display: flex;
            flex-direction: column;
            user-select: none;
            pointer-events: auto;
             opacity: 0; /* v4.3 初始化透明度为0，为了动画 */
            transform: translate(-50%, -50%) scale(0.9); /* v4.3 初始化缩小 */
            transition: transform var(--modal-transition-duration) var(--modal-transition-easing), opacity var(--modal-transition-duration) ease-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, color 0.3s ease-in-out, backdrop-filter 0.3s ease-out, -webkit-backdrop-filter 0.3s ease-out; /* v4.3 使用统一定义的动画变量, 添加 backdrop-filter 动画 */
             backdrop-filter: blur(10px); /* 添加模糊效果，程度稍强 */
             -webkit-backdrop-filter: blur(10px); /* 兼容旧版 Safari */
         }
         #replacement-editor.show { /* v4.3  show class 动画 */
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            display: flex; /* 确保显示 */
         }
         #replacement-editor.hide { /* v4.3 hide class */
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
            transition: opacity 0.2s ease-in, transform 0.2s ease-in; /* v4.3 Exit 动画时间缩短 */
         }
         #replacement-editor h2 {
            text-align: center;
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 1.1em;
            color: var(--text-color-light); /*  辅助文本颜色  */
         }
        #replacement-editor .replacement-row {
           display: flex;
           margin-bottom: 6px;
            align-items: baseline;
            flex-direction: row; /* v4.4h 恢复 flex-direction: row (电脑端默认横向排版) */
        }
        #replacement-editor label {
             margin-right: 4px; /* v4.4h 恢复 margin-right: 4px (电脑端默认 label 样式) */
             flex-basis: 50px; /* v4.4h 恢复 flex-basis: 50px (电脑端默认 label 宽度) */
             text-align: right; /* v4.4h 恢复 text-align: right (电脑端默认 label 右对齐) */
             white-space: nowrap; /* v4.4h 恢复 white-space: nowrap (电脑端默认 label 不换行) */
             color: var(--text-color-light); /*  辅助文本颜色  */
             font-size: 0.85em; /* v4.4h 恢复 font-size: 0.85em (电脑端默认 label 字体大小) */
             line-height: 1.4; /* v4.4h 恢复 line-height: 1.4 */
        }
        #replacement-editor input {
           flex-grow: 0; /* v4.4  取消 flex-grow */
           width: 180px; /* v4.4  固定宽度 */
           padding: 6px; /* v4.4h 恢复 padding: 6px (电脑端默认 input padding) */
           border: 1px solid var(--border-color);
           border-radius: 6px; /* v4.4h 恢复 border-radius: 6px */
           font-size: 0.85em; /* v4.4h 恢复 font-size: 0.85em (电脑端默认 input 字体大小) */
           color: var(--text-color); /*  全局文本颜色，输入框文字  */
           background-color: #444;
           transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, color 0.2s ease-in-out, background-color 0.2s ease-in-out;
           user-select: text !important;
           min-width: auto;
        }

        #replacement-editor input::placeholder { /*  输入框 placeholder 颜色  */
            color: var(--text-color-light); /*  辅助文本颜色，placeholder  */
        }


         #replacement-editor input:focus {
             border-color: #ccc;
             box-shadow: 0 0 5px rgba(0, 0, 0, 0.08);
             outline: none;
         }
          #replacement-editor button,
          #replacement-editor .button-pagination-container button,
          #choice-modal button,
          #quick-replace-modal button { /* v4.1 包含 quick-replace-modal button */
            padding: 7px 10px; /* v4.4h 恢复 padding: 7px 10px (电脑端默认按钮 padding) */
             cursor: pointer;
             border: none;
             border-radius: 8px; /* v4.4h 恢复 border-radius: 8px */
             background-color: var(--button-bg-color); /* 使用半透明背景色 */
              color: var(--button-text-color); /* 按钮文字颜色，使用 --button-text-color */
              font-size: 0.9em; /* v4.4h 恢复 font-size: 0.9em (电脑端默认按钮字体大小) */
              transition: background-color var(--button-transition-duration) ease-in-out, transform var(--button-transition-duration) var(--button-transition-easing), box-shadow var(--button-transition-duration) ease-in-out, color var(--button-transition-duration) ease-in-out; /* v4.3 使用统一定义的动画变量 */
          }
          #replacement-editor button:hover,
          #replacement-editor .button-pagination-container button:hover,
          #choice-modal button:hover,
          #quick-replace-modal button:hover { /* v4.1 包含 quick-replace-modal button */
              background-color: var(--button-hover-bg-color);
              transform: scale(1.06); /* v4.3 Hover 放大比例略微增加 */
              box-shadow: 0 3px 8px rgba(0,0,0,0.15); /* v4.3 Hover 阴影更明显 */
           }
          #replacement-editor button:active,
          #replacement-editor .button-pagination-container button:active,
          #choice-modal button:active,
          #quick-replace-modal button:active { /* v4.1 包含 quick-replace-modal button */
             background-color: var(--button-active-bg-color); /* v4.3 点击反馈 */
             transform: scale(0.97); /* v4.3 Active 缩小比例略微增加 */
             box-shadow: inset 0 2px 6px rgba(0,0,0,0.2); /* v4.3 Active 内阴影更明显 */
          }
            #replacement-editor .button-pagination-container {
               display: flex;
               justify-content: space-around;
               align-items: center;
               padding-top: 10px; /* v4.4b 添加 padding-top */
               padding-bottom: 10px; /* v4.4b 添加 padding-bottom */
               position: absolute; /* v4.4b  绝对定位 */
               bottom: 0; /* v4.4b  底部对齐 */
               left: 0;  /* v4.4b  左对齐 */
               width: 100%; /* v4.4b  宽度 100% */
               background-color: var(--modal-bg-color); /* v4.4b  确保背景色一致 */
               border-top: 1px solid var(--border-color); /* v4.4b  添加顶部分割线 */
           }
            #replacement-editor .editor-buttons-container {
               display: flex;
               justify-content: center;
               gap: 12px; /* v4.4h 恢复 gap: 12px (电脑端默认按钮间距) */
               padding-bottom: 15px; /* v4.4b  保留 padding-bottom */
                position: absolute; /* v4.4b  绝对定位 */
               bottom: 50px; /* v4.4b  定位在分页按钮上方 */
               left: 0;  /* v4.4b  左对齐 */
               width: 100%; /* v4.4b  宽度 100% */
                background-color: var(--modal-bg-color); /* v4.4b  确保背景色一致 */
            }


           /*  新的增强删除按钮样式  */
           #replacement-editor .delete-button-enhanced {
              background-color: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
              color: var(--text-color); /*  全局文本颜色，删除按钮文字  */
             border-radius: 8px; /* v4.4h 恢复 border-radius: 8px */
             padding: 6px 10px; /* v4.4h 恢复 padding: 6px 10px (电脑端默认删除按钮 padding) */
             border: none; /*  无边框  */
              margin-left: auto; /*  推到右侧  */
            cursor: pointer;
            font-size: 0.8em; /* v4.4h 恢复 font-size: 0.8em (电脑端默认删除按钮字体大小) */
            line-height: 1;
            transition: background-color var(--button-transition-duration) ease-in-out, transform var(--button-transition-duration) var(--button-transition-easing), box-shadow var(--button-transition-duration) ease-in-out, color var(--button-transition-duration) ease-in-out; /* v4.3 使用统一定义的动画变量 */
            display: flex; /* 弹性布局 */
            align-items: center; /* 垂直居中 */
            justify-content: center; /* 水平居中 */
            width: 24px; /*  固定宽度  v4.4h 恢复 width: 24px (电脑端默认删除按钮宽度) */
            height: 24px; /*  固定高度  v4.4h 恢复 height: 24px (电脑端默认删除按钮高度) */
           }
            #replacement-editor .delete-button-enhanced:hover{
                 background-color: rgba(0, 0, 0, 0.7); /* Hover 时稍微加深背景 */
                 transform: scale(1.06); /* v4.3 Hover 放大比例略微增加 */
                 box-shadow: 0 3px 8px rgba(0,0,0,0.3); /* v4.3 Hover 阴影更明显 */
            }
            #replacement-editor .delete-button-enhanced:active{ /* v4.3 点击反馈 */
                 background-color: rgba(0, 0, 0, 0.8); /* v4.3 点击反馈 */
                 transform: scale(0.96); /* v4.3 Active 缩小比例略微增加 */
                 box-shadow: inset 0 3px 6px rgba(0,0,0,0.4); /* v4.3 Active 内阴影更明显 */
            }


            #replacement-editor .scrollable-container {
               overflow-x: hidden;
              overflow-y: auto;
                max-height: calc(100% - 100px); /* v4.4b  调整 scrollable-container 最大高度，留出底部按钮空间 (假设 pagination-container + editor-buttons-container 高度共 100px) */
                padding-right: 8px; /* v4.4h 恢复 padding-right: 8px (电脑端默认滚动容器 padding) */
                border-radius: 10px; /* v4.4h 恢复 border-radius: 10px */
                transition: background-color 0.3s ease-in-out;
                 background-color: transparent;
                 padding-bottom: 60px; /* v4.4b  增加 padding-bottom，防止内容被固定按钮遮挡 */
            }
            #replacement-editor .scrollable-content {
               display: flex;
                flex-direction: column;
                padding-right: 8px; /* v4.4h 恢复 padding-right: 8px (电脑端默认内容滚动区域 padding) */
                padding-bottom: 6px; /* v4.4h 恢复 padding-bottom: 6px */
            }


        #replacement-editor .pagination-container button {
        }


        #replacement-editor .pagination-container button {
            margin: 0 5px; /* v4.4h 恢复 margin: 0 5px (电脑端默认分页按钮 margin) */
            padding: 6px 9px; /* v4.4h 恢复 padding: 6px 9px (电脑端默认分页按钮 padding) */
            border-radius: 6px;
            background-color: var(--button-bg-color); /* 使用半透明背景色 */
            border: none;
            color: var(--text-color-light); /*  辅助文本颜色，分页按钮文字  */
            font-size: 0.8em; /* v4.4h 恢复 font-size: 0.8em (电脑端默认分页按钮字体大小) */
            transition: background-color var(--button-transition-duration) ease-in-out, color var(--button-transition-duration) ease-in-out, transform var(--button-transition-duration) var(--button-transition-easing), color var(--button-transition-duration) ease-in-out; /* v4.3 使用统一定义的动画变量 */
        }
         #replacement-editor .pagination-container button:hover {
             background-color: var(--button-hover-bg-color);
             color: var(--button-text-color); /* 按钮文字颜色，使用 --button-text-color */
         }
        #replacement-editor .pagination-container button:disabled {
            opacity: 0.6;
            cursor: default;
            background-color: var(--button-bg-color); /* 使用半透明背景色 */
            color: var(--text-color-lighter); /*  更辅助文本颜色，禁用分页按钮文字  */
         }


       /* 快速替换模态框样式 - 电脑端样式保持不变 */
        #quick-replace-modal {
            position: fixed;
            z-index: 10002; /* 比 #replacement-editor 更高 */
            background-color: var(--modal-bg-color); /* 使用半透明背景色 */
            color: var(--text-color);
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 15px 20px;
            border-radius: 12px;
            display: none; /* 初始隐藏 */
            min-width: 280px;
            max-width: 400px;
            opacity: 0; /* v4.1 初始化透明度为0 */
            transform: scale(0.9); /* v4.1 初始化缩小 */
            transition: transform var(--modal-transition-duration) var(--modal-transition-easing), opacity var(--modal-transition-duration) ease-out, backdrop-filter var(--modal-transition-duration) ease-out, -webkit-backdrop-filter var(--modal-transition-duration) ease-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, color 0.3s ease-in-out; /* v4.3 使用统一定义的动画变量, 添加 backdrop-filter 动画 */
            backdrop-filter: blur(10px); /* 添加模糊效果 */
            -webkit-backdrop-filter: blur(10px); /* 兼容旧版 Safari */
        }
        #quick-replace-modal.show { /* v4.1 show class */
            opacity: 1;
            transform: scale(1);
            display: block; /* 确保显示 */
        }
        #quick-replace-modal.hide { /* v4.1 hide class */
            opacity: 0;
            transform: scale(0.9);
            transition: transform 0.2s ease-in, opacity 0.2s ease-in; /* v4.3 Exit 动画时间缩短 */
        }


        #quick-replace-modal h2 {
            text-align: center;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.1em;
            color: var(--text-color-light);
        }
        #quick-replace-modal input {
            width: calc(100% - 12px); /* 考虑 padding */
            padding: 8px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-size: 0.9em;
            color: var(--text-color);
            background-color: #444;
            margin-bottom: 15px;
        }
        #quick-replace-modal .editor-buttons-container { /* 复用按钮容器样式 */
            margin-top: 0;
            margin-bottom: 0;
        }
        #quick-replace-modal button { /* 复用按钮样式 */
             padding: 9px 14px;
             font-size: 0.9em;
             transition: background-color var(--button-transition-duration) ease-in-out, transform var(--button-transition-duration) var(--button-transition-easing), box-shadow var(--button-transition-duration) ease-in-out, color var(--button-transition-duration) ease-in-out; /* v4.3 使用统一定义的动画变量 */
          }


        /* 媒体查询，针对小屏幕设备（例如手机） - 保持极致紧凑样式 */
        @media (max-width: 768px) {
            :root {
                --base-font-size: 0.9em; /* v4.4k 手机端基础字体大小 增大 */
            }
            #replacement-editor { /* v4.4f 移动端编辑器窗口整体样式调整 */
                width: 90%; /* v4.4f 百分比宽度 */
                max-width: 360px; /* v4.4f 最大宽度限制 */
                padding: 10px; /* v4.4h 极致紧凑 padding */
                font-size: 0.9em; /* v4.4h 极致紧凑字体 */
             }
             #replacement-editor h2 { /* v4.4f 移动端标题字体大小 */
                 font-size: 1.1em; /* v4.4h 更小标题字体 */
                 margin-bottom: 8px; /* v4.4h 标题 margin-bottom 减小 */
             }
             #replacement-editor label { /* v4.4f 移动端 label 字体大小 */
                 font-size: 0.85em; /* v4.4h 极致紧凑字体 */
                 margin-bottom: 0; /* v4.4h label margin-bottom 移除 */
                 margin-right: 2px; /* v4.4j  增加 label margin-right */
             }
             #replacement-editor input { /* v4.4f 移动端 input 字体和 padding */
                 font-size: 0.85em; /* v4.4h 极致紧凑字体 */
                 padding: 3px; /* v4.4h 极致紧凑 padding */
                 border-radius: 4px; /* v4.4h 更小圆角 */
                 margin-bottom: 0; /* v4.4h input margin-bottom 移除 */
                 width: 100px; /* v4.4j  进一步减小输入框宽度 */
             }
             #replacement-editor button, /* v4.4f 移动端 按钮字体和 padding */
             #replacement-editor .button-pagination-container button,
             #replacement-editor .editor-buttons-container button,
             #replacement-editor .pagination-container button,
             #quick-replace-modal button {
                 padding: 4px 6px; /* v4.4h 极致紧凑 padding */
                 font-size: 0.75em; /* v4.4h 极致紧凑字体 */
                 border-radius: 4px; /* v4.4h 更小圆角 */
                 margin: 0; /* v4.4h 移除 margin */
             }
             #replacement-editor .editor-buttons-container { /* v4.4f 移动端 编辑按钮容器 margin-bottom 减小 */
                 padding-bottom: 8px; /* v4.4h padding-bottom 减小 */
                 gap: 6px; /* v4.4j 按钮间距进一步减小 */
             }
             #replacement-editor .button-pagination-container { /* v4.4f 移动端 分页按钮容器 padding 减小 */
                 padding-top: 4px; /* v4.4j padding-top 进一步减小 */
                 padding-bottom: 4px; /* v4.4j padding-bottom 进一步减小 */
                  margin: 0; /* v4.4h 移除 margin */
             }
             #quick-replace-modal { /* v4.4f 移动端 快速替换 modal 样式 */
                 padding: 10px 15px; /* v4.4f 极致紧凑 padding */
             }
             #quick-replace-modal h2 { /* v4.4f 移动端 快速替换 modal 标题字体大小 */
                 margin-bottom: 8px; /* v4.4h margin-bottom 减小 */
             }
             #quick-replace-modal input { /* v4.4f 移动端 快速替换 modal 输入框 margin-bottom 减小 */
                 margin-bottom: 10px;
                 padding: 6px; /* v4.4h padding 减小 */
                 border-radius: 6px; /* v4.4h 更小圆角 */
             }
             #replacement-editor .replacement-row { /* v4.4g 移动端 replacement-row 增加 padding-right 留出删除按钮空间 */
                 padding-right: 20px; /* v4.4h padding-right 进一步减小 */
                 margin-bottom: 4px; /* v4.4j 进一步减小 replacement-row 的 margin-bottom */
                 flex-direction: row; /* v4.4j 恢复横向排版 */
                 align-items: baseline; /* v4.4j 恢复 baseline 对齐 */
                 display: flex; /* v4.4j 恢复 flex 布局 */
            }
             #replacement-editor label {
                 flex-basis: 30px; /* v4.4j  进一步减小 label 宽度 */
                 text-align: right; /* v4.4g label 左对齐 */
                 white-space: nowrap; /* v4.4g 允许 label 文本换行 */
                 margin-right: 2px; /* v4.4j  增加 label margin-right */
             }
             #replacement-editor input {
                  width: 100px; /* v4.4j  进一步减小输入框宽度 */
                  flex-grow: 1; /* v4.4j  输入框 flex-grow: 1, 占据剩余空间 */
             }
             #replacement-editor .delete-button-enhanced { /* v4.4g 移动端 delete-button 字体和尺寸进一步减小 */
                 font-size: 0.6em; /* v4.4h 极小字体 */
                 width: 20px; /*  固定宽度  v4.4j 调整删除按钮宽度为 20px */
                 height: 20px; /*  固定高度  v4.4j 调整删除按钮高度为 20px */
                 border-radius: 4px; /* v4.4j 更小圆角 */
                 position: absolute; /* v4.4g 移除绝对定位 */
                 top: 50%; /* v4.4j 垂直居中 */
                 right: 0; /* v4.4j  右对齐 */
                 transform: translateY(-50%); /* v4.4j 垂直居中微调 */
                 margin-left: 0; /* v4.4g 恢复 margin-left: auto; */
             }
             #replacement-editor #editor-quick-replace-switch-container { /* v4.4l 隐藏手机端右键开关 */
                display: none !important;
             }
             #replacement-editor .scrollable-container { /* v4.4h 移动端 scrollable-container padding 减小 */
                 padding-right: 4px; /* v4.4h padding-right 减小 */
             }
             #replacement-editor .scrollable-content { /* v4.4h 移动端 scrollable-content padding 减小 */
                 padding-right: 4px; /* v4.4h padding-right 减小 */
                 padding-bottom: 4px; /* v4.4h padding-bottom 减小 */
             }
        }


        /* v4.4e 编辑器窗口右下角右键开关样式 - 电脑端样式保持不变 */
        #editor-quick-replace-switch-container {
            position: absolute;
            bottom: 15px;
            right: 20px;
            width: 36px;
            height: 20px;
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: flex-end;
        }

        #editor-quick-replace-switch-button {
            width: 36px;
            height: 20px;
            background-color: var(--quick-replace-toggle-off-color); /* 默认红色 */
            border-radius: 10px;
            position: relative;
            transition: background-color 0.2s ease-in-out;
        }

        #editor-quick-replace-switch-button:before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 16px;
            height: 16px;
            background-color: var(--text-color); /* 滑块颜色 */
            border-radius: 50%;
            transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        #editor-quick-replace-switch-button.on {
            background-color: var(--quick-replace-toggle-on-color); /* 开启时绿色 */
        }

        #editor-quick-replace-switch-button.on:before {
            transform: translateX(16px); /* 滑块位移到右侧 */
        }


    `;
    GM_addStyle(styles);


    // JavaScript 代码部分 (v4.4b - 布局调整 - JavaScript 代码基本无改动)
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

    //创建文本替换编辑窗口 (移除暗色模式切换按钮, 添加右键替换开关)
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
        <div id="quick-replace-toggle-container">  <!-- v4.2 悬浮球右键替换开关容器 -->
            <div id="quick-replace-toggle-button" class="${isQuickReplaceEnabled ? 'on' : 'off'}"></div> <!-- v4.2 悬浮球右键替换开关按钮，初始状态 -->
        </div>
        <div id="editor-quick-replace-switch-container">  <!-- v4.4e 编辑器窗口右下角右键开关容器 -->
            <div id="editor-quick-replace-switch-button" class="${isQuickReplaceEnabled ? 'on' : 'off'}"></div> <!-- v4.4e 编辑器窗口右下角右键开关按钮，初始状态 -->
        </div>
    `;
    document.body.appendChild(replacementEditor);

    // 获取 "新增条目" 按钮 (在 showReplacementEditor 函数外部获取)
    const addButton = replacementEditor.querySelector('#add-rule');
    // v4.2 获取悬浮球右键替换开关按钮
    const quickReplaceToggleButton = replacementEditor.querySelector('#quick-replace-toggle-button');
    // v4.4e 获取编辑器窗口右下角右键开关按钮
    const editorQuickReplaceSwitchButton = replacementEditor.querySelector('#editor-quick-replace-switch-button');


    // 创建快速替换模态框 (v4.0 新增)
    let quickReplaceModal = document.createElement('div');
    quickReplaceModal.id = 'quick-replace-modal';
    quickReplaceModal.style.display = 'none'; // 初始隐藏
    quickReplaceModal.innerHTML = `
        <h2>替换选中文本</h2>
        <input type="text" placeholder="替换为..." id="quick-replace-input">
        <div class="editor-buttons-container">
            <button id="quick-replace-ok-button">确定</button>
            <button id="quick-replace-cancel-button">取消</button>
        </div>
    `;
    document.body.appendChild(quickReplaceModal);


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
        replacementEditor.classList.add('show'); // v4.1 添加 show class，触发动画
        replacementEditor.style.display = 'flex'; // 显示编辑器


        const scrollableContent = replacementEditor.querySelector('.scrollable-content');
        scrollableContent.innerHTML = ''; // 清空之前的编辑器内容

        // 加载当前网站的替换表 (保持不变)
        replacementTable = GM_getValue(storageKey, {});
        const totalRules = Object.keys(replacementTable).length;
        totalPages = Math.ceil(totalRules / rulesPerPage) || 1; // 计算总页数，至少为1页  // v4.1 确保 totalPages 被正确赋值
        currentPage = 1; // 每次打开编辑器重置为第一页 // v4.1 每次打开编辑器重置为第一页

        // 分页显示规则 (保持不变)
        function displayPage(page) {
            scrollableContent.innerHTML = ''; // 清空内容
            currentPage = page; // 更新当前页码
            const startIndex = (currentPage - 1) * rulesPerPage;
            const endIndex = Math.min(startIndex + rulesPerPage, totalRules);
            let ruleIndex = 0; // 规则索引，用于在所有规则中定位
            let displayedRulesCount = 0; // v4.4k  当前页显示的规则计数

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
                    originalInput.placeholder = '请输入要替换的原文';
                    replacementRow.appendChild(originalInput);
                    // 替换文输入框
                    const translatedLabel = document.createElement('label');
                    translatedLabel.textContent = '替换：';
                    replacementRow.appendChild(translatedLabel);
                    const translatedInput = document.createElement('input');
                    translatedInput.value = replacementTable[key];
                    translatedInput.placeholder = '请输入替换后的文本';
                    replacementRow.appendChild(translatedInput);
                    // 删除按钮 (确保每个规则只创建一个删除按钮)
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'X';
                    deleteButton.classList.add('delete-button-enhanced');
                    deleteButton.addEventListener('click', function () {
                        const originalKey = originalInput.value;
                        delete replacementTable[originalKey];
                        scrollableContent.removeChild(replacementRow);
                        updateReplacementTable();
                        replacePage();
                        const updatedTotalRules = Object.keys(replacementTable).length;
                        totalPages = Math.ceil(updatedTotalRules / rulesPerPage) || 1;
                        updatePaginationButtons();
                         if (scrollableContent.children.length === 0 && currentPage > 1) {
                            displayPage(currentPage - 1);
                        }
                    });
                    replacementRow.appendChild(deleteButton); // 添加删除按钮

                    scrollableContent.appendChild(replacementRow);
                    displayedRulesCount++; // v4.4k 计数器递增
                }
                ruleIndex++;
            }
            updatePaginationButtons();
             if (displayedRulesCount === 0 && currentPage > 1) { // v4.4k  如果当前页无规则且不是第一页
                 displayPage(currentPage - 1); // v4.4k  自动显示上一页
             }
        }


        // 上一页按钮 (保持不变)
        const prevPageButton = replacementEditor.querySelector('#prev-page');
        prevPageButton.addEventListener('click', function () {
            if (currentPage > 1) {
                displayPage(currentPage - 1);
            }
        });


        // 添加新增条目按钮 (修复 BUG，确保每次点击只添加一个条目)
        // **关键修复：将事件监听器绑定代码移动到 showReplacementEditor 函数外部**
        // const addButton = replacementEditor.querySelector('#add-rule'); // **移动到 showReplacementEditor 函数外部**
        // addButton.addEventListener('click', function () { // **移动到 showReplacementEditor 函数外部**
        //     console.log("新增条目按钮被点击"); // Debug 日志
        //     const replacementRow = document.createElement('div');
        //     replacementRow.className = 'replacement-row';
        //     // ... (省略添加条目的代码，保持不变)
        // });


        // 下一页按钮 (保持不变)
        const nextPageButton = replacementEditor.querySelector('#next-page');
        nextPageButton.addEventListener('click', function () {
            if (currentPage < totalPages) {
                displayPage(currentPage + 1);
            }
        });


        // 更新分页按钮状态和页码显示 (保持不变)
        function updatePaginationButtons() { // v4.1 函数作用域调整，确保可以 be accessed by addButton
            prevPageButton.disabled = currentPage <= 1;
            nextPageButton.disabled = currentPage >= totalPages;
        }
        window.updatePaginationButtons = updatePaginationButtons; // v4.1 Expose to global, addButton can access


        // 保存按钮 (保持不变)
        const saveButton = replacementEditor.querySelector('#save-button');
        saveButton.addEventListener('click', function() {
            updateReplacementTable();//更新文本替换表
            GM_setValue(storageKey, replacementTable); // 保存到 GM_setValue，使用网站独立的 key
              replacementEditor.classList.remove('show'); // v4.1 使用 show/hide class 控制动画
              replacementEditor.classList.add('hide');
             setTimeout(() => {
                replacementEditor.style.display = 'none';
                replacementEditor.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
             }, 200); // v4.1 动画时间调整为 200ms
             startFadeTimer();
             if (isReplacementEnabled) {
                 replacePage();// 更新页面替换
             }
        });

        // 关闭按钮 (保持不变)
         const closeButton = replacementEditor.querySelector('#close-button');
         closeButton.addEventListener('click', function() {
              replacementEditor.classList.remove('show'); // v4.1 使用 show/hide class 控制动画
              replacementEditor.classList.add('hide');
             setTimeout(() => {
                replacementEditor.style.display = 'none';
                replacementEditor.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
             }, 200); // v4.1 动画时间调整为 200ms
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

    // 修改了 replaceText 函数，添加了单词边界 \b 实现严格匹配
    function replaceText(node) {
        if (!isReplacementEnabled || !node) { // **添加 !node 检查，如果 node 为 null 或 undefined，直接返回**
            restoreSingleNode(node); // (这里 node 可能为 null，restoreSingleNode 也需要做 null 检查)
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            let textContent = node.textContent;
            let originalText = textContent;
            for (let key in replacementTable) {
                // 使用不区分大小写的正则表达式和全局匹配，并添加单词边界 \b
                const regex = new RegExp('\\b' + escapeRegExp(key) + '\\b', 'gi');
                textContent = textContent.replace(regex, replacementTable[key]);
            }
            if(originalText !== textContent) {
                if (!originalTextMap.has(node)) {
                    originalTextMap.set(node, originalText);
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
        if (!isReplacementEnabled || !node) { // **添加 !node 检查，如果 node 为 null 或 undefined，直接返回**
            restoreNode(node); // 关闭替换时恢复节点及其子节点的原始文本 (restoreNode 自身也需要做 null 检查)
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

    // 恢复单个文本节点的原始文本 (修改：添加 null 检查)
    function restoreSingleNode(node) {
        if (!node) return; // **添加 !node 检查**
        if (node.nodeType === Node.TEXT_NODE && originalTextMap.has(node)) {
            node.textContent = originalTextMap.get(node);
        }
    }

    // 递归恢复节点及其子节点的原始文本 (修改：添加 null 检查)
    function restoreNode(node) {
        if (!node) return; // **添加 !node 检查**
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
        restoreNode(document.body); // 恢复整个 body 的原始文本 (restoreNode 自身已做 null 检查)
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

    // **关键修复： "新增条目" 按钮的事件监听器绑定，移动到 showReplacementEditor 函数外部，脚本初始化时执行一次**
    addButton.addEventListener('click', function () {
        console.log("新增条目按钮被点击"); // Debug 日志
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
        deleteButton.classList.add('delete-button-enhanced'); // 添加新的 class  (v3.9)
        deleteButton.addEventListener('click', function () {
            const scrollableContent = replacementEditor.querySelector('.scrollable-content'); // 需要在这里获取 scrollableContent
            scrollableContent.removeChild(replacementRow);
            updateReplacementTable();
            replacePage();
            // 重新计算总页数并更新分页按钮状态
            const updatedTotalRules = Object.keys(replacementTable).length;
            totalPages = Math.ceil(updatedTotalRules / rulesPerPage) || 1;
            updatePaginationButtons(); // v4.1 直接调用全局函数
        });
        replacementRow.appendChild(deleteButton);
        const scrollableContent = replacementEditor.querySelector('.scrollable-content'); // 需要在这里获取 scrollableContent
        scrollableContent.appendChild(replacementRow); // **改为 appendChild，添加到末尾**

         // 重新计算总页数并更新分页按钮状态 (新增条目后页数可能增加)
        const updatedTotalRules = Object.keys(replacementTable).length;
        totalPages = Math.ceil(updatedTotalRules / rulesPerPage) || 1;
        updatePaginationButtons(); // v4.1 直接调用全局函数
        // 移除 displayPage(currentPage);  不再强制刷新当前页
    });


    // v4.0 新增：监听 contextmenu 事件 (右键菜单事件)
    document.addEventListener('contextmenu', function(event) {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText && isQuickReplaceEnabled) { // v4.2 检查右键替换开关状态
            event.preventDefault(); // v4.2 阻止默认右键菜单
            showQuickReplaceModal(selectedText, event.clientX, event.clientY); // 显示快速替换模达框
        }
         // v4.2 如果 isQuickReplaceEnabled 为 false，则不阻止默认菜单，显示浏览器原生菜单
    });

    // v4.0 新增：显示快速替换模态框
    function showQuickReplaceModal(selectedText, x, y) {
        const modal = document.getElementById('quick-replace-modal');
        const input = modal.querySelector('#quick-replace-input');
        input.value = ""; // 清空上次输入的内容
        modal.style.left = x + 'px';
        modal.style.top = y + 'px';
        modal.classList.add('show'); // v4.1 添加 show class，触发动画
        modal.style.display = 'block'; // v4.1 确保显示
        modal.selectedText = selectedText; // 存储选中文本到模态框对象

        // 聚焦输入框，方便用户直接输入
        input.focus();
    }

    // v4.0 新增：隐藏快速替换模态框
    function hideQuickReplaceModal() {
        const modal = document.getElementById('quick-replace-modal');
        modal.classList.remove('show'); // v4.1 添加 hide class，触发动画
        modal.classList.add('hide');
        setTimeout(() => {
             modal.style.display = 'none';
             modal.classList.remove('hide'); // 移除隐藏动画 class，为下次显示做准备
        }, 200); // v4.1 动画时间调整为 200ms
    }

    // v4.0 新增：快速替换模态框 - "确定" 按钮事件监听器
    document.getElementById('quick-replace-ok-button').addEventListener('click', function() {
        const modal = document.getElementById('quick-replace-modal');
        const inputText = modal.querySelector('#quick-replace-input').value.trim();
        const originalText = modal.selectedText; // 从模态框对象中获取选中文本

        if (originalText && inputText) {
            replacementTable[originalText] = inputText; // 添加到替换规则表
            GM_setValue(storageKey, replacementTable); // 保存规则
            replacePage(); // 立即生效替换
            hideQuickReplaceModal(); // 关闭模态框
        } else {
            alert("请输入替换内容！"); // 可选：提示用户输入替换内容
        }
    });

    // v4.0 新增：快速替换模态框 - "取消" 按钮事件监听器
    document.getElementById('quick-replace-cancel-button').addEventListener('click', function() {
        hideQuickReplaceModal(); // 关闭模态框
    });

    // v4.2 新增：悬浮球右键替换开关 - 点击事件监听器 (保持不变)
    quickReplaceToggleButton.addEventListener('click', function() {
        isQuickReplaceEnabled = !isQuickReplaceEnabled; // 切换状态
        quickReplaceToggleButton.classList.toggle('on'); // 切换 .on class
        quickReplaceToggleButton.classList.toggle('off'); // 切换 .off class
        GM_setValue('quickReplaceEnabled', isQuickReplaceEnabled); // 保存状态
        // v4.4e 同步更新编辑器窗口右下角开关状态
        editorQuickReplaceSwitchButton.classList.toggle('on');
        editorQuickReplaceSwitchButton.classList.toggle('off');
    });

    // v4.4e 新增：编辑器窗口右下角右键替换开关 - 点击事件监听器
    editorQuickReplaceSwitchButton.addEventListener('click', function() {
        isQuickReplaceEnabled = !isQuickReplaceEnabled; // 切换状态
        editorQuickReplaceSwitchButton.classList.toggle('on'); // 切换 .on class
        editorQuickReplaceSwitchButton.classList.toggle('off'); // 切换 .off class
        GM_setValue('quickReplaceEnabled', isQuickReplaceEnabled); // 保存状态
        // v4.4e 同步更新悬浮球开关状态 (虽然这里同步更新悬浮球开关似乎不是必须的，但为了保持状态一致性，可以加上)
        quickReplaceToggleButton.classList.toggle('on');
        quickReplaceToggleButton.classList.toggle('off');
    });


})();
