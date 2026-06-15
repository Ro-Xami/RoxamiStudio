function initAiImage() {
    function isVolcano(provider) {
        return provider && provider.baseUrl && provider.baseUrl.indexOf('volces.com') !== -1;
    }

    AiGenChat.init({
        toolId: 'ai-image',
        configKey: 'aiImage',
        resultType: 'image',
        endpoint: '/images/generations',
        placeholder: '描述你想要生成的图片...',
        getExtraControls: function (provider) {
            var sizeOpts = isVolcano(provider) ? ['1K', '2K', '4K'] : ['1024x1024', '1792x1024', '1024x1792'];
            return [
                { id: 'size', label: '尺寸', type: 'select', value: sizeOpts[0], options: sizeOpts },
                { id: 'count', label: '数量', type: 'number', value: 1, min: 1, max: 4 }
            ];
        },
        buildBody: function (prompt, model, ctrl, provider, refImageUrls) {
            var body = { model: model, prompt: prompt, n: parseInt(ctrl.count) || 1, size: ctrl.size || '1024x1024' };
            if (isVolcano(provider)) {
                body.watermark = true;
                if (refImageUrls && refImageUrls.length > 0) {
                    body.image = refImageUrls.length === 1 ? refImageUrls[0] : refImageUrls;
                }
            }
            return body;
        }
    });
}
