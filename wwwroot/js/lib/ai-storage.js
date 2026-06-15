var AiStorage = (function () {
    'use strict';

    function getTimestamp() {
        var d = new Date();
        return d.getFullYear() +
            ('0' + (d.getMonth() + 1)).slice(-2) +
            ('0' + d.getDate()).slice(-2) + '_' +
            ('0' + d.getHours()).slice(-2) +
            ('0' + d.getMinutes()).slice(-2) +
            ('0' + d.getSeconds()).slice(-2);
    }

    function saveFile(dir, filename, base64data) {
        var path = dir + '/' + getTimestamp() + '_' + filename;
        return fetch('/api/save-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path, data: base64data })
        }).then(function (r) {
            if (!r.ok) throw new Error('Save failed: ' + r.status);
            return r.json();
        }).then(function (data) {
            return data.path;
        });
    }

    function saveBlob(dir, filename, blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var base64 = reader.result.split(',')[1];
                saveFile(dir, filename, base64).then(resolve, reject);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function saveUrl(dir, filename, url) {
        return fetch(url)
            .then(function (r) { return r.blob(); })
            .then(function (blob) { return saveBlob(dir, filename, blob); });
    }

    function fileUrl(path) {
        return '/' + path;
    }

    function sanitizeFilename(name) {
        return (name || 'file').replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
    }

    return {
        saveFile: saveFile,
        saveBlob: saveBlob,
        saveUrl: saveUrl,
        fileUrl: fileUrl,
        sanitizeFilename: sanitizeFilename,
        getTimestamp: getTimestamp
    };
})();
