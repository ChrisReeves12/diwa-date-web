import './paginator.scss';
import _ from 'lodash';

export default function Paginator({ pageCount, page, onChange }: { pageCount: number, page: number, onChange: (page: number) => void }) {
    return (
        <div className="paginator-container">
            <button disabled={page === 1} onClick={() => onChange(page - 1)} className="prev">
                <i className="las la-angle-left"></i>
            </button>
            <select onChange={(e) => onChange(Number(e.target.value))} value={page} className="pages">
                {_.range(1, pageCount + 1).map(page =>
                    <option key={page.toString()} value={page}>Page {page}</option>)}
            </select>
            <button disabled={page === pageCount} onClick={() => onChange(page + 1)} className="next">
                <i className="las la-angle-right"></i>
            </button>
        </div>
    );
}
