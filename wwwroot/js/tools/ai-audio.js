function initAiAudio() {
    AiGenChat.init({
        toolId: 'ai-audio',
        configKey: 'aiAudio',
        resultType: 'audio',
        endpoint: '/audio/speech',
        placeholder: '输入要转换为语音的文字...',
        extraControls: [
            { id: 'voice', label: '语音', type: 'select', value: 'alloy', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] }
        ],
        buildBody: function (prompt, model, ctrl) {
            return { model: model, input: prompt, voice: ctrl.voice || 'alloy' };
        }
    });
}
