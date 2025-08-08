document.addEventListener('DOMContentLoaded', () => {

    class Annotator {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.annotations = [];
            this.isDrawing = false;
            this.isDragging = false;
            this.isResizing = false;
            this.isShiftPressed = false;

            this.currentTool = 'select';
            this.strokeColor = '#ff0000';
            this.strokeWidth = 5;

            this.selectedObject = null;
            this.currentShape = null;
            this.activeHandle = null;

            this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
            this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
            this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

            window.addEventListener('keydown', (e) => { if (e.key === 'Shift') this.isShiftPressed = true; this.updateCursor(); });
            window.addEventListener('keyup', (e) => { if (e.key === 'Shift') this.isShiftPressed = false; this.updateCursor(); });

            this.loadScreenshot();
        }

        loadScreenshot() {
            chrome.storage.local.get('screenshotDataUrl', (result) => {
                if (result.screenshotDataUrl) {
                    const img = new Image();
                    this.backgroundImage = img;
                    img.onload = () => {
                        this.canvas.width = img.width;
                        this.canvas.height = img.height;
                        this.render();
                        chrome.storage.local.remove('screenshotDataUrl');
                    };
                    img.src = result.screenshotDataUrl;
                }
            });
        }

        render() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.backgroundImage) {
                this.ctx.drawImage(this.backgroundImage, 0, 0);
            }
            this.annotations.forEach(annotation => annotation.draw(this.ctx));
            if (this.isDrawing && this.currentShape) {
                this.currentShape.draw(this.ctx);
            }
            if (this.selectedObject) {
                this.selectedObject.drawHandles(this.ctx);
            }
        }

        getMousePos(evt) {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            return {
                x: (evt.clientX - rect.left) * scaleX,
                y: (evt.clientY - rect.top) * scaleY
            };
        }

        onMouseDown(e) {
            const pos = this.getMousePos(e);
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;

            if (this.currentTool === 'select') {
                if (this.selectedObject) {
                    this.activeHandle = this.selectedObject.getHandleAt(pos.x, pos.y);
                }

                if (this.activeHandle) {
                    this.isResizing = true;
                } else {
                    const clickedObject = this.getObjectAt(pos.x, pos.y);
                    if (clickedObject) {
                        this.selectedObject = clickedObject;
                        this.isDragging = true;
                    } else {
                        this.selectedObject = null;
                    }
                }
            } else if (this.currentTool === 'text') {
                this.createTextArea(pos.x, pos.y);
            } else {
                this.isDrawing = true;
                this.selectedObject = null;
                this.drawStartX = pos.x;
                this.drawStartY = pos.y;
                switch(this.currentTool) {
                    case 'rect':
                        this.currentShape = new Rectangle(this.drawStartX, this.drawStartY, this.strokeColor, this.strokeWidth);
                        break;
                    case 'circle':
                        this.currentShape = new Ellipse(this.drawStartX, this.drawStartY, this.strokeColor, this.strokeWidth);
                        break;
                    case 'line':
                        this.currentShape = new Line(this.drawStartX, this.drawStartY, this.strokeColor, this.strokeWidth);
                        break;
                    case 'arrow':
                        this.currentShape = new Arrow(this.drawStartX, this.drawStartY, this.strokeColor, this.strokeWidth);
                        break;
                }
            }
            this.render();
        }

        onMouseMove(e) {
            const pos = this.getMousePos(e);
            if (this.isResizing && this.selectedObject && this.activeHandle) {
                this.selectedObject.resizeByHandle(pos.x, pos.y, this.activeHandle);
            } else if (this.isDragging && this.selectedObject) {
                const dx = pos.x - this.dragStartX;
                const dy = pos.y - this.dragStartY;
                this.selectedObject.move(dx, dy);
                this.dragStartX = pos.x;
                this.dragStartY = pos.y;
            } else if (this.isDrawing && this.currentShape) {
                this.currentShape.resize(pos.x, pos.y, this.drawStartX, this.drawStartY, this.isShiftPressed);
            }
            this.updateCursor(e);
            this.render();
        }

        onMouseUp(e) {
            if (this.isDrawing) {
                if (this.currentShape) {
                    this.annotations.push(this.currentShape);
                    this.currentShape = null;
                }
            }
            this.isDrawing = false;
            this.isDragging = false;
            this.isResizing = false;
            this.activeHandle = null;
        }

        onDoubleClick(e) {
            const pos = this.getMousePos(e);
            const clickedObject = this.getObjectAt(pos.x, pos.y);
            if (clickedObject && clickedObject instanceof Text) {
                this.selectedObject = clickedObject;
                this.createTextArea(clickedObject.x, clickedObject.y, clickedObject);
            }
        }

        createTextArea(x, y, existingText = null) {
            const textarea = document.createElement('textarea');
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = rect.width / this.canvas.width;
            const scaleY = rect.height / this.canvas.height;

            textarea.style.position = 'absolute';
            textarea.style.left = `${rect.left + x * scaleX}px`;
            textarea.style.top = `${rect.top + y * scaleY}px`;
            textarea.style.border = '1px dashed #ccc';
            textarea.style.outline = 'none';
            textarea.style.padding = '0';
            textarea.style.margin = '0';
            textarea.style.background = 'rgba(255, 255, 255, 0.9)';
            textarea.style.color = this.strokeColor;
            textarea.style.fontSize = `${this.strokeWidth * 4 * scaleY}px`;
            textarea.style.fontFamily = 'sans-serif';
            textarea.style.resize = 'none';
            textarea.style.overflow = 'hidden';
            textarea.style.lineHeight = '1';
            textarea.style.transformOrigin = 'top left';
            textarea.style.transform = `scale(${scaleX}, ${scaleY})`;

            if (existingText) {
                textarea.value = existingText.text;
                this.annotations = this.annotations.filter(a => a !== existingText);
            }

            document.body.appendChild(textarea);
            textarea.focus();

            const finalize = () => {
                const textValue = textarea.value.trim();
                if (textValue) {
                    const newText = new Text(x, y, textValue, this.strokeColor, this.strokeWidth * 4);
                    this.annotations.push(newText);
                }
                document.body.removeChild(textarea);
                this.selectedObject = null;
                this.render();
            };

            textarea.addEventListener('blur', finalize);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    finalize();
                }
            });
        }

        getObjectAt(x, y) {
            for (let i = this.annotations.length - 1; i >= 0; i--) {
                if (this.annotations[i].isHit(x, y)) {
                    return this.annotations[i];
                }
            }
            return null;
        }

        updateCursor(e) {
            if (this.currentTool === 'select') {
                const pos = e ? this.getMousePos(e) : null;
                let cursor = 'default';
                if (this.selectedObject && pos) {
                    const handle = this.selectedObject.getHandleAt(pos.x, pos.y);
                    if (handle) {
                        cursor = handle.cursor;
                    } else if (this.getObjectAt(pos.x, pos.y)) {
                        cursor = 'move';
                    }
                } else if (pos && this.getObjectAt(pos.x, pos.y)) {
                    cursor = 'pointer';
                }
                this.canvas.style.cursor = cursor;
            } else {
                 this.canvas.style.cursor = this.currentTool === 'text' ? 'text' : 'crosshair';
            }
        }

        setTool(tool) {
            this.currentTool = tool;
            this.updateCursor();
            if (tool !== 'select') {
                this.selectedObject = null;
                this.render();
            }
        }

        setStrokeColor(color) {
            this.strokeColor = color;
            if (this.selectedObject) {
                this.selectedObject.strokeColor = color;
                this.render();
            }
        }

        setStrokeWidth(width) {
            this.strokeWidth = width;
            if (this.selectedObject && !(this.selectedObject instanceof Text)) {
                this.selectedObject.strokeWidth = width;
                this.render();
            }
        }

        undo() {
            if (this.annotations.length > 0) {
                this.annotations.pop();
                this.selectedObject = null;
                this.render();
            }
        }
    }

    class Annotation {
        constructor(x, y, strokeColor, strokeWidth) {
            this.x = x; this.y = y; this.strokeColor = strokeColor; this.strokeWidth = strokeWidth;
        }
        draw(ctx) {}
        isHit(x, y) { return false; }
        move(dx, dy) { this.x += dx; this.y += dy; }
        drawHandles(ctx) {}
        resize(newX, newY, startX, startY, isShiftPressed) {}
        getHandleAt(x, y) { return null; }
        resizeByHandle(x, y, handleName) {}
    }

    class Rectangle extends Annotation {
        constructor(x, y, strokeColor, strokeWidth) {
            super(x, y, strokeColor, strokeWidth);
            this.w = 0; this.h = 0;
        }

        draw(ctx) {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
        }

        resize(newX, newY, startX, startY) {
            this.x = Math.min(newX, startX);
            this.y = Math.min(newY, startY);
            this.w = Math.abs(newX - startX);
            this.h = Math.abs(newY - startY);
        }

        isHit(x, y) {
            return (x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h);
        }

        getHandles() {
            return [
                { name: 'top-left', x: this.x, y: this.y, cursor: 'nwse-resize' },
                { name: 'top-right', x: this.x + this.w, y: this.y, cursor: 'nesw-resize' },
                { name: 'bottom-left', x: this.x, y: this.y + this.h, cursor: 'nesw-resize' },
                { name: 'bottom-right', x: this.x + this.w, y: this.y + this.h, cursor: 'nwse-resize' },
            ];
        }

        getHandleAt(x, y) {
            for (const handle of this.getHandles()) {
                if (Math.abs(x - handle.x) <= 5 && Math.abs(y - handle.y) <= 5) {
                    return handle;
                }
            }
            return null;
        }

        resizeByHandle(x, y, handleName) {
            const oldX2 = this.x + this.w;
            const oldY2 = this.y + this.h;
            switch(handleName) {
                case 'top-left': this.x = x; this.y = y; this.w = oldX2 - x; this.h = oldY2 - y; break;
                case 'top-right': this.y = y; this.w = x - this.x; this.h = oldY2 - y; break;
                case 'bottom-left': this.x = x; this.w = oldX2 - x; this.h = y - this.y; break;
                case 'bottom-right': this.w = x - this.x; this.h = y - this.y; break;
            }
        }

        drawHandles(ctx) {
            this.getHandles().forEach(handle => {
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
                ctx.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
            });
        }
    }

    class Ellipse extends Annotation {
        constructor(x, y, strokeColor, strokeWidth) {
            super(x, y, strokeColor, strokeWidth);
            this.radiusX = 0; this.radiusY = 0;
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.ellipse(this.x, this.y, this.radiusX, this.radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
        }

        resize(newX, newY, startX, startY, isShiftPressed) {
            let w = Math.abs(newX - startX);
            let h = Math.abs(newY - startY);
            if (isShiftPressed) { w = h = Math.max(w, h); }
            this.radiusX = w / 2;
            this.radiusY = h / 2;
            this.x = startX + (newX - startX) / 2;
            this.y = startY + (newY - startY) / 2;
        }

        isHit(x, y) {
            if (this.radiusX === 0 || this.radiusY === 0) return false;
            const p = ((x - this.x) ** 2) / (this.radiusX ** 2);
            const q = ((y - this.y) ** 2) / (this.radiusY ** 2);
            return (p + q) <= 1;
        }

        drawHandles(ctx) {
            ctx.setLineDash([6, 3]);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - this.radiusX, this.y - this.radiusY, this.radiusX * 2, this.radiusY * 2);
            ctx.setLineDash([]);
        }
    }

    class Line extends Annotation {
        constructor(x, y, strokeColor, strokeWidth) {
            super(x, y, strokeColor, strokeWidth);
            this.x2 = x; this.y2 = y;
        }
        draw(ctx) {
            ctx.beginPath();
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x2, this.y2);
            ctx.stroke();
        }
        resize(newX, newY) { this.x2 = newX; this.y2 = newY; }
        isHit(x, y) { /* More complex hit detection needed for lines */ return false; }
        move(dx, dy) { super.move(dx, dy); this.x2 += dx; this.y2 += dy; }
    }

    class Arrow extends Line {
        draw(ctx) {
            super.draw(ctx);
            const headlen = this.strokeWidth * 3;
            const angle = Math.atan2(this.y2 - this.y, this.x2 - this.x);
            ctx.beginPath();
            ctx.moveTo(this.x2, this.y2);
            ctx.lineTo(this.x2 - headlen * Math.cos(angle - Math.PI / 6), this.y2 - headlen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(this.x2, this.y2);
            ctx.lineTo(this.x2 - headlen * Math.cos(angle + Math.PI / 6), this.y2 - headlen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }
    }

    class Text extends Annotation {
        constructor(x, y, text, color, size) {
            super(x, y, color, size);
            this.text = text; this.font = 'sans-serif';
        }

        draw(ctx) {
            ctx.fillStyle = this.strokeColor;
            ctx.font = `${this.strokeWidth}px ${this.font}`;
            ctx.textBaseline = 'top';
            this.measureText(ctx);
            const lines = this.text.split('\n');
            lines.forEach((line, index) => {
                ctx.fillText(line, this.x, this.y + (index * this.lineHeight));
            });
        }

        measureText(ctx) {
            const lines = this.text.split('\n');
            this.lineHeight = this.strokeWidth * 1.2;
            this.h = lines.length * this.lineHeight;
            this.w = 0;
            lines.forEach(line => {
                this.w = Math.max(this.w, ctx.measureText(line).width);
            });
        }

        isHit(x, y) {
            return (x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h);
        }

        drawHandles(ctx) {
            ctx.setLineDash([6, 3]);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
            ctx.setLineDash([]);
        }
    }

    // --- Initialization ---
    const canvas = document.getElementById('canvas');
    const annotator = new Annotator(canvas);

    const toolbar = document.getElementById('toolbar');
    toolbar.addEventListener('click', (e) => {
        const toolButton = e.target.closest('.tool-btn');
        if (toolButton && toolButton.dataset.tool) {
            annotator.setTool(toolButton.dataset.tool);
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            toolButton.classList.add('active');
        }
    });

    const strokeColorInput = document.getElementById('stroke-color');
    strokeColorInput.addEventListener('change', (e) => annotator.setStrokeColor(e.target.value));

    const strokeWidthInput = document.getElementById('stroke-width');
    strokeWidthInput.addEventListener('input', (e) => annotator.setStrokeWidth(e.target.value));

    const undoBtn = document.getElementById('undo-btn');
    undoBtn.addEventListener('click', () => annotator.undo());

    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', () => {
        annotator.selectedObject = null;
        annotator.render();
        const link = document.createElement('a');
        link.download = `screenshot-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });

    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', () => {
        annotator.selectedObject = null;
        annotator.render();
        canvas.toBlob((blob) => {
            navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]).then(() => {
                const copyBtnTextEl = copyBtn.querySelector('span:not(.material-icons-outlined)');
                if (copyBtnTextEl) {
                    const originalText = copyBtnTextEl.textContent;
                    copyBtnTextEl.textContent = "Copied!";
                    setTimeout(() => {
                        copyBtnTextEl.textContent = originalText;
                    }, 2000);
                }
            }).catch(err => {
                console.error('Failed to copy image:', err);
            });
        });
    });
});
