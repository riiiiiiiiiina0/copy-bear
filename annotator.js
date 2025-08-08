document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const toolbar = document.getElementById('toolbar');
    const strokeColorInput = document.getElementById('stroke-color');
    const strokeWidthInput = document.getElementById('stroke-width');
    const undoBtn = document.getElementById('undo-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');

    let isDrawing = false;
    let currentTool = 'rect';
    let startX, startY;
    let strokeColor = strokeColorInput.value;
    let strokeWidth = strokeWidthInput.value;

    let undoStack = [];
    let originalImage;

    // Load screenshot from storage
    chrome.storage.local.get('screenshotDataUrl', (result) => {
        if (result.screenshotDataUrl) {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
                saveState();
                // Clean up storage
                chrome.storage.local.remove('screenshotDataUrl');
            };
            img.src = result.screenshotDataUrl;
        } else {
            console.error('No screenshot data URL found.');
            // Handle error, maybe show a message to the user
        }
    });

    function saveState() {
        undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    function restoreState() {
        if (undoStack.length > 1) {
            undoStack.pop();
            ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        }
    }

    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(e);
        startX = pos.x;
        startY = pos.y;
        saveState();
    }

    function draw(e) {
        if (!isDrawing) return;

        const pos = getMousePos(e);
        const currentX = pos.x;
        const currentY = pos.y;

        // Restore the last saved state before drawing the new shape
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);

        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (currentTool) {
            case 'rect':
                ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
            case 'line':
                ctx.moveTo(startX, startY);
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                break;
            case 'arrow':
                drawArrow(startX, startY, currentX, currentY);
                break;
            case 'blur':
                 // The blur will be applied on mouseup
                break;
        }
    }

    function stopDrawing(e) {
        if (!isDrawing) return;
        isDrawing = false;

        if (currentTool === 'blur') {
            const pos = getMousePos(e);
            applyBlur(startX, startY, pos.x - startX, pos.y - startY);
        }
    }

    function drawArrow(fromx, fromy, tox, toy) {
        const headlen = strokeWidth * 5; // length of head in pixels
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    function applyBlur(x, y, w, h) {
        // Create a temporary canvas to draw the blurred section
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Put the original image on the temp canvas
        tempCtx.putImageData(originalImage, 0, 0);

        // Draw the blurred rectangle on the main canvas
        ctx.save();
        ctx.filter = 'blur(8px)';
        ctx.drawImage(tempCanvas, x, y, w, h, x, y, w, h);
        ctx.restore();

        saveState(); // Save the state after applying blur
    }


    toolbar.addEventListener('click', (e) => {
        const toolButton = e.target.closest('.tool-btn');
        if (toolButton && toolButton.dataset.tool) {
            currentTool = toolButton.dataset.tool;
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            toolButton.classList.add('active');
        }
    });

    strokeColorInput.addEventListener('change', (e) => {
        strokeColor = e.target.value;
    });

    strokeWidthInput.addEventListener('input', (e) => {
        strokeWidth = e.target.value;
    });

    undoBtn.addEventListener('click', restoreState);

    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `screenshot-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });

    copyBtn.addEventListener('click', () => {
        canvas.toBlob((blob) => {
            navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]).then(() => {
                alert('Image copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy image:', err);
                alert('Failed to copy image.');
            });
        });
    });

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', () => isDrawing = false);

    // Text tool implementation
    const textToolBtn = document.getElementById('text-tool');
    textToolBtn.addEventListener('click', () => {
        canvas.style.cursor = 'text';
    });

    // Revert cursor for other tools
    ['rect-tool', 'circle-tool', 'arrow-tool', 'line-tool', 'blur-tool'].forEach(id => {
        document.getElementById(id).addEventListener('click', () => {
             canvas.style.cursor = 'crosshair';
        });
    });

    canvas.addEventListener('click', (e) => {
        if (currentTool === 'text') {
            const pos = getMousePos(e);
            const text = prompt('Enter text:');
            if (text) {
                ctx.font = `${strokeWidth * 4}px Inter, sans-serif`;
                ctx.fillStyle = strokeColor;
                ctx.fillText(text, pos.x, pos.y);
                saveState();
            }
        }
    });
});
