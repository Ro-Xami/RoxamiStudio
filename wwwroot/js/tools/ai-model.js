function initAiModel() {
    AiGenChat.init({
        toolId: 'ai-model',
        configKey: 'aiModel',
        resultType: 'model',
        endpoint: '/models/generations',
        placeholder: '描述你想要生成的 3D 模型...',
        buildBody: function (prompt, model) {
            return { model: model, prompt: prompt };
        }
    });
}
