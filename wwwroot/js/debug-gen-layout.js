(function () {
    console.log('=== AI Gen Tools Layout Debug ===');
    console.log('请先切换到有问题的工具（如 AI 图片），然后运行此脚本\n');

    var genIds = ['ai-image', 'ai-video', 'ai-model', 'ai-audio', 'ai-chat'];

    genIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) { console.log('❌ #' + id + ': NOT FOUND'); return; }

        var style = window.getComputedStyle(el);
        var rect = el.getBoundingClientRect();
        var isActive = el.classList.contains('active');

        console.log((isActive ? '🟢' : '⚪') + ' #' + id + ':');
        console.log('   display: ' + style.display + ' | flex: ' + style.flex);
        console.log('   height: ' + style.height + ' | min-height: ' + style.minHeight);
        console.log('   overflow-y: ' + style.overflowY);
        console.log('   实际: ' + Math.round(rect.height) + 'px × ' + Math.round(rect.width) + 'px');
        console.log('   active class: ' + isActive);

        // Check chat-tool-ui
        var tui = el.querySelector('.chat-tool-ui');
        if (tui) {
            var ts = window.getComputedStyle(tui);
            var tr = tui.getBoundingClientRect();
            console.log('   .chat-tool-ui: flex=' + ts.flex + ' height=' + Math.round(tr.height) + 'px');
        }

        // Check chat-layout
        var layout = el.querySelector('.chat-layout');
        if (layout) {
            var ls = window.getComputedStyle(layout);
            var lr = layout.getBoundingClientRect();
            console.log('   .chat-layout: flex=' + ls.flex + ' height=' + Math.round(lr.height) + 'px overflow=' + ls.overflow);
        } else {
            console.log('   .chat-layout: NOT FOUND');
        }

        // Check chat-setup-prompt visibility
        var setup = el.querySelector('.chat-setup-prompt');
        if (setup) {
            console.log('   .chat-setup-prompt: display=' + window.getComputedStyle(setup).display);
        }

        console.log('');
    });

    console.log('--- Parent chain for active tool ---');
    var active = document.querySelector('.tool-placeholder.active');
    if (active) {
        var cur = active;
        while (cur && cur !== document.body) {
            var s = window.getComputedStyle(cur);
            var id = cur.id || '';
            var cls = Array.from(cur.classList).join('.');
            var label = id ? '#' + id : (cls ? '.' + cls : cur.tagName.toLowerCase());
            console.log('   ' + label + ' (display:' + s.display + ' flex:' + s.flex + ' height:' + Math.round(cur.getBoundingClientRect().height) + 'px overflow-y:' + s.overflowY + ')');
            cur = cur.parentElement;
        }
    }

    console.log('\n=== Done ===');
})();
