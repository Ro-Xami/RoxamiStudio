// 对话布局调试脚本
// 在浏览器控制台运行，输出完整的高度约束链信息

(function() {
    console.log('=== AI Chat Layout Debug ===');
    console.log('请打开 AI 对话面板，然后刷新页面运行此脚本\n');

    const selectors = [
        'body',
        '.app-container',
        '.main-content',
        '.tool-container',
        '#ai-chat',
        '#ai-chat.tool-placeholder.active',
        '.chat-tool-ui',
        '.chat-layout',
        '.chat-main',
        '.chat-messages',
        '.chat-input-area',
        '.chat-model-bar'
    ];

    function getComputedInfo(el) {
        if (!el) return null;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
            display: style.display,
            flex: style.flex,
            flexGrow: style.flexGrow,
            flexShrink: style.flexShrink,
            flexDirection: style.flexDirection,
            height: style.height,
            minHeight: style.minHeight,
            maxHeight: style.maxHeight,
            overflow: style.overflow,
            overflowY: style.overflowY,
            rectHeight: Math.round(rect.height),
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
        };
    }

    console.log('--- Flex 高度约束链 ---\n');
    
    selectors.forEach(selector => {
        const el = document.querySelector(selector);
        if (!el) {
            console.log(`❌ ${selector}: NOT FOUND`);
            return;
        }
        
        const info = getComputedInfo(el);
        console.log(`✅ ${selector}:`);
        console.log(`   display: ${info.display}`);
        console.log(`   flex: ${info.flex} (grow:${info.flexGrow}, shrink:${info.flexShrink})`);
        if (info.flexDirection !== 'row') {
            console.log(`   flex-direction: ${info.flexDirection}`);
        }
        console.log(`   height: ${info.height} (min:${info.minHeight}, max:${info.maxHeight})`);
        console.log(`   overflow-y: ${info.overflowY}`);
        console.log(`   实际高度: ${info.rectHeight}px (scroll:${info.scrollHeight}px, client:${info.clientHeight}px)`);
        
        // 诊断问题
        const problems = [];
        
        if (info.display === 'flex' && info.minHeight === 'auto') {
            problems.push('⚠️  flex 容器缺少 min-height:0，无法收缩');
        }
        
        if (info.scrollHeight > info.clientHeight && info.overflowY === 'visible') {
            problems.push('⚠️  内容溢出但 overflow-y 未设置滚动');
        }
        
        if (selector === '.chat-messages' && info.flexGrow === '0') {
            problems.push('⚠️  消息区 flex-grow:0，无法占据剩余空间');
        }
        
        if ((selector === '.chat-input-area' || selector === '.chat-model-bar') && info.flexShrink !== '0') {
            problems.push('⚠️  固定栏 flex-shrink 不为 0，可能被压缩');
        }
        
        if (problems.length > 0) {
            problems.forEach(p => console.log(`   ${p}`));
        }
        
        console.log('');
    });

    // 检查父子关系
    console.log('--- 父子嵌套关系 ---\n');
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        let current = chatMessages;
        const chain = [];
        while (current && current !== document.body) {
            const style = window.getComputedStyle(current);
            chain.push({
                tag: current.tagName.toLowerCase(),
                id: current.id,
                classes: Array.from(current.classList).join('.'),
                display: style.display,
                height: Math.round(current.getBoundingClientRect().height)
            });
            current = current.parentElement;
        }
        
        console.log('.chat-messages 的父级链（从内到外）：');
        chain.forEach((item, i) => {
            const label = item.id ? `#${item.id}` : (item.classes ? `.${item.classes}` : item.tag);
            console.log(`   ${i}. ${label} (display:${item.display}, height:${item.height}px)`);
        });
    }

    console.log('\n=== 诊断完成 ===');
    console.log('请将以上完整日志复制发给我');
})();
