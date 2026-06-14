function initAiImage() {
    AiGenChat.init({
        toolId: 'ai-image',
        configKey: 'aiImage',
        resultType: 'image',
        endpoint: '/images/generations',
        placeholder: '描述你想要生成的图片...',
        extraControls: [
            { id: 'size', label: '尺寸', type: 'select', value: '1024x1024', options: ['1024x1024', '1792x1024', '1024x1792'] },
            { id: 'count', label: '数量', type: 'number', value: 1, min: 1, max: 4 }
        ],
        buildBody: function (prompt, model, ctrl) {
            return { model: model, prompt: prompt, n: parseInt(ctrl.count) || 1, size: ctrl.size || '1024x1024' };
        }
    });
}
