// js/tools/EllipseTool.js - Ellipse / circle tool

import { BoxTool } from './BoxTool.js';

// An ellipse shares the box's corner-to-corner drag and fill styling;
// only the element type (and therefore how it's rendered) differs.
export class EllipseTool extends BoxTool {
    constructor(app) {
        super(app);
        this.elementType = 'ellipse';
    }
}
