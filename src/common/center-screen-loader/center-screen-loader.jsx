"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CenterScreenLoader;
require("./center-screen-loader.scss");
const material_1 = require("@mui/material");
function CenterScreenLoader() {
    return (<div className="center-screen-loader-container">
            <material_1.CircularProgress thickness={1.5} size={200} color="info"/>
        </div>);
}
//# sourceMappingURL=center-screen-loader.jsx.map