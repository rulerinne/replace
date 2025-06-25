/*
 * =======================================================================
 * == 现代化图片列表美化方案 (整合了去模糊/透明修正) ==
 * =======================================================================
*/

/* 步骤 1: 去除主容器的模糊与透明效果 (这是我们已解决的核心问题) */
/* 日间模式：强制设为不透明纯白背景 */
.hope-c-PJLV-iigjoxS-css {
    opacity: 1 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background-color: #FFFFFF !important;
}

/* 夜间模式：专门覆盖为不透明的深色背景 */
.hope-ui-dark .obj-box.hope-c-PJLV-iigjoxS-css {
    background-color: #181818 !important;
}


/* 步骤 2: 美化图片网格布局与样式 */

/* 主容器设置 - 优化了内边距 */
.obj-box.hope-stack {
    width: 100%;
    max-width: 100%;
    padding: 24px; /* 提供了更舒适的呼吸空间 */
    box-sizing: border-box;
}

/* 图片网格容器 */
.image-images.hope-flex {
    display: grid;
    /* 核心网格布局，保持不变，效果很好 */
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px; /* 统一并优化了卡片间距 */
    width: 100%;
}

/* 单个图片项容器 - 这是美化的核心 */
.image-item.viselect-item {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    border-radius: 12px; /* 更圆润的卡片圆角 */
    
    /* 关键：背景设为透明，以融入父容器的纯白/深黑背景 */
    background-color: transparent;
    
    /* 现代化阴影效果，更有层次感 */
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    
    /* 定义一个更平滑、统一的过渡动画 */
    transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), 
                box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 【夜间模式】为图片卡片添加辉光效果 */
.hope-ui-dark .image-item.viselect-item {
    /* 使用半透明白色阴影模拟辉光，比纯黑阴影在深色背景上效果更好 */
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.05), 0 0 20px rgba(255, 255, 255, 0.03);
}


/* 图片居中容器 - 微调内边距 */
.hope-center.hope-c-jKOUQW {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px; /* 调整图片与卡片边缘的距离 */
    box-sizing: border-box;
}

/* 图片本身样式 - 保持核心属性，确保完整显示 */
.hope-image.hope-c-PJLV {
    max-width: 100%;
    max-height: 300px;
    width: auto;
    height: auto;
    object-fit: contain; /* 保证图片总是完整显示，不被裁剪 */
    border-radius: 8px; /* 轻微的图片圆角 */
    box-shadow: none; /* 移除图片自身的多余阴影 */
    transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}


/* 悬停效果 - 优化动画和阴影反馈 */
.image-item.viselect-item:hover {
    /* 悬浮动效：轻微上移并放大，感觉更“活” */
    transform: translateY(-5px) scale(1.02);
    /* 悬浮时阴影加深，立体感更强 */
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* 【夜间模式】悬停时的辉光效果增强 */
.hope-ui-dark .image-item.viselect-item:hover {
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.1), 0 0 30px rgba(255, 255, 255, 0.08);
}

/* 图片在悬停时不再单独放大，由父容器带动，效果更统一 */
.image-item.viselect-item:hover .hope-image {
    transform: scale(1); /* 保持原样，防止双重放大 */
}


/* 步骤 3: 响应式调整 - 优化移动端体验 */
/* 平板 */
@media (max-width: 1024px) {
    .image-images.hope-flex {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 20px;
    }
    .hope-image.hope-c-PJLV { max-height: 250px; }
    .obj-box.hope-stack { padding: 20px; }
}

/* 移动端 */
@media (max-width: 768px) {
    .image-images.hope-flex {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
    }
    .hope-image.hope-c-PJLV { max-height: 200px; }
    .obj-box.hope-stack { padding: 16px; }
}

/* 小屏幕手机 */
@media (max-width: 480px) {
    .image-images.hope-flex {
        /* 在小屏上改为双列布局，防止图片过小 */
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
     .obj-box.hope-stack { padding: 12px; }
}
