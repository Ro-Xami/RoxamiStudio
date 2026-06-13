window.__rmbg14 = (function () {
    let session = null;
    let ort = null;

    async function getOrt() {
        if (!ort) ort = (await import('onnxruntime-web')).default;
        return ort;
    }

    async function getSession() {
        if (session) return session;
        const o = await getOrt();
        o.env.wasm.numThreads = 1;
        o.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0-dev.20250206-d981b153d3/dist/';
        const modelUrl = new URL('./wwwroot/lib/bg-removal/rmbg14.onnx', location.href).href;
        session = await o.InferenceSession.create(modelUrl);
        return session;
    }

    function canvasToNCHW(canvas, targetW, targetH, normMean, normStd) {
        const rc = document.createElement('canvas');
        rc.width = targetW; rc.height = targetH;
        rc.getContext('2d').drawImage(canvas, 0, 0, targetW, targetH);
        const { data, width, height } = rc.getContext('2d').getImageData(0, 0, targetW, targetH);
        const size = width * height;
        const input = new Float32Array(3 * size);
        for (let i = 0; i < size; i++) {
            const off = i * 4;
            const r = data[off] / 255.0, g = data[off + 1] / 255.0, b = data[off + 2] / 255.0;
            input[i] = (r - normMean[0]) / normStd[0];
            input[size + i] = (g - normMean[1]) / normStd[1];
            input[2 * size + i] = (b - normMean[2]) / normStd[2];
        }
        return { tensor: input, shape: [1, 3, height, width], w: width, h: height };
    }

    function alphaToMask(alphaData, modelW, modelH, origW, origH) {
        const rc = document.createElement('canvas');
        rc.width = modelW; rc.height = modelH;
        const tctx = rc.getContext('2d');
        const tImg = tctx.createImageData(modelW, modelH);
        for (let i = 0; i < modelW * modelH; i++) {
            const v = Math.round(alphaData[i] * 255);
            const off = i * 4;
            tImg.data[off] = v; tImg.data[off + 1] = v;
            tImg.data[off + 2] = v; tImg.data[off + 3] = v;
        }
        tctx.putImageData(tImg, 0, 0);
        const mc = document.createElement('canvas');
        mc.width = origW; mc.height = origH;
        const mctx = mc.getContext('2d');
        mctx.imageSmoothingQuality = 'high';
        mctx.drawImage(rc, 0, 0, origW, origH);
        const mImg = mctx.getImageData(0, 0, origW, origH);
        let minVal = 255, maxVal = 0;
        for (let i = 0; i < origW * origH; i++) {
            const v = mImg.data[i * 4];
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
        }
        const range = maxVal - minVal || 1;
        for (let i = 0; i < origW * origH; i++) {
            const v = Math.round(((mImg.data[i * 4] - minVal) / range) * 255);
            const off = i * 4;
            mImg.data[off] = v; mImg.data[off + 1] = v;
            mImg.data[off + 2] = v; mImg.data[off + 3] = v;
        }
        mctx.putImageData(mImg, 0, 0);
        return mc;
    }

    function applyMask(origCanvas, maskCanvas) {
        const out = document.createElement('canvas');
        out.width = origCanvas.width; out.height = origCanvas.height;
        const ctx = out.getContext('2d');
        ctx.drawImage(origCanvas, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
        return out;
    }

    async function removeBackground(source) {
        let canvas;
        if (source instanceof HTMLCanvasElement) {
            canvas = source;
        } else {
            canvas = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = img.width; c.height = img.height;
                    c.getContext('2d').drawImage(img, 0, 0);
                    resolve(c);
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(source);
            });
        }
        const sess = await getSession();
        const o = await getOrt();
        const origW = canvas.width, origH = canvas.height;
        const { tensor, shape } = canvasToNCHW(canvas, 1024, 1024, [0.5, 0.5, 0.5], [1.0, 1.0, 1.0]);
        const inputTensor = new o.Tensor('float32', tensor, shape);
        const results = await sess.run({ input: inputTensor });
        const alpha = results.alpha.data;
        const maskCanvas = alphaToMask(alpha, 1024, 1024, origW, origH);
        const resultCanvas = applyMask(canvas, maskCanvas);
        return new Promise(resolve => resultCanvas.toBlob(blob => resolve(blob), 'image/png'));
    }

    return { removeBackground };
})();
