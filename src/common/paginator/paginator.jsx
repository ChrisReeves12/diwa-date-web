"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Paginator;
require("./paginator.scss");
const lodash_1 = __importDefault(require("lodash"));
function Paginator({ pageCount, page, onChange }) {
    return (<div className="paginator-container">
            <button disabled={page === 1} onClick={() => onChange(page - 1)} className="prev">
                <i className="las la-angle-left"></i>
            </button>
            <select onChange={(e) => onChange(Number(e.target.value))} value={page} className="pages">
                {lodash_1.default.range(1, pageCount + 1).map(page => <option key={page.toString()} value={page}>Page {page}</option>)}
            </select>
            <button disabled={page === pageCount} onClick={() => onChange(page + 1)} className="next">
                <i className="las la-angle-right"></i>
            </button>
        </div>);
}
//# sourceMappingURL=paginator.jsx.map