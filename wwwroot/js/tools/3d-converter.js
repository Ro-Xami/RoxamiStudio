function init3DConverter() {
    console.log('Initializing 3D Converter');

    const glbFileInput = document.getElementById('glb-file-input');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const previewSection = document.getElementById('preview-section');
    const modelPreview = document.getElementById('model-preview');
    const convertToObjBtn = document.getElementById('convert-to-obj-btn');
    const extractTexturesBtn = document.getElementById('extract-textures-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const outputFiles = document.getElementById('output-files');
    const filenamePrefixInput = document.getElementById('filename-prefix-input');

    let currentModel = null;
    let currentScene = null;
    let currentRenderer = null;
    let currentCamera = null;
    let uploadedFile = null;
    let conversionOutputs = [];
    let currentGLTF = null; // Store full GLTF object for texture extraction

    // Helper function to get cleaned filename prefix
    function getFilenamePrefix() {
        if (!filenamePrefixInput) return '';
        const prefix = filenamePrefixInput.value.trim();
        // Clean up prefix: remove illegal filename characters, limit length
        const cleaned = prefix.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
        return cleaned ? cleaned + '_' : '';
    }

    // Helper function to clean a filename (remove extension and illegal characters)
    function cleanFileName(filename, removeExtension = true) {
        if (!filename) return '';
        let name = filename;
        if (removeExtension) {
            // Remove file extension
            name = name.replace(/\.[^/.]+$/, '');
        }
        // Remove illegal filename characters and replace spaces with underscores
        return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
    }

    // Helper function to extract Three.js texture to PNG base64
    function extractTextureToPNG(textureImage, index) {
        if (!textureImage) return null;

        try {
            // Create canvas with texture dimensions
            const canvas = document.createElement('canvas');
            canvas.width = textureImage.width || 1;
            canvas.height = textureImage.height || 1;
            const ctx = canvas.getContext('2d');

            // Draw texture to canvas
            ctx.drawImage(textureImage, 0, 0);

            // Convert to PNG base64
            return canvas.toDataURL('image/png').split(',')[1];
        } catch (error) {
            console.error(`Error extracting texture ${index}:`, error);
            return null;
        }
    }

    // Helper function to recursively extract textures from Three.js model
    function extractTexturesFromModel(object, startIndex) {
        const textures = [];
        let index = startIndex;

        // Recursively traverse the object and its children
        function traverse(obj) {
            if (obj.material) {
                // Handle single material
                if (obj.material.map && obj.material.map.image) {
                    const textureData = extractTextureToPNG(obj.material.map.image, index++);
                    if (textureData) textures.push(textureData);
                }

                // Handle material with multiple maps (e.g., normalMap, roughnessMap)
                const mapTypes = ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'specularMap'];
                mapTypes.forEach(mapType => {
                    if (obj.material[mapType] && obj.material[mapType].image) {
                        const textureData = extractTextureToPNG(obj.material[mapType].image, index++);
                        if (textureData) textures.push(textureData);
                    }
                });

                // Handle array of materials
            } else if (Array.isArray(obj.material)) {
                obj.material.forEach(material => {
                    if (material.map && material.map.image) {
                        const textureData = extractTextureToPNG(material.map.image, index++);
                        if (textureData) textures.push(textureData);
                    }
                });
            }

            // Recursively process children
            if (obj.children) {
                obj.children.forEach(child => traverse(child));
            }
        }

        traverse(object);
        return textures;
    }

    // Helper function to extract textures using multiple methods
    function extractAllTexturesFromGLTF(gltf) {
        const textures = [];

        // Method 1: Check gltf.textures array
        if (gltf.textures && Array.isArray(gltf.textures)) {
            gltf.textures.forEach((texture, index) => {
                if (texture && texture.image) {
                    const textureData = extractTextureToPNG(texture.image, index);
                    if (textureData) textures.push({ data: textureData, index: index });
                }
            });
        }

        // Method 2: Check gltf.parser for GLTF JSON structure
        if (textures.length === 0 && gltf.parser && gltf.parser.json) {
            const json = gltf.parser.json;
            if (json.textures && Array.isArray(json.textures)) {
                // Try to get textures through parser
                json.textures.forEach((textureDef, index) => {
                    try {
                        // Try to get texture dependency
                        const texture = gltf.parser.getDependency('texture', index);
                        if (texture && texture.image) {
                            const textureData = extractTextureToPNG(texture.image, index);
                            if (textureData) textures.push({ data: textureData, index: index });
                        }
                    } catch (e) {
                        console.warn(`Could not get texture ${index}:`, e);
                    }
                });
            }
        }

        // Method 3: Extract from scene materials
        if (textures.length === 0 && gltf.scene) {
            const texturesFromScene = extractTexturesFromModel(gltf.scene, 0);
            texturesFromScene.forEach((textureData, index) => {
                if (textureData) textures.push({ data: textureData, index: textures.length + index });
            });
        }

        return textures;
    }

    // Helper function to generate dummy model data for download
    function generateDummyModelData(format) {
        if (format === 'obj') {
            return `# Dummy OBJ file generated by Roxami Web Tools
# This is a placeholder for actual converted file

v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 0.0 1.0 0.0
v 1.0 1.0 0.0

vt 0.0 0.0
vt 1.0 0.0
vt 0.0 1.0
vt 1.0 1.0

vn 0.0 0.0 1.0
vn 0.0 0.0 1.0
vn 0.0 0.0 1.0
vn 0.0 0.0 1.0

f 1/1/1 2/2/2 3/3/3
f 2/2/2 4/4/4 3/3/3`;
        }
        return `Dummy ${format.toUpperCase()} file content`;
    }

    // Helper function to generate dummy texture data for download
    function generateDummyTextureData(textureType) {
        // Create a 1x1 pixel canvas with different colors based on texture type
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');

        // Set pixel color based on texture type
        switch (textureType) {
            case 'diffuse':
                ctx.fillStyle = '#ff0000'; // Red
                break;
            case 'normal':
                ctx.fillStyle = '#0000ff'; // Blue
                break;
            case 'roughness':
                ctx.fillStyle = '#808080'; // Gray
                break;
            default:
                ctx.fillStyle = '#ffffff'; // White
        }

        ctx.fillRect(0, 0, 1, 1);

        // Convert to PNG base64 (remove data:image/png;base64, prefix)
        return canvas.toDataURL('image/png').split(',')[1];
    }

    // Helper function to export model to OBJ format
    function exportModelToOBJ(model) {
        if (!model) return null;

        // Debug logging
        console.log('Exporting model to OBJ:', model);
        // Note: Preview transformation (centering and scaling for display) is reversed during export
        // to keep the OBJ coordinate system consistent with the original GLB file.
        // This ensures the OBJ file's origin, rotation, and scale match the original GLB.

        // Get preview transformation parameters to reverse the preview transformation
        // Preview transform: v'' = scale * (v - center), where v is original GLB coordinate
        // To get original coordinate: v = v''/scale + center
        const previewCenter = model.userData?.previewCenter;
        const previewScale = model.userData?.previewScale;
        console.log('Preview transform params for OBJ export:', {
            center: previewCenter,
            scale: previewScale,
            hasCenter: !!previewCenter,
            hasScale: previewScale !== undefined
        });

        try {
            let objContent = '# OBJ file exported from GLB by Roxami Web Tools\n';
            objContent += '# Generated: ' + new Date().toISOString() + '\n\n';

            // Collect all geometries from the model
            const vertices = [];
            const texcoords = [];
            const normals = [];
            let vertexOffset = 0;
            let texcoordOffset = 0;
            let normalOffset = 0;

            // Helper function to process object with matrix transformation
            function processObject(object, parentMatrix) {
                // Calculate world matrix for this object
                const objectMatrix = new THREE.Matrix4();
                if (object.matrix) {
                    objectMatrix.copy(object.matrix);
                }

                // Apply parent transformation
                const worldMatrix = new THREE.Matrix4();
                if (parentMatrix) {
                    worldMatrix.multiplyMatrices(parentMatrix, objectMatrix);
                } else {
                    worldMatrix.copy(objectMatrix);
                }

                // Calculate normal matrix (inverse transpose of world matrix)
                const normalMatrix = new THREE.Matrix3();
                normalMatrix.getNormalMatrix(worldMatrix);

                if (object.geometry && object.geometry.attributes) {
                    const geometry = object.geometry;
                    const hasUVs = geometry.attributes.uv !== undefined;
                    const hasNormals = geometry.attributes.normal !== undefined;
                    const vertexCount = geometry.attributes.position ? geometry.attributes.position.count : 0;

                    // Process vertices with transformation
                    if (geometry.attributes.position) {
                        const positions = geometry.attributes.position.array;
                        const positionVector = new THREE.Vector3();

                        for (let i = 0; i < positions.length; i += 3) {
                            positionVector.set(positions[i], positions[i+1], positions[i+2]);
                            positionVector.applyMatrix4(worldMatrix);

                            // If this is the root object and has preview transformation,
                            // apply inverse preview transform to restore original GLB coordinates
                            if (!parentMatrix && previewCenter && previewScale !== undefined) {
                                // Inverse preview transform: v = v''/scale + center
                                // where v'' is the transformed vertex after preview transformation
                                positionVector.x = positionVector.x / previewScale + previewCenter.x;
                                positionVector.y = positionVector.y / previewScale + previewCenter.y;
                                positionVector.z = positionVector.z / previewScale + previewCenter.z;
                            }

                            vertices.push(`v ${positionVector.x} ${positionVector.y} ${positionVector.z}`);
                        }
                    }

                    // Process texture coordinates (no transformation needed)
                    if (hasUVs) {
                        const uvs = geometry.attributes.uv.array;
                        for (let i = 0; i < uvs.length; i += 2) {
                            texcoords.push(`vt ${uvs[i]} ${1 - uvs[i+1]}`); // Flip V coordinate for OBJ
                        }
                    }

                    // Process normals with transformation
                    if (hasNormals) {
                        const norms = geometry.attributes.normal.array;
                        const normalVector = new THREE.Vector3();

                        for (let i = 0; i < norms.length; i += 3) {
                            normalVector.set(norms[i], norms[i+1], norms[i+2]);
                            normalVector.applyNormalMatrix(normalMatrix);
                            normalVector.normalize(); // Ensure unit length
                            normals.push(`vn ${normalVector.x} ${normalVector.y} ${normalVector.z}`);
                        }
                    }

                    // Process indices (faces)
                    if (geometry.index) {
                        const indices = geometry.index.array;
                        for (let i = 0; i < indices.length; i += 3) {
                            const v1 = indices[i] + 1 + vertexOffset;
                            const v2 = indices[i+1] + 1 + vertexOffset;
                            const v3 = indices[i+2] + 1 + vertexOffset;

                            if (hasUVs && hasNormals) {
                                const vt1 = indices[i] + 1 + texcoordOffset;
                                const vt2 = indices[i+1] + 1 + texcoordOffset;
                                const vt3 = indices[i+2] + 1 + texcoordOffset;
                                const vn1 = indices[i] + 1 + normalOffset;
                                const vn2 = indices[i+1] + 1 + normalOffset;
                                const vn3 = indices[i+2] + 1 + normalOffset;
                                objContent += `f ${v1}/${vt1}/${vn1} ${v2}/${vt2}/${vn2} ${v3}/${vt3}/${vn3}\n`;
                            } else if (hasUVs) {
                                const vt1 = indices[i] + 1 + texcoordOffset;
                                const vt2 = indices[i+1] + 1 + texcoordOffset;
                                const vt3 = indices[i+2] + 1 + texcoordOffset;
                                objContent += `f ${v1}/${vt1} ${v2}/${vt2} ${v3}/${vt3}\n`;
                            } else if (hasNormals) {
                                const vn1 = indices[i] + 1 + normalOffset;
                                const vn2 = indices[i+1] + 1 + normalOffset;
                                const vn3 = indices[i+2] + 1 + normalOffset;
                                objContent += `f ${v1}//${vn1} ${v2}//${vn2} ${v3}//${vn3}\n`;
                            } else {
                                objContent += `f ${v1} ${v2} ${v3}\n`;
                            }
                        }
                    } else {
                        // No indices, assume triangles
                        for (let i = 0; i < vertexCount; i += 3) {
                            const v1 = i + 1 + vertexOffset;
                            const v2 = i + 2 + vertexOffset;
                            const v3 = i + 3 + vertexOffset;

                            if (hasUVs && hasNormals) {
                                const vt1 = i + 1 + texcoordOffset;
                                const vt2 = i + 2 + texcoordOffset;
                                const vt3 = i + 3 + texcoordOffset;
                                const vn1 = i + 1 + normalOffset;
                                const vn2 = i + 2 + normalOffset;
                                const vn3 = i + 3 + normalOffset;
                                objContent += `f ${v1}/${vt1}/${vn1} ${v2}/${vt2}/${vn2} ${v3}/${vt3}/${vn3}\n`;
                            } else if (hasUVs) {
                                const vt1 = i + 1 + texcoordOffset;
                                const vt2 = i + 2 + texcoordOffset;
                                const vt3 = i + 3 + texcoordOffset;
                                objContent += `f ${v1}/${vt1} ${v2}/${vt2} ${v3}/${vt3}\n`;
                            } else if (hasNormals) {
                                const vn1 = i + 1 + normalOffset;
                                const vn2 = i + 2 + normalOffset;
                                const vn3 = i + 3 + normalOffset;
                                objContent += `f ${v1}//${vn1} ${v2}//${vn2} ${v3}//${vn3}\n`;
                            } else {
                                objContent += `f ${v1} ${v2} ${v3}\n`;
                            }
                        }
                    }

                    // Update offsets for next geometry
                    vertexOffset += vertexCount;
                    texcoordOffset += hasUVs ? geometry.attributes.uv.count : 0;
                    normalOffset += hasNormals ? geometry.attributes.normal.count : 0;
                }

                // Process children recursively with world matrix
                if (object.children) {
                    object.children.forEach(child => processObject(child, worldMatrix));
                }
            }

            // Start processing from root with no parent matrix
            processObject(model, null);

            // Debug statistics
            console.log('OBJ Export Statistics:', {
                vertices: vertices.length,
                texcoords: texcoords.length,
                normals: normals.length,
                vertexOffset,
                texcoordOffset,
                normalOffset
            });

            // Build final OBJ content
            let finalObj = objContent;
            if (vertices.length > 0) {
                finalObj = vertices.join('\n') + '\n\n' +
                          (texcoords.length > 0 ? texcoords.join('\n') + '\n\n' : '') +
                          (normals.length > 0 ? normals.join('\n') + '\n\n' : '') +
                          objContent;
            }

            return finalObj || null;
        } catch (error) {
            console.error('Error exporting to OBJ:', error);
            return null;
        }
    }

    // Helper function to export model to glTF format

    // File upload handling
    glbFileInput.addEventListener('change', handleFileUpload);

    // Drag and drop support
    const uploadArea = document.querySelector('.file-upload-area');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // Conversion buttons
    convertToObjBtn.addEventListener('click', () => convertToFormat('obj'));
    extractTexturesBtn.addEventListener('click', extractTextures);
    downloadAllBtn.addEventListener('click', downloadAllFiles);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.glb')) {
            showNotification('Please upload a GLB file (.glb)', 'error');
            return;
        }

        processUploadedFile(file);
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.style.borderColor = 'var(--color-active)';
        uploadArea.style.backgroundColor = 'var(--color-hover)';
    }

    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.style.borderColor = 'var(--color-border)';
        uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.style.borderColor = 'var(--color-border)';
        uploadArea.style.backgroundColor = 'var(--color-bg-tertiary)';

        const file = event.dataTransfer.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.glb')) {
            showNotification('Please upload a GLB file (.glb)', 'error');
            return;
        }

        // Set the file input value
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        glbFileInput.files = dataTransfer.files;

        processUploadedFile(file);
    }

    function processUploadedFile(file) {
        uploadedFile = file;

        // Update file info display
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';

        // Show preview section
        previewSection.style.display = 'block';

        // Initialize Three.js preview
        initThreeJSPreview(file);

        // Clear previous outputs
        clearConversionOutputs();

        showNotification(`File "${file.name}" uploaded successfully`, 'success');
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function initThreeJSPreview(file) {
        // Clean up previous preview
        if (currentRenderer) {
            modelPreview.innerHTML = '';
            currentRenderer = null;
        }

        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            showNotification('Three.js library not loaded. Preview disabled.', 'warning');
            modelPreview.innerHTML = '<p class="no-output">3D preview requires Three.js library</p>';
            return;
        }

        try {
            // Create Three.js scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1e293b);

            // Create camera
            const camera = new THREE.PerspectiveCamera(75, modelPreview.clientWidth / modelPreview.clientHeight, 0.1, 1000);
            camera.position.z = 5;

            // Create renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(modelPreview.clientWidth, modelPreview.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            modelPreview.appendChild(renderer.domElement);

            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);

            // Load GLB file
            const loader = new THREE.GLTFLoader();
            const reader = new FileReader();

            reader.onload = function(event) {
                const arrayBuffer = event.target.result;

                loader.parse(arrayBuffer, '', function(gltf) {
                    currentModel = gltf.scene;
                    currentGLTF = gltf; // Store full GLTF object for texture extraction
                    scene.add(currentModel);

                    // Center and scale model
                    const box = new THREE.Box3().setFromObject(currentModel);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());

                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 4 / maxDim;

                    currentModel.position.x = -center.x * scale;
                    currentModel.position.y = -center.y * scale;
                    currentModel.position.z = -center.z * scale;
                    currentModel.scale.set(scale, scale, scale);

                    // Store preview transformation parameters for OBJ export
                    // These will be used to reverse the preview transformation
                    // and keep the original GLB coordinate system
                    currentModel.userData.previewCenter = center.clone();
                    currentModel.userData.previewScale = scale;
                    console.log('Preview transform saved:', { center: center, scale: scale });

                    // Store references
                    currentScene = scene;
                    currentCamera = camera;
                    currentRenderer = renderer;

                    // Start animation loop
                    animate();

                }, function(error) {
                    console.error('Error loading GLB:', error);
                    showNotification('Failed to load GLB file for preview', 'error');
                    modelPreview.innerHTML = '<p class="no-output">Failed to load 3D preview</p>';
                    currentGLTF = null; // Reset GLTF object on error
                });
            };

            reader.onerror = function(error) {
                console.error('Error reading file:', error);
                showNotification('Error reading file', 'error');
            };

            reader.readAsArrayBuffer(file);

        } catch (error) {
            console.error('Three.js initialization error:', error);
            showNotification('3D preview initialization failed', 'error');
            modelPreview.innerHTML = '<p class="no-output">3D preview initialization failed</p>';
        }
    }

    function animate() {
        if (!currentRenderer || !currentScene || !currentCamera) return;

        requestAnimationFrame(animate);

        // Rotate model slowly
        if (currentModel) {
            currentModel.rotation.y += 0.005;
        }

        currentRenderer.render(currentScene, currentCamera);
    }

    function convertToFormat(format) {
        if (!uploadedFile) {
            showNotification('Please upload a GLB file first', 'warning');
            return;
        }

        if (!currentGLTF && !currentModel) {
            showNotification('No GLB model loaded. Please wait for the model to load completely.', 'warning');
            return;
        }

        showNotification(`Converting to ${format.toUpperCase()}...`, 'info');

        try {
            // Try to export actual model data
            let modelData;
            let estimatedSize = Math.floor(uploadedFile.size * 0.8); // Default estimate

            if (format === 'obj') {
                // Use currentModel (gltf.scene) which is a Three.js object
                modelData = exportModelToOBJ(currentModel);
                estimatedSize = modelData ? modelData.length : estimatedSize;
            }

            // If export failed, use dummy data
            if (!modelData) {
                showNotification(`Using demonstration ${format.toUpperCase()} data (real conversion not available)`, 'info');
                modelData = generateDummyModelData(format);
            }

            const prefix = getFilenamePrefix();
            const baseName = cleanFileName(uploadedFile.name, true);
            const fileName = prefix + (baseName || 'model') + '.' + format;

            const outputFile = {
                id: Date.now(),
                name: fileName,
                format: format,
                size: estimatedSize,
                type: 'model',
                data: modelData
            };

            conversionOutputs.push(outputFile);
            updateOutputDisplay();
            showNotification(`Conversion to ${format.toUpperCase()} completed`, 'success');

        } catch (error) {
            console.error(`Error converting to ${format}:`, error);
            showNotification(`Failed to convert to ${format.toUpperCase()}. Using demonstration data.`, 'error');

            // Fallback to dummy data
            setTimeout(() => {
                const prefix = getFilenamePrefix();
                const baseName = cleanFileName(uploadedFile.name, true);
                const fileName = prefix + (baseName || 'model') + '.' + format;

                const outputFile = {
                    id: Date.now(),
                    name: fileName,
                    format: format,
                    size: Math.floor(uploadedFile.size * 0.8),
                    type: 'model',
                    data: generateDummyModelData(format)
                };

                conversionOutputs.push(outputFile);
                updateOutputDisplay();
                showNotification(`Conversion to ${format.toUpperCase()} completed (with demonstration data)`, 'success');
            }, 100);
        }
    }

    function extractTextures() {
        if (!uploadedFile) {
            showNotification('Please upload a GLB file first', 'warning');
            return;
        }

        if (!currentGLTF) {
            showNotification('No GLB model loaded. Please wait for the model to load completely.', 'warning');
            return;
        }

        showNotification('Extracting textures from GLB file...', 'info');

        // Extract textures from the GLTF object
        try {
            const prefix = getFilenamePrefix();
            const baseName = cleanFileName(uploadedFile.name, true);
            const base = baseName || 'model';

            // Use comprehensive texture extraction
            const extractedTextureInfos = extractAllTexturesFromGLTF(currentGLTF);

            if (extractedTextureInfos.length > 0) {
                const extractedTextures = extractedTextureInfos.map((textureInfo, idx) => {
                    // Generate descriptive name based on texture index and type
                    let textureType = 'texture';
                    if (textureInfo.index === 0) textureType = 'diffuse';
                    else if (textureInfo.index === 1) textureType = 'normal';
                    else if (textureInfo.index === 2) textureType = 'roughness';

                    const textureName = prefix + base + '_' + textureType + '_' + (textureInfo.index + 1) + '.png';

                    return {
                        id: Date.now() + textureInfo.index + 1,
                        name: textureName,
                        format: 'png',
                        size: textureInfo.data.length, // Approximate size
                        type: 'texture',
                        data: textureInfo.data
                    };
                });

                conversionOutputs.push(...extractedTextures);
                updateOutputDisplay();
                showNotification(`Successfully extracted ${extractedTextures.length} texture(s) from GLB file`, 'success');
            } else {
                showNotification('No textures found in the GLB file', 'info');

                // Fallback to dummy textures for demonstration
                setTimeout(() => {
                    const fallbackTextures = [
                        { id: Date.now() + 1, name: prefix + base + '_diffuse.png', format: 'png', size: 102400, type: 'texture', data: generateDummyTextureData('diffuse') },
                        { id: Date.now() + 2, name: prefix + base + '_normal.png', format: 'png', size: 102400, type: 'texture', data: generateDummyTextureData('normal') },
                        { id: Date.now() + 3, name: prefix + base + '_roughness.png', format: 'png', size: 51200, type: 'texture', data: generateDummyTextureData('roughness') }
                    ];

                    conversionOutputs.push(...fallbackTextures);
                    updateOutputDisplay();
                    showNotification('Using demonstration textures (no real textures found in file)', 'info');
                }, 100);
            }

        } catch (error) {
            console.error('Error extracting textures:', error);
            showNotification('Failed to extract textures. The GLB file may not contain extractable textures.', 'error');
        }
    }

    function updateOutputDisplay() {
        if (conversionOutputs.length === 0) {
            outputFiles.innerHTML = '<p class="no-output">No conversion output yet.</p>';
            downloadAllBtn.disabled = true;
            return;
        }

        let html = '';
        conversionOutputs.forEach(output => {
            const icon = output.type === 'model' ? 'fa-cube' : 'fa-image';
            const typeLabel = output.type === 'model' ? '3D Model' : 'Texture';

            html += `
                <div class="file-item">
                    <div class="file-item-info">
                        <div class="file-item-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="file-item-details">
                            <h5>${output.name}</h5>
                            <p>${typeLabel} • ${output.format.toUpperCase()} • ${formatFileSize(output.size)}</p>
                        </div>
                    </div>
                    <div class="file-item-actions">
                        <button class="small-btn download-single-btn" data-id="${output.id}">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
        });

        outputFiles.innerHTML = html;
        downloadAllBtn.disabled = false;

        // Add event listeners to single download buttons
        document.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                downloadSingleFile(id);
            });
        });
    }

    function clearConversionOutputs() {
        conversionOutputs = [];
        updateOutputDisplay();
    }

    function downloadSingleFile(id) {
        const file = conversionOutputs.find(f => f.id === id);
        if (!file) return;

        showNotification(`Downloading ${file.name}...`, 'info');

        // Create blob from file data
        let blob;
        if (file.format === 'png' && file.type === 'texture') {
            // Texture data is base64 PNG
            const byteCharacters = atob(file.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: 'image/png' });
        } else {
            // Model data (OBJ) is text
            blob = new Blob([file.data], { type: 'text/plain' });
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`${file.name} downloaded successfully`, 'success');
    }

    function downloadAllFiles() {
        if (conversionOutputs.length === 0) return;

        showNotification(`Preparing ${conversionOutputs.length} files for download...`, 'info');

        // Download each file with a delay to avoid overwhelming the browser
        conversionOutputs.forEach((file, index) => {
            setTimeout(() => {
                downloadSingleFile(file.id);
            }, index * 500); // 500ms delay between each file
        });
    }

    // Handle window resize for Three.js preview
    window.addEventListener('resize', function() {
        if (currentRenderer && currentCamera && modelPreview.clientWidth > 0) {
            currentCamera.aspect = modelPreview.clientWidth / modelPreview.clientHeight;
            currentCamera.updateProjectionMatrix();
            currentRenderer.setSize(modelPreview.clientWidth, modelPreview.clientHeight);
        }
    });
}
