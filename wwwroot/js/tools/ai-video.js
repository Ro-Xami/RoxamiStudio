function initAiVideo() {
    AiGenChat.init({
        toolId: 'ai-video',
        configKey: 'aiVideo',
        resultType: 'video',
        endpoint: '/videos/generations',
        placeholder: '描述你想要生成的视频...',
        extraControls: [
            { id: 'duration', label: '时长(s)', type: 'select', value: '5', options: ['5', '10', '15', '30'] }
        ],
        buildBody: function (prompt, model, ctrl) {
            return { model: model, prompt: prompt, duration: parseInt(ctrl.duration) || 5 };
        }
    });
}
