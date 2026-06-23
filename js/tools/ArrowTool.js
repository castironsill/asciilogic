// js/tools/ArrowTool.js - Arrow tool (a line with a directional head)

import { LineTool } from './LineTool.js';

export class ArrowTool extends LineTool {
    constructor(app) {
        super(app);
        this.elementType = 'arrow';
    }
}
